//! Tauri commands for Experience Library persistence
//!
//! This module provides commands for saving, loading, managing, and exporting
//! experience entries stored in ~/.claude-history-viewer/experience-library/

use crate::models::{ExperienceEntry, ExperienceEntrySummary};
use std::fs;
use std::io::Write;
use std::path::PathBuf;

/// Get the experience library folder path (~/.claude-history-viewer/experience-library)
fn get_experience_library_folder() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home.join(".claude-history-viewer").join("experience-library"))
}

/// Ensure the experience library folder exists
fn ensure_experience_library_folder() -> Result<PathBuf, String> {
    let folder = get_experience_library_folder()?;
    if !folder.exists() {
        fs::create_dir_all(&folder)
            .map_err(|e| format!("Failed to create experience library folder: {e}"))?;
    }
    Ok(folder)
}

/// Validate entry ID format: alphanumeric, hyphens, underscores only
fn validate_entry_id(id: &str) -> Result<(), String> {
    let id_regex = regex::Regex::new(r"^[A-Za-z0-9_-]+$")
        .map_err(|e| format!("Regex error: {e}"))?;

    if !id_regex.is_match(id) {
        return Err(format!(
            "Invalid entry ID format. Expected alphanumeric/hyphen/underscore, got: {id}"
        ));
    }
    Ok(())
}

/// Get the file path for a specific entry
fn get_entry_file_path(id: &str) -> Result<PathBuf, String> {
    validate_entry_id(id)?;
    let folder = get_experience_library_folder()?;
    let file_path = folder.join(format!("{id}.json"));

    // Security: ensure the path is within the experience library folder
    let canonical_folder = folder
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize folder: {e}"))?;

    // If file doesn't exist yet, verify the parent directory
    let canonical_file = if file_path.exists() {
        file_path
            .canonicalize()
            .map_err(|e| format!("Failed to canonicalize file path: {e}"))?
    } else {
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
        return Err("Security: file path outside experience library folder".to_string());
    }

    Ok(file_path)
}

/// Validate that a directory path is within the user's home directory
fn validate_output_dir(output_dir: &str) -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let path = PathBuf::from(output_dir);

    let canonical_home = home
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize home: {e}"))?;

    let canonical_path = if path.exists() {
        path.canonicalize()
            .map_err(|e| format!("Failed to canonicalize output dir: {e}"))?
    } else {
        return Err(format!("Output directory does not exist: {output_dir}"));
    };

    if !canonical_path.starts_with(&canonical_home) {
        return Err("Security: output directory must be within home directory".to_string());
    }

    Ok(canonical_path)
}

/// List all experience entries (metadata only, no content)
#[tauri::command]
pub async fn list_experience_entries() -> Result<Vec<ExperienceEntrySummary>, String> {
    let folder = match get_experience_library_folder() {
        Ok(f) => f,
        Err(_) => return Ok(vec![]),
    };

    if !folder.exists() {
        return Ok(vec![]);
    }

    let mut entries: Vec<ExperienceEntrySummary> = Vec::new();

    let read_dir =
        fs::read_dir(&folder).map_err(|e| format!("Failed to read experience library: {e}"))?;

    for dir_entry in read_dir {
        let dir_entry = match dir_entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = dir_entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }

        let content = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let entry: ExperienceEntry = match serde_json::from_str(&content) {
            Ok(e) => e,
            Err(_) => continue,
        };

        entries.push(ExperienceEntrySummary::from(entry));
    }

    // Sort by updated_at descending (newest first)
    entries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    Ok(entries)
}

/// Load a single experience entry by ID
#[tauri::command]
pub async fn load_experience_entry(id: String) -> Result<ExperienceEntry, String> {
    let file_path = get_entry_file_path(&id)?;

    if !file_path.exists() {
        return Err(format!("Experience entry not found: {id}"));
    }

    let content =
        fs::read_to_string(&file_path).map_err(|e| format!("Failed to read entry file: {e}"))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse entry: {e}"))
}

/// Create or update an experience entry (atomic write)
#[tauri::command]
pub async fn save_experience_entry(entry: ExperienceEntry) -> Result<(), String> {
    validate_entry_id(&entry.id)?;

    let folder = ensure_experience_library_folder()?;
    let file_path = get_entry_file_path(&entry.id)?;
    let temp_path = folder.join(format!("{}.tmp", entry.id));

    let content = serde_json::to_string_pretty(&entry)
        .map_err(|e| format!("Failed to serialize entry: {e}"))?;

    let mut file =
        fs::File::create(&temp_path).map_err(|e| format!("Failed to create temp file: {e}"))?;

    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {e}"))?;

    file.sync_all()
        .map_err(|e| format!("Failed to sync temp file: {e}"))?;

    drop(file);

    super::fs_utils::atomic_rename(&temp_path, &file_path)?;

    Ok(())
}

/// Delete an experience entry by ID
#[tauri::command]
pub async fn delete_experience_entry(id: String) -> Result<(), String> {
    let file_path = get_entry_file_path(&id)?;

    if !file_path.exists() {
        return Err(format!("Experience entry not found: {id}"));
    }

    fs::remove_file(&file_path).map_err(|e| format!("Failed to delete entry: {e}"))?;

    Ok(())
}

/// Export selected experience entries as formatted files
#[tauri::command]
pub async fn export_experience_templates(
    ids: Vec<String>,
    output_dir: String,
    format: String,
) -> Result<String, String> {
    let output_path = validate_output_dir(&output_dir)?;

    // Load all requested entries
    let mut entries: Vec<ExperienceEntry> = Vec::new();
    for id in &ids {
        let file_path = get_entry_file_path(id)?;
        if !file_path.exists() {
            return Err(format!("Experience entry not found: {id}"));
        }
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read entry {id}: {e}"))?;
        let entry: ExperienceEntry =
            serde_json::from_str(&content).map_err(|e| format!("Failed to parse entry {id}: {e}"))?;
        entries.push(entry);
    }

    if entries.is_empty() {
        return Err("No entries to export".to_string());
    }

    match format.as_str() {
        "prompt_template" => export_prompt_template(&entries, &output_path),
        "skill_definition" => export_skill_definition(&entries, &output_path),
        "claude_md" => export_claude_md(&entries, &output_path),
        _ => Err(format!("Unknown export format: {format}")),
    }
}

/// Export as a single prompt templates markdown file
fn export_prompt_template(
    entries: &[ExperienceEntry],
    output_path: &std::path::Path,
) -> Result<String, String> {
    let timestamp = chrono::Utc::now().format("%Y%m%d-%H%M%S");
    let filename = format!("prompt-templates-{timestamp}.md");
    let file_path = output_path.join(&filename);

    let mut content = String::from("# Prompt Templates\n\n");
    content.push_str(&format!(
        "> Exported {} entries on {}\n\n",
        entries.len(),
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
    ));

    for entry in entries {
        content.push_str(&format!("## {}\n\n", entry.title));
        content.push_str(&format!(
            "**Category**: {} | **Tags**: {}\n\n",
            entry.category,
            entry.tags.join(", ")
        ));
        content.push_str(&entry.content);
        content.push_str("\n\n---\n\n");
    }

    fs::write(&file_path, &content)
        .map_err(|e| format!("Failed to write export file: {e}"))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// Export as individual skill definition files with YAML frontmatter
fn export_skill_definition(
    entries: &[ExperienceEntry],
    output_path: &std::path::Path,
) -> Result<String, String> {
    let mut exported_paths: Vec<String> = Vec::new();

    for entry in entries {
        // Sanitize title for filename: lowercase, replace spaces/special chars with hyphens
        let safe_title: String = entry
            .title
            .to_lowercase()
            .chars()
            .map(|c| if c.is_alphanumeric() || c == '-' { c } else { '-' })
            .collect::<String>()
            .replace("--", "-")
            .trim_matches('-')
            .to_string();

        let filename = format!("skill-{safe_title}.md");
        let file_path = output_path.join(&filename);

        let mut content = String::from("---\n");
        content.push_str(&format!("id: {}\n", entry.id));
        content.push_str(&format!("category: {}\n", entry.category));
        content.push_str(&format!("title: \"{}\"\n", entry.title));
        content.push_str(&format!(
            "tags: [{}]\n",
            entry
                .tags
                .iter()
                .map(|t| format!("\"{t}\""))
                .collect::<Vec<_>>()
                .join(", ")
        ));
        content.push_str(&format!("created_at: {}\n", entry.created_at));
        content.push_str(&format!("updated_at: {}\n", entry.updated_at));
        content.push_str("---\n\n");
        content.push_str(&format!("# {}\n\n", entry.title));
        content.push_str(&entry.content);
        content.push('\n');

        fs::write(&file_path, &content)
            .map_err(|e| format!("Failed to write skill file: {e}"))?;

        exported_paths.push(file_path.to_string_lossy().to_string());
    }

    Ok(exported_paths.join("\n"))
}

/// Export as a CLAUDE.md snippet
fn export_claude_md(
    entries: &[ExperienceEntry],
    output_path: &std::path::Path,
) -> Result<String, String> {
    let file_path = output_path.join("CLAUDE-experience.md");

    let mut content =
        String::from("# Experience Library (Auto-generated)\n\n");
    content.push_str(&format!(
        "> {} entries exported on {}\n\n",
        entries.len(),
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
    ));

    for entry in entries {
        content.push_str(&format!("## {} ({})\n\n", entry.title, entry.category));
        if !entry.tags.is_empty() {
            content.push_str(&format!("Tags: {}\n\n", entry.tags.join(", ")));
        }
        content.push_str(&entry.content);
        content.push_str("\n\n");
    }

    fs::write(&file_path, &content)
        .map_err(|e| format!("Failed to write CLAUDE-experience.md: {e}"))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_entry_id() {
        // Valid IDs
        assert!(validate_entry_id("550e8400-e29b-41d4-a716-446655440000").is_ok());
        assert!(validate_entry_id("my_entry_123").is_ok());
        assert!(validate_entry_id("ABC-def-123").is_ok());

        // Invalid formats
        assert!(validate_entry_id("").is_err());
        assert!(validate_entry_id("../../../etc/passwd").is_err());
        assert!(validate_entry_id("entry with spaces").is_err());
        assert!(validate_entry_id("entry;rm -rf").is_err());
    }
}
