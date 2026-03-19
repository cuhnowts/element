use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value};

use crate::ai::provider::AiProvider;
use crate::ai::types::{
    AiError, CompletionRequest, CompletionResponse, ModelInfo, ProviderType, TokenUsage,
};

pub struct AnthropicProvider {
    api_key: String,
    model: String,
    client: Client,
}

impl AnthropicProvider {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            api_key,
            model,
            client: Client::new(),
        }
    }
}

#[async_trait]
impl AiProvider for AnthropicProvider {
    fn name(&self) -> &str {
        "Anthropic"
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::Anthropic
    }

    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, AiError> {
        let body = json!({
            "model": self.model,
            "max_tokens": request.max_tokens,
            "system": request.system_prompt,
            "messages": [
                {"role": "user", "content": request.user_message}
            ]
        });

        let resp = self
            .client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AiError::Api {
                status: status.as_u16(),
                message: text,
            });
        }

        let json: Value = resp.json().await?;

        let content = json["content"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let input_tokens = json["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32;
        let output_tokens = json["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32;

        Ok(CompletionResponse {
            content,
            model: json["model"]
                .as_str()
                .unwrap_or(&self.model)
                .to_string(),
            usage: TokenUsage {
                input_tokens,
                output_tokens,
            },
        })
    }

    async fn complete_stream(
        &self,
        request: CompletionRequest,
        event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        let body = json!({
            "model": self.model,
            "max_tokens": request.max_tokens,
            "system": request.system_prompt,
            "stream": true,
            "messages": [
                {"role": "user", "content": request.user_message}
            ]
        });

        let resp = self
            .client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AiError::Api {
                status: status.as_u16(),
                message: text,
            });
        }

        let mut accumulated = String::new();
        let mut input_tokens: u32 = 0;
        let mut output_tokens: u32 = 0;
        let mut model_name = self.model.clone();

        let bytes = resp.bytes().await?;
        let text = String::from_utf8_lossy(&bytes);

        for line in text.lines() {
            let line = line.trim();
            if !line.starts_with("data: ") {
                continue;
            }
            let data = &line[6..];
            if data == "[DONE]" {
                break;
            }

            if let Ok(chunk) = serde_json::from_str::<Value>(data) {
                let event_type = chunk["type"].as_str().unwrap_or("");

                match event_type {
                    "message_start" => {
                        if let Some(m) = chunk["message"]["model"].as_str() {
                            model_name = m.to_string();
                        }
                        input_tokens = chunk["message"]["usage"]["input_tokens"]
                            .as_u64()
                            .unwrap_or(0) as u32;
                    }
                    "content_block_delta" => {
                        if let Some(text) = chunk["delta"]["text"].as_str() {
                            accumulated.push_str(text);
                            let _ = event_sender.send(text.to_string()).await;
                        }
                    }
                    "message_delta" => {
                        output_tokens = chunk["usage"]["output_tokens"]
                            .as_u64()
                            .unwrap_or(0) as u32;
                    }
                    _ => {}
                }
            }
        }

        Ok(CompletionResponse {
            content: accumulated,
            model: model_name,
            usage: TokenUsage {
                input_tokens,
                output_tokens,
            },
        })
    }

    async fn test_connection(&self) -> Result<bool, AiError> {
        let request = CompletionRequest {
            system_prompt: String::new(),
            user_message: "hi".to_string(),
            max_tokens: 1,
            temperature: 0.0,
        };
        self.complete(request).await?;
        Ok(true)
    }

    async fn list_models(&self) -> Result<Vec<ModelInfo>, AiError> {
        // Anthropic has no list-models API; return hardcoded list
        Ok(vec![
            ModelInfo {
                id: "claude-sonnet-4-20250514".to_string(),
                name: "Claude Sonnet 4".to_string(),
            },
            ModelInfo {
                id: "claude-haiku-35-20241022".to_string(),
                name: "Claude Haiku 3.5".to_string(),
            },
        ])
    }
}
