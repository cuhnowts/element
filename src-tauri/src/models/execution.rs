use serde::{Deserialize, Serialize};

use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum StepStatus {
    Pending,
    Running,
    Complete,
    Failed,
    Skipped,
}

impl std::fmt::Display for StepStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StepStatus::Pending => write!(f, "pending"),
            StepStatus::Running => write!(f, "running"),
            StepStatus::Complete => write!(f, "complete"),
            StepStatus::Failed => write!(f, "failed"),
            StepStatus::Skipped => write!(f, "skipped"),
        }
    }
}

impl StepStatus {
    pub fn from_db_str(s: &str) -> Result<Self, String> {
        match s {
            "pending" => Ok(StepStatus::Pending),
            "running" => Ok(StepStatus::Running),
            "complete" => Ok(StepStatus::Complete),
            "failed" => Ok(StepStatus::Failed),
            "skipped" => Ok(StepStatus::Skipped),
            _ => Err(format!("Invalid step status: {}", s)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionStep {
    pub id: String,
    pub name: String,
    pub status: StepStatus,
    pub duration: Option<String>,
    pub order: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionRecord {
    pub id: String,
    pub task_id: String,
    pub status: StepStatus,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub steps: Vec<ExecutionStep>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRun {
    pub id: String,
    pub workflow_id: String,
    pub trigger_type: String,
    pub status: String,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StepResult {
    pub id: String,
    pub run_id: String,
    pub step_index: i32,
    pub step_name: String,
    pub step_type: String,
    pub status: String,
    pub input_preview: Option<String>,
    pub output_preview: Option<String>,
    pub output_full: Option<String>,
    pub error_message: Option<String>,
    pub duration_ms: Option<i64>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

impl Database {
    pub fn create_execution_record(
        &self,
        task_id: &str,
    ) -> Result<ExecutionRecord, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "INSERT INTO execution_records (id, task_id, status, started_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![id, task_id, "running", now],
        )?;

        Ok(ExecutionRecord {
            id,
            task_id: task_id.to_string(),
            status: StepStatus::Running,
            started_at: now,
            completed_at: None,
            steps: vec![],
        })
    }

    pub fn get_execution_history(
        &self,
        task_id: &str,
    ) -> Result<Vec<ExecutionRecord>, rusqlite::Error> {
        let mut stmt = self.conn().prepare(
            "SELECT id, task_id, status, started_at, completed_at FROM execution_records WHERE task_id = ?1 ORDER BY started_at DESC",
        )?;

        let records: Vec<ExecutionRecord> = stmt
            .query_map(rusqlite::params![task_id], |row| {
                let status_str: String = row.get(2)?;
                Ok(ExecutionRecord {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    status: StepStatus::from_db_str(&status_str)
                        .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
                    started_at: row.get(3)?,
                    completed_at: row.get(4)?,
                    steps: vec![],
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        // Load steps for each record
        let mut result = Vec::new();
        for mut record in records {
            record.steps = self.get_execution_steps(&record.id)?;
            result.push(record);
        }

        Ok(result)
    }

    fn get_execution_steps(
        &self,
        execution_id: &str,
    ) -> Result<Vec<ExecutionStep>, rusqlite::Error> {
        let mut stmt = self.conn().prepare(
            "SELECT id, name, status, duration, step_order FROM execution_steps WHERE execution_id = ?1 ORDER BY step_order ASC",
        )?;

        let steps = stmt.query_map(rusqlite::params![execution_id], |row| {
            let status_str: String = row.get(2)?;
            Ok(ExecutionStep {
                id: row.get(0)?,
                name: row.get(1)?,
                status: StepStatus::from_db_str(&status_str)
                    .map_err(|e| rusqlite::Error::InvalidParameterName(e))?,
                duration: row.get(3)?,
                order: row.get(4)?,
            })
        })?;

        steps.collect()
    }

    pub fn get_execution_logs(
        &self,
        execution_id: &str,
    ) -> Result<Vec<LogEntry>, rusqlite::Error> {
        let mut stmt = self.conn().prepare(
            "SELECT timestamp, level, message FROM execution_logs WHERE execution_id = ?1 ORDER BY id ASC",
        )?;

        let logs = stmt.query_map(rusqlite::params![execution_id], |row| {
            Ok(LogEntry {
                timestamp: row.get(0)?,
                level: row.get(1)?,
                message: row.get(2)?,
            })
        })?;

        logs.collect()
    }

    // --- Workflow execution models ---

    pub fn create_workflow_run(
        &self,
        workflow_id: &str,
        trigger_type: &str,
    ) -> Result<WorkflowRun, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "INSERT INTO workflow_runs (id, workflow_id, trigger_type, status, started_at) VALUES (?1, ?2, ?3, 'running', ?4)",
            rusqlite::params![id, workflow_id, trigger_type, now],
        )?;

        Ok(WorkflowRun {
            id,
            workflow_id: workflow_id.to_string(),
            trigger_type: trigger_type.to_string(),
            status: "running".to_string(),
            started_at: now,
            completed_at: None,
            error_message: None,
        })
    }

    pub fn complete_workflow_run(
        &self,
        run_id: &str,
        status: &str,
        error_message: Option<&str>,
    ) -> Result<(), rusqlite::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        self.conn().execute(
            "UPDATE workflow_runs SET status = ?1, completed_at = ?2, error_message = ?3 WHERE id = ?4",
            rusqlite::params![status, now, error_message, run_id],
        )?;

        Ok(())
    }

    pub fn list_workflow_runs(
        &self,
        workflow_id: &str,
    ) -> Result<Vec<WorkflowRun>, rusqlite::Error> {
        let mut stmt = self.conn().prepare(
            "SELECT id, workflow_id, trigger_type, status, started_at, completed_at, error_message FROM workflow_runs WHERE workflow_id = ?1 ORDER BY started_at DESC",
        )?;

        let runs = stmt.query_map(rusqlite::params![workflow_id], |row| {
            Ok(WorkflowRun {
                id: row.get(0)?,
                workflow_id: row.get(1)?,
                trigger_type: row.get(2)?,
                status: row.get(3)?,
                started_at: row.get(4)?,
                completed_at: row.get(5)?,
                error_message: row.get(6)?,
            })
        })?;

        runs.collect()
    }

    pub fn get_workflow_run(&self, run_id: &str) -> Result<WorkflowRun, rusqlite::Error> {
        self.conn().query_row(
            "SELECT id, workflow_id, trigger_type, status, started_at, completed_at, error_message FROM workflow_runs WHERE id = ?1",
            rusqlite::params![run_id],
            |row| {
                Ok(WorkflowRun {
                    id: row.get(0)?,
                    workflow_id: row.get(1)?,
                    trigger_type: row.get(2)?,
                    status: row.get(3)?,
                    started_at: row.get(4)?,
                    completed_at: row.get(5)?,
                    error_message: row.get(6)?,
                })
            },
        )
    }

    pub fn create_step_result(
        &self,
        run_id: &str,
        step_index: i32,
        step_name: &str,
        step_type: &str,
    ) -> Result<StepResult, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();

        self.conn().execute(
            "INSERT INTO step_results (id, run_id, step_index, step_name, step_type, status) VALUES (?1, ?2, ?3, ?4, ?5, 'pending')",
            rusqlite::params![id, run_id, step_index, step_name, step_type],
        )?;

        Ok(StepResult {
            id,
            run_id: run_id.to_string(),
            step_index,
            step_name: step_name.to_string(),
            step_type: step_type.to_string(),
            status: "pending".to_string(),
            input_preview: None,
            output_preview: None,
            output_full: None,
            error_message: None,
            duration_ms: None,
            started_at: None,
            completed_at: None,
        })
    }

    pub fn update_step_result(
        &self,
        id: &str,
        status: &str,
        output_preview: Option<&str>,
        output_full: Option<&str>,
        error_message: Option<&str>,
        duration_ms: Option<i64>,
    ) -> Result<(), rusqlite::Error> {
        let now = chrono::Utc::now().to_rfc3339();

        // Set started_at if transitioning to running, completed_at if terminal
        let started_at = if status == "running" {
            Some(now.clone())
        } else {
            None
        };
        let completed_at = if status == "completed" || status == "failed" || status == "skipped" {
            Some(now)
        } else {
            None
        };

        self.conn().execute(
            "UPDATE step_results SET status = ?1, output_preview = ?2, output_full = ?3, error_message = ?4, duration_ms = ?5, started_at = COALESCE(?6, started_at), completed_at = COALESCE(?7, completed_at) WHERE id = ?8",
            rusqlite::params![status, output_preview, output_full, error_message, duration_ms, started_at, completed_at, id],
        )?;

        Ok(())
    }

    pub fn get_step_results(&self, run_id: &str) -> Result<Vec<StepResult>, rusqlite::Error> {
        let mut stmt = self.conn().prepare(
            "SELECT id, run_id, step_index, step_name, step_type, status, input_preview, output_preview, output_full, error_message, duration_ms, started_at, completed_at FROM step_results WHERE run_id = ?1 ORDER BY step_index",
        )?;

        let results = stmt.query_map(rusqlite::params![run_id], |row| {
            Ok(StepResult {
                id: row.get(0)?,
                run_id: row.get(1)?,
                step_index: row.get(2)?,
                step_name: row.get(3)?,
                step_type: row.get(4)?,
                status: row.get(5)?,
                input_preview: row.get(6)?,
                output_preview: row.get(7)?,
                output_full: row.get(8)?,
                error_message: row.get(9)?,
                duration_ms: row.get(10)?,
                started_at: row.get(11)?,
                completed_at: row.get(12)?,
            })
        })?;

        results.collect()
    }

    pub fn get_todays_tasks(
        &self,
    ) -> Result<Vec<crate::models::task::Task>, rusqlite::Error> {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let query = format!(
            "SELECT {} FROM tasks WHERE \
             (scheduled_date = ?1) \
             OR (due_date IS NOT NULL AND due_date <= ?1 AND status != 'complete') \
             OR (scheduled_date IS NULL AND due_date IS NULL AND status != 'complete') \
             OR (status = 'complete' AND scheduled_date = ?1) \
             ORDER BY \
               CASE WHEN due_date < ?1 AND status != 'complete' THEN 0 ELSE 1 END, \
               scheduled_time ASC, \
               CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, \
               created_at DESC",
            crate::models::task::TASK_COLUMNS
        );
        let mut stmt = self.conn().prepare(&query)?;
        let tasks = stmt.query_map(rusqlite::params![today], |row| {
            crate::models::task::row_to_task(row)
        })?;
        tasks.collect()
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

    fn create_test_task(db: &Database) -> String {
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".into(),
                description: None,
            })
            .unwrap();

        let task = db
            .create_task(CreateTaskInput {
                project_id: project.id,
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
            })
            .unwrap();

        task.id
    }

    #[test]
    fn test_create_execution_record() {
        let db = setup_test_db();
        let task_id = create_test_task(&db);

        let record = db.create_execution_record(&task_id).unwrap();
        assert_eq!(record.task_id, task_id);
        assert_eq!(record.status, StepStatus::Running);
        assert!(record.completed_at.is_none());
    }

    #[test]
    fn test_get_execution_history() {
        let db = setup_test_db();
        let task_id = create_test_task(&db);

        db.create_execution_record(&task_id).unwrap();
        db.create_execution_record(&task_id).unwrap();

        let history = db.get_execution_history(&task_id).unwrap();
        assert_eq!(history.len(), 2);
    }

    #[test]
    fn test_get_execution_history_empty() {
        let db = setup_test_db();
        let task_id = create_test_task(&db);

        let history = db.get_execution_history(&task_id).unwrap();
        assert_eq!(history.len(), 0);
    }

    #[test]
    fn test_get_execution_logs_empty() {
        let db = setup_test_db();
        let task_id = create_test_task(&db);
        let record = db.create_execution_record(&task_id).unwrap();

        let logs = db.get_execution_logs(&record.id).unwrap();
        assert_eq!(logs.len(), 0);
    }

    #[test]
    fn test_get_todays_tasks() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".into(),
                description: None,
            })
            .unwrap();

        db.create_task(CreateTaskInput {
            project_id: project.id.clone(),
            title: "Active Task".into(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: None,
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
        })
        .unwrap();

        let complete_task = db
            .create_task(CreateTaskInput {
                project_id: project.id,
                title: "Done Task".into(),
                description: None,
                context: None,
                priority: None,
                external_path: None,
                due_date: None,
                scheduled_date: None,
                scheduled_time: None,
                duration_minutes: None,
                recurrence_rule: None,
            })
            .unwrap();

        db.update_task_status(&complete_task.id, crate::models::task::TaskStatus::Complete)
            .unwrap();

        let todays = db.get_todays_tasks().unwrap();
        assert_eq!(todays.len(), 1);
        assert_eq!(todays[0].title, "Active Task");
    }

    #[test]
    fn test_create_and_complete_workflow_run() {
        let db = setup_test_db();
        let workflow = db
            .create_workflow(crate::models::workflow::CreateWorkflowInput {
                task_id: None,
                name: "Test WF".into(),
                description: "".into(),
                steps: vec![],
            })
            .unwrap();

        let run = db
            .create_workflow_run(&workflow.id, "manual")
            .unwrap();
        assert_eq!(run.workflow_id, workflow.id);
        assert_eq!(run.trigger_type, "manual");
        assert_eq!(run.status, "running");
        assert!(run.completed_at.is_none());

        db.complete_workflow_run(&run.id, "completed", None)
            .unwrap();
        let fetched = db.get_workflow_run(&run.id).unwrap();
        assert_eq!(fetched.status, "completed");
        assert!(fetched.completed_at.is_some());
    }

    #[test]
    fn test_workflow_step_results() {
        let db = setup_test_db();
        let workflow = db
            .create_workflow(crate::models::workflow::CreateWorkflowInput {
                task_id: None,
                name: "Test WF".into(),
                description: "".into(),
                steps: vec![],
            })
            .unwrap();

        let run = db
            .create_workflow_run(&workflow.id, "manual")
            .unwrap();

        let s1 = db
            .create_step_result(&run.id, 0, "Build", "shell")
            .unwrap();
        let s2 = db
            .create_step_result(&run.id, 1, "Deploy", "shell")
            .unwrap();
        assert_eq!(s1.status, "pending");
        assert_eq!(s2.status, "pending");

        db.update_step_result(
            &s1.id,
            "completed",
            Some("build output..."),
            Some("full build output here"),
            None,
            Some(1500),
        )
        .unwrap();

        let results = db.get_step_results(&run.id).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].status, "completed");
        assert_eq!(results[0].output_preview, Some("build output...".into()));
        assert_eq!(results[0].duration_ms, Some(1500));
        assert_eq!(results[1].status, "pending");
    }

    #[test]
    fn test_get_todays_tasks_with_scheduling() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".into(),
                description: None,
            })
            .unwrap();

        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let yesterday = (chrono::Local::now() - chrono::Duration::days(1))
            .format("%Y-%m-%d")
            .to_string();
        let tomorrow = (chrono::Local::now() + chrono::Duration::days(1))
            .format("%Y-%m-%d")
            .to_string();

        // Task scheduled for today - should appear
        db.create_task(CreateTaskInput {
            project_id: project.id.clone(),
            title: "Today Scheduled".into(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: None,
            scheduled_date: Some(today.clone()),
            scheduled_time: Some("10:00".into()),
            duration_minutes: Some(30),
            recurrence_rule: None,
        })
        .unwrap();

        // Task with overdue due_date - should appear
        db.create_task(CreateTaskInput {
            project_id: project.id.clone(),
            title: "Overdue Task".into(),
            description: None,
            context: None,
            priority: Some(crate::models::task::TaskPriority::High),
            external_path: None,
            due_date: Some(yesterday.clone()),
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
        })
        .unwrap();

        // Task scheduled for tomorrow - should NOT appear (has scheduled_date, not today)
        db.create_task(CreateTaskInput {
            project_id: project.id.clone(),
            title: "Tomorrow Task".into(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: None,
            scheduled_date: Some(tomorrow.clone()),
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
        })
        .unwrap();

        // Unscheduled incomplete task - should appear
        db.create_task(CreateTaskInput {
            project_id: project.id.clone(),
            title: "Unscheduled Task".into(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: None,
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
        })
        .unwrap();

        let todays = db.get_todays_tasks().unwrap();
        let titles: Vec<&str> = todays.iter().map(|t| t.title.as_str()).collect();

        assert!(titles.contains(&"Today Scheduled"), "Should include today's scheduled task");
        assert!(titles.contains(&"Overdue Task"), "Should include overdue task");
        assert!(titles.contains(&"Unscheduled Task"), "Should include unscheduled incomplete task");
        assert!(!titles.contains(&"Tomorrow Task"), "Should NOT include tomorrow's task");
        assert_eq!(todays.len(), 3);

        // Verify overdue tasks come first (sorted by CASE WHEN due_date < today)
        assert_eq!(todays[0].title, "Overdue Task");
    }
}
