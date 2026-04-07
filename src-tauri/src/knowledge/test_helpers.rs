#![cfg(test)]

use crate::ai::provider::AiProvider;
use crate::ai::types::{
    AiError, ChatRequest, CompletionRequest, CompletionResponse, ModelInfo, ProviderType,
    TokenUsage,
};
use async_trait::async_trait;
use std::sync::atomic::{AtomicUsize, Ordering};

/// A mock AI provider that returns a fixed response string.
pub struct MockProvider {
    pub response: String,
}

#[async_trait]
impl AiProvider for MockProvider {
    fn name(&self) -> &str {
        "mock"
    }
    fn provider_type(&self) -> ProviderType {
        ProviderType::Openai
    }
    async fn complete(
        &self,
        _request: CompletionRequest,
    ) -> Result<CompletionResponse, AiError> {
        Ok(CompletionResponse {
            content: self.response.clone(),
            model: "mock".to_string(),
            usage: TokenUsage {
                input_tokens: 0,
                output_tokens: 0,
            },
            tool_use: None,
        })
    }
    async fn complete_stream(
        &self,
        _request: CompletionRequest,
        _event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        Ok(CompletionResponse {
            content: self.response.clone(),
            model: "mock".to_string(),
            usage: TokenUsage {
                input_tokens: 0,
                output_tokens: 0,
            },
            tool_use: None,
        })
    }
    async fn chat_stream(
        &self,
        _request: ChatRequest,
        _event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        Ok(CompletionResponse {
            content: self.response.clone(),
            model: "mock".to_string(),
            usage: TokenUsage {
                input_tokens: 0,
                output_tokens: 0,
            },
            tool_use: None,
        })
    }
    async fn test_connection(&self) -> Result<bool, AiError> {
        Ok(true)
    }
    async fn list_models(&self) -> Result<Vec<ModelInfo>, AiError> {
        Ok(vec![])
    }
}

/// A mock AI provider that returns different responses for sequential calls.
pub struct SequentialMockProvider {
    pub responses: Vec<String>,
    call_index: AtomicUsize,
}

impl SequentialMockProvider {
    pub fn new(responses: Vec<String>) -> Self {
        Self {
            responses,
            call_index: AtomicUsize::new(0),
        }
    }
}

#[async_trait]
impl AiProvider for SequentialMockProvider {
    fn name(&self) -> &str {
        "sequential-mock"
    }
    fn provider_type(&self) -> ProviderType {
        ProviderType::Openai
    }
    async fn complete(
        &self,
        _request: CompletionRequest,
    ) -> Result<CompletionResponse, AiError> {
        let idx = self.call_index.fetch_add(1, Ordering::SeqCst);
        let response = if idx < self.responses.len() {
            self.responses[idx].clone()
        } else {
            self.responses.last().cloned().unwrap_or_default()
        };
        Ok(CompletionResponse {
            content: response,
            model: "mock".to_string(),
            usage: TokenUsage {
                input_tokens: 0,
                output_tokens: 0,
            },
            tool_use: None,
        })
    }
    async fn complete_stream(
        &self,
        request: CompletionRequest,
        _event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        self.complete(request).await
    }
    async fn chat_stream(
        &self,
        _request: ChatRequest,
        _event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        Ok(CompletionResponse {
            content: String::new(),
            model: "mock".to_string(),
            usage: TokenUsage {
                input_tokens: 0,
                output_tokens: 0,
            },
            tool_use: None,
        })
    }
    async fn test_connection(&self) -> Result<bool, AiError> {
        Ok(true)
    }
    async fn list_models(&self) -> Result<Vec<ModelInfo>, AiError> {
        Ok(vec![])
    }
}
