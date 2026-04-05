use crate::ai::types::{
    AiError, ChatRequest, CompletionRequest, CompletionResponse, ModelInfo, ProviderType,
};
use async_trait::async_trait;

#[async_trait]
#[allow(dead_code)] // trait API methods used via dynamic dispatch
pub trait AiProvider: Send + Sync {
    fn name(&self) -> &str;
    fn provider_type(&self) -> ProviderType;
    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, AiError>;
    async fn complete_stream(
        &self,
        request: CompletionRequest,
        event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError>;
    async fn chat_stream(
        &self,
        request: ChatRequest,
        event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError>;
    async fn test_connection(&self) -> Result<bool, AiError>;
    async fn list_models(&self) -> Result<Vec<ModelInfo>, AiError>;
}
