use async_trait::async_trait;
use reqwest::Client;
use serde_json::{json, Value};

use crate::ai::provider::AiProvider;
use crate::ai::types::{
    AiError, ChatRequest, CompletionRequest, CompletionResponse, ModelInfo, ProviderType,
    TokenUsage, ToolUseBlock,
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

    /// Parse tool_use blocks from Anthropic's content array in non-streaming responses.
    fn parse_tool_use_from_content(json: &Value) -> Vec<ToolUseBlock> {
        let mut blocks = Vec::new();
        if let Some(content_arr) = json["content"].as_array() {
            for block in content_arr {
                if block["type"].as_str() == Some("tool_use") {
                    if let (Some(id), Some(name)) =
                        (block["id"].as_str(), block["name"].as_str())
                    {
                        blocks.push(ToolUseBlock {
                            id: id.to_string(),
                            name: name.to_string(),
                            input: block["input"].clone(),
                        });
                    }
                }
            }
        }
        blocks
    }

    /// Build the request body, conditionally including tools and tool_results.
    fn build_request_body(
        &self,
        request: &CompletionRequest,
        stream: bool,
    ) -> Value {
        let mut messages = Vec::new();

        // If tool_results are present, we need a multi-turn conversation:
        // first the user message, then tool_result blocks
        if let Some(ref tool_results) = request.tool_results {
            if !tool_results.is_empty() {
                // The user_message contains the previous assistant response context
                messages.push(json!({"role": "user", "content": request.user_message}));

                // Add tool results as user messages with tool_result content blocks
                let mut result_blocks = Vec::new();
                for tr in tool_results {
                    result_blocks.push(json!({
                        "type": "tool_result",
                        "tool_use_id": tr.tool_use_id,
                        "content": tr.content,
                    }));
                }
                messages.push(json!({"role": "user", "content": result_blocks}));
            } else {
                messages.push(json!({"role": "user", "content": request.user_message}));
            }
        } else {
            messages.push(json!({"role": "user", "content": request.user_message}));
        }

        let mut body = json!({
            "model": self.model,
            "max_tokens": request.max_tokens,
            "system": request.system_prompt,
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
                            "name": t.name,
                            "description": t.description,
                            "input_schema": t.input_schema,
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
impl AiProvider for AnthropicProvider {
    fn name(&self) -> &str {
        "Anthropic"
    }

    fn provider_type(&self) -> ProviderType {
        ProviderType::Anthropic
    }

    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, AiError> {
        let body = self.build_request_body(&request, false);

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

        // Extract text content (first text block)
        let content = json["content"]
            .as_array()
            .and_then(|arr| {
                arr.iter()
                    .find(|b| b["type"].as_str() == Some("text"))
                    .and_then(|b| b["text"].as_str())
            })
            .unwrap_or("")
            .to_string();

        let input_tokens = json["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32;
        let output_tokens = json["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32;

        let tool_use_blocks = Self::parse_tool_use_from_content(&json);

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
        let mut tool_use_blocks: Vec<ToolUseBlock> = Vec::new();

        // Tool_use streaming state
        let mut current_tool_id: Option<String> = None;
        let mut current_tool_name: Option<String> = None;
        let mut current_tool_input_json = String::new();

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
                    "content_block_start" => {
                        let block_type = chunk["content_block"]["type"].as_str().unwrap_or("");
                        if block_type == "tool_use" {
                            current_tool_id = chunk["content_block"]["id"]
                                .as_str()
                                .map(|s| s.to_string());
                            current_tool_name = chunk["content_block"]["name"]
                                .as_str()
                                .map(|s| s.to_string());
                            current_tool_input_json.clear();
                        }
                    }
                    "content_block_delta" => {
                        let delta_type = chunk["delta"]["type"].as_str().unwrap_or("");
                        if delta_type == "text_delta" {
                            if let Some(text) = chunk["delta"]["text"].as_str() {
                                accumulated.push_str(text);
                                let _ = event_sender.send(text.to_string()).await;
                            }
                        } else if delta_type == "input_json_delta" {
                            if let Some(partial) = chunk["delta"]["partial_json"].as_str() {
                                current_tool_input_json.push_str(partial);
                            }
                        }
                    }
                    "content_block_stop" => {
                        // If we were accumulating a tool_use block, finalize it
                        if let (Some(id), Some(name)) =
                            (current_tool_id.take(), current_tool_name.take())
                        {
                            let input: Value =
                                serde_json::from_str(&current_tool_input_json)
                                    .unwrap_or(json!({}));
                            current_tool_input_json.clear();

                            let block = ToolUseBlock {
                                id: id.clone(),
                                name: name.clone(),
                                input: input.clone(),
                            };
                            tool_use_blocks.push(block);

                            // Send tool_use event to frontend
                            let tool_event = json!({
                                "type": "tool_use",
                                "id": id,
                                "name": name,
                                "input": input,
                            });
                            let _ = event_sender
                                .send(tool_event.to_string())
                                .await;
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
        // Anthropic: system is top-level, NOT in messages array
        let messages: Vec<serde_json::Value> = request
            .messages
            .iter()
            .filter(|m| m.role != "system")
            .map(|m| json!({"role": &m.role, "content": &m.content}))
            .collect();

        let mut body = json!({
            "model": self.model,
            "max_tokens": request.max_tokens,
            "system": request.system_prompt,
            "stream": true,
            "messages": messages
        });

        // Include tools if provided
        if let Some(ref tools) = request.tools {
            if !tools.is_empty() {
                let tools_json: Vec<Value> = tools
                    .iter()
                    .map(|t| {
                        json!({
                            "name": t.name,
                            "description": t.description,
                            "input_schema": t.input_schema,
                        })
                    })
                    .collect();
                body["tools"] = json!(tools_json);
            }
        }

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
        let mut tool_use_blocks: Vec<ToolUseBlock> = Vec::new();

        // Tool_use streaming state
        let mut current_tool_id: Option<String> = None;
        let mut current_tool_name: Option<String> = None;
        let mut current_tool_input_json = String::new();

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
                    "content_block_start" => {
                        let block_type =
                            chunk["content_block"]["type"].as_str().unwrap_or("");
                        if block_type == "tool_use" {
                            current_tool_id = chunk["content_block"]["id"]
                                .as_str()
                                .map(|s| s.to_string());
                            current_tool_name = chunk["content_block"]["name"]
                                .as_str()
                                .map(|s| s.to_string());
                            current_tool_input_json.clear();
                        }
                    }
                    "content_block_delta" => {
                        let delta_type = chunk["delta"]["type"].as_str().unwrap_or("");
                        if delta_type == "text_delta" {
                            if let Some(text) = chunk["delta"]["text"].as_str() {
                                accumulated.push_str(text);
                                let _ = event_sender.send(text.to_string()).await;
                            }
                        } else if delta_type == "input_json_delta" {
                            if let Some(partial) =
                                chunk["delta"]["partial_json"].as_str()
                            {
                                current_tool_input_json.push_str(partial);
                            }
                        }
                    }
                    "content_block_stop" => {
                        if let (Some(id), Some(name)) =
                            (current_tool_id.take(), current_tool_name.take())
                        {
                            let input: Value =
                                serde_json::from_str(&current_tool_input_json)
                                    .unwrap_or(json!({}));
                            current_tool_input_json.clear();

                            let block = ToolUseBlock {
                                id: id.clone(),
                                name: name.clone(),
                                input: input.clone(),
                            };
                            tool_use_blocks.push(block);

                            let tool_event = json!({
                                "type": "tool_use",
                                "id": id,
                                "name": name,
                                "input": input,
                            });
                            let _ = event_sender
                                .send(tool_event.to_string())
                                .await;
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
            tool_use: if tool_use_blocks.is_empty() {
                None
            } else {
                Some(tool_use_blocks)
            },
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
