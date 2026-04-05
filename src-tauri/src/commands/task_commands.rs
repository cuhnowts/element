use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::models::manifest::ManifestRebuildTrigger;
use crate::models::tag::Tag;
use crate::models::task::{CreateTaskInput, Task, TaskPriority, TaskStatus, UpdateTaskInput};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TaskWithTags {
    #[serde(flatten)]
    pub task: Task,
    pub tags: Vec<Tag>,
}

#[tauri::command]
pub async fn create_task(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    rebuild_trigger: State<'_, ManifestRebuildTrigger>,
    project_id: Option<String>,
    theme_id: Option<String>,
    title: String,
    description: Option<String>,
    context: Option<String>,
    priority: Option<TaskPriority>,
    external_path: Option<String>,
    due_date: Option<String>,
    scheduled_date: Option<String>,
    scheduled_time: Option<String>,
    duration_minutes: Option<i32>,
    recurrence_rule: Option<String>,
    estimated_minutes: Option<i32>,
    phase_id: Option<String>,
) -> Result<Task, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let input = CreateTaskInput {
        project_id,
        theme_id,
        title,
        description,
        context,
        priority,
        external_path,
        due_date,
        scheduled_date,
        scheduled_time,
        duration_minutes,
        recurrence_rule,
        estimated_minutes,
        phase_id,
    };
    let task = db.create_task(input).map_err(|e| e.to_string())?;
    app.emit("task-created", &task).map_err(|e| e.to_string())?;
    let _ = rebuild_trigger.0.try_send(());
    Ok(task)
}

#[tauri::command]
pub async fn list_tasks(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    project_id: String,
) -> Result<Vec<Task>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.list_tasks(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_task(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    task_id: String,
) -> Result<TaskWithTags, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let task = db.get_task(&task_id).map_err(|e| e.to_string())?;
    let tags = db.get_tags_for_task(&task_id).map_err(|e| e.to_string())?;
    Ok(TaskWithTags { task, tags })
}

#[tauri::command]
pub async fn update_task(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    task_id: String,
    title: Option<String>,
    description: Option<String>,
    context: Option<String>,
    priority: Option<TaskPriority>,
    external_path: Option<String>,
    due_date: Option<String>,
    scheduled_date: Option<String>,
    scheduled_time: Option<String>,
    duration_minutes: Option<i32>,
    recurrence_rule: Option<String>,
    estimated_minutes: Option<i32>,
    phase_id: Option<String>,
) -> Result<Task, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let input = UpdateTaskInput {
        title,
        description,
        context,
        priority,
        external_path,
        due_date,
        scheduled_date,
        scheduled_time,
        duration_minutes,
        recurrence_rule,
        estimated_minutes,
        phase_id,
    };
    let task = db.update_task(&task_id, input).map_err(|e| e.to_string())?;
    app.emit("task-updated", &task).map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
pub async fn update_task_status(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    rebuild_trigger: State<'_, ManifestRebuildTrigger>,
    task_id: String,
    status: String,
) -> Result<Task, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let parsed_status = TaskStatus::from_db_str(&status).map_err(|e| e.to_string())?;
    let task = db
        .update_task_status(&task_id, parsed_status)
        .map_err(|e| e.to_string())?;
    app.emit("task-updated", &task).map_err(|e| e.to_string())?;
    let _ = rebuild_trigger.0.try_send(());
    Ok(task)
}

#[tauri::command]
pub async fn delete_task(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    rebuild_trigger: State<'_, ManifestRebuildTrigger>,
    task_id: String,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.delete_task(&task_id).map_err(|e| e.to_string())?;
    app.emit("task-deleted", &task_id)
        .map_err(|e| e.to_string())?;
    let _ = rebuild_trigger.0.try_send(());
    Ok(())
}

#[tauri::command]
pub async fn add_tag_to_task(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    task_id: String,
    tag_name: String,
) -> Result<Tag, String> {
    let db = state.lock().map_err(|e| e.to_string())?;

    // Get-or-create pattern: find existing tag by name or create a new one
    let tag = match db
        .list_tags()
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|t| t.name == tag_name)
    {
        Some(existing) => existing,
        None => db.create_tag(&tag_name).map_err(|e| e.to_string())?,
    };

    db.add_tag_to_task(&task_id, &tag.id)
        .map_err(|e| e.to_string())?;
    app.emit("task-updated", &task_id)
        .map_err(|e| e.to_string())?;
    Ok(tag)
}

#[tauri::command]
pub async fn remove_tag_from_task(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    task_id: String,
    tag_id: String,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.remove_tag_from_task(&task_id, &tag_id)
        .map_err(|e| e.to_string())?;
    app.emit("task-updated", &task_id)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_tags(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<Vec<Tag>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.list_tags().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_standalone_tasks(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<Vec<Task>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.list_standalone_tasks().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_tasks(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    query: String,
) -> Result<Vec<Task>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", query);
    let sql = format!(
        "SELECT {} FROM tasks WHERE title LIKE ?1 ORDER BY created_at DESC LIMIT 20",
        crate::models::task::TASK_COLUMNS
    );
    let mut stmt = db.conn().prepare(&sql).map_err(|e| e.to_string())?;
    let tasks = stmt
        .query_map(rusqlite::params![pattern], |row| {
            crate::models::task::row_to_task(row)
        })
        .map_err(|e| e.to_string())?;
    tasks
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_tasks_by_theme(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    theme_id: String,
) -> Result<Vec<Task>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.list_tasks_by_theme(&theme_id).map_err(|e| e.to_string())
}
