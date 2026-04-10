pub mod calendar;
pub mod filesystem;
pub mod http;
pub mod knowledge;
pub mod shell;

use crate::plugins::manifest::{
    DirectoryScope, McpToolDefinition, OwnedDirectory, PluginCapability, PluginManifest,
    SkillDefinition, StepTypeDefinition,
};
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
        manifest_version: None,
        skills: vec![],
        mcp_tools: vec![],
        owned_directories: vec![],
        on_enable: vec![],
        on_disable: vec![],
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
        manifest_version: None,
        skills: vec![],
        mcp_tools: vec![],
        owned_directories: vec![],
        on_enable: vec![],
        on_disable: vec![],
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
        manifest_version: None,
        skills: vec![],
        mcp_tools: vec![],
        owned_directories: vec![],
        on_enable: vec![],
        on_disable: vec![],
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
        manifest_version: None,
        skills: vec![],
        mcp_tools: vec![],
        owned_directories: vec![],
        on_enable: vec![],
        on_disable: vec![],
    };

    registry.register(LoadedPlugin {
        manifest: calendar_manifest,
        status: PluginStatus::Active,
        error_message: None,
        loaded_at: now.clone(),
        plugin_path: PathBuf::from("core://calendar"),
    });

    // Knowledge engine plugin manifest (v2 with skills, MCP tools, owned directories)
    let knowledge_manifest = PluginManifest {
        name: "core-knowledge".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        display_name: "Knowledge Engine".to_string(),
        description: "AI-powered wiki with ingest, query, and lint operations".to_string(),
        author: Some("Element".to_string()),
        capabilities: vec![PluginCapability::FsRead, PluginCapability::FsWrite],
        credentials: vec![],
        entry: None,
        step_types: vec![],
        manifest_version: Some(2),
        skills: vec![
            SkillDefinition {
                name: "ingest".to_string(),
                description: "Ingest a raw source document into the wiki, producing a compiled article with cross-references and an updated index".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "source_path": { "type": "string", "description": "File path or URL to ingest" },
                        "name": { "type": "string", "description": "Name for text content (alternative to source_path)" },
                        "content": { "type": "string", "description": "Raw text content (used with name)" }
                    }
                }),
                output_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "slug": { "type": "string" },
                        "title": { "type": "string" },
                        "source_hash": { "type": "string" },
                        "was_noop": { "type": "boolean" },
                        "article_path": { "type": "string" }
                    }
                }),
                destructive: true,
            },
            SkillDefinition {
                name: "query".to_string(),
                description: "Query the wiki and receive a synthesized answer drawn from relevant articles".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "question": { "type": "string", "description": "The question to answer from wiki knowledge" }
                    },
                    "required": ["question"]
                }),
                output_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "answer": { "type": "string" },
                        "sources": { "type": "array" }
                    }
                }),
                destructive: false,
            },
            SkillDefinition {
                name: "lint".to_string(),
                description: "Run quality checks on the wiki: stale sources, broken links, thin articles, orphans, contradictions".to_string(),
                input_schema: serde_json::json!({}),
                output_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "timestamp": { "type": "string" },
                        "article_count": { "type": "integer" },
                        "issues": { "type": "array" },
                        "summary": { "type": "object" }
                    }
                }),
                destructive: false,
            },
        ],
        mcp_tools: vec![
            McpToolDefinition {
                name: "wiki_query".to_string(),
                description: "Query the knowledge wiki for synthesized answers".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "question": { "type": "string" }
                    },
                    "required": ["question"]
                }),
            },
            McpToolDefinition {
                name: "wiki_ingest".to_string(),
                description: "Ingest a document into the knowledge wiki".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "source_path": { "type": "string" }
                    },
                    "required": ["source_path"]
                }),
            },
        ],
        owned_directories: vec![
            OwnedDirectory {
                path: ".knowledge".to_string(),
                scope: DirectoryScope::Global,
                description: "Knowledge wiki storage (raw sources, compiled articles, index)".to_string(),
            },
        ],
        on_enable: vec!["create_dirs".to_string()],
        on_disable: vec!["unregister".to_string()],
    };

    registry.register(LoadedPlugin {
        manifest: knowledge_manifest,
        status: PluginStatus::Active,
        error_message: None,
        loaded_at: now,
        plugin_path: PathBuf::from("core://knowledge"),
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register_core_plugins_adds_five() {
        let mut registry = PluginRegistry::new();
        register_core_plugins(&mut registry);

        let plugins = registry.list();
        assert_eq!(plugins.len(), 5);

        assert!(registry.get("core-shell").is_some());
        assert!(registry.get("core-http").is_some());
        assert!(registry.get("core-filesystem").is_some());
        assert!(registry.get("core-calendar").is_some());
        assert!(registry.get("core-knowledge").is_some());
    }

    #[test]
    fn test_knowledge_plugin_manifest_has_skills() {
        let mut registry = PluginRegistry::new();
        register_core_plugins(&mut registry);

        let knowledge = registry.get("core-knowledge").unwrap();
        assert_eq!(knowledge.manifest.skills.len(), 3);

        let skill_names: Vec<&str> = knowledge
            .manifest
            .skills
            .iter()
            .map(|s| s.name.as_str())
            .collect();
        assert!(skill_names.contains(&"ingest"));
        assert!(skill_names.contains(&"query"));
        assert!(skill_names.contains(&"lint"));

        // Verify destructive flags
        let ingest = knowledge.manifest.skills.iter().find(|s| s.name == "ingest").unwrap();
        assert!(ingest.destructive);
        let query = knowledge.manifest.skills.iter().find(|s| s.name == "query").unwrap();
        assert!(!query.destructive);
    }

    #[test]
    fn test_knowledge_plugin_manifest_has_mcp_tools() {
        let mut registry = PluginRegistry::new();
        register_core_plugins(&mut registry);

        let knowledge = registry.get("core-knowledge").unwrap();
        assert_eq!(knowledge.manifest.mcp_tools.len(), 2);

        let tool_names: Vec<&str> = knowledge
            .manifest
            .mcp_tools
            .iter()
            .map(|t| t.name.as_str())
            .collect();
        assert!(tool_names.contains(&"wiki_query"));
        assert!(tool_names.contains(&"wiki_ingest"));
    }

    #[test]
    fn test_knowledge_plugin_manifest_has_owned_directory() {
        let mut registry = PluginRegistry::new();
        register_core_plugins(&mut registry);

        let knowledge = registry.get("core-knowledge").unwrap();
        assert_eq!(knowledge.manifest.owned_directories.len(), 1);
        assert_eq!(knowledge.manifest.owned_directories[0].path, ".knowledge");
        assert_eq!(
            knowledge.manifest.owned_directories[0].scope,
            crate::plugins::manifest::DirectoryScope::Global
        );
    }

    #[test]
    fn test_knowledge_plugin_enable_disable_lifecycle() {
        use crate::plugins::PluginHost;

        let plugins_dir = tempfile::tempdir().unwrap();
        let app_data_dir = tempfile::tempdir().unwrap();
        let host = PluginHost::new(
            plugins_dir.path().to_path_buf(),
            app_data_dir.path().to_path_buf(),
        );

        // Scan loads core plugins including core-knowledge
        host.scan_and_load();

        // Enable core-knowledge: should register skills and create .knowledge/ dir
        host.set_enabled("core-knowledge", true).unwrap();

        let skills = host.list_skills();
        let knowledge_skills: Vec<_> = skills
            .iter()
            .filter(|s| s.prefixed_name.starts_with("core-knowledge:"))
            .collect();
        assert_eq!(
            knowledge_skills.len(),
            3,
            "Expected 3 knowledge skills after enable, got {}",
            knowledge_skills.len()
        );

        // Verify .knowledge/ directory was created (on_enable: ["create_dirs"])
        assert!(
            app_data_dir.path().join(".knowledge").exists(),
            ".knowledge directory should be created on enable"
        );

        // Disable core-knowledge: should remove skills from registry
        host.set_enabled("core-knowledge", false).unwrap();

        let skills_after = host.list_skills();
        let knowledge_skills_after: Vec<_> = skills_after
            .iter()
            .filter(|s| s.prefixed_name.starts_with("core-knowledge:"))
            .collect();
        assert_eq!(
            knowledge_skills_after.len(),
            0,
            "Expected 0 knowledge skills after disable, got {}",
            knowledge_skills_after.len()
        );
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
        assert!(fs.manifest.capabilities.contains(&PluginCapability::FsRead));
        assert!(fs
            .manifest
            .capabilities
            .contains(&PluginCapability::FsWrite));
    }
}
