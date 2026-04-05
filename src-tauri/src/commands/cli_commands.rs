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
