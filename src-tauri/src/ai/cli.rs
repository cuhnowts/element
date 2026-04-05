use async_trait::async_trait;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;

use crate::ai::provider::AiProvider;
use crate::ai::types::{
    AiError, ChatRequest, CompletionRequest, CompletionResponse, ModelInfo, ProviderType,
    TokenUsage,
};

/// AI provider that delegates to an external CLI tool (e.g., `claude --print`).
///
/// Reads the `cli_command` app setting and spawns it as a subprocess,
/// piping the prompt via stdin and streaming stdout back as chunks.
pub struct CliProvider {
    command: String,
}

impl CliProvider {
    pub fn new(command: String) -> Self {
        Self { command }
    }

    /// Build the full prompt string from a system prompt and user message.
    fn build_prompt(system_prompt: &str, user_message: &str) -> String {
        format!("<system>\n{}\n</system>\n\n{}", system_prompt, user_message)
    }

    /// Build the full prompt string from a system prompt and chat messages.
    fn build_chat_prompt(
        system_prompt: &str,
        messages: &[crate::ai::types::ChatMessage],
    ) -> String {
        let mut prompt = format!("<system>\n{}\n</system>\n\n", system_prompt);
        for msg in messages {
            match msg.role.as_str() {
                "user" => {
                    prompt.push_str(&format!("User: {}\n\n", msg.content));
                }
                "assistant" => {
                    prompt.push_str(&format!("Assistant: {}\n\n", msg.content));
                }
                _ => {
                    prompt.push_str(&format!("{}: {}\n\n", msg.role, msg.content));
                }
            }
        }
        prompt
    }

    /// Spawn the CLI tool and stream its output.
    async fn run_cli(
        &self,
        prompt: String,
        event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        // Parse command into program + args
        // Support formats like "claude" or "claude --print" or "/usr/local/bin/claude"
        let parts: Vec<&str> = self.command.split_whitespace().collect();
        if parts.is_empty() {
            return Err(AiError::Parse("CLI command is empty".to_string()));
        }

        let program = parts[0];
        let mut cmd = TokioCommand::new(program);

        // Add any args from the command string (e.g., --print)
        for arg in &parts[1..] {
            cmd.arg(arg);
        }

        // Always add --print for non-interactive mode if not already present
        if !parts.contains(&"--print") && !parts.contains(&"-p") {
            cmd.arg("--print");
        }

        // Pass the prompt as the final argument
        cmd.arg(&prompt);

        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| {
            AiError::Parse(format!(
                "Failed to spawn CLI tool '{}': {}",
                self.command, e
            ))
        })?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| AiError::Parse("Failed to capture stdout".to_string()))?;

        let mut reader = BufReader::new(stdout);
        let mut full_content = String::new();
        let mut line = String::new();

        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) => break, // EOF
                Ok(_) => {
                    full_content.push_str(&line);
                    // Send each line as a streaming chunk
                    let _ = event_sender.send(line.clone()).await;
                }
                Err(e) => {
                    return Err(AiError::Parse(format!("Error reading CLI output: {}", e)));
                }
            }
        }

        // Wait for the process to finish
        let status = child
            .wait()
            .await
            .map_err(|e| AiError::Parse(format!("CLI process error: {}", e)))?;

        if !status.success() {
            let code = status.code().unwrap_or(-1);
            return Err(AiError::Api {
                status: code as u16,
                message: format!("CLI tool exited with code {}", code),
            });
        }

        Ok(CompletionResponse {
            content: full_content.trim().to_string(),
            model: self.command.clone(),
            usage: TokenUsage {
                input_tokens: 0,
                output_tokens: 0,
            },
            tool_use: None,
        })
    }
}

#[async_trait]
impl AiProvider for CliProvider {
    fn name(&self) -> &str {
        "cli"
    }

    fn provider_type(&self) -> ProviderType {
        // Reuse Ollama as the closest match (local, no API key)
        ProviderType::Ollama
    }

    async fn complete(&self, request: CompletionRequest) -> Result<CompletionResponse, AiError> {
        let prompt = Self::build_prompt(&request.system_prompt, &request.user_message);
        let (tx, mut _rx) = tokio::sync::mpsc::channel::<String>(32);
        // Drain receiver in background
        let drain = tokio::spawn(async move { while _rx.recv().await.is_some() {} });
        let result = self.run_cli(prompt, tx).await;
        let _ = drain.await;
        result
    }

    async fn complete_stream(
        &self,
        request: CompletionRequest,
        event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        let prompt = Self::build_prompt(&request.system_prompt, &request.user_message);
        self.run_cli(prompt, event_sender).await
    }

    async fn chat_stream(
        &self,
        request: ChatRequest,
        event_sender: tokio::sync::mpsc::Sender<String>,
    ) -> Result<CompletionResponse, AiError> {
        let prompt = Self::build_chat_prompt(&request.system_prompt, &request.messages);
        self.run_cli(prompt, event_sender).await
    }

    async fn test_connection(&self) -> Result<bool, AiError> {
        // Just check if the command exists
        let parts: Vec<&str> = self.command.split_whitespace().collect();
        if parts.is_empty() {
            return Ok(false);
        }
        match TokioCommand::new(parts[0]).arg("--version").output().await {
            Ok(output) => Ok(output.status.success()),
            Err(_) => Ok(false),
        }
    }

    async fn list_models(&self) -> Result<Vec<ModelInfo>, AiError> {
        Ok(vec![ModelInfo {
            id: self.command.clone(),
            name: format!("CLI: {}", self.command),
        }])
    }
}
