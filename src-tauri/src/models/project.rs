use serde::{Deserialize, Serialize};

use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub directory_path: Option<String>,
    pub theme_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectInput {
    pub name: String,
    pub description: Option<String>,
}

impl Database {
    pub fn create_project(&self, input: CreateProjectInput) -> Result<Project, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let description = input.description.unwrap_or_default();

        self.conn().execute(
            "INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![id, input.name, description, now, now],
        )?;

        Ok(Project {
            id,
            name: input.name,
            description,
            directory_path: None,
            theme_id: None,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_projects(&self) -> Result<Vec<Project>, rusqlite::Error> {
        let mut stmt = self
            .conn()
            .prepare("SELECT id, name, description, directory_path, theme_id, created_at, updated_at FROM projects ORDER BY created_at DESC")?;

        let projects = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                directory_path: row.get(3)?,
                theme_id: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;

        projects.collect()
    }

    pub fn get_project(&self, id: &str) -> Result<Project, rusqlite::Error> {
        self.conn().query_row(
            "SELECT id, name, description, directory_path, theme_id, created_at, updated_at FROM projects WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    directory_path: row.get(3)?,
                    theme_id: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
    }

    pub fn update_project(
        &self,
        id: &str,
        name: &str,
        description: &str,
    ) -> Result<Project, rusqlite::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "UPDATE projects SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
            rusqlite::params![name, description, now, id],
        )?;

        self.get_project(id)
    }

    pub fn link_directory(
        &self,
        id: &str,
        directory_path: &str,
    ) -> Result<Project, rusqlite::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "UPDATE projects SET directory_path = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![directory_path, now, id],
        )?;

        self.get_project(id)
    }

    pub fn get_app_setting(&self, key: &str) -> Result<Option<String>, rusqlite::Error> {
        match self.conn().query_row(
            "SELECT value FROM app_settings WHERE key = ?1",
            rusqlite::params![key],
            |row| row.get(0),
        ) {
            Ok(val) => Ok(Some(val)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn set_app_setting(&self, key: &str, value: &str) -> Result<(), rusqlite::Error> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn().execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3",
            rusqlite::params![key, value, now],
        )?;
        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> Result<(), rusqlite::Error> {
        self.conn().execute(
            "DELETE FROM projects WHERE id = ?1",
            rusqlite::params![id],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations;
    use rusqlite::Connection;

    fn setup_test_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&conn).unwrap();
        Database::from_connection(conn)
    }

    #[test]
    fn test_create_project() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".into(),
                description: Some("A test project".into()),
            })
            .unwrap();

        assert_eq!(project.name, "Test Project");
        assert_eq!(project.description, "A test project");
        assert!(!project.id.is_empty());
        assert!(project.directory_path.is_none());
    }

    #[test]
    fn test_list_projects() {
        let db = setup_test_db();
        db.create_project(CreateProjectInput {
            name: "Project 1".into(),
            description: None,
        })
        .unwrap();
        db.create_project(CreateProjectInput {
            name: "Project 2".into(),
            description: None,
        })
        .unwrap();

        let projects = db.list_projects().unwrap();
        assert_eq!(projects.len(), 2);
    }

    #[test]
    fn test_get_project() {
        let db = setup_test_db();
        let created = db
            .create_project(CreateProjectInput {
                name: "Test".into(),
                description: None,
            })
            .unwrap();

        let fetched = db.get_project(&created.id).unwrap();
        assert_eq!(fetched.id, created.id);
        assert_eq!(fetched.name, "Test");
    }

    #[test]
    fn test_update_project() {
        let db = setup_test_db();
        let created = db
            .create_project(CreateProjectInput {
                name: "Old Name".into(),
                description: None,
            })
            .unwrap();

        let updated = db
            .update_project(&created.id, "New Name", "New description")
            .unwrap();
        assert_eq!(updated.name, "New Name");
        assert_eq!(updated.description, "New description");
    }

    #[test]
    fn test_delete_project() {
        let db = setup_test_db();
        let created = db
            .create_project(CreateProjectInput {
                name: "To Delete".into(),
                description: None,
            })
            .unwrap();

        db.delete_project(&created.id).unwrap();
        let result = db.get_project(&created.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_link_directory() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Dir Project".into(),
                description: None,
            })
            .unwrap();

        assert!(project.directory_path.is_none());

        let linked = db.link_directory(&project.id, "/tmp/test").unwrap();
        assert_eq!(
            linked.directory_path,
            Some("/tmp/test".to_string())
        );

        // Verify round-trip
        let fetched = db.get_project(&project.id).unwrap();
        assert_eq!(
            fetched.directory_path,
            Some("/tmp/test".to_string())
        );
    }

    #[test]
    fn test_project_serializes_directory_path_camel_case() {
        let project = Project {
            id: "test-id".into(),
            name: "Test".into(),
            description: "".into(),
            directory_path: Some("/tmp/test".into()),
            theme_id: None,
            created_at: "2026-01-01".into(),
            updated_at: "2026-01-01".into(),
        };

        let json = serde_json::to_string(&project).unwrap();
        assert!(json.contains("directoryPath"));
    }

    #[test]
    fn test_cascade_deletes_tasks() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Project".into(),
                description: None,
            })
            .unwrap();

        // Create a task for this project
        use crate::models::task::CreateTaskInput;
        db.create_task(CreateTaskInput {
            project_id: Some(project.id.clone()),
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
            phase_id: None,
        })
        .unwrap();

        let tasks_before = db.list_tasks(&project.id).unwrap();
        assert_eq!(tasks_before.len(), 1);

        // Delete project should cascade delete tasks
        db.delete_project(&project.id).unwrap();
        let tasks_after = db.list_tasks(&project.id).unwrap();
        assert_eq!(tasks_after.len(), 0);
    }
}
