//! Tauri commands for ACP (AI Chat Panel) session persistence
//!
//! This module provides commands for saving, loading, and managing
//! ACP chat sessions stored in ~/.claude-history-viewer/acp-sessions/

use crate::models::{AcpChatMessage, AcpChatSession, AcpSessionMetadata};
use std::fs;
use std::io::Write;
use std::path::PathBuf;

/// Get the ACP sessions folder path (~/.claude-history-viewer/acp-sessions)
fn get_acp_sessions_folder() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home.join(".claude-history-viewer").join("acp-sessions"))
}

/// Ensure the ACP sessions folder exists
fn ensure_acp_sessions_folder() -> Result<PathBuf, String> {
    let folder = get_acp_sessions_folder()?;
    if !folder.exists() {
        fs::create_dir_all(&folder)
            .map_err(|e| format!("Failed to create ACP sessions folder: {e}"))?;
    }
    Ok(folder)
}

/// Validate session ID format (UUID: lowercase hex with hyphens)
fn validate_session_id(session_id: &str) -> Result<(), String> {
    // UUID format: 8-4-4-4-12 hex digits with hyphens
    let uuid_regex =
        regex::Regex::new(r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$")
            .map_err(|e| format!("Regex error: {e}"))?;

    if !uuid_regex.is_match(session_id) {
        return Err(format!(
            "Invalid session ID format. Expected UUID, got: {session_id}"
        ));
    }
    Ok(())
}

/// Get the file path for a specific session
fn get_session_file_path(session_id: &str) -> Result<PathBuf, String> {
    validate_session_id(session_id)?;
    let folder = get_acp_sessions_folder()?;
    let file_path = folder.join(format!("{session_id}.json"));

    // Security: ensure the path is within the ACP sessions folder
    let canonical_folder = folder
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize folder: {e}"))?;

    // If file doesn't exist yet, just verify the parent directory
    let canonical_file = if file_path.exists() {
        file_path
            .canonicalize()
            .map_err(|e| format!("Failed to canonicalize file path: {e}"))?
    } else {
        // For non-existent files, verify parent and construct path
        let parent = file_path
            .parent()
            .ok_or_else(|| "No parent directory".to_string())?;
        let canonical_parent = parent
            .canonicalize()
            .map_err(|e| format!("Failed to canonicalize parent: {e}"))?;
        let filename = file_path
            .file_name()
            .ok_or_else(|| "No filename".to_string())?;
        canonical_parent.join(filename)
    };

    if !canonical_file.starts_with(&canonical_folder) {
        return Err("Security: file path outside ACP sessions folder".to_string());
    }

    Ok(file_path)
}

/// List all ACP sessions (returns metadata only, not full messages)
#[tauri::command]
pub async fn list_acp_sessions() -> Result<Vec<AcpSessionMetadata>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let folder = get_acp_sessions_folder()?;

        if !folder.exists() {
            return Ok(Vec::new());
        }

        let mut sessions = Vec::new();

        let entries = fs::read_dir(&folder)
            .map_err(|e| format!("Failed to read ACP sessions folder: {e}"))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {e}"))?;
            let path = entry.path();

            // Only process .json files
            if path.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }

            // Read and parse the session file
            match fs::read_to_string(&path) {
                Ok(content) => match serde_json::from_str::<AcpChatSession>(&content) {
                    Ok(session) => {
                        sessions.push(AcpSessionMetadata::from(session));
                    }
                    Err(e) => {
                        log::warn!("Failed to parse session file {}: {e}", path.display());
                    }
                },
                Err(e) => {
                    log::warn!("Failed to read session file {}: {e}", path.display());
                }
            }
        }

        // Sort by updated_at descending (most recent first)
        sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

        Ok(sessions)
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

/// Load a specific ACP session by ID
#[tauri::command]
pub async fn load_acp_session(session_id: String) -> Result<AcpChatSession, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let file_path = get_session_file_path(&session_id)?;

        if !file_path.exists() {
            return Err(format!("Session not found: {session_id}"));
        }

        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read session file: {e}"))?;

        let session: AcpChatSession =
            serde_json::from_str(&content).map_err(|e| format!("Failed to parse session: {e}"))?;

        Ok(session)
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

/// Save an ACP session (create or update)
#[tauri::command]
pub async fn save_acp_session(session: AcpChatSession) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        ensure_acp_sessions_folder()?;
        let file_path = get_session_file_path(&session.id)?;

        // Atomic write: write to temp file first, then rename
        let temp_path = file_path.with_extension("json.tmp");

        let content = serde_json::to_string_pretty(&session)
            .map_err(|e| format!("Failed to serialize session: {e}"))?;

        let mut file =
            fs::File::create(&temp_path).map_err(|e| format!("Failed to create temp file: {e}"))?;

        file.write_all(content.as_bytes())
            .map_err(|e| format!("Failed to write temp file: {e}"))?;

        file.sync_all()
            .map_err(|e| format!("Failed to sync temp file: {e}"))?;

        // Drop file handle before rename
        drop(file);

        // Cross-platform atomic rename
        super::fs_utils::atomic_rename(&temp_path, &file_path)?;

        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

/// Delete an ACP session
#[tauri::command]
pub async fn delete_acp_session(session_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let file_path = get_session_file_path(&session_id)?;

        if !file_path.exists() {
            return Err(format!("Session not found: {session_id}"));
        }

        fs::remove_file(&file_path).map_err(|e| format!("Failed to delete session file: {e}"))?;

        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

/// Append a message to an existing session (optimized for streaming)
#[tauri::command]
pub async fn append_acp_message(session_id: String, message: AcpChatMessage) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let file_path = get_session_file_path(&session_id)?;

        if !file_path.exists() {
            return Err(format!("Session not found: {session_id}"));
        }

        // Load existing session
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read session file: {e}"))?;

        let mut session: AcpChatSession =
            serde_json::from_str(&content).map_err(|e| format!("Failed to parse session: {e}"))?;

        // Append message
        session.messages.push(message);

        // Update timestamp
        session.updated_at = chrono::Utc::now().to_rfc3339();

        // Save back (atomic write)
        let temp_path = file_path.with_extension("json.tmp");

        let content = serde_json::to_string_pretty(&session)
            .map_err(|e| format!("Failed to serialize session: {e}"))?;

        let mut file =
            fs::File::create(&temp_path).map_err(|e| format!("Failed to create temp file: {e}"))?;

        file.write_all(content.as_bytes())
            .map_err(|e| format!("Failed to write temp file: {e}"))?;

        file.sync_all()
            .map_err(|e| format!("Failed to sync temp file: {e}"))?;

        drop(file);

        super::fs_utils::atomic_rename(&temp_path, &file_path)?;

        Ok(())
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_session_id() {
        // Valid UUIDs
        assert!(validate_session_id("550e8400-e29b-41d4-a716-446655440000").is_ok());
        assert!(validate_session_id("6ba7b810-9dad-11d1-80b4-00c04fd430c8").is_ok());

        // Invalid formats
        assert!(validate_session_id("not-a-uuid").is_err());
        assert!(validate_session_id("550e8400-e29b-41d4-a716").is_err()); // too short
        assert!(validate_session_id("550E8400-E29B-41D4-A716-446655440000").is_err()); // uppercase
        assert!(validate_session_id("../../../etc/passwd").is_err()); // path traversal
    }
}
