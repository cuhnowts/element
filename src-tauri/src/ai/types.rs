use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProviderType {
    Anthropic,
    Openai,
    Ollama,
    OpenaiCompatible,
}

impl std::fmt::Display for ProviderType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProviderType::Anthropic => write!(f, "anthropic"),
            ProviderType::Openai => write!(f, "openai"),
            ProviderType::Ollama => write!(f, "ollama"),
            ProviderType::OpenaiCompatible => write!(f, "openai_compatible"),
        }
    }
}

impl ProviderType {
    pub fn from_db_str(s: &str) -> Result<Self, String> {
        match s {
            "anthropic" => Ok(ProviderType::Anthropic),
            "openai" => Ok(ProviderType::Openai),
            "ollama" => Ok(ProviderType::Ollama),
            "openai_compatible" => Ok(ProviderType::OpenaiCompatible),
            _ => Err(format!("Invalid provider type: {}", s)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderConfig {
    pub id: String,
    pub provider_type: ProviderType,
    pub name: String,
    pub model: String,
    pub base_url: Option<String>,
    pub credential_key: Option<String>,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProviderInput {
    pub provider_type: ProviderType,
    pub name: String,
    pub model: String,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompletionRequest {
    pub system_prompt: String,
    pub user_message: String,
    pub max_tokens: u32,
    pub temperature: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CompletionResponse {
    pub content: String,
    pub model: String,
    pub usage: TokenUsage,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenUsage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatRequest {
    pub system_prompt: String,
    pub messages: Vec<ChatMessage>,
    pub max_tokens: u32,
    pub temperature: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TaskScaffold {
    pub description: Option<String>,
    pub steps: Option<Vec<String>>,
    pub priority: Option<String>,
    pub estimated_minutes: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub related_tasks: Option<Vec<String>>,
}

#[derive(Debug, thiserror::Error)]
pub enum AiError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("API error: {status} - {message}")]
    Api { status: u16, message: String },
    #[error("Parse error: {0}")]
    Parse(String),
    #[error("No provider configured")]
    NoProvider,
    #[error("Provider not found: {0}")]
    ProviderNotFound(String),
    #[error("Credential error: {0}")]
    Credential(String),
}
