use serde::{Deserialize, Serialize};
use std::fmt;

use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Pending,
    #[serde(rename = "in-progress")]
    InProgress,
    Complete,
    Blocked,
}

impl fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TaskStatus::Pending => write!(f, "pending"),
            TaskStatus::InProgress => write!(f, "in-progress"),
            TaskStatus::Complete => write!(f, "complete"),
            TaskStatus::Blocked => write!(f, "blocked"),
        }
    }
}

impl TaskStatus {
    pub fn from_db_str(s: &str) -> Result<Self, String> {
        match s {
            "pending" => Ok(TaskStatus::Pending),
            "in-progress" => Ok(TaskStatus::InProgress),
            "complete" => Ok(TaskStatus::Complete),
            "blocked" => Ok(TaskStatus::Blocked),
            _ => Err(format!("Invalid task status: {}", s)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskPriority {
    Urgent,
    High,
    Medium,
    Low,
}

impl fmt::Display for TaskPriority {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TaskPriority::Urgent => write!(f, "urgent"),
            TaskPriority::High => write!(f, "high"),
            TaskPriority::Medium => write!(f, "medium"),
            TaskPriority::Low => write!(f, "low"),
        }
    }
}

impl TaskPriority {
    pub fn from_db_str(s: &str) -> Result<Self, String> {
        match s {
            "urgent" => Ok(TaskPriority::Urgent),
            "high" => Ok(TaskPriority::High),
            "medium" => Ok(TaskPriority::Medium),
            "low" => Ok(TaskPriority::Low),
            _ => Err(format!("Invalid task priority: {}", s)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: String,
    pub context: String,
    pub status: TaskStatus,
    pub priority: TaskPriority,
    pub external_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub context: Option<String>,
    pub priority: Option<TaskPriority>,
    pub external_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub context: Option<String>,
    pub priority: Option<TaskPriority>,
    pub external_path: Option<String>,
}

fn row_to_task(row: &rusqlite::Row) -> Result<Task, rusqlite::Error> {
    let status_str: String = row.get(5)?;
    let priority_str: String = row.get(6)?;

    Ok(Task {
        id: row.get(0)?,
        project_id: row.get(1)?,
        title: row.get(2)?,
        description: row.get(3)?,
        context: row.get(4)?,
        status: TaskStatus::from_db_str(&status_str)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
        priority: TaskPriority::from_db_str(&priority_str)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
        external_path: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

impl Database {
    pub fn create_task(&self, input: CreateTaskInput) -> Result<Task, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let description = input.description.unwrap_or_default();
        let context = input.context.unwrap_or_default();
        let priority = input.priority.unwrap_or(TaskPriority::Medium);
        let status = TaskStatus::Pending;

        self.conn().execute(
            "INSERT INTO tasks (id, project_id, title, description, context, status, priority, external_path, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                id,
                input.project_id,
                input.title,
                description,
                context,
                status.to_string(),
                priority.to_string(),
                input.external_path,
                now,
                now,
            ],
        )?;

        Ok(Task {
            id,
            project_id: input.project_id,
            title: input.title,
            description,
            context,
            status,
            priority,
            external_path: input.external_path,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_tasks(&self, project_id: &str) -> Result<Vec<Task>, rusqlite::Error> {
        let mut stmt = self.conn().prepare(
            "SELECT id, project_id, title, description, context, status, priority, external_path, created_at, updated_at FROM tasks WHERE project_id = ?1 ORDER BY created_at DESC",
        )?;

        let tasks = stmt.query_map(rusqlite::params![project_id], |row| row_to_task(row))?;
        tasks.collect()
    }

    pub fn get_task(&self, id: &str) -> Result<Task, rusqlite::Error> {
        self.conn().query_row(
            "SELECT id, project_id, title, description, context, status, priority, external_path, created_at, updated_at FROM tasks WHERE id = ?1",
            rusqlite::params![id],
            |row| row_to_task(row),
        )
    }

    pub fn update_task(&self, id: &str, input: UpdateTaskInput) -> Result<Task, rusqlite::Error> {
        let existing = self.get_task(id)?;
        let now = chrono::Utc::now().to_rfc3339();

        let title = input.title.unwrap_or(existing.title);
        let description = input.description.unwrap_or(existing.description);
        let context = input.context.unwrap_or(existing.context);
        let priority = input.priority.unwrap_or(existing.priority);
        let external_path = input.external_path.or(existing.external_path);

        self.conn().execute(
            "UPDATE tasks SET title = ?1, description = ?2, context = ?3, priority = ?4, external_path = ?5, updated_at = ?6 WHERE id = ?7",
            rusqlite::params![
                title,
                description,
                context,
                priority.to_string(),
                external_path,
                now,
                id,
            ],
        )?;

        self.get_task(id)
    }

    pub fn update_task_status(
        &self,
        id: &str,
        status: TaskStatus,
    ) -> Result<Task, rusqlite::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![status.to_string(), now, id],
        )?;

        self.get_task(id)
    }

    pub fn delete_task(&self, id: &str) -> Result<(), rusqlite::Error> {
        self.conn()
            .execute("DELETE FROM tasks WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations;
    use crate::models::project::CreateProjectInput;
    use rusqlite::Connection;

    fn setup_test_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&conn).unwrap();
        Database::from_connection(conn)
    }

    fn create_test_project(db: &Database) -> String {
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".into(),
                description: None,
            })
            .unwrap();
        project.id
    }

    #[test]
    fn test_create_task_with_defaults() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let task = db
            .create_task(CreateTaskInput {
                project_id: project_id.clone(),
                title: "My Task".into(),
                description: None,
                context: None,
                priority: None,
                external_path: None,
            })
            .unwrap();

        assert_eq!(task.title, "My Task");
        assert_eq!(task.status, TaskStatus::Pending);
        assert_eq!(task.priority, TaskPriority::Medium);
        assert_eq!(task.description, "");
        assert_eq!(task.context, "");
        assert!(task.external_path.is_none());
    }

    #[test]
    fn test_create_task_with_all_fields() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let task = db
            .create_task(CreateTaskInput {
                project_id: project_id.clone(),
                title: "Full Task".into(),
                description: Some("A description".into()),
                context: Some("Some context notes".into()),
                priority: Some(TaskPriority::High),
                external_path: Some("/home/user/repo".into()),
            })
            .unwrap();

        assert_eq!(task.title, "Full Task");
        assert_eq!(task.description, "A description");
        assert_eq!(task.context, "Some context notes");
        assert_eq!(task.priority, TaskPriority::High);
        assert_eq!(task.external_path, Some("/home/user/repo".into()));
    }

    #[test]
    fn test_list_tasks_by_project() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        db.create_task(CreateTaskInput {
            project_id: project_id.clone(),
            title: "Task 1".into(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
        })
        .unwrap();
        db.create_task(CreateTaskInput {
            project_id: project_id.clone(),
            title: "Task 2".into(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
        })
        .unwrap();

        let tasks = db.list_tasks(&project_id).unwrap();
        assert_eq!(tasks.len(), 2);
    }

    #[test]
    fn test_update_task_fields() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let task = db
            .create_task(CreateTaskInput {
                project_id,
                title: "Original".into(),
                description: None,
                context: None,
                priority: None,
                external_path: None,
            })
            .unwrap();

        let updated = db
            .update_task(
                &task.id,
                UpdateTaskInput {
                    title: Some("Updated Title".into()),
                    description: Some("New desc".into()),
                    context: None,
                    priority: Some(TaskPriority::Urgent),
                    external_path: None,
                },
            )
            .unwrap();

        assert_eq!(updated.title, "Updated Title");
        assert_eq!(updated.description, "New desc");
        assert_eq!(updated.priority, TaskPriority::Urgent);
    }

    #[test]
    fn test_update_task_status() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let task = db
            .create_task(CreateTaskInput {
                project_id,
                title: "Status Test".into(),
                description: None,
                context: None,
                priority: None,
                external_path: None,
            })
            .unwrap();

        assert_eq!(task.status, TaskStatus::Pending);

        let updated = db
            .update_task_status(&task.id, TaskStatus::InProgress)
            .unwrap();
        assert_eq!(updated.status, TaskStatus::InProgress);

        let completed = db
            .update_task_status(&task.id, TaskStatus::Complete)
            .unwrap();
        assert_eq!(completed.status, TaskStatus::Complete);
    }

    #[test]
    fn test_delete_task() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let task = db
            .create_task(CreateTaskInput {
                project_id,
                title: "To Delete".into(),
                description: None,
                context: None,
                priority: None,
                external_path: None,
            })
            .unwrap();

        db.delete_task(&task.id).unwrap();
        let result = db.get_task(&task.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_external_path_stored() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let task = db
            .create_task(CreateTaskInput {
                project_id,
                title: "External".into(),
                description: None,
                context: None,
                priority: None,
                external_path: Some("/path/to/repo".into()),
            })
            .unwrap();

        let fetched = db.get_task(&task.id).unwrap();
        assert_eq!(fetched.external_path, Some("/path/to/repo".into()));
    }
}
