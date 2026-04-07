use std::sync::{Arc, Mutex};
use tauri::State;

use crate::ai::gateway::AiGateway;
use crate::db::connection::Database;
use crate::knowledge::KnowledgeEngine;
use crate::knowledge::types::{IngestResult, LintReport, QueryResult, SourceInput, SourceType};

#[tauri::command]
pub async fn knowledge_ingest(
    source_path: String,
    engine: State<'_, KnowledgeEngine>,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
) -> Result<IngestResult, String> {
    let provider = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway
            .get_default_provider(&db)
            .map_err(|e| e.to_string())?
    };

    // Determine source type from path (per D-02)
    let (name, content, source_type) = if source_path.starts_with("http://")
        || source_path.starts_with("https://")
    {
        // URL source: name is the URL, content left empty for ingest pipeline to fetch
        (source_path.clone(), String::new(), SourceType::Url)
    } else {
        // File source: read content from disk
        let content = tokio::fs::read_to_string(&source_path)
            .await
            .map_err(|e| format!("Failed to read source file '{}': {}", source_path, e))?;
        let name = std::path::PathBuf::from(&source_path)
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        (name, content, SourceType::File)
    };

    let source = SourceInput {
        name,
        content,
        source_type,
    };

    engine
        .ingest(source, provider.as_ref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn knowledge_ingest_text(
    name: String,
    content: String,
    engine: State<'_, KnowledgeEngine>,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
) -> Result<IngestResult, String> {
    let provider = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway
            .get_default_provider(&db)
            .map_err(|e| e.to_string())?
    };

    let source = SourceInput {
        name,
        content,
        source_type: SourceType::File,
    };

    engine
        .ingest(source, provider.as_ref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn knowledge_query(
    question: String,
    engine: State<'_, KnowledgeEngine>,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
) -> Result<QueryResult, String> {
    let provider = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway
            .get_default_provider(&db)
            .map_err(|e| e.to_string())?
    };

    engine
        .query(&question, provider.as_ref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn knowledge_lint(
    engine: State<'_, KnowledgeEngine>,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
) -> Result<LintReport, String> {
    let provider = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway
            .get_default_provider(&db)
            .map_err(|e| e.to_string())?
    };

    engine
        .lint(provider.as_ref())
        .await
        .map_err(|e| e.to_string())
}
