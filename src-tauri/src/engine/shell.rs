use std::process::Stdio;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

use super::executor::{Document, DocumentMeta, EngineError};

const DEFAULT_TIMEOUT_MS: u64 = 30_000;
const MAX_OUTPUT_BYTES: usize = 1_048_576; // 1MB

pub async fn execute_shell(
    command: &str,
    working_dir: Option<&str>,
    timeout_ms: Option<u64>,
    stdin_input: Option<&str>,
) -> Result<Document, EngineError> {
    let timeout = timeout_ms.unwrap_or(DEFAULT_TIMEOUT_MS);

    let mut cmd = Command::new("sh");
    cmd.arg("-c").arg(command);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    if let Some(dir) = working_dir {
        cmd.current_dir(dir);
    }

    if stdin_input.is_some() {
        cmd.stdin(Stdio::piped());
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| EngineError::SpawnFailed(e.to_string()))?;

    // Write stdin if provided
    if let Some(input) = stdin_input {
        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(input.as_bytes())
                .await
                .map_err(|e| EngineError::SpawnFailed(format!("Failed to write stdin: {}", e)))?;
            // Drop stdin to signal EOF
            drop(stdin);
        }
    }

    let output = tokio::time::timeout(
        std::time::Duration::from_millis(timeout),
        child.wait_with_output(),
    )
    .await
    .map_err(|_| EngineError::Timeout(timeout))?
    .map_err(|e| EngineError::SpawnFailed(e.to_string()))?;

    let exit_code = output.status.code();
    let mut stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Err(EngineError::StepFailed {
            exit_code,
            stdout,
            stderr,
        });
    }

    // Truncate output at 1MB
    if stdout.len() > MAX_OUTPUT_BYTES {
        stdout.truncate(MAX_OUTPUT_BYTES);
        stdout.push_str("\n[output truncated at 1MB]");
    }

    Ok(Document {
        content: stdout,
        content_type: "text/plain".to_string(),
        metadata: DocumentMeta {
            step_name: String::new(),
            timestamp: String::new(),
            exit_code,
            status_code: None,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_shell_echo() {
        let result = execute_shell("echo hello", None, None, None).await;
        assert!(result.is_ok());
        let doc = result.unwrap();
        assert!(doc.content.contains("hello"));
        assert_eq!(doc.content_type, "text/plain");
        assert_eq!(doc.metadata.exit_code, Some(0));
    }

    #[tokio::test]
    async fn test_shell_exit_code() {
        let result = execute_shell("exit 1", None, None, None).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            EngineError::StepFailed { exit_code, .. } => {
                assert_eq!(exit_code, Some(1));
            }
            other => panic!("Expected StepFailed, got: {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_shell_stdin_pipe() {
        let result = execute_shell("cat", None, None, Some("piped data")).await;
        assert!(result.is_ok());
        let doc = result.unwrap();
        assert_eq!(doc.content, "piped data");
    }

    #[tokio::test]
    async fn test_shell_timeout() {
        let result = execute_shell("sleep 10", None, Some(100), None).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            EngineError::Timeout(ms) => assert_eq!(ms, 100),
            other => panic!("Expected Timeout, got: {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_shell_working_dir() {
        let result = execute_shell("pwd", Some("/tmp"), None, None).await;
        assert!(result.is_ok());
        let doc = result.unwrap();
        // macOS /tmp is a symlink to /private/tmp
        assert!(
            doc.content.contains("/tmp") || doc.content.contains("/private/tmp"),
            "Expected /tmp in output, got: {}",
            doc.content
        );
    }

    #[tokio::test]
    async fn test_shell_stderr_on_failure() {
        let result = execute_shell("echo error >&2 && exit 2", None, None, None).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            EngineError::StepFailed {
                exit_code, stderr, ..
            } => {
                assert_eq!(exit_code, Some(2));
                assert!(stderr.contains("error"));
            }
            other => panic!("Expected StepFailed, got: {:?}", other),
        }
    }
}
