use serde::{Deserialize, Serialize};

use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Theme {
    pub id: String,
    pub name: String,
    pub color: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateThemeInput {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateThemeInput {
    pub name: Option<String>,
    pub color: Option<String>,
}

impl Database {
    pub fn create_theme(&self, input: CreateThemeInput) -> Result<Theme, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let max_sort: i32 = self.conn().query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM themes",
            [],
            |row| row.get(0),
        )?;
        let sort_order = max_sort + 1;

        self.conn().execute(
            "INSERT INTO themes (id, name, color, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![id, input.name, input.color, sort_order, now, now],
        )?;

        Ok(Theme {
            id,
            name: input.name,
            color: input.color,
            sort_order,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_themes(&self) -> Result<Vec<Theme>, rusqlite::Error> {
        let mut stmt = self
            .conn()
            .prepare("SELECT id, name, color, sort_order, created_at, updated_at FROM themes ORDER BY sort_order ASC")?;

        let themes = stmt.query_map([], |row| {
            Ok(Theme {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                sort_order: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;

        themes.collect()
    }

    pub fn get_theme(&self, id: &str) -> Result<Theme, rusqlite::Error> {
        self.conn().query_row(
            "SELECT id, name, color, sort_order, created_at, updated_at FROM themes WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Theme {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    sort_order: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
    }

    pub fn update_theme(
        &self,
        id: &str,
        input: UpdateThemeInput,
    ) -> Result<Theme, rusqlite::Error> {
        let existing = self.get_theme(id)?;
        let now = chrono::Utc::now().to_rfc3339();

        let name = input.name.unwrap_or(existing.name);
        let color = input.color.unwrap_or(existing.color);

        self.conn().execute(
            "UPDATE themes SET name = ?1, color = ?2, updated_at = ?3 WHERE id = ?4",
            rusqlite::params![name, color, now, id],
        )?;

        self.get_theme(id)
    }

    pub fn delete_theme(&self, id: &str) -> Result<(), rusqlite::Error> {
        self.conn()
            .execute("DELETE FROM themes WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }

    pub fn reorder_themes(&self, ordered_ids: Vec<String>) -> Result<(), rusqlite::Error> {
        let now = chrono::Utc::now().to_rfc3339();
        for (index, id) in ordered_ids.iter().enumerate() {
            self.conn().execute(
                "UPDATE themes SET sort_order = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![index as i32, now, id],
            )?;
        }
        Ok(())
    }

    pub fn get_theme_item_counts(&self, id: &str) -> Result<(i64, i64), rusqlite::Error> {
        let project_count: i64 = self.conn().query_row(
            "SELECT COUNT(*) FROM projects WHERE theme_id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )?;
        let task_count: i64 = self.conn().query_row(
            "SELECT COUNT(*) FROM tasks WHERE theme_id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )?;
        Ok((project_count, task_count))
    }

    pub fn assign_project_theme(
        &self,
        project_id: &str,
        theme_id: Option<&str>,
    ) -> Result<crate::models::project::Project, rusqlite::Error> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn().execute(
            "UPDATE projects SET theme_id = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![theme_id, now, project_id],
        )?;
        self.get_project(project_id)
    }

    pub fn assign_task_theme(
        &self,
        task_id: &str,
        theme_id: Option<&str>,
    ) -> Result<crate::models::task::Task, rusqlite::Error> {
        let now = chrono::Utc::now().to_rfc3339();
        self.conn().execute(
            "UPDATE tasks SET theme_id = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![theme_id, now, task_id],
        )?;
        self.get_task(task_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::project::CreateProjectInput;
    use crate::models::task::CreateTaskInput;
    use crate::test_fixtures::setup_test_db;

    #[test]
    fn test_create_theme() {
        let db = setup_test_db();
        let theme = db
            .create_theme(CreateThemeInput {
                name: "Business".into(),
                color: "#3b82f6".into(),
            })
            .unwrap();

        assert_eq!(theme.name, "Business");
        assert_eq!(theme.color, "#3b82f6");
        assert_eq!(theme.sort_order, 0);
        assert!(!theme.id.is_empty());
    }

    #[test]
    fn test_list_themes_ordered() {
        let db = setup_test_db();
        db.create_theme(CreateThemeInput {
            name: "First".into(),
            color: "#111".into(),
        })
        .unwrap();
        db.create_theme(CreateThemeInput {
            name: "Second".into(),
            color: "#222".into(),
        })
        .unwrap();
        db.create_theme(CreateThemeInput {
            name: "Third".into(),
            color: "#333".into(),
        })
        .unwrap();

        let themes = db.list_themes().unwrap();
        assert_eq!(themes.len(), 3);
        assert_eq!(themes[0].sort_order, 0);
        assert_eq!(themes[1].sort_order, 1);
        assert_eq!(themes[2].sort_order, 2);
        assert_eq!(themes[0].name, "First");
        assert_eq!(themes[1].name, "Second");
        assert_eq!(themes[2].name, "Third");
    }

    #[test]
    fn test_update_theme() {
        let db = setup_test_db();
        let theme = db
            .create_theme(CreateThemeInput {
                name: "Old Name".into(),
                color: "#000".into(),
            })
            .unwrap();

        let updated = db
            .update_theme(
                &theme.id,
                UpdateThemeInput {
                    name: Some("New Name".into()),
                    color: Some("#fff".into()),
                },
            )
            .unwrap();

        assert_eq!(updated.name, "New Name");
        assert_eq!(updated.color, "#fff");
    }

    #[test]
    fn test_delete_theme() {
        let db = setup_test_db();
        let theme = db
            .create_theme(CreateThemeInput {
                name: "To Delete".into(),
                color: "#000".into(),
            })
            .unwrap();

        db.delete_theme(&theme.id).unwrap();
        let result = db.get_theme(&theme.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_theme_nullifies_project() {
        let db = setup_test_db();
        let theme = db
            .create_theme(CreateThemeInput {
                name: "Theme".into(),
                color: "#000".into(),
            })
            .unwrap();

        let project = db
            .create_project(CreateProjectInput {
                name: "Project".into(),
                description: None,
            })
            .unwrap();

        db.assign_project_theme(&project.id, Some(&theme.id))
            .unwrap();

        // Verify assignment
        let assigned = db.get_project(&project.id).unwrap();
        assert_eq!(assigned.theme_id, Some(theme.id.clone()));

        // Delete theme
        db.delete_theme(&theme.id).unwrap();

        // Verify project theme_id is now NULL
        let after = db.get_project(&project.id).unwrap();
        assert_eq!(after.theme_id, None);
    }

    #[test]
    fn test_reorder_themes() {
        let db = setup_test_db();
        let t0 = db
            .create_theme(CreateThemeInput {
                name: "Zero".into(),
                color: "#000".into(),
            })
            .unwrap();
        let t1 = db
            .create_theme(CreateThemeInput {
                name: "One".into(),
                color: "#111".into(),
            })
            .unwrap();
        let t2 = db
            .create_theme(CreateThemeInput {
                name: "Two".into(),
                color: "#222".into(),
            })
            .unwrap();

        // Reorder: Two first, Zero second, One third
        db.reorder_themes(vec![t2.id.clone(), t0.id.clone(), t1.id.clone()])
            .unwrap();

        let themes = db.list_themes().unwrap();
        assert_eq!(themes[0].name, "Two");
        assert_eq!(themes[0].sort_order, 0);
        assert_eq!(themes[1].name, "Zero");
        assert_eq!(themes[1].sort_order, 1);
        assert_eq!(themes[2].name, "One");
        assert_eq!(themes[2].sort_order, 2);
    }

    #[test]
    fn test_theme_item_counts() {
        let db = setup_test_db();
        let theme = db
            .create_theme(CreateThemeInput {
                name: "Counted".into(),
                color: "#000".into(),
            })
            .unwrap();

        let project = db
            .create_project(CreateProjectInput {
                name: "Project".into(),
                description: None,
            })
            .unwrap();

        db.assign_project_theme(&project.id, Some(&theme.id))
            .unwrap();

        let task = db
            .create_task(CreateTaskInput {
                project_id: Some(project.id.clone()),
                theme_id: None,
                title: "Task".into(),
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

        db.assign_task_theme(&task.id, Some(&theme.id)).unwrap();

        let (pc, tc) = db.get_theme_item_counts(&theme.id).unwrap();
        assert_eq!(pc, 1);
        assert_eq!(tc, 1);
    }

    #[test]
    fn test_assign_project_theme() {
        let db = setup_test_db();
        let theme = db
            .create_theme(CreateThemeInput {
                name: "Theme".into(),
                color: "#000".into(),
            })
            .unwrap();

        let project = db
            .create_project(CreateProjectInput {
                name: "Project".into(),
                description: None,
            })
            .unwrap();

        let assigned = db
            .assign_project_theme(&project.id, Some(&theme.id))
            .unwrap();
        assert_eq!(assigned.theme_id, Some(theme.id.clone()));

        // Unassign
        let unassigned = db.assign_project_theme(&project.id, None).unwrap();
        assert_eq!(unassigned.theme_id, None);
    }
}
