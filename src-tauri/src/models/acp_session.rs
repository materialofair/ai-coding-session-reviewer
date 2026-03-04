//! ACP (AI Chat Panel) session data models

use serde::{Deserialize, Serialize};

/// A single message in an ACP chat session
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcpChatMessage {
    pub id: String,
    pub role: String, // "user" | "assistant"
    pub content: String,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_streaming: Option<bool>,
}

/// A complete ACP chat session
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcpChatSession {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub messages: Vec<AcpChatMessage>,
    /// Optional: link to the main session being analyzed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context_session_id: Option<String>,
    /// Optional: link to the project being analyzed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context_project_path: Option<String>,
}

/// Lightweight metadata for listing ACP sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcpSessionMetadata {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub message_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context_session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context_project_path: Option<String>,
}

impl From<AcpChatSession> for AcpSessionMetadata {
    fn from(session: AcpChatSession) -> Self {
        Self {
            id: session.id,
            title: session.title,
            created_at: session.created_at,
            updated_at: session.updated_at,
            message_count: session.messages.len(),
            context_session_id: session.context_session_id,
            context_project_path: session.context_project_path,
        }
    }
}
