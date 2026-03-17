use serde::Serialize;
use tauri::State;

use crate::db::connection::Database;
use crate::models::execution::{ExecutionRecord, ExecutionStep, LogEntry};
use crate::models::task::Task;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TaskDetailResponse {
    #[serde(flatten)]
    pub task: Task,
    pub tags: Vec<String>,
    pub agents: Vec<String>,
    pub skills: Vec<String>,
    pub tools: Vec<String>,
    pub steps: Vec<ExecutionStep>,
}

#[tauri::command]
pub async fn get_todays_tasks(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<Vec<Task>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.get_todays_tasks().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task_detail(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    task_id: String,
) -> Result<TaskDetailResponse, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let task = db.get_task(&task_id).map_err(|e| e.to_string())?;
    let tags = db
        .get_tags_for_task(&task_id)
        .map_err(|e| e.to_string())?;

    // Get the latest execution record's steps if any
    let history = db
        .get_execution_history(&task_id)
        .map_err(|e| e.to_string())?;
    let steps = history
        .first()
        .map(|r| r.steps.clone())
        .unwrap_or_default();

    Ok(TaskDetailResponse {
        task,
        tags: tags.into_iter().map(|t| t.name).collect(),
        agents: vec![],
        skills: vec![],
        tools: vec![],
        steps,
    })
}

#[tauri::command]
pub async fn get_execution_history(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    task_id: String,
) -> Result<Vec<ExecutionRecord>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.get_execution_history(&task_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_execution_logs(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    execution_id: String,
) -> Result<Vec<LogEntry>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.get_execution_logs(&execution_id)
        .map_err(|e| e.to_string())
}
