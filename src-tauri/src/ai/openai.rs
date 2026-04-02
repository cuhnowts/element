use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value};

use crate::ai::provider::AiProvider;
use crate::ai::types::{
    AiError, ChatRequest, CompletionRequest, CompletionResponse, ModelInfo, ProviderType,
    TokenUsage, ToolUseBlock,
};

pub struct OpenAiProvider {
    api_key: String,
    model: String,
    client: Client,
}

impl OpenAiProvider {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            api_key,
            model,
            client: Client::new(),
        }
    }

    /// Parse tool_calls from OpenAI non-streaming response.
    fn parse_tool_calls(json: &Value) -> Vec<ToolUseBlock> {
        let mut blocks = Vec::new();
        if let Some(tool_calls) = json["choices"][0]["message"]["tool_calls"].as_array() {
            for tc in tool_calls {
                if tc["type"].as_str() == Some("function") {
                    let id = tc["id"].as_str().unwrap_or("").to_string();
                    let name = tc["function"]["name"].as_str().unwrap_or("").to_string();
                    let input: Value = tc["function"]["arguments"]
                        .as_str()
                        .and_then(|s| serde_json::from_str(s).ok())
                        .unwrap_or(json!({}));
                    blocks.push(ToolUseBlock { id, name, input });
                }
            }
        }
        blocks
    }

    /// Build request body, conditionally including tools and tool results.
    fn build_request_body(&self, request: &CompletionRequest, stream: bool) -> Value {
        let mut messages = vec![
            json!({"role": "system", "content": request.system_prompt}),
            json!({"role": "user", "content": request.user_message}),
        ];

        // Add tool results as tool-role messages
        if let Some(ref tool_results) = request.tool_results {
            for tr in tool_results {
                messages.push(json!({
                    "role": "tool",
                    "tool_call_id": tr.tool_use_id,
                    "content": tr.content,
                }));
            }
        }

        let mut body = json!({
            "model": self.model,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "messages": messages,
        });

        if stream {
            body["stream"] = json!(true);
        }

        // Add tools if present
        if let Some(ref tools) = request.tools {
            if !tools.is_empty() {
                let tools_json: Vec<Value> = tools
                    .iter()
                    .map(|t| {
                        json!({
                            "type": "function",
                            "function": {
                                "name": t.name,
                                "description": t.description,
                                "parameters": t.input_schema,
                            }
                        })
                    })
                    .collect();
                body["tools"] = json!(tools_json);
            }
        }

        body
    }
}

#[async_trait]
impl AiProvider for OpenAiProvider {
    fn name(&self) -> &str {
        "OpenAI"
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::Openai
    }

    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, AiError> {
        let body = self.build_request_body(&request, false);

        let resp = self
            .client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
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

        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let input_tokens = json["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
        let output_tokens = json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;

        let tool_use_blocks = Self::parse_tool_calls(&json);

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
            tool_use: if tool_use_blocks.is_empty() {
                None
            } else {
                Some(tool_use_blocks)
            },
        })
    }

    async fn complete_stream(
        &self,
        request: CompletionRequest,
        event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        let body = self.build_request_body(&request, true);

        let resp = self
            .client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
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
        let mut tool_use_blocks: Vec<ToolUseBlock> = Vec::new();

        // OpenAI streaming tool_call state
        let mut tool_call_id = String::new();
        let mut tool_call_name = String::new();
        let mut tool_call_args = String::new();
        let mut in_tool_call = false;

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
                let delta = &chunk["choices"][0]["delta"];
                let finish_reason = chunk["choices"][0]["finish_reason"].as_str();

                // Handle text content
                if let Some(content) = delta["content"].as_str() {
                    accumulated.push_str(content);
                    let _ = event_sender.send(content.to_string()).await;
                }

                // Handle tool_calls in streaming
                if let Some(tool_calls) = delta["tool_calls"].as_array() {
                    for tc in tool_calls {
                        // New tool call starting
                        if let Some(id) = tc["id"].as_str() {
                            // If we were already building one, finalize it
                            if in_tool_call && !tool_call_id.is_empty() {
                                let input: Value =
                                    serde_json::from_str(&tool_call_args).unwrap_or(json!({}));
                                let block = ToolUseBlock {
                                    id: tool_call_id.clone(),
                                    name: tool_call_name.clone(),
                                    input: input.clone(),
                                };
                                tool_use_blocks.push(block);

                                let tool_event = json!({
                                    "type": "tool_use",
                                    "id": tool_call_id,
                                    "name": tool_call_name,
                                    "input": input,
                                });
                                let _ = event_sender.send(tool_event.to_string()).await;
                            }
                            tool_call_id = id.to_string();
                            tool_call_name = tc["function"]["name"]
                                .as_str()
                                .unwrap_or("")
                                .to_string();
                            tool_call_args.clear();
                            in_tool_call = true;
                        }

                        // Accumulate arguments
                        if let Some(args) = tc["function"]["arguments"].as_str() {
                            tool_call_args.push_str(args);
                        }
                    }
                }

                // Finalize on finish_reason "tool_calls" or "stop"
                if finish_reason == Some("tool_calls") || finish_reason == Some("stop") {
                    if in_tool_call && !tool_call_id.is_empty() {
                        let input: Value =
                            serde_json::from_str(&tool_call_args).unwrap_or(json!({}));
                        let block = ToolUseBlock {
                            id: tool_call_id.clone(),
                            name: tool_call_name.clone(),
                            input: input.clone(),
                        };
                        tool_use_blocks.push(block);

                        let tool_event = json!({
                            "type": "tool_use",
                            "id": tool_call_id,
                            "name": tool_call_name,
                            "input": input,
                        });
                        let _ = event_sender.send(tool_event.to_string()).await;

                        in_tool_call = false;
                        tool_call_id.clear();
                        tool_call_name.clear();
                        tool_call_args.clear();
                    }
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
            tool_use: if tool_use_blocks.is_empty() {
                None
            } else {
                Some(tool_use_blocks)
            },
        })
    }

    async fn chat_stream(
        &self,
        request: ChatRequest,
        event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        let mut messages: Vec<serde_json::Value> =
            vec![json!({"role": "system", "content": request.system_prompt})];
        for m in &request.messages {
            messages.push(json!({"role": &m.role, "content": &m.content}));
        }

        let body = json!({
            "model": self.model,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "stream": true,
            "messages": messages
        });

        let resp = self
            .client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
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
            tool_use: None,
        })
    }

    async fn test_connection(&self) -> Result<bool, AiError> {
        let request = CompletionRequest {
            system_prompt: String::new(),
            user_message: "hi".to_string(),
            max_tokens: 1,
            temperature: 0.0,
            tools: None,
            tool_results: None,
        };
        self.complete(request).await?;
        Ok(true)
    }

    async fn list_models(&self) -> Result<Vec<ModelInfo>, AiError> {
        let resp = self
            .client
            .get("https://api.openai.com/v1/models")
            .header("Authorization", format!("Bearer {}", self.api_key))
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
        let models = json["data"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|m| {
                let id = m["id"].as_str()?;
                // Filter to chat models
                if id.contains("gpt") || id.contains("o1") || id.contains("o3") {
                    Some(ModelInfo {
                        id: id.to_string(),
                        name: id.to_string(),
                    })
                } else {
                    None
                }
            })
            .collect();

        Ok(models)
    }
}
