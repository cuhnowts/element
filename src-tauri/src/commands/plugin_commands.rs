use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::plugins::core::filesystem::{FilesystemPlugin, FsStepInput};
use crate::plugins::core::http::{HttpPlugin, HttpStepInput};
use crate::plugins::core::shell::{ShellPlugin, ShellStepInput};
use crate::plugins::manifest::PluginCapability;
use crate::plugins::registry::{LoadedPlugin, PluginStatus};
use crate::plugins::{PluginHost, PluginSkillInfo};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PluginInfo {
    pub name: String,
    pub display_name: String,
    pub version: String,
    pub description: String,
    pub author: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub capabilities: Vec<String>,
    pub enabled: bool,
    pub step_types: Vec<StepTypeInfo>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StepTypeInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
    pub output_schema: serde_json::Value,
}

impl From<&LoadedPlugin> for PluginInfo {
    fn from(p: &LoadedPlugin) -> Self {
        let status_str = match &p.status {
            PluginStatus::Active => "active",
            PluginStatus::Error => "error",
            PluginStatus::Disabled => "disabled",
            PluginStatus::Loading => "loading",
        };

        let enabled = !matches!(p.status, PluginStatus::Disabled);

        let capabilities: Vec<String> = p
            .manifest
            .capabilities
            .iter()
            .map(|c| match c {
                PluginCapability::Network => "network".to_string(),
                PluginCapability::FsRead => "fs:read".to_string(),
                PluginCapability::FsWrite => "fs:write".to_string(),
                PluginCapability::Credentials => "credentials".to_string(),
                PluginCapability::Shell => "shell".to_string(),
            })
            .collect();

        let step_types: Vec<StepTypeInfo> = p
            .manifest
            .step_types
            .iter()
            .map(|s| StepTypeInfo {
                id: s.id.clone(),
                name: s.name.clone(),
                description: s.description.clone(),
                input_schema: s.input_schema.clone(),
                output_schema: s.output_schema.clone(),
            })
            .collect();

        PluginInfo {
            name: p.manifest.name.clone(),
            display_name: p.manifest.display_name.clone(),
            version: p.manifest.version.clone(),
            description: p.manifest.description.clone(),
            author: p.manifest.author.clone(),
            status: status_str.to_string(),
            error_message: p.error_message.clone(),
            capabilities,
            enabled,
            step_types,
        }
    }
}

#[tauri::command]
pub async fn list_plugins(
    state: State<'_, std::sync::Mutex<PluginHost>>,
) -> Result<Vec<PluginInfo>, String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    let plugins = host.list_plugins();
    Ok(plugins.iter().map(PluginInfo::from).collect())
}

#[tauri::command]
pub async fn get_plugin(
    state: State<'_, std::sync::Mutex<PluginHost>>,
    name: String,
) -> Result<PluginInfo, String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    host.get_plugin(&name)
        .map(|p| PluginInfo::from(&p))
        .ok_or_else(|| format!("Plugin not found: {}", name))
}

#[tauri::command]
pub async fn enable_plugin(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<PluginHost>>,
    name: String,
) -> Result<(), String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    host.set_enabled(&name, true).map_err(|e| e.to_string())?;
    app.emit("plugin-updated", &name)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn disable_plugin(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<PluginHost>>,
    name: String,
) -> Result<(), String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    host.set_enabled(&name, false).map_err(|e| e.to_string())?;
    app.emit("plugin-updated", &name)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reload_plugin(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<PluginHost>>,
    name: String,
) -> Result<PluginInfo, String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    // Re-scan to pick up changes
    host.scan_and_load();
    let plugin = host
        .get_plugin(&name)
        .map(|p| PluginInfo::from(&p))
        .ok_or_else(|| format!("Plugin not found after reload: {}", name))?;
    app.emit("plugin-reloaded", &name)
        .map_err(|e| e.to_string())?;
    Ok(plugin)
}

#[tauri::command]
pub async fn scan_plugins(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<PluginHost>>,
) -> Result<Vec<PluginInfo>, String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    host.scan_and_load();
    let plugins: Vec<PluginInfo> = host.list_plugins().iter().map(PluginInfo::from).collect();
    app.emit("plugins-scanned", &plugins)
        .map_err(|e| e.to_string())?;
    Ok(plugins)
}

#[tauri::command]
pub async fn open_plugins_directory(
    state: State<'_, std::sync::Mutex<PluginHost>>,
) -> Result<String, String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    Ok(host.plugins_dir().to_string_lossy().to_string())
}

#[tauri::command]
pub async fn dispatch_plugin_skill(
    state: State<'_, std::sync::Mutex<PluginHost>>,
    skill_name: String,
    input: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    host.dispatch_skill(&skill_name, input)
}

#[tauri::command]
pub async fn list_plugin_skills(
    state: State<'_, std::sync::Mutex<PluginHost>>,
) -> Result<Vec<PluginSkillInfo>, String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    Ok(host.list_skills())
}

#[tauri::command]
pub async fn purge_plugin_directory(
    state: State<'_, std::sync::Mutex<PluginHost>>,
    plugin_name: String,
    directory_path: String,
) -> Result<(), String> {
    let host = state.lock().map_err(|e| e.to_string())?;
    host.purge_directory(&plugin_name, &directory_path)
}

#[tauri::command]
pub async fn execute_step(
    step_type_id: String,
    input: serde_json::Value,
) -> Result<serde_json::Value, String> {
    match step_type_id.as_str() {
        "shell-command" => {
            let shell_input: ShellStepInput =
                serde_json::from_value(input).map_err(|e| format!("Invalid shell input: {}", e))?;
            let output = ShellPlugin::execute(shell_input)
                .await
                .map_err(|e| e.to_string())?;
            serde_json::to_value(output).map_err(|e| e.to_string())
        }
        "http-request" => {
            let http_input: HttpStepInput =
                serde_json::from_value(input).map_err(|e| format!("Invalid HTTP input: {}", e))?;
            let output = HttpPlugin::execute(http_input)
                .await
                .map_err(|e| e.to_string())?;
            serde_json::to_value(output).map_err(|e| e.to_string())
        }
        "file-operation" => {
            let fs_input: FsStepInput =
                serde_json::from_value(input).map_err(|e| format!("Invalid FS input: {}", e))?;
            // Scope filesystem operations to current working directory
            let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            let plugin = FilesystemPlugin::new(vec![cwd]);
            let output = plugin.execute(fs_input).await.map_err(|e| e.to_string())?;
            serde_json::to_value(output).map_err(|e| e.to_string())
        }
        _ => Err(format!("Unknown step type: {}", step_type_id)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_execute_step_shell() {
        let input = serde_json::json!({
            "command": "echo test_output"
        });
        let result = execute_step("shell-command".to_string(), input)
            .await
            .unwrap();
        assert_eq!(result["exit_code"], 0);
        assert!(result["stdout"].as_str().unwrap().contains("test_output"));
    }

    #[tokio::test]
    async fn test_execute_step_unknown_type() {
        let input = serde_json::json!({});
        let result = execute_step("unknown-type".to_string(), input).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("Unknown step type: unknown-type"));
    }

    #[test]
    fn test_plugin_info_serialization_camel_case() {
        let info = PluginInfo {
            name: "test".to_string(),
            display_name: "Test Plugin".to_string(),
            version: "1.0.0".to_string(),
            description: "A test".to_string(),
            author: None,
            status: "active".to_string(),
            error_message: None,
            capabilities: vec!["network".to_string()],
            enabled: true,
            step_types: vec![],
        };

        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"displayName\""));
        assert!(json.contains("\"errorMessage\""));
        assert!(json.contains("\"stepTypes\""));
        // Should NOT contain snake_case
        assert!(!json.contains("display_name"));
        assert!(!json.contains("error_message"));
        assert!(!json.contains("step_types"));
    }

    #[test]
    fn test_step_type_info_serialization() {
        let info = StepTypeInfo {
            id: "my-step".to_string(),
            name: "My Step".to_string(),
            description: "Does stuff".to_string(),
            input_schema: serde_json::json!({"type": "object"}),
            output_schema: serde_json::json!({}),
        };

        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"inputSchema\""));
        assert!(json.contains("\"outputSchema\""));
    }

    #[test]
    fn test_plugin_info_from_loaded_plugin() {
        use crate::plugins::manifest::PluginManifest;
        use std::path::PathBuf;

        let loaded = LoadedPlugin {
            manifest: PluginManifest {
                name: "test-plugin".to_string(),
                version: "2.0.0".to_string(),
                display_name: "Test Plugin".to_string(),
                description: "Description".to_string(),
                author: Some("Author".to_string()),
                capabilities: vec![PluginCapability::Network, PluginCapability::Shell],
                credentials: vec!["api-key".to_string()],
                entry: Some("main.js".to_string()),
                step_types: vec![],
                manifest_version: None,
                skills: vec![],
                mcp_tools: vec![],
                owned_directories: vec![],
                on_enable: vec![],
                on_disable: vec![],
            },
            status: PluginStatus::Active,
            error_message: None,
            loaded_at: "2026-01-01T00:00:00Z".to_string(),
            plugin_path: PathBuf::from("/plugins/test-plugin"),
        };

        let info = PluginInfo::from(&loaded);
        assert_eq!(info.name, "test-plugin");
        assert_eq!(info.version, "2.0.0");
        assert_eq!(info.status, "active");
        assert!(info.enabled);
        assert_eq!(info.capabilities, vec!["network", "shell"]);
    }
}
