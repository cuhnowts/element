use serde::{Deserialize, Serialize};

use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
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
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_projects(&self) -> Result<Vec<Project>, rusqlite::Error> {
        let mut stmt = self
            .conn()
            .prepare("SELECT id, name, description, created_at, updated_at FROM projects ORDER BY created_at DESC")?;

        let projects = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;

        projects.collect()
    }

    pub fn get_project(&self, id: &str) -> Result<Project, rusqlite::Error> {
        self.conn().query_row(
            "SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
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
            project_id: project.id.clone(),
            title: "Task 1".into(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
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
