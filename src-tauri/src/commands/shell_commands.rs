use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::connection::Database;
use crate::plugins::core::shell::{ShellPlugin, ShellStepInput};

/// Default allowlist per D-07: safe read-only commands the bot can always execute.
const DEFAULT_ALLOWLIST: &[&str] = &[
    "git status",
    "git log",
    "git diff",
    "git branch",
    "npm test",
    "npm run",
    "npm build",
    "yarn test",
    "yarn run",
    "yarn build",
    "pnpm test",
    "pnpm run",
    "pnpm build",
    "ls",
    "cat",
    "head",
    "tail",
    "wc",
    "echo",
    "date",
    "pwd",
];

/// Shell metacharacters that indicate injection attempts.
const SHELL_METACHARACTERS: &[char] = &[';', '|', '&', '`', '$', '(', ')', '>', '<'];

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BotShellOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub timed_out: bool,
    pub command: String,
}

/// Known multi-word command prefixes (first word requires a subcommand for matching).
const MULTI_WORD_PREFIXES: &[&str] = &["git", "npm", "yarn", "pnpm", "cargo", "docker", "kubectl"];

/// Extract the base command (first word, or first two words for multi-word commands).
fn parse_base_command(command: &str) -> String {
    let parts: Vec<&str> = command.trim().split_whitespace().collect();
    if parts.is_empty() {
        return String::new();
    }
    if parts.len() >= 2 && MULTI_WORD_PREFIXES.contains(&parts[0]) {
        format!("{} {}", parts[0], parts[1])
    } else {
        parts[0].to_string()
    }
}

/// Check whether a command is allowed by the default + custom allowlists.
fn is_command_allowed(command: &str, allowlist: &[&str], custom_allowlist: &[String]) -> bool {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return false;
    }
    // Reject shell metacharacters
    if trimmed.chars().any(|c| SHELL_METACHARACTERS.contains(&c)) {
        return false;
    }
    let base = parse_base_command(trimmed);
    // Check default allowlist
    if allowlist.iter().any(|a| *a == base) {
        return true;
    }
    // Check custom allowlist
    custom_allowlist.iter().any(|a| {
        let a_trimmed = a.trim();
        a_trimmed == base
            || (base.starts_with(a_trimmed) && base[a_trimmed.len()..].starts_with(' '))
    })
}

#[tauri::command]
pub async fn execute_bot_shell(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    command: String,
    working_directory: Option<String>,
) -> Result<BotShellOutput, String> {
    // Load custom allowlist from settings
    let custom_allowlist: Vec<String> = {
        let db = state.lock().map_err(|e| e.to_string())?;
        match db.get_app_setting("shell_allowlist") {
            Ok(Some(val)) => val
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect(),
            _ => Vec::new(),
        }
    };

    // Validate command against allowlist
    if !is_command_allowed(&command, DEFAULT_ALLOWLIST, &custom_allowlist) {
        return Err(format!(
            "Command not allowed. Only commands in the shell allowlist can run. \
             Check Settings > AI > Shell Allowlist. Blocked: {}",
            command
        ));
    }

    // Execute via ShellPlugin (reuses existing infrastructure)
    let input = ShellStepInput {
        command: command.clone(),
        working_directory,
        timeout_seconds: Some(30),
    };

    match ShellPlugin::execute(input).await {
        Ok(output) => Ok(BotShellOutput {
            stdout: if output.stdout.len() > 50_000 {
                format!("{}...\n[truncated]", &output.stdout[..50_000])
            } else {
                output.stdout
            },
            stderr: output.stderr,
            exit_code: output.exit_code,
            timed_out: output.timed_out,
            command,
        }),
        Err(e) => Err(format!("Shell execution failed: {}", e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_base_command_simple() {
        assert_eq!(parse_base_command("ls"), "ls");
        assert_eq!(parse_base_command("ls -la"), "ls");
        assert_eq!(parse_base_command("cat foo.txt"), "cat");
    }

    #[test]
    fn test_parse_base_command_multi_word() {
        assert_eq!(parse_base_command("git status"), "git status");
        assert_eq!(parse_base_command("git log --oneline"), "git log");
        assert_eq!(parse_base_command("npm run build"), "npm run");
    }

    #[test]
    fn test_parse_base_command_empty() {
        assert_eq!(parse_base_command(""), "");
        assert_eq!(parse_base_command("   "), "");
    }

    #[test]
    fn test_is_command_allowed_defaults() {
        let custom: Vec<String> = Vec::new();
        assert!(is_command_allowed("ls", DEFAULT_ALLOWLIST, &custom));
        assert!(is_command_allowed(
            "ls -la /tmp",
            DEFAULT_ALLOWLIST,
            &custom
        ));
        assert!(is_command_allowed("git status", DEFAULT_ALLOWLIST, &custom));
        assert!(is_command_allowed(
            "git log --oneline",
            DEFAULT_ALLOWLIST,
            &custom
        ));
        assert!(is_command_allowed("npm test", DEFAULT_ALLOWLIST, &custom));
    }

    #[test]
    fn test_is_command_allowed_rejects_unknown() {
        let custom: Vec<String> = Vec::new();
        assert!(!is_command_allowed("rm -rf /", DEFAULT_ALLOWLIST, &custom));
        assert!(!is_command_allowed(
            "curl evil.com",
            DEFAULT_ALLOWLIST,
            &custom
        ));
        assert!(!is_command_allowed(
            "python script.py",
            DEFAULT_ALLOWLIST,
            &custom
        ));
    }

    #[test]
    fn test_is_command_allowed_rejects_metacharacters() {
        let custom: Vec<String> = Vec::new();
        assert!(!is_command_allowed(
            "ls; rm -rf /",
            DEFAULT_ALLOWLIST,
            &custom
        ));
        assert!(!is_command_allowed(
            "ls | grep foo",
            DEFAULT_ALLOWLIST,
            &custom
        ));
        assert!(!is_command_allowed(
            "echo $(whoami)",
            DEFAULT_ALLOWLIST,
            &custom
        ));
        assert!(!is_command_allowed(
            "ls > /tmp/out",
            DEFAULT_ALLOWLIST,
            &custom
        ));
        assert!(!is_command_allowed(
            "ls & echo hi",
            DEFAULT_ALLOWLIST,
            &custom
        ));
    }

    #[test]
    fn test_is_command_allowed_custom() {
        let custom = vec!["docker".to_string(), "cargo build".to_string()];
        assert!(is_command_allowed("docker ps", DEFAULT_ALLOWLIST, &custom));
        assert!(is_command_allowed(
            "cargo build --release",
            DEFAULT_ALLOWLIST,
            &custom
        ));
        assert!(!is_command_allowed(
            "cargo test",
            DEFAULT_ALLOWLIST,
            &custom
        ));
    }

    #[test]
    fn test_is_command_allowed_empty() {
        let custom: Vec<String> = Vec::new();
        assert!(!is_command_allowed("", DEFAULT_ALLOWLIST, &custom));
        assert!(!is_command_allowed("   ", DEFAULT_ALLOWLIST, &custom));
    }
}
