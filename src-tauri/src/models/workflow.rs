use serde::{Deserialize, Serialize};

use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum StepDefinition {
    Shell {
        name: String,
        command: String,
        working_dir: Option<String>,
        timeout_ms: Option<u64>,
    },
    Http {
        name: String,
        method: String,
        url: String,
        headers: Option<Vec<(String, String)>>,
        body: Option<serde_json::Value>,
        timeout_ms: Option<u64>,
    },
    Manual {
        name: String,
        description: String,
    },
}

impl StepDefinition {
    pub fn name(&self) -> &str {
        match self {
            StepDefinition::Shell { name, .. } => name,
            StepDefinition::Http { name, .. } => name,
            StepDefinition::Manual { name, .. } => name,
        }
    }
    pub fn step_type(&self) -> &str {
        match self {
            StepDefinition::Shell { .. } => "shell",
            StepDefinition::Http { .. } => "http",
            StepDefinition::Manual { .. } => "manual",
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Workflow {
    pub id: String,
    pub task_id: Option<String>,
    pub name: String,
    pub description: String,
    pub steps: Vec<StepDefinition>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkflowInput {
    pub task_id: Option<String>,
    pub name: String,
    pub description: String,
    pub steps: Vec<StepDefinition>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkflowInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub steps: Option<Vec<StepDefinition>>,
}

impl Database {
    pub fn create_workflow(
        &self,
        input: CreateWorkflowInput,
    ) -> Result<Workflow, Box<dyn std::error::Error>> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let steps_json = serde_json::to_string(&input.steps)?;

        self.conn().execute(
            "INSERT INTO workflows (id, task_id, name, description, steps_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![id, input.task_id, input.name, input.description, steps_json, now, now],
        )?;

        Ok(Workflow {
            id,
            task_id: input.task_id,
            name: input.name,
            description: input.description,
            steps: input.steps,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_workflows_db(&self) -> Result<Vec<Workflow>, Box<dyn std::error::Error>> {
        let mut stmt = self.conn().prepare(
            "SELECT id, task_id, name, description, steps_json, created_at, updated_at FROM workflows ORDER BY created_at DESC",
        )?;

        let workflows = stmt
            .query_map([], |row| {
                let steps_json: String = row.get(4)?;
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    steps_json,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;

        let mut result = Vec::new();
        for (id, task_id, name, description, steps_json, created_at, updated_at) in workflows {
            let steps: Vec<StepDefinition> = serde_json::from_str(&steps_json)?;
            result.push(Workflow {
                id,
                task_id,
                name,
                description,
                steps,
                created_at,
                updated_at,
            });
        }

        Ok(result)
    }

    pub fn get_workflow(&self, id: &str) -> Result<Workflow, Box<dyn std::error::Error>> {
        let row = self.conn().query_row(
            "SELECT id, task_id, name, description, steps_json, created_at, updated_at FROM workflows WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                ))
            },
        )?;

        let steps: Vec<StepDefinition> = serde_json::from_str(&row.4)?;
        Ok(Workflow {
            id: row.0,
            task_id: row.1,
            name: row.2,
            description: row.3,
            steps,
            created_at: row.5,
            updated_at: row.6,
        })
    }

    pub fn update_workflow(
        &self,
        id: &str,
        input: UpdateWorkflowInput,
    ) -> Result<Workflow, Box<dyn std::error::Error>> {
        let existing = self.get_workflow(id)?;
        let now = chrono::Utc::now().to_rfc3339();

        let name = input.name.unwrap_or(existing.name);
        let description = input.description.unwrap_or(existing.description);
        let steps = input.steps.unwrap_or(existing.steps);
        let steps_json = serde_json::to_string(&steps)?;

        self.conn().execute(
            "UPDATE workflows SET name = ?1, description = ?2, steps_json = ?3, updated_at = ?4 WHERE id = ?5",
            rusqlite::params![name, description, steps_json, now, id],
        )?;

        Ok(Workflow {
            id: id.to_string(),
            task_id: existing.task_id,
            name,
            description,
            steps,
            created_at: existing.created_at,
            updated_at: now,
        })
    }

    pub fn delete_workflow_db(&self, id: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.conn().execute(
            "DELETE FROM workflows WHERE id = ?1",
            rusqlite::params![id],
        )?;
        Ok(())
    }

    pub fn get_workflow_by_task_id(
        &self,
        task_id: &str,
    ) -> Result<Option<Workflow>, Box<dyn std::error::Error>> {
        let result = self.conn().query_row(
            "SELECT id, task_id, name, description, steps_json, created_at, updated_at FROM workflows WHERE task_id = ?1",
            rusqlite::params![task_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                ))
            },
        );

        match result {
            Ok(row) => {
                let steps: Vec<StepDefinition> = serde_json::from_str(&row.4)?;
                Ok(Some(Workflow {
                    id: row.0,
                    task_id: row.1,
                    name: row.2,
                    description: row.3,
                    steps,
                    created_at: row.5,
                    updated_at: row.6,
                }))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(Box::new(e)),
        }
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
    fn test_create_and_get_workflow() {
        let db = setup_test_db();

        let workflow = db
            .create_workflow(CreateWorkflowInput {
                task_id: None,
                name: "Deploy Pipeline".into(),
                description: "Build and deploy".into(),
                steps: vec![
                    StepDefinition::Shell {
                        name: "Build".into(),
                        command: "cargo build --release".into(),
                        working_dir: Some("/project".into()),
                        timeout_ms: Some(60000),
                    },
                    StepDefinition::Http {
                        name: "Notify".into(),
                        method: "POST".into(),
                        url: "https://hooks.example.com/deploy".into(),
                        headers: Some(vec![("Authorization".into(), "Bearer token".into())]),
                        body: Some(serde_json::json!({"status": "deployed"})),
                        timeout_ms: Some(5000),
                    },
                ],
            })
            .unwrap();

        assert_eq!(workflow.name, "Deploy Pipeline");
        assert_eq!(workflow.steps.len(), 2);

        let fetched = db.get_workflow(&workflow.id).unwrap();
        assert_eq!(fetched.name, "Deploy Pipeline");
        assert_eq!(fetched.description, "Build and deploy");
        assert_eq!(fetched.steps.len(), 2);
        assert_eq!(fetched.steps[0].name(), "Build");
        assert_eq!(fetched.steps[0].step_type(), "shell");
        assert_eq!(fetched.steps[1].name(), "Notify");
        assert_eq!(fetched.steps[1].step_type(), "http");
    }

    #[test]
    fn test_list_workflows() {
        let db = setup_test_db();

        db.create_workflow(CreateWorkflowInput {
            task_id: None,
            name: "Workflow A".into(),
            description: "First".into(),
            steps: vec![],
        })
        .unwrap();

        db.create_workflow(CreateWorkflowInput {
            task_id: None,
            name: "Workflow B".into(),
            description: "Second".into(),
            steps: vec![],
        })
        .unwrap();

        let workflows = db.list_workflows_db().unwrap();
        assert_eq!(workflows.len(), 2);
    }

    #[test]
    fn test_update_workflow_steps() {
        let db = setup_test_db();

        let workflow = db
            .create_workflow(CreateWorkflowInput {
                task_id: None,
                name: "Original".into(),
                description: "Test".into(),
                steps: vec![StepDefinition::Manual {
                    name: "Old Step".into(),
                    description: "Do something".into(),
                }],
            })
            .unwrap();

        let updated = db
            .update_workflow(
                &workflow.id,
                UpdateWorkflowInput {
                    name: None,
                    description: None,
                    steps: Some(vec![
                        StepDefinition::Shell {
                            name: "New Step".into(),
                            command: "echo hello".into(),
                            working_dir: None,
                            timeout_ms: None,
                        },
                        StepDefinition::Manual {
                            name: "Review".into(),
                            description: "Check output".into(),
                        },
                    ]),
                },
            )
            .unwrap();

        assert_eq!(updated.steps.len(), 2);
        assert_eq!(updated.steps[0].name(), "New Step");
        assert_eq!(updated.steps[0].step_type(), "shell");
    }

    #[test]
    fn test_delete_workflow() {
        let db = setup_test_db();

        let workflow = db
            .create_workflow(CreateWorkflowInput {
                task_id: None,
                name: "To Delete".into(),
                description: "".into(),
                steps: vec![],
            })
            .unwrap();

        db.delete_workflow_db(&workflow.id).unwrap();
        let result = db.get_workflow(&workflow.id);
        assert!(result.is_err());
    }

    #[test]
    fn test_workflow_with_task_id() {
        let db = setup_test_db();

        // Create a project and task first
        let project = db
            .create_project(crate::models::project::CreateProjectInput {
                name: "Test Project".into(),
                description: None,
            })
            .unwrap();

        let task = db
            .create_task(crate::models::task::CreateTaskInput {
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

        let workflow = db
            .create_workflow(CreateWorkflowInput {
                task_id: Some(task.id.clone()),
                name: "Task Workflow".into(),
                description: "Linked to task".into(),
                steps: vec![],
            })
            .unwrap();

        assert_eq!(workflow.task_id, Some(task.id.clone()));

        let found = db.get_workflow_by_task_id(&task.id).unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Task Workflow");

        let not_found = db.get_workflow_by_task_id("nonexistent").unwrap();
        assert!(not_found.is_none());
    }
}
