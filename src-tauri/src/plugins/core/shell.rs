use serde::{Deserialize, Serialize};
use std::time::Duration;

use crate::plugins::manifest::PluginError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShellStepInput {
    pub command: String,
    pub working_directory: Option<String>,
    pub timeout_seconds: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ShellStepOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub timed_out: bool,
}

pub struct ShellPlugin;

impl ShellPlugin {
    pub async fn execute(input: ShellStepInput) -> Result<ShellStepOutput, PluginError> {
        let timeout_secs = input.timeout_seconds.unwrap_or(30);

        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = tokio::process::Command::new("cmd");
            c.arg("/C").arg(&input.command);
            c
        } else {
            let mut c = tokio::process::Command::new("sh");
            c.arg("-c").arg(&input.command);
            c
        };

        if let Some(ref cwd) = input.working_directory {
            cmd.current_dir(cwd);
        }

        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());

        let child = cmd
            .spawn()
            .map_err(|e| PluginError::LoadError(format!("Failed to spawn process: {}", e)))?;

        match tokio::time::timeout(Duration::from_secs(timeout_secs), child.wait_with_output())
            .await
        {
            Ok(Ok(output)) => {
                let exit_code = output.status.code().unwrap_or(-1);
                Ok(ShellStepOutput {
                    stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                    stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                    exit_code,
                    timed_out: false,
                })
            }
            Ok(Err(e)) => Err(PluginError::LoadError(format!(
                "Process execution failed: {}",
                e
            ))),
            Err(_) => {
                // Timeout occurred
                Ok(ShellStepOutput {
                    stdout: String::new(),
                    stderr: "Process timed out".to_string(),
                    exit_code: -1,
                    timed_out: true,
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_shell_execute_echo() {
        let input = ShellStepInput {
            command: "echo hello".to_string(),
            working_directory: None,
            timeout_seconds: None,
        };
        let output = ShellPlugin::execute(input).await.unwrap();
        assert_eq!(output.stdout.trim(), "hello");
        assert_eq!(output.exit_code, 0);
        assert!(!output.timed_out);
    }

    #[tokio::test]
    async fn test_shell_invalid_command() {
        let input = ShellStepInput {
            command: "nonexistent_command_xyz_123".to_string(),
            working_directory: None,
            timeout_seconds: None,
        };
        let output = ShellPlugin::execute(input).await.unwrap();
        assert_ne!(output.exit_code, 0);
        assert!(!output.stderr.is_empty());
    }

    #[tokio::test]
    async fn test_shell_timeout() {
        let input = ShellStepInput {
            command: "sleep 5".to_string(),
            working_directory: None,
            timeout_seconds: Some(1),
        };
        let output = ShellPlugin::execute(input).await.unwrap();
        assert!(output.timed_out);
    }

    #[tokio::test]
    async fn test_shell_working_directory() {
        let dir = tempfile::tempdir().unwrap();
        let input = ShellStepInput {
            command: "pwd".to_string(),
            working_directory: Some(dir.path().to_string_lossy().to_string()),
            timeout_seconds: None,
        };
        let output = ShellPlugin::execute(input).await.unwrap();
        assert_eq!(output.exit_code, 0);
        // Canonicalize both paths for comparison (macOS /private/var vs /var)
        let expected = std::fs::canonicalize(dir.path()).unwrap();
        let actual = std::fs::canonicalize(output.stdout.trim()).unwrap();
        assert_eq!(actual, expected);
    }
}
