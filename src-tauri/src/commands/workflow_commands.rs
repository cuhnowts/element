use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::models::execution::{StepResult, WorkflowRun};
use crate::models::workflow::{
    CreateWorkflowInput, StepDefinition, UpdateWorkflowInput, Workflow,
};

#[tauri::command]
pub async fn create_workflow(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<Database>>,
    name: String,
    description: String,
    steps: Vec<StepDefinition>,
    task_id: Option<String>,
) -> Result<Workflow, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let input = CreateWorkflowInput {
        task_id,
        name,
        description,
        steps,
    };
    let workflow = db.create_workflow(input).map_err(|e| e.to_string())?;
    app.emit("workflow-created", &workflow)
        .map_err(|e| e.to_string())?;
    Ok(workflow)
}

#[tauri::command]
pub async fn list_workflows(
    state: State<'_, std::sync::Mutex<Database>>,
) -> Result<Vec<Workflow>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.list_workflows_db().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_workflow(
    state: State<'_, std::sync::Mutex<Database>>,
    workflow_id: String,
) -> Result<Workflow, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.get_workflow(&workflow_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_workflow(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<Database>>,
    workflow_id: String,
    name: Option<String>,
    description: Option<String>,
    steps: Option<Vec<StepDefinition>>,
) -> Result<Workflow, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let input = UpdateWorkflowInput {
        name,
        description,
        steps,
    };
    let workflow = db
        .update_workflow(&workflow_id, input)
        .map_err(|e| e.to_string())?;
    app.emit("workflow-updated", &workflow)
        .map_err(|e| e.to_string())?;
    Ok(workflow)
}

#[tauri::command]
pub async fn delete_workflow(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<Database>>,
    workflow_id: String,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.delete_workflow_db(&workflow_id)
        .map_err(|e| e.to_string())?;
    app.emit("workflow-deleted", &workflow_id)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn promote_task_to_workflow(
    app: AppHandle,
    state: State<'_, std::sync::Mutex<Database>>,
    task_id: String,
) -> Result<Workflow, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let task = db.get_task(&task_id).map_err(|e| e.to_string())?;

    let step_description = if !task.context.is_empty() {
        task.context.clone()
    } else {
        task.description.clone()
    };

    let input = CreateWorkflowInput {
        task_id: Some(task_id),
        name: task.title,
        description: task.description,
        steps: vec![StepDefinition::Manual {
            name: "Step 1".to_string(),
            description: step_description,
        }],
    };

    let workflow = db.create_workflow(input).map_err(|e| e.to_string())?;
    app.emit("workflow-created", &workflow)
        .map_err(|e| e.to_string())?;
    Ok(workflow)
}

#[tauri::command]
pub async fn get_workflow_runs(
    state: State<'_, std::sync::Mutex<Database>>,
    workflow_id: String,
) -> Result<Vec<WorkflowRun>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.list_workflow_runs(&workflow_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_step_results(
    state: State<'_, std::sync::Mutex<Database>>,
    run_id: String,
) -> Result<Vec<StepResult>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.get_step_results(&run_id).map_err(|e| e.to_string())
}
