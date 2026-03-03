//! Session deletion commands
//!
//! Provides provider-aware, path-validated session file deletion.

use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::command;

use super::rename::{parse_opencode_session_path, validate_claude_path};

#[derive(Debug, Serialize)]
pub struct DeleteSessionResult {
    pub success: bool,
    pub provider: String,
    pub file_path: String,
}

#[command]
pub async fn delete_session_file(
    provider: String,
    session_path: String,
) -> Result<DeleteSessionResult, String> {
    let deleted_path = match provider.as_str() {
        "claude" => delete_claude_session_file(&session_path)?,
        "codex" => crate::providers::codex::delete_session_file(&session_path)?,
        "opencode" => delete_opencode_session_file(&session_path)?,
        _ => return Err(format!("Unsupported provider for deletion: {provider}")),
    };

    Ok(DeleteSessionResult {
        success: true,
        provider,
        file_path: deleted_path,
    })
}

fn delete_claude_session_file(session_path: &str) -> Result<String, String> {
    if !Path::new(session_path).exists() {
        return Err(format!("Session file not found: {session_path}"));
    }

    validate_claude_path(session_path)?;

    if Path::new(session_path)
        .extension()
        .and_then(|ext| ext.to_str())
        != Some("jsonl")
    {
        return Err("Claude session file must be a .jsonl file".to_string());
    }

    let canonical_file = PathBuf::from(session_path)
        .canonicalize()
        .map_err(|e| format!("Failed to resolve Claude session path: {e}"))?;

    let claude_base_path = crate::providers::claude::get_base_path()
        .ok_or_else(|| "Claude base path not found".to_string())?;
    let projects_root = Path::new(&claude_base_path).join("projects");
    let canonical_projects_root = projects_root
        .canonicalize()
        .map_err(|e| format!("Failed to resolve Claude projects directory: {e}"))?;

    if !canonical_file.starts_with(&canonical_projects_root) {
        return Err(format!(
            "Claude session path must be under projects directory: {session_path}"
        ));
    }

    let metadata = fs::symlink_metadata(&canonical_file)
        .map_err(|e| format!("Failed to read Claude session metadata: {e}"))?;
    if metadata.file_type().is_symlink() {
        return Err("Claude session file cannot be a symlink".to_string());
    }

    fs::remove_file(&canonical_file)
        .map_err(|e| format!("Failed to delete Claude session file: {e}"))?;

    Ok(canonical_file.to_string_lossy().to_string())
}

fn delete_opencode_session_file(session_path: &str) -> Result<String, String> {
    let (project_id, session_id) = parse_opencode_session_path(session_path)?;
    let opencode_base_path = crate::providers::opencode::get_base_path()
        .ok_or_else(|| "OpenCode base path not found".to_string())?;

    let sessions_root = Path::new(&opencode_base_path).join("storage").join("session");
    let session_file = sessions_root
        .join(project_id)
        .join(format!("{session_id}.json"));

    if !session_file.exists() {
        return Err(format!("OpenCode session file not found: {session_path}"));
    }

    let metadata = fs::symlink_metadata(&session_file)
        .map_err(|e| format!("Failed to read OpenCode session metadata: {e}"))?;
    if metadata.file_type().is_symlink() {
        return Err("OpenCode session file cannot be a symlink".to_string());
    }

    let canonical_file = session_file
        .canonicalize()
        .map_err(|e| format!("Failed to resolve OpenCode session path: {e}"))?;
    let canonical_sessions_root = sessions_root
        .canonicalize()
        .map_err(|e| format!("Failed to resolve OpenCode sessions root: {e}"))?;

    if !canonical_file.starts_with(&canonical_sessions_root) {
        return Err(format!(
            "OpenCode session path is outside session storage: {session_path}"
        ));
    }

    fs::remove_file(&canonical_file)
        .map_err(|e| format!("Failed to delete OpenCode session file: {e}"))?;

    Ok(canonical_file.to_string_lossy().to_string())
}
