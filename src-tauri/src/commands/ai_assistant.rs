use serde::{Deserialize, Serialize};
use std::process::Stdio;
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;
use tokio::sync::Semaphore;

// ============ Data Structures ============

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliDetectResult {
    pub installed: bool,
    pub path: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamChunk {
    pub request_id: String,
    pub delta: String,
    pub elapsed_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamDone {
    pub request_id: String,
    pub elapsed_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamError {
    pub request_id: String,
    pub error: String,
    /// One of: `CLI_NOT_FOUND`, `CLI_AUTH_ERROR`, `RATE_LIMIT`, `TIMEOUT`, `UNKNOWN`
    pub code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessagePayload {
    pub role: String, // "user" | "assistant"
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnresolvedIssue {
    pub session_id: String,
    pub message_uuid: String,
    pub timestamp: String,
    /// One of: `error`, `tool_failure`, `user_feedback`, `interrupted`
    pub issue_type: String,
    pub context: String,
    /// One of: `high`, `medium`, `low`
    pub severity: String,
}

#[derive(Debug, Clone)]
struct MixedContext {
    file_manifest: String,
    distilled_context: String,
    file_count: usize,
    extracted_line_count: usize,
    truncated: bool,
}

#[derive(Debug, Clone)]
struct ExtractedSnippet {
    text: String,
    high_signal: bool,
}

// ============ Provider Session Path Discovery ============

/// Return all session file paths for a given AI provider.
///
/// - `"claude"`   → `~/.claude/projects/**/*.jsonl`
/// - `"codex"`    → `~/.codex/sessions/**/*.jsonl`
/// - `"opencode"` → `~/.local/share/opencode/storage/session/**/*.json`
#[tauri::command]
pub async fn get_provider_session_paths(provider: String) -> Result<Vec<String>, String> {
    match provider.as_str() {
        "claude" => {
            let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
            let projects_dir = home.join(".claude").join("projects");
            Ok(collect_files_by_ext(&projects_dir, "jsonl"))
        }
        "codex" => {
            let base = crate::providers::codex::get_base_path()
                .ok_or("Codex not installed or ~/.codex not found")?;
            let base_path = std::path::Path::new(&base);
            let mut paths = collect_files_by_ext(&base_path.join("sessions"), "jsonl");
            paths.extend(collect_files_by_ext(
                &base_path.join("archived_sessions"),
                "jsonl",
            ));
            Ok(paths)
        }
        "opencode" => {
            let base =
                crate::providers::opencode::get_base_path().ok_or("OpenCode not installed")?;
            let sessions_dir = std::path::Path::new(&base).join("storage").join("session");
            Ok(collect_files_by_ext(&sessions_dir, "json"))
        }
        _ => Err(format!("Unknown provider: {provider}")),
    }
}

/// Recursively collect all files with a given extension under `dir`.
fn collect_files_by_ext(dir: &std::path::Path, ext: &str) -> Vec<String> {
    use walkdir::WalkDir;
    if !dir.exists() {
        return Vec::new();
    }
    WalkDir::new(dir)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| {
            e.file_type().is_file() && e.path().extension().and_then(|s| s.to_str()) == Some(ext)
        })
        .map(|e| e.path().to_string_lossy().to_string())
        .collect()
}

// ============ Rate Limiter (1 concurrent CLI call) ============

static CLI_SEMAPHORE: OnceLock<Semaphore> = OnceLock::new();

fn get_cli_semaphore() -> &'static Semaphore {
    // Allow limited parallel requests to reduce queueing latency.
    CLI_SEMAPHORE.get_or_init(|| Semaphore::new(2))
}

// ============ Commands ============

/// Detect whether a CLI tool is installed, its path, and version.
#[tauri::command]
pub async fn detect_cli(cli_name: String) -> Result<CliDetectResult, String> {
    // Validate cli_name to prevent injection (only allow alphanumeric + hyphen)
    if !cli_name.chars().all(|c| c.is_alphanumeric() || c == '-') {
        return Err("Invalid CLI name".to_string());
    }

    // Use 'which' on Unix, 'where' on Windows
    #[cfg(target_os = "windows")]
    let which_cmd = "where";
    #[cfg(not(target_os = "windows"))]
    let which_cmd = "which";

    let output = tokio::process::Command::new(which_cmd)
        .arg(&cli_name)
        .output()
        .await
        .map_err(|e| format!("Failed to run {which_cmd}: {e}"))?;

    if !output.status.success() {
        return Ok(CliDetectResult {
            installed: false,
            path: None,
            version: None,
        });
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();

    // Try to get version (failure is non-fatal)
    let version = get_cli_version(&cli_name).await.ok();

    Ok(CliDetectResult {
        installed: true,
        path: Some(path),
        version,
    })
}

async fn get_cli_version(cli_name: &str) -> Result<String, String> {
    let output = tokio::process::Command::new(cli_name)
        .arg("--version")
        .output()
        .await
        .map_err(|e| format!("{e}"))?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Read session JSONL files and stream an AI analysis to the frontend.
#[tauri::command]
pub async fn analyze_session(
    app_handle: AppHandle,
    session_paths: Vec<String>,
    analysis_type: String, // "summary" | "repeated" | "unresolved" | "prompt_skill_optimization"
    provider: String,      // "claude" | "codex" | "opencode"
    request_id: String,
) -> Result<(), String> {
    let _permit = get_cli_semaphore()
        .acquire()
        .await
        .map_err(|e| format!("Rate limit error: {e}"))?;

    let start = Instant::now();

    let mixed_context = build_mixed_context(&session_paths, &analysis_type)?;
    if mixed_context.distilled_context.trim().is_empty() {
        let _ = app_handle.emit(
            "ai_stream_error",
            StreamError {
                request_id: request_id.clone(),
                error: "No readable conversation content found in the selected sessions. \
                        The session files may use an unsupported format or contain no messages."
                    .to_string(),
                code: "EMPTY_CONTEXT".to_string(),
            },
        );
        return Ok(());
    }
    let prompt = build_analysis_prompt(&analysis_type, &mixed_context);
    let cli_exe = get_cli_executable(&provider);

    stream_cli_output(&app_handle, &cli_exe, &prompt, &request_id, start).await
}

/// Send a chat message (with optional session context) to an AI CLI and stream the response.
#[tauri::command]
pub async fn chat_with_ai(
    app_handle: AppHandle,
    messages: Vec<ChatMessagePayload>,
    context_session_paths: Vec<String>,
    provider: String,
    request_id: String,
) -> Result<(), String> {
    let _permit = get_cli_semaphore()
        .acquire()
        .await
        .map_err(|e| format!("Rate limit error: {e}"))?;

    let start = Instant::now();

    let mixed_context = build_mixed_context(&context_session_paths, "chat")?;
    // context may be empty when no session is selected or paths are empty — that's fine for chat
    let prompt = build_chat_prompt(&messages, &mixed_context);
    let cli_exe = get_cli_executable(&provider);

    stream_cli_output(&app_handle, &cli_exe, &prompt, &request_id, start).await
}

/// Scan session JSONL files synchronously and return a list of detected unresolved issues.
#[tauri::command]
pub fn detect_unresolved_issues(
    session_paths: Vec<String>,
) -> Result<Vec<UnresolvedIssue>, String> {
    // Error signal words for user feedback detection (multilingual)
    let error_signals = [
        // English
        "still not working",
        "that's wrong",
        "error again",
        "it failed",
        "doesn't work",
        "not working",
        "broken",
        "fix this",
        // Korean
        "아직도 오류",
        "여전히 오류",
        "또 에러",
        "안 되는데",
        "왜 안 되",
        // Chinese
        "还是有问题",
        "还是不行",
        "还是错误",
        "不对",
        "又报错了",
        // Japanese
        "まだエラー",
        "動かない",
        "また失敗",
    ];

    let mut issues = Vec::new();

    for path in &session_paths {
        let content =
            std::fs::read_to_string(path).map_err(|e| format!("Failed to read {path}: {e}"))?;

        // Extract session_id from filename stem
        let session_id = std::path::Path::new(path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        for line in content.lines() {
            let Ok(val) = serde_json::from_str::<serde_json::Value>(line) else {
                continue;
            };

            let uuid = val
                .get("uuid")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let timestamp = val
                .get("timestamp")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let msg_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");

            // 1. Direct error messages
            if msg_type == "error" {
                let context =
                    extract_text_from_message(&val).unwrap_or_else(|| "Error message".to_string());
                issues.push(UnresolvedIssue {
                    session_id: session_id.clone(),
                    message_uuid: uuid.clone(),
                    timestamp: timestamp.clone(),
                    issue_type: "error".to_string(),
                    context,
                    severity: "high".to_string(),
                });
                continue;
            }

            // 2. Tool result errors (is_error: true in content array)
            if let Some(content_arr) = val.pointer("/message/content").and_then(|v| v.as_array()) {
                for item in content_arr {
                    if item
                        .get("is_error")
                        .and_then(serde_json::Value::as_bool)
                        .unwrap_or(false)
                    {
                        let ctx = item
                            .get("content")
                            .and_then(|v| v.as_str())
                            .unwrap_or("Tool error")
                            .chars()
                            .take(200)
                            .collect::<String>();
                        issues.push(UnresolvedIssue {
                            session_id: session_id.clone(),
                            message_uuid: uuid.clone(),
                            timestamp: timestamp.clone(),
                            issue_type: "tool_failure".to_string(),
                            context: ctx,
                            severity: "high".to_string(),
                        });
                    }
                }
            }

            // 3. User feedback signals
            if val.pointer("/message/role").and_then(|v| v.as_str()) == Some("user") {
                let text = extract_text_from_message(&val)
                    .unwrap_or_default()
                    .to_lowercase();
                if error_signals.iter().any(|s| text.contains(s)) {
                    issues.push(UnresolvedIssue {
                        session_id: session_id.clone(),
                        message_uuid: uuid.clone(),
                        timestamp: timestamp.clone(),
                        issue_type: "user_feedback".to_string(),
                        context: text.chars().take(200).collect(),
                        severity: "medium".to_string(),
                    });
                }
            }
        }
    }

    // Sort by timestamp then dedup consecutive duplicates
    issues.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
    issues.dedup_by(|a, b| a.session_id == b.session_id && a.message_uuid == b.message_uuid);

    Ok(issues)
}

/// Write an AI analysis report to a Markdown file in the given directory.
#[tauri::command]
pub async fn export_ai_report(content: String, output_dir: String) -> Result<String, String> {
    use std::path::PathBuf;

    let dir = PathBuf::from(&output_dir);

    // Security: ensure output_dir is within the user's home directory
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    let canonical_dir = dir
        .canonicalize()
        .map_err(|e| format!("Invalid output directory: {e}"))?;
    if !canonical_dir.starts_with(&home) {
        return Err("Output directory must be within home directory".to_string());
    }

    // Generate filename with timestamp
    let timestamp = chrono::Local::now().format("%Y-%m-%d-%H%M%S");
    let filename = format!("ai-report-{timestamp}.md");
    let file_path = canonical_dir.join(&filename);

    // Atomic write: temp file + rename
    let tmp_path = canonical_dir.join(format!(".{filename}.tmp"));
    std::fs::write(&tmp_path, content.as_bytes())
        .map_err(|e| format!("Failed to write report: {e}"))?;
    std::fs::rename(&tmp_path, &file_path).map_err(|e| {
        let _ = std::fs::remove_file(&tmp_path);
        format!("Failed to finalize report: {e}")
    })?;

    Ok(file_path.to_string_lossy().to_string())
}

// ============ Private Helpers ============

fn get_cli_executable(provider: &str) -> String {
    match provider {
        "codex" => "codex".to_string(),
        "opencode" => "opencode".to_string(),
        // "claude" and unknown providers both use the claude CLI
        _ => "claude".to_string(),
    }
}

fn build_mixed_context(
    session_paths: &[String],
    analysis_type: &str,
) -> Result<MixedContext, String> {
    let mut high_signal_lines = Vec::new();
    let mut normal_lines = Vec::new();
    let mut manifest_lines = Vec::new();
    let max_chars = 32_000_usize;
    let mut total = 0_usize;
    let mut extracted_line_count = 0_usize;
    let mut truncated = false;
    let focus_prompt_skill = analysis_type == "prompt_skill_optimization";

    for path in session_paths {
        let content =
            std::fs::read_to_string(path).map_err(|e| format!("Failed to read {path}: {e}"))?;

        let mut file_extracted = 0_usize;
        for line in content.lines() {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
                for snippet in extract_snippets_from_message(&val) {
                    if focus_prompt_skill && !snippet.high_signal {
                        continue;
                    }
                    if total + snippet.text.len() > max_chars {
                        truncated = true;
                        break;
                    }
                    total += snippet.text.len();
                    extracted_line_count += 1;
                    file_extracted += 1;
                    if snippet.high_signal {
                        high_signal_lines.push(snippet.text);
                    } else {
                        normal_lines.push(snippet.text);
                    }
                }
            }
            if truncated {
                break;
            }
        }
        manifest_lines.push(format!("- {path} (extracted_lines: {file_extracted})"));
        if truncated {
            break;
        }
    }

    let mut lines = high_signal_lines;
    if !focus_prompt_skill {
        lines.extend(normal_lines);
    }

    Ok(MixedContext {
        file_manifest: manifest_lines.join("\n"),
        distilled_context: lines.join("\n"),
        file_count: session_paths.len(),
        extracted_line_count,
        truncated,
    })
}

fn extract_text_from_message(val: &serde_json::Value) -> Option<String> {
    // ── Claude format ──────────────────────────────────────────────────────
    // {"type":"user","message":{"role":"user","content":"..."}}

    // content as plain string
    if let Some(content) = val.pointer("/message/content").and_then(|v| v.as_str()) {
        let role = val
            .pointer("/message/role")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        return Some(format!("[{role}]: {content}"));
    }

    // content as array of blocks (text / tool_use / tool_result …)
    if let Some(arr) = val.pointer("/message/content").and_then(|v| v.as_array()) {
        let texts: Vec<String> = arr
            .iter()
            .filter_map(|item| item.get("text").and_then(|t| t.as_str()).map(String::from))
            .collect();
        if !texts.is_empty() {
            let role = val
                .pointer("/message/role")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            return Some(format!("[{role}]: {}", texts.join(" ")));
        }
    }

    // ── Codex rollout format ───────────────────────────────────────────────
    // {"type":"message","role":"user","content":"..."}
    // or content as array: {"type":"message","role":"assistant","content":[{"type":"text","text":"..."}]}
    let item_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");
    if item_type == "message" {
        let role = val
            .get("role")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        // content as plain string
        if let Some(content) = val.get("content").and_then(|v| v.as_str()) {
            if !content.trim().is_empty() {
                return Some(format!("[{role}]: {content}"));
            }
        }

        // content as array
        if let Some(arr) = val.get("content").and_then(|v| v.as_array()) {
            let texts: Vec<String> = arr
                .iter()
                .filter_map(|item| item.get("text").and_then(|t| t.as_str()).map(String::from))
                .collect();
            if !texts.is_empty() {
                return Some(format!("[{role}]: {}", texts.join(" ")));
            }
        }
    }

    // ── Codex event wrapper ───────────────────────────────────────────────
    // {"event":{"type":"message",...}} or {"item":{...}}
    if let Some(inner) = val.get("item").or_else(|| val.get("event")) {
        if let Some(text) = extract_text_from_message(inner) {
            return Some(text);
        }
    }

    // ── Codex input_items ─────────────────────────────────────────────────
    // {"type":"input_items","items":[...]}
    if item_type == "input_items" {
        if let Some(items) = val.get("items").and_then(|v| v.as_array()) {
            let texts: Vec<String> = items.iter().filter_map(extract_text_from_message).collect();
            if !texts.is_empty() {
                return Some(texts.join("\n"));
            }
        }
    }

    None
}

fn extract_snippets_from_message(val: &serde_json::Value) -> Vec<ExtractedSnippet> {
    let mut snippets = Vec::new();

    if let Some(content) = val.pointer("/message/content").and_then(|v| v.as_str()) {
        let role = val
            .pointer("/message/role")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");
        let text = format!("[{role}]: {content}");
        snippets.push(ExtractedSnippet {
            high_signal: is_high_signal(role, &text),
            text,
        });
        return snippets;
    }

    if let Some(arr) = val.pointer("/message/content").and_then(|v| v.as_array()) {
        let role = val
            .pointer("/message/role")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        let text = arr
            .iter()
            .filter_map(|item| item.get("text").and_then(|t| t.as_str()))
            .collect::<Vec<_>>()
            .join(" ");
        if !text.trim().is_empty() {
            let line = format!("[{role}]: {text}");
            snippets.push(ExtractedSnippet {
                high_signal: is_high_signal(role, &line),
                text: line,
            });
        }

        for item in arr {
            let item_type = item.get("type").and_then(|v| v.as_str()).unwrap_or("");
            if item_type == "tool_use" {
                let name = item
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown_tool");
                snippets.push(ExtractedSnippet {
                    text: format!("[tool_use]: {name}"),
                    high_signal: true,
                });
            }
            if item_type == "tool_result" {
                let is_error = item
                    .get("is_error")
                    .and_then(serde_json::Value::as_bool)
                    .unwrap_or(false);
                let result_text = item
                    .get("content")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .chars()
                    .take(240)
                    .collect::<String>();
                let tag = if is_error {
                    "[tool_result_error]"
                } else {
                    "[tool_result]"
                };
                if !result_text.is_empty() {
                    snippets.push(ExtractedSnippet {
                        text: format!("{tag}: {result_text}"),
                        high_signal: true,
                    });
                }
            }
        }

        if !snippets.is_empty() {
            return snippets;
        }
    }

    let item_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");
    if item_type == "message" {
        let role = val
            .get("role")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown");

        if let Some(content) = val.get("content").and_then(|v| v.as_str()) {
            if !content.trim().is_empty() {
                let text = format!("[{role}]: {content}");
                snippets.push(ExtractedSnippet {
                    high_signal: is_high_signal(role, &text),
                    text,
                });
            }
        }

        if let Some(arr) = val.get("content").and_then(|v| v.as_array()) {
            let text = arr
                .iter()
                .filter_map(|item| item.get("text").and_then(|t| t.as_str()))
                .collect::<Vec<_>>()
                .join(" ");
            if !text.trim().is_empty() {
                let line = format!("[{role}]: {text}");
                snippets.push(ExtractedSnippet {
                    high_signal: is_high_signal(role, &line),
                    text: line,
                });
            }
        }

        if !snippets.is_empty() {
            return snippets;
        }
    }

    if let Some(inner) = val.get("item").or_else(|| val.get("event")) {
        return extract_snippets_from_message(inner);
    }

    if item_type == "input_items" {
        if let Some(items) = val.get("items").and_then(|v| v.as_array()) {
            for item in items {
                snippets.extend(extract_snippets_from_message(item));
            }
        }
    }

    snippets
}

fn is_high_signal(role: &str, text: &str) -> bool {
    if role.eq_ignore_ascii_case("user") {
        return true;
    }

    let lower = text.to_lowercase();
    let prompt_skill_signals = [
        "prompt",
        "system prompt",
        "skill",
        "skills",
        "tool",
        "agent",
        "timeout",
        "failed",
        "error",
        "optimiz",
        "/",
        "$",
    ];
    prompt_skill_signals.iter().any(|s| lower.contains(s))
}

fn build_analysis_prompt(analysis_type: &str, mixed: &MixedContext) -> String {
    let common_header = format!(
        "You are analyzing AI coding sessions in HYBRID mode.\n\
         Use BOTH inputs below:\n\
         1) Source session file paths (for traceability)\n\
         2) Distilled extracted conversation context (for speed)\n\n\
         Session stats:\n\
         - file_count: {}\n\
         - extracted_lines: {}\n\
         - context_truncated: {}\n\n\
         Source files:\n{}\n\n\
         Distilled context:\n{}\n\n",
        mixed.file_count,
        mixed.extracted_line_count,
        mixed.truncated,
        mixed.file_manifest,
        mixed.distilled_context
    );

    match analysis_type {
        "summary" => format!("{common_header}{}",
            "Please summarize the following AI coding assistant conversation history. \
            Include: main tasks completed, tools used, problems encountered, and final outcomes. \
            Format as Markdown."
        ),
        "repeated" => format!("{common_header}{}",
            "Analyze the following conversation history and identify questions or topics \
            that appear repeatedly. Group similar questions and explain the pattern. \
            Format as Markdown."
        ),
        "unresolved" => format!("{common_header}{}",
            "Analyze the following conversation history and identify unresolved issues, \
            errors, and failed attempts. For each issue, describe what went wrong and \
            whether it was eventually resolved. Format as Markdown."
        ),
        "prompt_skill_optimization" => format!("{common_header}{}",
            "Analyze these AI coding sessions with a strict focus on user prompts and skill/tool usage quality.\n\
            Output Markdown with these sections:\n\
            1) Prompt quality diagnosis (specific problematic prompts + why they underperform)\n\
            2) Skill/tool usage diagnosis (missing skills, wrong tool sequence, overuse/underuse)\n\
            3) Optimized prompt rewrites (give concrete rewritten prompts)\n\
            4) Recommended skill workflow per task type (planning, implementation, debugging, verification)\n\
            5) Fast-execution playbook (how to reduce timeout/latency while keeping quality)\n\
            Be concrete, actionable, and reference evidence from the provided context."
        ),
        _ => format!("{common_header}Analyze this conversation and provide concise actionable insights in Markdown."),
    }
}

fn build_chat_prompt(messages: &[ChatMessagePayload], mixed: &MixedContext) -> String {
    let history: Vec<String> = messages
        .iter()
        .map(|m| format!("[{}]: {}", m.role, m.content))
        .collect();

    format!(
        "You are answering in HYBRID mode.\n\
        Prefer the distilled context for speed, and use source file paths for traceability.\n\n\
        Session stats:\n\
        - file_count: {}\n\
        - extracted_lines: {}\n\
        - context_truncated: {}\n\n\
        Source files:\n{}\n\n\
        Distilled context:\n{}\n\n\
        Chat history:\n{}\n\nPlease respond to the last user message.",
        mixed.file_count,
        mixed.extracted_line_count,
        mixed.truncated,
        mixed.file_manifest,
        mixed.distilled_context,
        history.join("\n")
    )
}

async fn stream_cli_output(
    app_handle: &AppHandle,
    cli_exe: &str,
    prompt: &str,
    request_id: &str,
    start: Instant,
) -> Result<(), String> {
    let mut cmd = match cli_exe {
        "claude" => {
            let mut c = Command::new("claude");
            // Use Claude stream-json mode for incremental frontend updates.
            c.args([
                "--print",
                "--output-format",
                "stream-json",
                "--verbose",
                "--include-partial-messages",
            ]);
            c
        }
        "codex" => {
            let mut c = Command::new("codex");
            c.arg("--quiet");
            c
        }
        _ => Command::new(cli_exe),
    };

    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| {
        let _ = app_handle.emit(
            "ai_stream_error",
            StreamError {
                request_id: request_id.to_string(),
                error: format!("CLI not found: {e}"),
                code: "CLI_NOT_FOUND".to_string(),
            },
        );
        format!("Failed to spawn {cli_exe}: {e}")
    })?;

    // Write prompt to stdin then close it so the CLI knows input is done
    if let Some(mut stdin) = child.stdin.take() {
        use tokio::io::AsyncWriteExt;
        stdin
            .write_all(prompt.as_bytes())
            .await
            .map_err(|e| format!("Failed to write prompt: {e}"))?;
        // stdin is dropped here, which closes the pipe
    }

    enum OutputEvent {
        StdoutLine(String),
        StderrLine(String),
        StdoutDone,
        StderrDone,
    }

    let (tx, mut rx) = mpsc::unbounded_channel::<OutputEvent>();

    if let Some(stdout) = child.stdout.take() {
        let tx_out = tx.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                if tx_out.send(OutputEvent::StdoutLine(line)).is_err() {
                    return;
                }
            }
            let _ = tx_out.send(OutputEvent::StdoutDone);
        });
    } else {
        let _ = tx.send(OutputEvent::StdoutDone);
    }

    if let Some(stderr) = child.stderr.take() {
        let tx_err = tx.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                if tx_err.send(OutputEvent::StderrLine(line)).is_err() {
                    return;
                }
            }
            let _ = tx_err.send(OutputEvent::StderrDone);
        });
    } else {
        let _ = tx.send(OutputEvent::StderrDone);
    }

    drop(tx);

    let total_timeout = Duration::from_secs(20 * 60);
    let idle_timeout = Duration::from_secs(3 * 60);
    let total_deadline = tokio::time::Instant::now() + total_timeout;
    let mut last_activity_at = tokio::time::Instant::now();
    let mut stdout_done = false;
    let mut stderr_done = false;
    let mut stderr_lines: Vec<String> = Vec::new();
    let mut claude_text_state = String::new();

    while !(stdout_done && stderr_done) {
        let now = tokio::time::Instant::now();
        if now >= total_deadline {
            let _ = child.kill().await;
            let _ = app_handle.emit(
                "ai_stream_error",
                StreamError {
                    request_id: request_id.to_string(),
                    error: "Analysis timed out (total time exceeded 20 minutes)".to_string(),
                    code: "TIMEOUT".to_string(),
                },
            );
            return Err("Total timeout".to_string());
        }

        if now.duration_since(last_activity_at) >= idle_timeout {
            let _ = child.kill().await;
            let _ = app_handle.emit(
                "ai_stream_error",
                StreamError {
                    request_id: request_id.to_string(),
                    error: "Analysis timed out (no output for 3 minutes)".to_string(),
                    code: "TIMEOUT".to_string(),
                },
            );
            return Err("Idle timeout".to_string());
        }

        let remaining_total = total_deadline.saturating_duration_since(now);
        let remaining_idle = idle_timeout.saturating_sub(now.duration_since(last_activity_at));
        let wait_for = remaining_total.min(remaining_idle);
        let event = match tokio::time::timeout(wait_for, rx.recv()).await {
            Ok(event) => event,
            Err(_) => continue,
        };

        let Some(event) = event else {
            break;
        };

        match event {
            OutputEvent::StdoutLine(line) => {
                last_activity_at = tokio::time::Instant::now();
                let delta = if cli_exe == "claude" {
                    extract_claude_stream_delta(&line, &mut claude_text_state)
                } else {
                    Some(format!("{line}\n"))
                };

                if let Some(delta) = delta {
                    let elapsed = start.elapsed().as_millis() as u64;
                    let _ = app_handle.emit(
                        "ai_stream_chunk",
                        StreamChunk {
                            request_id: request_id.to_string(),
                            delta,
                            elapsed_ms: elapsed,
                        },
                    );
                }
            }
            OutputEvent::StderrLine(line) => {
                last_activity_at = tokio::time::Instant::now();
                if stderr_lines.len() >= 50 {
                    stderr_lines.remove(0);
                }
                stderr_lines.push(line);
            }
            OutputEvent::StdoutDone => stdout_done = true,
            OutputEvent::StderrDone => stderr_done = true,
        }
    }

    let now = tokio::time::Instant::now();
    if now >= total_deadline {
        let _ = child.kill().await;
        let _ = app_handle.emit(
            "ai_stream_error",
            StreamError {
                request_id: request_id.to_string(),
                error: "Analysis timed out (total time exceeded 20 minutes)".to_string(),
                code: "TIMEOUT".to_string(),
            },
        );
        return Err("Total timeout".to_string());
    }

    let remaining = total_deadline.saturating_duration_since(now);
    match tokio::time::timeout(remaining, child.wait()).await {
        Ok(Ok(status)) => {
            if status.success() {
                let elapsed = start.elapsed().as_millis() as u64;
                let _ = app_handle.emit(
                    "ai_stream_done",
                    StreamDone {
                        request_id: request_id.to_string(),
                        elapsed_ms: elapsed,
                    },
                );
                Ok(())
            } else {
                let stderr_tail = if stderr_lines.is_empty() {
                    "CLI exited with error".to_string()
                } else {
                    stderr_lines.join("\n")
                };
                let _ = app_handle.emit(
                    "ai_stream_error",
                    StreamError {
                        request_id: request_id.to_string(),
                        error: stderr_tail,
                        code: "CLI_AUTH_ERROR".to_string(),
                    },
                );
                Err("CLI process failed".to_string())
            }
        }
        Ok(Err(e)) => {
            let _ = app_handle.emit(
                "ai_stream_error",
                StreamError {
                    request_id: request_id.to_string(),
                    error: format!("Process error: {e}"),
                    code: "UNKNOWN".to_string(),
                },
            );
            Err(format!("Process error: {e}"))
        }
        Err(_) => {
            let _ = child.kill().await;
            let _ = app_handle.emit(
                "ai_stream_error",
                StreamError {
                    request_id: request_id.to_string(),
                    error: "Analysis timed out (total time exceeded 20 minutes)".to_string(),
                    code: "TIMEOUT".to_string(),
                },
            );
            Err("Total timeout".to_string())
        }
    }
}

fn extract_claude_stream_delta(line: &str, state: &mut String) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(line).ok()?;
    let line_type = value.get("type").and_then(|v| v.as_str()).unwrap_or("");

    let extracted = match line_type {
        // stream-json emits assistant snapshots; emit only incremental text.
        "assistant" => value
            .get("message")
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|item| {
                        if item.get("type").and_then(|v| v.as_str()) == Some("text") {
                            item.get("text")
                                .and_then(|v| v.as_str())
                                .map(str::to_string)
                        } else {
                            None
                        }
                    })
                    .collect::<Vec<_>>()
                    .join("")
            }),
        // final result line fallback
        "result" => value
            .get("result")
            .and_then(|v| v.as_str())
            .map(str::to_string),
        _ => None,
    }?;

    if extracted.is_empty() {
        return None;
    }

    if extracted.starts_with(state.as_str()) {
        let delta = extracted[state.len()..].to_string();
        *state = extracted;
        if delta.is_empty() {
            None
        } else {
            Some(delta)
        }
    } else if state.is_empty() {
        *state = extracted.clone();
        Some(extracted)
    } else {
        // If Claude emits a reset/summarized snapshot, append as a new segment.
        *state = extracted.clone();
        Some(format!("\n{extracted}"))
    }
}

#[cfg(test)]
mod tests {
    use super::extract_claude_stream_delta;

    #[test]
    fn extract_claude_stream_delta_emits_incremental_text() {
        let mut state = String::new();
        let first =
            r#"{"type":"assistant","message":{"content":[{"type":"text","text":"Hello"}]}}"#;
        let second =
            r#"{"type":"assistant","message":{"content":[{"type":"text","text":"Hello world"}]}}"#;

        assert_eq!(
            extract_claude_stream_delta(first, &mut state).as_deref(),
            Some("Hello")
        );
        assert_eq!(state, "Hello");

        assert_eq!(
            extract_claude_stream_delta(second, &mut state).as_deref(),
            Some(" world")
        );
        assert_eq!(state, "Hello world");
    }

    #[test]
    fn extract_claude_stream_delta_ignores_non_assistant_events() {
        let mut state = String::new();
        let system = r#"{"type":"system","subtype":"init"}"#;
        assert_eq!(extract_claude_stream_delta(system, &mut state), None);
        assert!(state.is_empty());
    }
}
