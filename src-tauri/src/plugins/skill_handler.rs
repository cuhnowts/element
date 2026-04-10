use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;

/// Trait for plugin skill execution. Each plugin that registers skills
/// must provide an implementation that handles its skill names.
#[async_trait]
pub trait SkillHandler: Send + Sync {
    /// Execute a skill by its local name (e.g., "ingest", not "knowledge:ingest").
    async fn execute(
        &self,
        skill_name: &str,
        input: serde_json::Value,
    ) -> Result<serde_json::Value, String>;
}

/// Registry mapping plugin names to their skill handlers.
/// Used by dispatch_plugin_skill to route skill calls to the correct handler.
pub struct SkillHandlerRegistry {
    handlers: HashMap<String, Arc<dyn SkillHandler>>,
}

impl SkillHandlerRegistry {
    pub fn new() -> Self {
        Self {
            handlers: HashMap::new(),
        }
    }

    /// Register a handler for a plugin by name.
    pub fn register(&mut self, plugin_name: &str, handler: Arc<dyn SkillHandler>) {
        self.handlers.insert(plugin_name.to_string(), handler);
    }

    /// Remove a handler for a plugin.
    pub fn unregister(&mut self, plugin_name: &str) {
        self.handlers.remove(plugin_name);
    }

    /// Dispatch a prefixed skill name (e.g., "core-knowledge:ingest") to the
    /// appropriate handler. Splits on ":" to resolve plugin_name and skill_name.
    pub async fn dispatch(
        &self,
        prefixed_name: &str,
        input: serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        let (plugin_name, skill_name) = prefixed_name
            .split_once(':')
            .ok_or_else(|| {
                format!(
                    "Invalid skill name '{}': expected 'plugin:skill' format",
                    prefixed_name
                )
            })?;

        let handler = self.handlers.get(plugin_name).ok_or_else(|| {
            format!(
                "No handler registered for plugin '{}'. The plugin may need to be enabled.",
                plugin_name
            )
        })?;

        handler.execute(skill_name, input).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct MockSkillHandler {
        responses: HashMap<String, serde_json::Value>,
    }

    impl MockSkillHandler {
        fn new(responses: Vec<(&str, serde_json::Value)>) -> Self {
            Self {
                responses: responses
                    .into_iter()
                    .map(|(k, v)| (k.to_string(), v))
                    .collect(),
            }
        }
    }

    #[async_trait]
    impl SkillHandler for MockSkillHandler {
        async fn execute(
            &self,
            skill_name: &str,
            _input: serde_json::Value,
        ) -> Result<serde_json::Value, String> {
            self.responses
                .get(skill_name)
                .cloned()
                .ok_or_else(|| format!("Unknown skill: {}", skill_name))
        }
    }

    #[tokio::test]
    async fn test_dispatch_routes_to_correct_handler() {
        let mut registry = SkillHandlerRegistry::new();
        let handler = Arc::new(MockSkillHandler::new(vec![
            ("do-thing", serde_json::json!({"result": "done"})),
        ]));
        registry.register("test-plugin", handler);

        let result = registry
            .dispatch("test-plugin:do-thing", serde_json::json!({}))
            .await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap()["result"], "done");
    }

    #[tokio::test]
    async fn test_dispatch_unregistered_plugin_returns_error() {
        let registry = SkillHandlerRegistry::new();
        let result = registry
            .dispatch("nonexistent:skill", serde_json::json!({}))
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("No handler registered"));
    }

    #[tokio::test]
    async fn test_dispatch_unknown_skill_returns_error() {
        let mut registry = SkillHandlerRegistry::new();
        let handler = Arc::new(MockSkillHandler::new(vec![]));
        registry.register("test-plugin", handler);

        let result = registry
            .dispatch("test-plugin:unknown", serde_json::json!({}))
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unknown skill"));
    }

    #[tokio::test]
    async fn test_dispatch_invalid_format_returns_error() {
        let registry = SkillHandlerRegistry::new();
        let result = registry
            .dispatch("no-colon-here", serde_json::json!({}))
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid skill name"));
    }

    #[tokio::test]
    async fn test_unregister_removes_handler() {
        let mut registry = SkillHandlerRegistry::new();
        let handler = Arc::new(MockSkillHandler::new(vec![
            ("do-thing", serde_json::json!({"ok": true})),
        ]));
        registry.register("test-plugin", handler);

        // Should work before unregister
        assert!(registry
            .dispatch("test-plugin:do-thing", serde_json::json!({}))
            .await
            .is_ok());

        registry.unregister("test-plugin");

        // Should fail after unregister
        assert!(registry
            .dispatch("test-plugin:do-thing", serde_json::json!({}))
            .await
            .is_err());
    }
}
