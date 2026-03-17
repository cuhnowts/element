pub mod calendar;
pub mod filesystem;
pub mod http;
pub mod shell;

use crate::plugins::manifest::{PluginCapability, PluginManifest, StepTypeDefinition};
use crate::plugins::registry::{LoadedPlugin, PluginRegistry, PluginStatus};
use std::path::PathBuf;

pub fn register_core_plugins(registry: &mut PluginRegistry) {
    // Shell plugin manifest
    let shell_manifest = PluginManifest {
        name: "core-shell".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        display_name: "Shell Command".to_string(),
        description: "Execute shell commands and CLI tools".to_string(),
        author: Some("Element".to_string()),
        capabilities: vec![PluginCapability::Shell],
        credentials: vec![],
        entry: None,
        step_types: vec![StepTypeDefinition {
            id: "shell-command".to_string(),
            name: "Shell Command".to_string(),
            description: "Execute a shell command".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "command": { "type": "string" },
                    "working_directory": { "type": "string" },
                    "timeout_seconds": { "type": "integer" }
                },
                "required": ["command"]
            }),
            output_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "stdout": { "type": "string" },
                    "stderr": { "type": "string" },
                    "exit_code": { "type": "integer" },
                    "timed_out": { "type": "boolean" }
                }
            }),
        }],
    };

    // HTTP plugin manifest
    let http_manifest = PluginManifest {
        name: "core-http".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        display_name: "HTTP Request".to_string(),
        description: "Make HTTP requests to APIs and web services".to_string(),
        author: Some("Element".to_string()),
        capabilities: vec![PluginCapability::Network],
        credentials: vec![],
        entry: None,
        step_types: vec![StepTypeDefinition {
            id: "http-request".to_string(),
            name: "HTTP Request".to_string(),
            description: "Make an HTTP request".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "method": { "type": "string", "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"] },
                    "url": { "type": "string" },
                    "headers": { "type": "object" },
                    "body": { "type": "string" },
                    "auth": { "type": "object" },
                    "timeout_seconds": { "type": "integer" }
                },
                "required": ["method", "url"]
            }),
            output_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "status": { "type": "integer" },
                    "headers": { "type": "object" },
                    "body": { "type": "string" },
                    "elapsed_ms": { "type": "integer" }
                }
            }),
        }],
    };

    // Filesystem plugin manifest
    let fs_manifest = PluginManifest {
        name: "core-filesystem".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        display_name: "File Operation".to_string(),
        description: "Read, write, and list files within scoped paths".to_string(),
        author: Some("Element".to_string()),
        capabilities: vec![PluginCapability::FsRead, PluginCapability::FsWrite],
        credentials: vec![],
        entry: None,
        step_types: vec![StepTypeDefinition {
            id: "file-operation".to_string(),
            name: "File Operation".to_string(),
            description: "Perform a file system operation".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "operation": { "type": "string", "enum": ["read", "write", "list"] },
                    "path": { "type": "string" },
                    "content": { "type": "string" }
                },
                "required": ["operation", "path"]
            }),
            output_schema: serde_json::json!({
                "type": "object",
                "oneOf": [
                    { "properties": { "content": { "type": "string" } } },
                    { "properties": { "path": { "type": "string" }, "bytes_written": { "type": "integer" } } },
                    { "properties": { "entries": { "type": "array" } } }
                ]
            }),
        }],
    };

    let now = chrono::Utc::now().to_rfc3339();

    registry.register(LoadedPlugin {
        manifest: shell_manifest,
        status: PluginStatus::Active,
        error_message: None,
        loaded_at: now.clone(),
        plugin_path: PathBuf::from("core://shell"),
    });

    registry.register(LoadedPlugin {
        manifest: http_manifest,
        status: PluginStatus::Active,
        error_message: None,
        loaded_at: now.clone(),
        plugin_path: PathBuf::from("core://http"),
    });

    registry.register(LoadedPlugin {
        manifest: fs_manifest,
        status: PluginStatus::Active,
        error_message: None,
        loaded_at: now.clone(),
        plugin_path: PathBuf::from("core://filesystem"),
    });

    // Calendar plugin manifest
    let calendar_manifest = PluginManifest {
        name: "core-calendar".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        display_name: "Calendar".to_string(),
        description: "Google and Outlook calendar integration with OAuth and event syncing"
            .to_string(),
        author: Some("Element".to_string()),
        capabilities: vec![PluginCapability::Network, PluginCapability::Credentials],
        credentials: vec![],
        entry: None,
        step_types: vec![StepTypeDefinition {
            id: "calendar-sync".to_string(),
            name: "Calendar Sync".to_string(),
            description: "Sync calendar events from connected accounts".to_string(),
            input_schema: serde_json::json!({}),
            output_schema: serde_json::json!({}),
        }],
    };

    registry.register(LoadedPlugin {
        manifest: calendar_manifest,
        status: PluginStatus::Active,
        error_message: None,
        loaded_at: now,
        plugin_path: PathBuf::from("core://calendar"),
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register_core_plugins_adds_four() {
        let mut registry = PluginRegistry::new();
        register_core_plugins(&mut registry);

        let plugins = registry.list();
        assert_eq!(plugins.len(), 4);

        assert!(registry.get("core-shell").is_some());
        assert!(registry.get("core-http").is_some());
        assert!(registry.get("core-filesystem").is_some());
        assert!(registry.get("core-calendar").is_some());
    }

    #[test]
    fn test_core_plugin_manifests_have_step_types() {
        let mut registry = PluginRegistry::new();
        register_core_plugins(&mut registry);

        let shell = registry.get("core-shell").unwrap();
        assert_eq!(shell.manifest.step_types.len(), 1);
        assert_eq!(shell.manifest.step_types[0].id, "shell-command");

        let http = registry.get("core-http").unwrap();
        assert_eq!(http.manifest.step_types.len(), 1);
        assert_eq!(http.manifest.step_types[0].id, "http-request");

        let fs = registry.get("core-filesystem").unwrap();
        assert_eq!(fs.manifest.step_types.len(), 1);
        assert_eq!(fs.manifest.step_types[0].id, "file-operation");
    }

    #[test]
    fn test_core_plugins_are_active() {
        let mut registry = PluginRegistry::new();
        register_core_plugins(&mut registry);

        for plugin in registry.list() {
            assert_eq!(plugin.status, PluginStatus::Active);
        }
    }

    #[test]
    fn test_shell_manifest_has_shell_capability() {
        let mut registry = PluginRegistry::new();
        register_core_plugins(&mut registry);

        let shell = registry.get("core-shell").unwrap();
        assert!(shell
            .manifest
            .capabilities
            .contains(&PluginCapability::Shell));
    }

    #[test]
    fn test_http_manifest_has_network_capability() {
        let mut registry = PluginRegistry::new();
        register_core_plugins(&mut registry);

        let http = registry.get("core-http").unwrap();
        assert!(http
            .manifest
            .capabilities
            .contains(&PluginCapability::Network));
    }

    #[test]
    fn test_fs_manifest_has_fs_capabilities() {
        let mut registry = PluginRegistry::new();
        register_core_plugins(&mut registry);

        let fs = registry.get("core-filesystem").unwrap();
        assert!(fs
            .manifest
            .capabilities
            .contains(&PluginCapability::FsRead));
        assert!(fs
            .manifest
            .capabilities
            .contains(&PluginCapability::FsWrite));
    }
}
