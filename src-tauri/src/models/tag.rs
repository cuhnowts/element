use serde::{Deserialize, Serialize};

use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

impl Database {
    pub fn create_tag(&self, name: &str) -> Result<Tag, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "INSERT INTO tags (id, name, created_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![id, name, now],
        )?;

        Ok(Tag {
            id,
            name: name.to_string(),
            created_at: now,
        })
    }

    pub fn list_tags(&self) -> Result<Vec<Tag>, rusqlite::Error> {
        let mut stmt = self
            .conn()
            .prepare("SELECT id, name, created_at FROM tags ORDER BY name ASC")?;

        let tags = stmt.query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
            })
        })?;

        tags.collect()
    }

    pub fn add_tag_to_task(&self, task_id: &str, tag_id: &str) -> Result<(), rusqlite::Error> {
        self.conn().execute(
            "INSERT INTO task_tags (task_id, tag_id) VALUES (?1, ?2)",
            rusqlite::params![task_id, tag_id],
        )?;
        Ok(())
    }

    pub fn remove_tag_from_task(&self, task_id: &str, tag_id: &str) -> Result<(), rusqlite::Error> {
        self.conn().execute(
            "DELETE FROM task_tags WHERE task_id = ?1 AND tag_id = ?2",
            rusqlite::params![task_id, tag_id],
        )?;
        Ok(())
    }

    pub fn get_tags_for_task(&self, task_id: &str) -> Result<Vec<Tag>, rusqlite::Error> {
        let mut stmt = self.conn().prepare(
            "SELECT t.id, t.name, t.created_at FROM tags t INNER JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ?1 ORDER BY t.name ASC",
        )?;

        let tags = stmt.query_map(rusqlite::params![task_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
            })
        })?;

        tags.collect()
    }

    #[allow(dead_code)] // CRUD method for tag management
    pub fn delete_tag(&self, id: &str) -> Result<(), rusqlite::Error> {
        self.conn()
            .execute("DELETE FROM tags WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::project::CreateProjectInput;
    use crate::models::task::CreateTaskInput;
    use crate::test_fixtures::setup_test_db;

    fn create_test_task(db: &Database) -> String {
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".into(),
                description: None,
            })
            .unwrap();

        let task = db
            .create_task(CreateTaskInput {
                project_id: Some(project.id),
                theme_id: None,
                title: "Test Task".into(),
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

        task.id
    }

    #[test]
    fn test_create_tag() {
        let db = setup_test_db();
        let tag = db.create_tag("bug").unwrap();
        assert_eq!(tag.name, "bug");
        assert!(!tag.id.is_empty());
    }

    #[test]
    fn test_list_tags() {
        let db = setup_test_db();
        db.create_tag("bug").unwrap();
        db.create_tag("feature").unwrap();

        let tags = db.list_tags().unwrap();
        assert_eq!(tags.len(), 2);
    }

    #[test]
    fn test_add_tag_to_task() {
        let db = setup_test_db();
        let task_id = create_test_task(&db);
        let tag = db.create_tag("urgent").unwrap();

        db.add_tag_to_task(&task_id, &tag.id).unwrap();

        let tags = db.get_tags_for_task(&task_id).unwrap();
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].name, "urgent");
    }

    #[test]
    fn test_remove_tag_from_task() {
        let db = setup_test_db();
        let task_id = create_test_task(&db);
        let tag = db.create_tag("temp").unwrap();

        db.add_tag_to_task(&task_id, &tag.id).unwrap();
        db.remove_tag_from_task(&task_id, &tag.id).unwrap();

        let tags = db.get_tags_for_task(&task_id).unwrap();
        assert_eq!(tags.len(), 0);
    }

    #[test]
    fn test_get_tags_for_task() {
        let db = setup_test_db();
        let task_id = create_test_task(&db);
        let tag1 = db.create_tag("alpha").unwrap();
        let tag2 = db.create_tag("beta").unwrap();

        db.add_tag_to_task(&task_id, &tag1.id).unwrap();
        db.add_tag_to_task(&task_id, &tag2.id).unwrap();

        let tags = db.get_tags_for_task(&task_id).unwrap();
        assert_eq!(tags.len(), 2);
    }

    #[test]
    fn test_delete_tag_cascades() {
        let db = setup_test_db();
        let task_id = create_test_task(&db);
        let tag = db.create_tag("to-delete").unwrap();

        db.add_tag_to_task(&task_id, &tag.id).unwrap();
        db.delete_tag(&tag.id).unwrap();

        let tags = db.get_tags_for_task(&task_id).unwrap();
        assert_eq!(tags.len(), 0);
    }
}
