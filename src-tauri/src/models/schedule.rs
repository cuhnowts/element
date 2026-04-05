use serde::{Deserialize, Serialize};

use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    pub id: String,
    pub workflow_id: String,
    pub cron_expression: String,
    pub is_active: bool,
    pub last_run_at: Option<String>,
    pub next_run_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Database {
    pub fn create_schedule(
        &self,
        workflow_id: &str,
        cron_expression: &str,
    ) -> Result<Schedule, Box<dyn std::error::Error>> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "INSERT INTO schedules (id, workflow_id, cron_expression, is_active, created_at, updated_at) VALUES (?1, ?2, ?3, 1, ?4, ?5)",
            rusqlite::params![id, workflow_id, cron_expression, now, now],
        )?;

        Ok(Schedule {
            id,
            workflow_id: workflow_id.to_string(),
            cron_expression: cron_expression.to_string(),
            is_active: true,
            last_run_at: None,
            next_run_at: None,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn get_schedule(&self, id: &str) -> Result<Schedule, Box<dyn std::error::Error>> {
        let schedule = self.conn().query_row(
            "SELECT id, workflow_id, cron_expression, is_active, last_run_at, next_run_at, created_at, updated_at FROM schedules WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Schedule {
                    id: row.get(0)?,
                    workflow_id: row.get(1)?,
                    cron_expression: row.get(2)?,
                    is_active: row.get(3)?,
                    last_run_at: row.get(4)?,
                    next_run_at: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )?;
        Ok(schedule)
    }

    pub fn get_schedule_by_workflow(
        &self,
        workflow_id: &str,
    ) -> Result<Option<Schedule>, Box<dyn std::error::Error>> {
        let result = self.conn().query_row(
            "SELECT id, workflow_id, cron_expression, is_active, last_run_at, next_run_at, created_at, updated_at FROM schedules WHERE workflow_id = ?1",
            rusqlite::params![workflow_id],
            |row| {
                Ok(Schedule {
                    id: row.get(0)?,
                    workflow_id: row.get(1)?,
                    cron_expression: row.get(2)?,
                    is_active: row.get(3)?,
                    last_run_at: row.get(4)?,
                    next_run_at: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        );

        match result {
            Ok(schedule) => Ok(Some(schedule)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(Box::new(e)),
        }
    }

    pub fn update_schedule_cron(
        &self,
        id: &str,
        cron_expression: &str,
    ) -> Result<Schedule, Box<dyn std::error::Error>> {
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "UPDATE schedules SET cron_expression = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![cron_expression, now, id],
        )?;

        self.get_schedule(id)
    }

    pub fn toggle_schedule(
        &self,
        id: &str,
        is_active: bool,
    ) -> Result<Schedule, Box<dyn std::error::Error>> {
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "UPDATE schedules SET is_active = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![is_active, now, id],
        )?;

        self.get_schedule(id)
    }

    pub fn delete_schedule(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.conn()
            .execute("DELETE FROM schedules WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }

    pub fn list_active_schedules(&self) -> Result<Vec<Schedule>, Box<dyn std::error::Error>> {
        let mut stmt = self.conn().prepare(
            "SELECT id, workflow_id, cron_expression, is_active, last_run_at, next_run_at, created_at, updated_at FROM schedules WHERE is_active = 1 ORDER BY created_at DESC",
        )?;

        let schedules = stmt
            .query_map([], |row| {
                Ok(Schedule {
                    id: row.get(0)?,
                    workflow_id: row.get(1)?,
                    cron_expression: row.get(2)?,
                    is_active: row.get(3)?,
                    last_run_at: row.get(4)?,
                    next_run_at: row.get(5)?,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(schedules)
    }

    pub fn update_schedule_last_run(
        &self,
        id: &str,
        last_run_at: &str,
        next_run_at: Option<&str>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "UPDATE schedules SET last_run_at = ?1, next_run_at = ?2, updated_at = ?3 WHERE id = ?4",
            rusqlite::params![last_run_at, next_run_at, now, id],
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations;
    use crate::models::workflow::CreateWorkflowInput;
    use rusqlite::Connection;

    fn setup_test_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&conn).unwrap();
        Database::from_connection(conn)
    }

    fn create_test_workflow(db: &Database) -> String {
        let workflow = db
            .create_workflow(CreateWorkflowInput {
                task_id: None,
                name: "Test Workflow".into(),
                description: "For schedule tests".into(),
                steps: vec![],
            })
            .unwrap();
        workflow.id
    }

    #[test]
    fn test_create_and_get_schedule() {
        let db = setup_test_db();
        let workflow_id = create_test_workflow(&db);

        let schedule = db.create_schedule(&workflow_id, "0 9 * * *").unwrap();

        assert_eq!(schedule.workflow_id, workflow_id);
        assert_eq!(schedule.cron_expression, "0 9 * * *");
        assert!(schedule.is_active);
        assert!(schedule.last_run_at.is_none());
        assert!(schedule.next_run_at.is_none());

        let fetched = db.get_schedule(&schedule.id).unwrap();
        assert_eq!(fetched.cron_expression, "0 9 * * *");
        assert!(fetched.is_active);
    }

    #[test]
    fn test_toggle_schedule() {
        let db = setup_test_db();
        let workflow_id = create_test_workflow(&db);

        let schedule = db.create_schedule(&workflow_id, "0 9 * * *").unwrap();
        assert!(schedule.is_active);

        let toggled = db.toggle_schedule(&schedule.id, false).unwrap();
        assert!(!toggled.is_active);

        let toggled_back = db.toggle_schedule(&schedule.id, true).unwrap();
        assert!(toggled_back.is_active);
    }

    #[test]
    fn test_list_active_schedules() {
        let db = setup_test_db();
        let wf1 = create_test_workflow(&db);
        let wf2_id = db
            .create_workflow(CreateWorkflowInput {
                task_id: None,
                name: "WF2".into(),
                description: "".into(),
                steps: vec![],
            })
            .unwrap()
            .id;

        let s1 = db.create_schedule(&wf1, "0 9 * * *").unwrap();
        db.create_schedule(&wf2_id, "0 12 * * *").unwrap();

        // Both active
        let active = db.list_active_schedules().unwrap();
        assert_eq!(active.len(), 2);

        // Deactivate one
        db.toggle_schedule(&s1.id, false).unwrap();
        let active = db.list_active_schedules().unwrap();
        assert_eq!(active.len(), 1);
        assert_eq!(active[0].cron_expression, "0 12 * * *");
    }
}
