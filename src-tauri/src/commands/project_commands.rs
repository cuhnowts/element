use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::models::project::{CreateProjectInput, Project};

#[tauri::command]
pub async fn create_project(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    name: String,
    description: Option<String>,
) -> Result<Project, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let input = CreateProjectInput { name, description };
    let project = db.create_project(input).map_err(|e| e.to_string())?;
    app.emit("project-created", &project)
        .map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub async fn list_projects(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<Vec<Project>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.list_projects().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_project(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    project_id: String,
) -> Result<Project, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.get_project(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_project(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    project_id: String,
    name: String,
    description: String,
) -> Result<Project, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let project = db
        .update_project(&project_id, &name, &description)
        .map_err(|e| e.to_string())?;
    app.emit("project-updated", &project)
        .map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub async fn update_project_goal(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    project_id: String,
    goal: String,
) -> Result<Project, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let project = db
        .update_project_goal(&project_id, &goal)
        .map_err(|e| e.to_string())?;
    app.emit("project-updated", &project)
        .map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub async fn delete_project(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    project_id: String,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    db.delete_project(&project_id).map_err(|e| e.to_string())?;
    app.emit("project-deleted", &project_id)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_fixtures::setup_test_db;
    use std::sync::{Arc, Mutex};

    fn setup_managed_db() -> Arc<Mutex<Database>> {
        Arc::new(Mutex::new(setup_test_db()))
    }

    #[test]
    fn test_create_project_command() {
        let db_state = setup_managed_db();
        let db = db_state.lock().unwrap();
        let input = CreateProjectInput {
            name: "My Project".into(),
            description: Some("A test project".into()),
        };
        let project = db.create_project(input).unwrap();
        assert_eq!(project.name, "My Project");
        assert_eq!(project.description, "A test project");
        assert!(!project.id.is_empty());
    }

    #[test]
    fn test_list_projects_command() {
        let db_state = setup_managed_db();
        let db = db_state.lock().unwrap();

        // Create a project
        db.create_project(CreateProjectInput {
            name: "Listed Project".into(),
            description: None,
        })
        .unwrap();

        // Verify list returns it
        let projects = db.list_projects().unwrap();
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "Listed Project");
    }
}
