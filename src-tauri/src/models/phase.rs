use serde::{Deserialize, Serialize};

use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Phase {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub sort_order: i32,
    pub source: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePhaseInput {
    pub project_id: String,
    pub name: String,
}

impl Database {
    pub fn create_phase(&self, input: CreatePhaseInput) -> Result<Phase, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let sort_order: i32 = self.conn().query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM phases WHERE project_id = ?1",
            rusqlite::params![input.project_id],
            |row| row.get(0),
        )?;

        self.conn().execute(
            "INSERT INTO phases (id, project_id, name, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![id, input.project_id, input.name, sort_order, now, now],
        )?;

        Ok(Phase {
            id,
            project_id: input.project_id,
            name: input.name,
            sort_order,
            source: "user".to_string(),
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_phases(&self, project_id: &str) -> Result<Vec<Phase>, rusqlite::Error> {
        let mut stmt = self.conn().prepare(
            "SELECT id, project_id, name, sort_order, source, created_at, updated_at FROM phases WHERE project_id = ?1 ORDER BY sort_order ASC",
        )?;

        let phases = stmt.query_map(rusqlite::params![project_id], |row| {
            Ok(Phase {
                id: row.get(0)?,
                project_id: row.get(1)?,
                name: row.get(2)?,
                sort_order: row.get(3)?,
                source: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;

        phases.collect()
    }

    pub fn update_phase(&self, id: &str, name: &str) -> Result<Phase, rusqlite::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "UPDATE phases SET name = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![name, now, id],
        )?;

        self.conn().query_row(
            "SELECT id, project_id, name, sort_order, source, created_at, updated_at FROM phases WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Phase {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    name: row.get(2)?,
                    sort_order: row.get(3)?,
                    source: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
    }

    pub fn delete_phase(&self, id: &str) -> Result<(), rusqlite::Error> {
        self.conn().execute(
            "DELETE FROM phases WHERE id = ?1",
            rusqlite::params![id],
        )?;
        Ok(())
    }

    pub fn reorder_phases(
        &self,
        project_id: &str,
        ordered_ids: Vec<String>,
    ) -> Result<(), rusqlite::Error> {
        let tx = self.conn().unchecked_transaction()?;
        let now = chrono::Utc::now().to_rfc3339();

        for (index, phase_id) in ordered_ids.iter().enumerate() {
            tx.execute(
                "UPDATE phases SET sort_order = ?1, updated_at = ?2 WHERE id = ?3 AND project_id = ?4",
                rusqlite::params![index as i32, now, phase_id, project_id],
            )?;
        }

        tx.commit()?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations;
    use crate::models::project::CreateProjectInput;
    use crate::models::task::CreateTaskInput;
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
    fn test_create_phase() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let phase = db
            .create_phase(CreatePhaseInput {
                project_id: project_id.clone(),
                name: "Phase 1".into(),
            })
            .unwrap();

        assert!(!phase.id.is_empty());
        assert_eq!(phase.project_id, project_id);
        assert_eq!(phase.name, "Phase 1");
        assert_eq!(phase.sort_order, 0);
        assert!(!phase.created_at.is_empty());
        assert!(!phase.updated_at.is_empty());
    }

    #[test]
    fn test_list_phases_ordered_by_sort_order() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        db.create_phase(CreatePhaseInput {
            project_id: project_id.clone(),
            name: "Phase A".into(),
        })
        .unwrap();
        db.create_phase(CreatePhaseInput {
            project_id: project_id.clone(),
            name: "Phase B".into(),
        })
        .unwrap();
        db.create_phase(CreatePhaseInput {
            project_id: project_id.clone(),
            name: "Phase C".into(),
        })
        .unwrap();

        let phases = db.list_phases(&project_id).unwrap();
        assert_eq!(phases.len(), 3);
        assert_eq!(phases[0].name, "Phase A");
        assert_eq!(phases[0].sort_order, 0);
        assert_eq!(phases[1].name, "Phase B");
        assert_eq!(phases[1].sort_order, 1);
        assert_eq!(phases[2].name, "Phase C");
        assert_eq!(phases[2].sort_order, 2);
    }

    #[test]
    fn test_update_phase() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let phase = db
            .create_phase(CreatePhaseInput {
                project_id: project_id.clone(),
                name: "Old Name".into(),
            })
            .unwrap();

        let updated = db.update_phase(&phase.id, "New Name").unwrap();
        assert_eq!(updated.name, "New Name");
        assert_ne!(updated.updated_at, phase.created_at);
    }

    #[test]
    fn test_delete_phase() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let phase = db
            .create_phase(CreatePhaseInput {
                project_id: project_id.clone(),
                name: "To Delete".into(),
            })
            .unwrap();

        db.delete_phase(&phase.id).unwrap();
        let phases = db.list_phases(&project_id).unwrap();
        assert_eq!(phases.len(), 0);
    }

    #[test]
    fn test_delete_phase_sets_task_phase_id_to_null() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let phase = db
            .create_phase(CreatePhaseInput {
                project_id: project_id.clone(),
                name: "Phase With Tasks".into(),
            })
            .unwrap();

        // Create a task and assign it to this phase
        let task = db
            .create_task(CreateTaskInput {
                project_id: Some(project_id.clone()),
                theme_id: None,
                title: "Task In Phase".into(),
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

        // Assign task to phase
        let assigned = db.set_task_phase(&task.id, Some(&phase.id)).unwrap();
        assert_eq!(assigned.phase_id, Some(phase.id.clone()));

        // Delete the phase — should SET NULL on task's phase_id
        db.delete_phase(&phase.id).unwrap();

        let fetched_task = db.get_task(&task.id).unwrap();
        assert!(fetched_task.phase_id.is_none());
    }

    #[test]
    fn test_reorder_phases() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        let p1 = db
            .create_phase(CreatePhaseInput {
                project_id: project_id.clone(),
                name: "Phase A".into(),
            })
            .unwrap();
        let p2 = db
            .create_phase(CreatePhaseInput {
                project_id: project_id.clone(),
                name: "Phase B".into(),
            })
            .unwrap();
        let p3 = db
            .create_phase(CreatePhaseInput {
                project_id: project_id.clone(),
                name: "Phase C".into(),
            })
            .unwrap();

        // Reorder: C, A, B
        db.reorder_phases(
            &project_id,
            vec![p3.id.clone(), p1.id.clone(), p2.id.clone()],
        )
        .unwrap();

        let phases = db.list_phases(&project_id).unwrap();
        assert_eq!(phases[0].name, "Phase C");
        assert_eq!(phases[0].sort_order, 0);
        assert_eq!(phases[1].name, "Phase A");
        assert_eq!(phases[1].sort_order, 1);
        assert_eq!(phases[2].name, "Phase B");
        assert_eq!(phases[2].sort_order, 2);
    }

    #[test]
    fn test_phase_serializes_camel_case() {
        let phase = Phase {
            id: "test-id".into(),
            project_id: "proj-1".into(),
            name: "Test".into(),
            sort_order: 0,
            source: "user".to_string(),
            created_at: "2026-01-01".into(),
            updated_at: "2026-01-01".into(),
        };

        let json = serde_json::to_string(&phase).unwrap();
        assert!(json.contains("projectId"));
        assert!(json.contains("sortOrder"));
        assert!(json.contains("createdAt"));
        assert!(json.contains("updatedAt"));
    }
}
