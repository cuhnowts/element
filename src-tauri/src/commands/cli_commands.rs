use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command as TokioCommand;

#[tauri::command]
pub async fn run_cli_tool(
    command: String,
    args: Vec<String>,
    working_dir: Option<String>,
    app: AppHandle,
) -> Result<i32, String> {
    let mut cmd = TokioCommand::new(&command);
    cmd.args(&args);
    if let Some(dir) = &working_dir {
        cmd.current_dir(dir);
    }
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn {}: {}", command, e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let app_clone = app.clone();

    // Stream stdout
    if let Some(stdout) = stdout {
        let app_out = app_clone.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_out.emit(
                    "cli-output",
                    serde_json::json!({
                        "stream": "stdout",
                        "line": line,
                    }),
                );
            }
        });
    }

    // Stream stderr
    if let Some(stderr) = stderr {
        let app_err = app_clone.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = app_err.emit(
                    "cli-output",
                    serde_json::json!({
                        "stream": "stderr",
                        "line": line,
                    }),
                );
            }
        });
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Process error: {}", e))?;
    let code = status.code().unwrap_or(-1);

    let _ = app.emit(
        "cli-complete",
        serde_json::json!({
            "exitCode": code,
        }),
    );

    Ok(code)
}

/// Write a file inside the app data directory. Creates parent dirs as needed.
/// `relative_path` is joined to the app data dir (e.g. "agent/mcp-config.json").
/// Returns the absolute path written.
#[tauri::command]
pub fn write_agent_file(
    relative_path: String,
    contents: String,
    app: AppHandle,
) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let full_path = data_dir.join(&relative_path);

    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(&full_path, &contents).map_err(|e| e.to_string())?;

    full_path
        .to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Path contains invalid UTF-8".to_string())
}

/// Resolve the MCP server script path. In dev mode, uses the source tree.
/// In production, uses the Tauri resource bundle.
#[tauri::command]
pub fn resolve_mcp_server_path(app: AppHandle) -> Result<String, String> {
    // Try Tauri resource resolution first (production builds)
    if let Ok(resource_path) = app.path().resolve("mcp-server/dist/index.js", tauri::path::BaseDirectory::Resource) {
        if resource_path.exists() {
            return resource_path
                .to_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "Path contains invalid UTF-8".to_string());
        }
    }

    // Dev mode fallback: walk up from the executable to find the project root
    if let Ok(exe) = std::env::current_exe() {
        // In dev, exe is at src-tauri/target/debug/element
        // Project root is 3 levels up, then mcp-server/dist/index.js
        let mut dir = exe.parent().map(|p| p.to_path_buf());
        for _ in 0..5 {
            if let Some(ref d) = dir {
                let candidate = d.join("mcp-server/dist/index.js");
                if candidate.exists() {
                    return candidate
                        .to_str()
                        .map(|s| s.to_string())
                        .ok_or_else(|| "Path contains invalid UTF-8".to_string());
                }
                dir = d.parent().map(|p| p.to_path_buf());
            }
        }
    }

    Err("MCP server not found. Run 'npm run build:mcp' in the mcp-server directory.".to_string())
}
