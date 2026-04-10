use std::sync::{Arc, Mutex};

use async_trait::async_trait;

use crate::ai::gateway::AiGateway;
use crate::db::connection::Database;
use crate::knowledge::types::{SourceInput, SourceType};
use crate::knowledge::KnowledgeEngine;
use crate::plugins::skill_handler::SkillHandler;

/// Skill handler that wraps the existing KnowledgeEngine, adapting it
/// to the plugin skill dispatch system. All knowledge operations
/// (ingest, query, lint) route through this handler.
pub struct KnowledgeSkillHandler {
    engine: Arc<KnowledgeEngine>,
    db: Arc<Mutex<Database>>,
    gateway: Arc<AiGateway>,
}

impl KnowledgeSkillHandler {
    pub fn new(
        engine: Arc<KnowledgeEngine>,
        db: Arc<Mutex<Database>>,
        gateway: Arc<AiGateway>,
    ) -> Self {
        Self {
            engine,
            db,
            gateway,
        }
    }

    /// Resolve the default AI provider from the database.
    fn get_provider(&self) -> Result<Box<dyn crate::ai::provider::AiProvider>, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        self.gateway
            .get_default_provider(&db)
            .map_err(|e| e.to_string())
    }
}

#[async_trait]
impl SkillHandler for KnowledgeSkillHandler {
    async fn execute(
        &self,
        skill_name: &str,
        input: serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        match skill_name {
            "ingest" => {
                let provider = self.get_provider()?;

                // Support two input forms:
                // 1. {"source_path": "..."} - file path or URL
                // 2. {"name": "...", "content": "..."} - direct text
                let source = if let Some(source_path) =
                    input.get("source_path").and_then(|v| v.as_str())
                {
                    if source_path.starts_with("http://")
                        || source_path.starts_with("https://")
                    {
                        SourceInput {
                            name: source_path.to_string(),
                            content: String::new(),
                            source_type: SourceType::Url,
                        }
                    } else {
                        let content = tokio::fs::read_to_string(source_path)
                            .await
                            .map_err(|e| {
                                format!(
                                    "Failed to read source file '{}': {}",
                                    source_path, e
                                )
                            })?;
                        let name = std::path::PathBuf::from(source_path)
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();
                        SourceInput {
                            name,
                            content,
                            source_type: SourceType::File,
                        }
                    }
                } else if let (Some(name), Some(content)) = (
                    input.get("name").and_then(|v| v.as_str()),
                    input.get("content").and_then(|v| v.as_str()),
                ) {
                    SourceInput {
                        name: name.to_string(),
                        content: content.to_string(),
                        source_type: SourceType::File,
                    }
                } else {
                    return Err(
                        "Invalid input: provide either 'source_path' or both 'name' and 'content'"
                            .to_string(),
                    );
                };

                let result = self
                    .engine
                    .ingest(source, provider.as_ref())
                    .await
                    .map_err(|e| e.to_string())?;

                serde_json::to_value(result).map_err(|e| e.to_string())
            }

            "query" => {
                let provider = self.get_provider()?;

                let question = input
                    .get("question")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| "Missing required field 'question'".to_string())?;

                let result = self
                    .engine
                    .query(question, provider.as_ref())
                    .await
                    .map_err(|e| e.to_string())?;

                serde_json::to_value(result).map_err(|e| e.to_string())
            }

            "lint" => {
                let provider = self.get_provider()?;

                let result = self
                    .engine
                    .lint(provider.as_ref())
                    .await
                    .map_err(|e| e.to_string())?;

                serde_json::to_value(result).map_err(|e| e.to_string())
            }

            _ => Err(format!("Unknown knowledge skill: {}", skill_name)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::connection::Database;

    /// Create a KnowledgeSkillHandler backed by a temp directory with in-memory DB.
    fn create_test_handler() -> (KnowledgeSkillHandler, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let engine = Arc::new(KnowledgeEngine::new(dir.path().join(".knowledge")));

        // Create a minimal in-memory SQLite database
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        // Run migrations so ai_providers table exists
        crate::db::migrations::run_migrations(&conn).unwrap();
        let db = Database::from_connection(conn);
        let db_arc = Arc::new(Mutex::new(db));
        let gateway = Arc::new(AiGateway::new());

        let handler = KnowledgeSkillHandler::new(engine, db_arc, gateway);
        (handler, dir)
    }

    #[tokio::test]
    async fn test_execute_ingest_missing_input_returns_error() {
        let (handler, _dir) = create_test_handler();

        // No source_path and no name+content => should return input validation error
        let result = handler
            .execute("ingest", serde_json::json!({}))
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid input"));
    }

    #[tokio::test]
    async fn test_execute_query_missing_question() {
        let (handler, _dir) = create_test_handler();

        let result = handler
            .execute("query", serde_json::json!({}))
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Missing required field"));
    }

    #[tokio::test]
    async fn test_execute_unknown_skill() {
        let (handler, _dir) = create_test_handler();

        let result = handler
            .execute("nonexistent", serde_json::json!({}))
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unknown knowledge skill"));
    }
}
