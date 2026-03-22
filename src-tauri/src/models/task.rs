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
    pub project_id: Option<String>,
    pub theme_id: Option<String>,
    pub title: String,
    pub description: String,
    pub context: String,
    pub status: TaskStatus,
    pub priority: TaskPriority,
    pub external_path: Option<String>,
    pub due_date: Option<String>,
    pub scheduled_date: Option<String>,
    pub scheduled_time: Option<String>,
    pub duration_minutes: Option<i32>,
    pub recurrence_rule: Option<String>,
    pub estimated_minutes: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub project_id: Option<String>,
    pub theme_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub context: Option<String>,
    pub priority: Option<TaskPriority>,
    pub external_path: Option<String>,
    pub due_date: Option<String>,
    pub scheduled_date: Option<String>,
    pub scheduled_time: Option<String>,
    pub duration_minutes: Option<i32>,
    pub recurrence_rule: Option<String>,
    pub estimated_minutes: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub context: Option<String>,
    pub priority: Option<TaskPriority>,
    pub external_path: Option<String>,
    pub due_date: Option<String>,
    pub scheduled_date: Option<String>,
    pub scheduled_time: Option<String>,
    pub duration_minutes: Option<i32>,
    pub recurrence_rule: Option<String>,
    pub estimated_minutes: Option<i32>,
}

pub const TASK_COLUMNS: &str = "id, project_id, theme_id, title, description, context, status, priority, external_path, due_date, scheduled_date, scheduled_time, duration_minutes, recurrence_rule, estimated_minutes, created_at, updated_at";

pub fn row_to_task(row: &rusqlite::Row) -> Result<Task, rusqlite::Error> {
    let status_str: String = row.get(6)?;
    let priority_str: String = row.get(7)?;

    Ok(Task {
        id: row.get(0)?,
        project_id: row.get(1)?,
        theme_id: row.get(2)?,
        title: row.get(3)?,
        description: row.get(4)?,
        context: row.get(5)?,
        status: TaskStatus::from_db_str(&status_str)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
        priority: TaskPriority::from_db_str(&priority_str)
            .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
        external_path: row.get(8)?,
        due_date: row.get(9)?,
        scheduled_date: row.get(10)?,
        scheduled_time: row.get(11)?,
        duration_minutes: row.get(12)?,
        recurrence_rule: row.get(13)?,
        estimated_minutes: row.get(14)?,
        created_at: row.get(15)?,
        updated_at: row.get(16)?,
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

        // Validate recurrence_rule if present
        if let Some(ref rule) = input.recurrence_rule {
            match rule.as_str() {
                "daily" | "weekdays" | "weekly" | "monthly" => {}
                _ => {
                    return Err(rusqlite::Error::InvalidParameterName(format!(
                        "Invalid recurrence rule: {}",
                        rule
                    )))
                }
            }
        }

        self.conn().execute(
            "INSERT INTO tasks (id, project_id, theme_id, title, description, context, status, priority, external_path, due_date, scheduled_date, scheduled_time, duration_minutes, recurrence_rule, estimated_minutes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            rusqlite::params![
                id,
                input.project_id,
                input.theme_id,
                input.title,
                description,
                context,
                status.to_string(),
                priority.to_string(),
                input.external_path,
                input.due_date,
                input.scheduled_date,
                input.scheduled_time,
                input.duration_minutes,
                input.recurrence_rule,
                input.estimated_minutes,
                now,
                now,
            ],
        )?;

        Ok(Task {
            id,
            project_id: input.project_id,
            theme_id: input.theme_id,
            title: input.title,
            description,
            context,
            status,
            priority,
            external_path: input.external_path,
            due_date: input.due_date,
            scheduled_date: input.scheduled_date,
            scheduled_time: input.scheduled_time,
            duration_minutes: input.duration_minutes,
            recurrence_rule: input.recurrence_rule,
            estimated_minutes: input.estimated_minutes,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_tasks(&self, project_id: &str) -> Result<Vec<Task>, rusqlite::Error> {
        let query = format!(
            "SELECT {} FROM tasks WHERE project_id = ?1 ORDER BY created_at DESC",
            TASK_COLUMNS
        );
        let mut stmt = self.conn().prepare(&query)?;

        let tasks = stmt.query_map(rusqlite::params![project_id], |row| row_to_task(row))?;
        tasks.collect()
    }

    pub fn get_task(&self, id: &str) -> Result<Task, rusqlite::Error> {
        let query = format!("SELECT {} FROM tasks WHERE id = ?1", TASK_COLUMNS);
        self.conn()
            .query_row(&query, rusqlite::params![id], |row| row_to_task(row))
    }

    pub fn update_task(&self, id: &str, input: UpdateTaskInput) -> Result<Task, rusqlite::Error> {
        let existing = self.get_task(id)?;
        let now = chrono::Utc::now().to_rfc3339();

        let title = input.title.unwrap_or(existing.title);
        let description = input.description.unwrap_or(existing.description);
        let context = input.context.unwrap_or(existing.context);
        let priority = input.priority.unwrap_or(existing.priority);
        let external_path = input.external_path.or(existing.external_path);
        let due_date = input.due_date.or(existing.due_date);
        let scheduled_date = input.scheduled_date.or(existing.scheduled_date);
        let scheduled_time = input.scheduled_time.or(existing.scheduled_time);
        let duration_minutes = input.duration_minutes.or(existing.duration_minutes);
        let recurrence_rule = input.recurrence_rule.or(existing.recurrence_rule);
        let estimated_minutes = input.estimated_minutes.or(existing.estimated_minutes);

        // Validate recurrence_rule if present
        if let Some(ref rule) = recurrence_rule {
            match rule.as_str() {
                "daily" | "weekdays" | "weekly" | "monthly" => {}
                _ => {
                    return Err(rusqlite::Error::InvalidParameterName(format!(
                        "Invalid recurrence rule: {}",
                        rule
                    )))
                }
            }
        }

        self.conn().execute(
            "UPDATE tasks SET title = ?1, description = ?2, context = ?3, priority = ?4, external_path = ?5, due_date = ?6, scheduled_date = ?7, scheduled_time = ?8, duration_minutes = ?9, recurrence_rule = ?10, estimated_minutes = ?11, updated_at = ?12 WHERE id = ?13",
            rusqlite::params![
                title,
                description,
                context,
                priority.to_string(),
                external_path,
                due_date,
                scheduled_date,
                scheduled_time,
                duration_minutes,
                recurrence_rule,
                estimated_minutes,
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
                project_id: Some(project_id.clone()),
                theme_id: None,
                title: "My Task".into(),
                description: None,
                context: None,
                priority: None,
                external_path: None,
                due_date: None,
                scheduled_date: None,
                scheduled_time: None,
                duration_minutes: None,
                recurrence_rule: None,
                estimated_minutes: None,
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
                project_id: Some(project_id.clone()),
                theme_id: None,
                title: "Full Task".into(),
                description: Some("A description".into()),
                context: Some("Some context notes".into()),
                priority: Some(TaskPriority::High),
                external_path: Some("/home/user/repo".into()),
                due_date: Some("2026-03-20".into()),
                scheduled_date: Some("2026-03-20".into()),
                scheduled_time: Some("14:00".into()),
                duration_minutes: Some(60),
                recurrence_rule: Some("weekly".into()),
                estimated_minutes: None,
            })
            .unwrap();

        assert_eq!(task.title, "Full Task");
        assert_eq!(task.description, "A description");
        assert_eq!(task.context, "Some context notes");
        assert_eq!(task.priority, TaskPriority::High);
        assert_eq!(task.external_path, Some("/home/user/repo".into()));
        assert_eq!(task.due_date, Some("2026-03-20".into()));
        assert_eq!(task.scheduled_date, Some("2026-03-20".into()));
        assert_eq!(task.scheduled_time, Some("14:00".into()));
        assert_eq!(task.duration_minutes, Some(60));
        assert_eq!(task.recurrence_rule, Some("weekly".into()));
    }

    #[test]
    fn test_list_tasks_by_project() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        db.create_task(CreateTaskInput {
            project_id: Some(project_id.clone()),
            theme_id: None,
            title: "Task 1".into(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: None,
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
        })
        .unwrap();
        db.create_task(CreateTaskInput {
            project_id: Some(project_id.clone()),
            theme_id: None,
            title: "Task 2".into(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: None,
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
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
                project_id: Some(project_id),
                theme_id: None,
                title: "Original".into(),
                description: None,
                context: None,
                priority: None,
                external_path: None,
                due_date: None,
                scheduled_date: None,
                scheduled_time: None,
                duration_minutes: None,
                recurrence_rule: None,
                estimated_minutes: None,
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
                    due_date: None,
                    scheduled_date: None,
                    scheduled_time: None,
                    duration_minutes: None,
                    recurrence_rule: None,
                    estimated_minutes: None,
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
                project_id: Some(project_id),
                theme_id: None,
                title: "Status Test".into(),
                description: None,
                context: None,
                priority: None,
                external_path: None,
                due_date: None,
                scheduled_date: None,
                scheduled_time: None,
                duration_minutes: None,
                recurrence_rule: None,
                estimated_minutes: None,
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
                project_id: Some(project_id),
                theme_id: None,
                title: "To Delete".into(),
                description: None,
                context: None,
                priority: None,
                external_path: None,
                due_date: None,
                scheduled_date: None,
                scheduled_time: None,
                duration_minutes: None,
                recurrence_rule: None,
                estimated_minutes: None,
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
                project_id: Some(project_id),
                theme_id: None,
                title: "External".into(),
                description: None,
                context: None,
                priority: None,
                external_path: Some("/path/to/repo".into()),
                due_date: None,
                scheduled_date: None,
                scheduled_time: None,
                duration_minutes: None,
                recurrence_rule: None,
                estimated_minutes: None,
            })
            .unwrap();

        let fetched = db.get_task(&task.id).unwrap();
        assert_eq!(fetched.external_path, Some("/path/to/repo".into()));
    }

    #[test]
    fn test_create_task_with_scheduling_fields() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let task = db
            .create_task(CreateTaskInput {
                project_id: Some(project_id),
                theme_id: None,
                title: "Scheduled Task".into(),
                description: None,
                context: None,
                priority: None,
                external_path: None,
                due_date: Some("2026-03-25".into()),
                scheduled_date: Some("2026-03-20".into()),
                scheduled_time: Some("09:30".into()),
                duration_minutes: Some(45),
                recurrence_rule: Some("daily".into()),
                estimated_minutes: None,
            })
            .unwrap();

        assert_eq!(task.due_date, Some("2026-03-25".into()));
        assert_eq!(task.scheduled_date, Some("2026-03-20".into()));
        assert_eq!(task.scheduled_time, Some("09:30".into()));
        assert_eq!(task.duration_minutes, Some(45));
        assert_eq!(task.recurrence_rule, Some("daily".into()));

        // Verify round-trip through database
        let fetched = db.get_task(&task.id).unwrap();
        assert_eq!(fetched.due_date, Some("2026-03-25".into()));
        assert_eq!(fetched.scheduled_date, Some("2026-03-20".into()));
        assert_eq!(fetched.scheduled_time, Some("09:30".into()));
        assert_eq!(fetched.duration_minutes, Some(45));
        assert_eq!(fetched.recurrence_rule, Some("daily".into()));
    }

    #[test]
    fn test_update_task_scheduling_fields() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let task = db
            .create_task(CreateTaskInput {
                project_id: Some(project_id),
                theme_id: None,
                title: "To Schedule".into(),
                description: None,
                context: None,
                priority: None,
                external_path: None,
                due_date: None,
                scheduled_date: None,
                scheduled_time: None,
                duration_minutes: None,
                recurrence_rule: None,
                estimated_minutes: None,
            })
            .unwrap();

        assert!(task.due_date.is_none());

        let updated = db
            .update_task(
                &task.id,
                UpdateTaskInput {
                    title: None,
                    description: None,
                    context: None,
                    priority: None,
                    external_path: None,
                    due_date: Some("2026-04-01".into()),
                    scheduled_date: Some("2026-03-28".into()),
                    scheduled_time: Some("10:00".into()),
                    duration_minutes: Some(30),
                    recurrence_rule: Some("weekdays".into()),
                    estimated_minutes: None,
                },
            )
            .unwrap();

        assert_eq!(updated.due_date, Some("2026-04-01".into()));
        assert_eq!(updated.scheduled_date, Some("2026-03-28".into()));
        assert_eq!(updated.scheduled_time, Some("10:00".into()));
        assert_eq!(updated.duration_minutes, Some(30));
        assert_eq!(updated.recurrence_rule, Some("weekdays".into()));
    }

    #[test]
    fn test_invalid_recurrence_rule_rejected() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let result = db.create_task(CreateTaskInput {
            project_id: Some(project_id),
            theme_id: None,
            title: "Bad Recurrence".into(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: None,
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: Some("every-other-tuesday".into()),
            estimated_minutes: None,
        });

        assert!(result.is_err());
    }
}
