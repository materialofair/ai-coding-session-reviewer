//! Experience Library data models

use serde::{Deserialize, Serialize};

/// A full experience entry with content
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperienceEntry {
    pub id: String,
    pub category: String, // "prompt_pattern" | "skill_workflow" | "acceptance_criteria"
    pub title: String,
    pub content: String, // Markdown
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_session_id: Option<String>,
    pub created_at: String, // ISO 8601
    pub updated_at: String,
}

/// Lightweight metadata for listing experience entries (no content)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExperienceEntrySummary {
    pub id: String,
    pub category: String,
    pub title: String,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<ExperienceEntry> for ExperienceEntrySummary {
    fn from(entry: ExperienceEntry) -> Self {
        Self {
            id: entry.id,
            category: entry.category,
            title: entry.title,
            tags: entry.tags,
            created_at: entry.created_at,
            updated_at: entry.updated_at,
        }
    }
}
