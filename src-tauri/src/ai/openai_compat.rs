use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value};

use crate::ai::provider::AiProvider;
use crate::ai::types::{
    AiError, CompletionRequest, CompletionResponse, ModelInfo, ProviderType, TokenUsage,
};

pub struct OpenAiCompatProvider {
    base_url: String,
    api_key: Option<String>,
    model: String,
    client: Client,
}

impl OpenAiCompatProvider {
    pub fn new(base_url: String, api_key: Option<String>, model: String) -> Self {
        Self {
            base_url,
            api_key,
            model,
            client: Client::new(),
        }
    }

    fn build_request(&self, url: &str) -> reqwest::RequestBuilder {
        let mut req = self.client.post(url);
        if let Some(ref key) = self.api_key {
            req = req.header("Authorization", format!("Bearer {}", key));
        }
        req
    }

    fn build_get_request(&self, url: &str) -> reqwest::RequestBuilder {
        let mut req = self.client.get(url);
        if let Some(ref key) = self.api_key {
            req = req.header("Authorization", format!("Bearer {}", key));
        }
        req
    }
}

#[async_trait]
impl AiProvider for OpenAiCompatProvider {
    fn name(&self) -> &str {
        "OpenAI Compatible"
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::OpenaiCompatible
    }

    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, AiError> {
        let body = json!({
            "model": self.model,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "messages": [
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.user_message}
            ]
        });

        let url = format!("{}/v1/chat/completions", self.base_url);
        let resp = self.build_request(&url).json(&body).send().await?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AiError::Api {
                status: status.as_u16(),
                message: text,
            });
        }

        let json: Value = resp.json().await?;

        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let input_tokens = json["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
        let output_tokens = json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;

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
            "temperature": request.temperature,
            "stream": true,
            "messages": [
                {"role": "system", "content": request.system_prompt},
                {"role": "user", "content": request.user_message}
            ]
        });

        let url = format!("{}/v1/chat/completions", self.base_url);
        let resp = self.build_request(&url).json(&body).send().await?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AiError::Api {
                status: status.as_u16(),
                message: text,
            });
        }

        let mut accumulated = String::new();
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
                if let Some(content) = chunk["choices"][0]["delta"]["content"].as_str() {
                    accumulated.push_str(content);
                    let _ = event_sender.send(content.to_string()).await;
                }
            }
        }

        Ok(CompletionResponse {
            content: accumulated,
            model: self.model.clone(),
            usage: TokenUsage {
                input_tokens: 0,
                output_tokens: 0,
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
        let url = format!("{}/v1/models", self.base_url);
        let resp = self.build_get_request(&url).send().await?;

        let status = resp.status();
        if !status.is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AiError::Api {
                status: status.as_u16(),
                message: text,
            });
        }

        let json: Value = resp.json().await?;
        let models = json["data"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|m| {
                let id = m["id"].as_str()?;
                Some(ModelInfo {
                    id: id.to_string(),
                    name: id.to_string(),
                })
            })
            .collect();

        Ok(models)
    }
}
