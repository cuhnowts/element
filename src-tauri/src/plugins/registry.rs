use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use super::manifest::{McpToolDefinition, PluginManifest, SkillDefinition};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PluginStatus {
    Active,
    Error,
    Disabled,
    Loading,
}

#[allow(dead_code)] // fields populated during plugin loading
#[derive(Debug, Clone)]
pub struct LoadedPlugin {
    pub manifest: PluginManifest,
    pub status: PluginStatus,
    pub error_message: Option<String>,
    pub loaded_at: String,
    pub plugin_path: PathBuf,
}

pub struct PluginRegistry {
    plugins: HashMap<String, LoadedPlugin>,
}

impl PluginRegistry {
    pub fn new() -> Self {
        Self {
            plugins: HashMap::new(),
        }
    }

    pub fn register(&mut self, plugin: LoadedPlugin) {
        self.plugins.insert(plugin.manifest.name.clone(), plugin);
    }

    pub fn get(&self, name: &str) -> Option<&LoadedPlugin> {
        self.plugins.get(name)
    }

    pub fn list(&self) -> Vec<&LoadedPlugin> {
        self.plugins.values().collect()
    }

    pub fn set_status(&mut self, name: &str, status: PluginStatus, error: Option<String>) -> bool {
        if let Some(plugin) = self.plugins.get_mut(name) {
            plugin.status = status;
            plugin.error_message = error;
            true
        } else {
            false
        }
    }

    pub fn remove(&mut self, name: &str) -> Option<LoadedPlugin> {
        self.plugins.remove(name)
    }
}

pub struct SkillRegistry {
    skills: HashMap<String, (String, SkillDefinition)>,
}

impl SkillRegistry {
    pub fn new() -> Self {
        Self {
            skills: HashMap::new(),
        }
    }

    pub fn register_plugin_skills(
        &mut self,
        plugin_name: &str,
        skills: &[SkillDefinition],
    ) -> Result<(), String> {
        for skill in skills {
            let prefixed = format!("{}:{}", plugin_name, skill.name);
            if self.skills.contains_key(&prefixed) {
                return Err(format!(
                    "Plugin conflict: skill name '{}' is already registered",
                    prefixed
                ));
            }
            self.skills
                .insert(prefixed, (plugin_name.to_string(), skill.clone()));
        }
        Ok(())
    }

    pub fn unregister_plugin(&mut self, plugin_name: &str) {
        self.skills.retain(|_, (owner, _)| owner != plugin_name);
    }

    pub fn get(&self, prefixed_name: &str) -> Option<&SkillDefinition> {
        self.skills.get(prefixed_name).map(|(_, def)| def)
    }

    pub fn list(&self) -> Vec<(&str, &SkillDefinition)> {
        self.skills
            .iter()
            .map(|(k, (_, v))| (k.as_str(), v))
            .collect()
    }
}

pub struct McpToolRegistry {
    tools: HashMap<String, (String, McpToolDefinition)>,
}

impl McpToolRegistry {
    pub fn new() -> Self {
        Self {
            tools: HashMap::new(),
        }
    }

    pub fn register_plugin_tools(
        &mut self,
        plugin_name: &str,
        tools: &[McpToolDefinition],
    ) -> Result<(), String> {
        for tool in tools {
            let prefixed = format!("{}:{}", plugin_name, tool.name);
            if self.tools.contains_key(&prefixed) {
                return Err(format!(
                    "Plugin conflict: tool name '{}' is already registered",
                    prefixed
                ));
            }
            self.tools
                .insert(prefixed, (plugin_name.to_string(), tool.clone()));
        }
        Ok(())
    }

    pub fn unregister_plugin(&mut self, plugin_name: &str) {
        self.tools.retain(|_, (owner, _)| owner != plugin_name);
    }

    pub fn get(&self, prefixed_name: &str) -> Option<&McpToolDefinition> {
        self.tools.get(prefixed_name).map(|(_, def)| def)
    }

    pub fn list(&self) -> Vec<(&str, &McpToolDefinition)> {
        self.tools
            .iter()
            .map(|(k, (_, v))| (k.as_str(), v))
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugins::manifest::{McpToolDefinition, PluginManifest, SkillDefinition};

    fn make_plugin(name: &str) -> LoadedPlugin {
        LoadedPlugin {
            manifest: PluginManifest {
                name: name.to_string(),
                version: "1.0.0".to_string(),
                display_name: format!("{} Plugin", name),
                description: "Test".to_string(),
                author: None,
                capabilities: vec![],
                credentials: vec![],
                entry: None,
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
            plugin_path: PathBuf::from(format!("/plugins/{}", name)),
        }
    }

    #[test]
    fn test_register_and_get() {
        let mut reg = PluginRegistry::new();
        reg.register(make_plugin("test"));
        assert!(reg.get("test").is_some());
        assert_eq!(reg.get("test").unwrap().manifest.name, "test");
    }

    #[test]
    fn test_list_all() {
        let mut reg = PluginRegistry::new();
        reg.register(make_plugin("a"));
        reg.register(make_plugin("b"));
        assert_eq!(reg.list().len(), 2);
    }

    #[test]
    fn test_update_status() {
        let mut reg = PluginRegistry::new();
        reg.register(make_plugin("test"));

        let updated = reg.set_status(
            "test",
            PluginStatus::Error,
            Some("Something broke".to_string()),
        );
        assert!(updated);

        let plugin = reg.get("test").unwrap();
        assert_eq!(plugin.status, PluginStatus::Error);
        assert_eq!(plugin.error_message, Some("Something broke".to_string()));
    }

    #[test]
    fn test_remove() {
        let mut reg = PluginRegistry::new();
        reg.register(make_plugin("test"));
        let removed = reg.remove("test");
        assert!(removed.is_some());
        assert!(reg.get("test").is_none());
    }

    #[test]
    fn test_update_nonexistent_returns_false() {
        let mut reg = PluginRegistry::new();
        let updated = reg.set_status("nonexistent", PluginStatus::Active, None);
        assert!(!updated);
    }

    fn make_skill(name: &str) -> SkillDefinition {
        SkillDefinition {
            name: name.to_string(),
            description: format!("{} skill", name),
            input_schema: serde_json::Value::Null,
            output_schema: serde_json::Value::Null,
            destructive: false,
        }
    }

    fn make_mcp_tool(name: &str) -> McpToolDefinition {
        McpToolDefinition {
            name: name.to_string(),
            description: format!("{} tool", name),
            input_schema: serde_json::Value::Null,
        }
    }

    #[test]
    fn test_skill_registry_register_and_get() {
        let mut reg = SkillRegistry::new();
        let skills = vec![make_skill("ingest"), make_skill("query")];
        reg.register_plugin_skills("knowledge", &skills).unwrap();

        assert!(reg.get("knowledge:ingest").is_some());
        assert_eq!(reg.get("knowledge:ingest").unwrap().name, "ingest");
        assert!(reg.get("knowledge:query").is_some());
        assert!(reg.get("unknown:ingest").is_none());
    }

    #[test]
    fn test_skill_registry_duplicate_returns_err() {
        let mut reg = SkillRegistry::new();
        let skills = vec![make_skill("ingest")];
        reg.register_plugin_skills("knowledge", &skills).unwrap();

        let result = reg.register_plugin_skills("knowledge", &skills);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Plugin conflict: skill name"));
    }

    #[test]
    fn test_skill_registry_unregister_plugin() {
        let mut reg = SkillRegistry::new();
        reg.register_plugin_skills("knowledge", &[make_skill("ingest")])
            .unwrap();
        reg.register_plugin_skills("wiki", &[make_skill("search")])
            .unwrap();

        reg.unregister_plugin("knowledge");
        assert!(reg.get("knowledge:ingest").is_none());
        assert!(reg.get("wiki:search").is_some());
    }

    #[test]
    fn test_skill_registry_list() {
        let mut reg = SkillRegistry::new();
        reg.register_plugin_skills("a", &[make_skill("x")])
            .unwrap();
        reg.register_plugin_skills("b", &[make_skill("y")])
            .unwrap();
        assert_eq!(reg.list().len(), 2);
    }

    #[test]
    fn test_skill_registry_same_local_name_different_plugins() {
        let mut reg = SkillRegistry::new();
        reg.register_plugin_skills("plugin-a", &[make_skill("ingest")])
            .unwrap();
        let result = reg.register_plugin_skills("plugin-b", &[make_skill("ingest")]);
        assert!(result.is_ok());
        assert!(reg.get("plugin-a:ingest").is_some());
        assert!(reg.get("plugin-b:ingest").is_some());
    }

    #[test]
    fn test_mcp_tool_registry_register_and_get() {
        let mut reg = McpToolRegistry::new();
        let tools = vec![make_mcp_tool("search")];
        reg.register_plugin_tools("wiki", &tools).unwrap();

        assert!(reg.get("wiki:search").is_some());
        assert_eq!(reg.get("wiki:search").unwrap().name, "search");
    }

    #[test]
    fn test_mcp_tool_registry_duplicate_returns_err() {
        let mut reg = McpToolRegistry::new();
        let tools = vec![make_mcp_tool("search")];
        reg.register_plugin_tools("wiki", &tools).unwrap();

        let result = reg.register_plugin_tools("wiki", &tools);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Plugin conflict: tool name"));
    }

    #[test]
    fn test_mcp_tool_registry_unregister_and_list() {
        let mut reg = McpToolRegistry::new();
        reg.register_plugin_tools("a", &[make_mcp_tool("x")])
            .unwrap();
        reg.register_plugin_tools("b", &[make_mcp_tool("y")])
            .unwrap();
        assert_eq!(reg.list().len(), 2);

        reg.unregister_plugin("a");
        assert_eq!(reg.list().len(), 1);
        assert!(reg.get("a:x").is_none());
        assert!(reg.get("b:y").is_some());
    }
}
