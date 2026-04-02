use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;

use crate::ai::provider::AiProvider;
use crate::ai::types::{
    AiError, ChatRequest, CompletionRequest, CompletionResponse, ModelInfo, ProviderType, TokenUsage,
};

pub struct OllamaProvider {
    base_url: String,
    model: String,
    client: Client,
}

impl OllamaProvider {
    pub fn new(base_url: Option<String>, model: String) -> Self {
        Self {
            base_url: base_url.unwrap_or_else(|| "http://localhost:11434".to_string()),
            model,
            client: Client::new(),
        }
    }
}

#[async_trait]
impl AiProvider for OllamaProvider {
    fn name(&self) -> &str {
        "Ollama"
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::Ollama
    }

    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, AiError> {
        let body = json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.user_message}
            ],
            "stream": false
        });

        let resp = self
            .client
            .post(format!("{}/api/chat", self.base_url))
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

        let content = json["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        // Ollama doesn't always return token counts
        let input_tokens = json["prompt_eval_count"].as_u64().unwrap_or(0) as u32;
        let output_tokens = json["eval_count"].as_u64().unwrap_or(0) as u32;

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
            tool_use: None,
        })
    }

    async fn complete_stream(
        &self,
        request: CompletionRequest,
        event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        let body = json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.user_message}
            ],
            "stream": true
        });

        let resp = self
            .client
            .post(format!("{}/api/chat", self.base_url))
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

        // Ollama streams NDJSON (one JSON object per line)
        let bytes = resp.bytes().await?;
        let text = String::from_utf8_lossy(&bytes);

        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            if let Ok(chunk) = serde_json::from_str::<Value>(line) {
                if let Some(content) = chunk["message"]["content"].as_str() {
                    if !content.is_empty() {
                        accumulated.push_str(content);
                        let _ = event_sender.send(content.to_string()).await;
                    }
                }

                // Final message has done: true with token counts
                if chunk["done"].as_bool().unwrap_or(false) {
                    input_tokens = chunk["prompt_eval_count"].as_u64().unwrap_or(0) as u32;
                    output_tokens = chunk["eval_count"].as_u64().unwrap_or(0) as u32;
                }
            }
        }

        Ok(CompletionResponse {
            content: accumulated,
            model: self.model.clone(),
            usage: TokenUsage {
                input_tokens,
                output_tokens,
            },
            tool_use: None,
        })
    }

    async fn chat_stream(
        &self,
        request: ChatRequest,
        event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        let mut messages: Vec<serde_json::Value> = vec![
            json!({"role": "system", "content": request.system_prompt})
        ];
        for m in &request.messages {
            messages.push(json!({"role": &m.role, "content": &m.content}));
        }

        let body = json!({
            "model": self.model,
            "messages": messages,
            "stream": true
        });

        let resp = self
            .client
            .post(format!("{}/api/chat", self.base_url))
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

        let bytes = resp.bytes().await?;
        let text = String::from_utf8_lossy(&bytes);

        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            if let Ok(chunk) = serde_json::from_str::<Value>(line) {
                if let Some(content) = chunk["message"]["content"].as_str() {
                    if !content.is_empty() {
                        accumulated.push_str(content);
                        let _ = event_sender.send(content.to_string()).await;
                    }
                }

                if chunk["done"].as_bool().unwrap_or(false) {
                    input_tokens = chunk["prompt_eval_count"].as_u64().unwrap_or(0) as u32;
                    output_tokens = chunk["eval_count"].as_u64().unwrap_or(0) as u32;
                }
            }
        }

        Ok(CompletionResponse {
            content: accumulated,
            model: self.model.clone(),
            usage: TokenUsage {
                input_tokens,
                output_tokens,
            },
            tool_use: None,
        })
    }

    async fn test_connection(&self) -> Result<bool, AiError> {
        // 2-second timeout to avoid hanging when Ollama is not running
        let client = Client::builder()
            .timeout(Duration::from_secs(2))
            .build()
            .map_err(AiError::Http)?;

        let resp = client
            .get(format!("{}/api/tags", self.base_url))
            .send()
            .await;

        match resp {
            Ok(r) => Ok(r.status().is_success()),
            Err(e) => {
                if e.is_timeout() || e.is_connect() {
                    Ok(false)
                } else {
                    Err(AiError::Http(e))
                }
            }
        }
    }

    async fn list_models(&self) -> Result<Vec<ModelInfo>, AiError> {
        let resp = self
            .client
            .get(format!("{}/api/tags", self.base_url))
            .timeout(Duration::from_secs(2))
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
        let models = json["models"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|m| {
                let name = m["name"].as_str()?;
                Some(ModelInfo {
                    id: name.to_string(),
                    name: name.to_string(),
                })
            })
            .collect();

        Ok(models)
    }
}
