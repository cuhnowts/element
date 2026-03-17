use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use regex::Regex;
use tauri::Emitter;

use crate::db::connection::Database;
use crate::models::workflow::{StepDefinition, Workflow};

use super::http;
use super::shell;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub content: String,
    pub content_type: String,
    pub metadata: DocumentMeta,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DocumentMeta {
    pub step_name: String,
    pub timestamp: String,
    pub exit_code: Option<i32>,
    pub status_code: Option<u16>,
}

#[derive(Debug)]
pub enum EngineError {
    Timeout(u64),
    StepFailed {
        exit_code: Option<i32>,
        stdout: String,
        stderr: String,
    },
    HttpError(String),
    InvalidMethod(String),
    SpawnFailed(String),
    ExecutionFailed(String),
}

impl std::fmt::Display for EngineError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EngineError::Timeout(ms) => write!(f, "Step timed out after {}ms", ms),
            EngineError::StepFailed {
                exit_code,
                stdout,
                stderr,
            } => {
                write!(
                    f,
                    "Step failed (exit code: {:?})\nstdout: {}\nstderr: {}",
                    exit_code, stdout, stderr
                )
            }
            EngineError::HttpError(msg) => write!(f, "HTTP error: {}", msg),
            EngineError::InvalidMethod(method) => write!(f, "Invalid HTTP method: {}", method),
            EngineError::SpawnFailed(msg) => write!(f, "Failed to spawn process: {}", msg),
            EngineError::ExecutionFailed(msg) => write!(f, "Execution failed: {}", msg),
        }
    }
}

impl std::error::Error for EngineError {}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StepProgress {
    pub workflow_id: String,
    pub run_id: String,
    pub step_index: usize,
    pub step_name: String,
    pub status: String,
    pub output_preview: Option<String>,
    pub error_message: Option<String>,
    pub duration_ms: Option<i64>,
}

pub struct PipelineExecutor {
    step_outputs: HashMap<String, Document>,
}

impl PipelineExecutor {
    pub fn new() -> Self {
        PipelineExecutor {
            step_outputs: HashMap::new(),
        }
    }

    pub async fn execute(
        &mut self,
        workflow: &Workflow,
        app: &tauri::AppHandle,
        db: &Arc<Mutex<Database>>,
        trigger_type: &str,
    ) -> Result<String, EngineError> {
        self.execute_with_run(workflow, app, db, trigger_type, None).await
    }

    pub async fn execute_with_run(
        &mut self,
        workflow: &Workflow,
        app: &tauri::AppHandle,
        db: &Arc<Mutex<Database>>,
        trigger_type: &str,
        existing_run_id: Option<String>,
    ) -> Result<String, EngineError> {
        // Use existing run or create a new one
        let run_id = match existing_run_id {
            Some(id) => id,
            None => {
                let run = {
                    let db_lock = db
                        .lock()
                        .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
                    db_lock
                        .create_workflow_run(&workflow.id, trigger_type)
                        .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?
                };
                run.id
            }
        };

        for (index, step) in workflow.steps.iter().enumerate() {
            let step_name = step.name().to_string();
            let step_type = step.step_type().to_string();

            // Create step result record
            let step_result = {
                let db_lock = db
                    .lock()
                    .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
                db_lock
                    .create_step_result(&run_id, index as i32, &step_name, &step_type)
                    .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?
            };

            // Emit step started
            let progress = StepProgress {
                workflow_id: workflow.id.clone(),
                run_id: run_id.clone(),
                step_index: index,
                step_name: step_name.clone(),
                status: "running".to_string(),
                output_preview: None,
                error_message: None,
                duration_ms: None,
            };
            let _ = app.emit("workflow-step-started", &progress);

            // Update to running
            {
                let db_lock = db
                    .lock()
                    .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
                let _ = db_lock.update_step_result(
                    &step_result.id,
                    "running",
                    None,
                    None,
                    None,
                    None,
                );
            }

            let started = Instant::now();

            // Execute step based on type
            let result = match step {
                StepDefinition::Shell {
                    command,
                    working_dir,
                    timeout_ms,
                    ..
                } => {
                    let resolved_command = self.resolve_templates(command);
                    shell::execute_shell(
                        &resolved_command,
                        working_dir.as_deref(),
                        *timeout_ms,
                        None,
                    )
                    .await
                }
                StepDefinition::Http {
                    method,
                    url,
                    headers,
                    body,
                    timeout_ms,
                    ..
                } => {
                    let resolved_url = self.resolve_templates(url);
                    http::execute_http(&method, &resolved_url, headers, body, *timeout_ms).await
                }
                StepDefinition::Manual {
                    name, description, ..
                } => {
                    // Manual steps pause execution -- emit event and return
                    let manual_progress = StepProgress {
                        workflow_id: workflow.id.clone(),
                        run_id: run_id.clone(),
                        step_index: index,
                        step_name: name.clone(),
                        status: "manual".to_string(),
                        output_preview: Some(description.clone()),
                        error_message: None,
                        duration_ms: None,
                    };
                    let _ = app.emit("workflow-step-manual", &manual_progress);

                    {
                        let db_lock = db
                            .lock()
                            .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
                        let _ = db_lock.update_step_result(
                            &step_result.id,
                            "pending",
                            None,
                            None,
                            Some("Manual step - awaiting user action"),
                            None,
                        );
                        let _ =
                            db_lock.complete_workflow_run(&run_id, "paused", Some("Manual step"));
                    }

                    return Ok(run_id);
                }
            };

            let duration_ms = started.elapsed().as_millis() as i64;

            match result {
                Ok(mut doc) => {
                    doc.metadata.step_name = step_name.clone();
                    doc.metadata.timestamp = chrono::Utc::now().to_rfc3339();

                    let output_preview = if doc.content.len() > 200 {
                        Some(doc.content[..200].to_string())
                    } else {
                        Some(doc.content.clone())
                    };

                    // Update step result
                    {
                        let db_lock = db
                            .lock()
                            .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
                        let _ = db_lock.update_step_result(
                            &step_result.id,
                            "completed",
                            output_preview.as_deref(),
                            Some(&doc.content),
                            None,
                            Some(duration_ms),
                        );
                    }

                    // Emit step completed
                    let completed_progress = StepProgress {
                        workflow_id: workflow.id.clone(),
                        run_id: run_id.clone(),
                        step_index: index,
                        step_name: step_name.clone(),
                        status: "completed".to_string(),
                        output_preview,
                        error_message: None,
                        duration_ms: Some(duration_ms),
                    };
                    let _ = app.emit("workflow-step-completed", &completed_progress);

                    // Store output for template resolution
                    self.step_outputs.insert(step_name, doc);
                }
                Err(err) => {
                    let error_msg = err.to_string();

                    // Update step result
                    {
                        let db_lock = db
                            .lock()
                            .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
                        let _ = db_lock.update_step_result(
                            &step_result.id,
                            "failed",
                            None,
                            None,
                            Some(&error_msg),
                            Some(duration_ms),
                        );
                        let _ = db_lock.complete_workflow_run(
                            &run_id,
                            "failed",
                            Some(&error_msg),
                        );
                    }

                    // Emit step failed
                    let failed_progress = StepProgress {
                        workflow_id: workflow.id.clone(),
                        run_id: run_id.clone(),
                        step_index: index,
                        step_name: step_name.clone(),
                        status: "failed".to_string(),
                        output_preview: None,
                        error_message: Some(error_msg),
                        duration_ms: Some(duration_ms),
                    };
                    let _ = app.emit("workflow-step-failed", &failed_progress);

                    return Err(err);
                }
            }
        }

        // All steps completed
        {
            let db_lock = db
                .lock()
                .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
            let _ = db_lock.complete_workflow_run(&run_id, "completed", None);
        }

        Ok(run_id)
    }

    pub async fn retry_from_step(
        &mut self,
        workflow: &Workflow,
        app: &tauri::AppHandle,
        db: &Arc<Mutex<Database>>,
        run_id: &str,
        from_step_index: usize,
    ) -> Result<(), EngineError> {
        // Load existing step results and populate step_outputs from completed steps
        let existing_results = {
            let db_lock = db
                .lock()
                .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
            db_lock
                .get_step_results(run_id)
                .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?
        };

        for result in &existing_results {
            if (result.step_index as usize) < from_step_index && result.status == "completed" {
                if let Some(ref output) = result.output_full {
                    self.step_outputs.insert(
                        result.step_name.clone(),
                        Document {
                            content: output.clone(),
                            content_type: "text/plain".to_string(),
                            metadata: DocumentMeta {
                                step_name: result.step_name.clone(),
                                timestamp: result
                                    .completed_at
                                    .clone()
                                    .unwrap_or_default(),
                                exit_code: None,
                                status_code: None,
                            },
                        },
                    );
                }
            }
        }

        // Resume execution from from_step_index
        for (index, step) in workflow.steps.iter().enumerate() {
            if index < from_step_index {
                continue;
            }

            let step_name = step.name().to_string();
            let step_type = step.step_type().to_string();

            let step_result = {
                let db_lock = db
                    .lock()
                    .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
                db_lock
                    .create_step_result(run_id, index as i32, &step_name, &step_type)
                    .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?
            };

            let progress = StepProgress {
                workflow_id: workflow.id.clone(),
                run_id: run_id.to_string(),
                step_index: index,
                step_name: step_name.clone(),
                status: "running".to_string(),
                output_preview: None,
                error_message: None,
                duration_ms: None,
            };
            let _ = app.emit("workflow-step-started", &progress);

            {
                let db_lock = db
                    .lock()
                    .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
                let _ = db_lock.update_step_result(
                    &step_result.id,
                    "running",
                    None,
                    None,
                    None,
                    None,
                );
            }

            let started = Instant::now();

            let result = match step {
                StepDefinition::Shell {
                    command,
                    working_dir,
                    timeout_ms,
                    ..
                } => {
                    let resolved_command = self.resolve_templates(command);
                    shell::execute_shell(
                        &resolved_command,
                        working_dir.as_deref(),
                        *timeout_ms,
                        None,
                    )
                    .await
                }
                StepDefinition::Http {
                    method,
                    url,
                    headers,
                    body,
                    timeout_ms,
                    ..
                } => {
                    let resolved_url = self.resolve_templates(url);
                    http::execute_http(&method, &resolved_url, headers, body, *timeout_ms).await
                }
                StepDefinition::Manual { name, description } => {
                    let manual_progress = StepProgress {
                        workflow_id: workflow.id.clone(),
                        run_id: run_id.to_string(),
                        step_index: index,
                        step_name: name.clone(),
                        status: "manual".to_string(),
                        output_preview: Some(description.clone()),
                        error_message: None,
                        duration_ms: None,
                    };
                    let _ = app.emit("workflow-step-manual", &manual_progress);

                    {
                        let db_lock = db
                            .lock()
                            .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
                        let _ = db_lock.update_step_result(
                            &step_result.id,
                            "pending",
                            None,
                            None,
                            Some("Manual step - awaiting user action"),
                            None,
                        );
                        let _ = db_lock.complete_workflow_run(
                            run_id,
                            "paused",
                            Some("Manual step"),
                        );
                    }
                    return Ok(());
                }
            };

            let duration_ms = started.elapsed().as_millis() as i64;

            match result {
                Ok(mut doc) => {
                    doc.metadata.step_name = step_name.clone();
                    doc.metadata.timestamp = chrono::Utc::now().to_rfc3339();

                    let output_preview = if doc.content.len() > 200 {
                        Some(doc.content[..200].to_string())
                    } else {
                        Some(doc.content.clone())
                    };

                    {
                        let db_lock = db
                            .lock()
                            .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
                        let _ = db_lock.update_step_result(
                            &step_result.id,
                            "completed",
                            output_preview.as_deref(),
                            Some(&doc.content),
                            None,
                            Some(duration_ms),
                        );
                    }

                    let completed_progress = StepProgress {
                        workflow_id: workflow.id.clone(),
                        run_id: run_id.to_string(),
                        step_index: index,
                        step_name: step_name.clone(),
                        status: "completed".to_string(),
                        output_preview,
                        error_message: None,
                        duration_ms: Some(duration_ms),
                    };
                    let _ = app.emit("workflow-step-completed", &completed_progress);

                    self.step_outputs.insert(step_name, doc);
                }
                Err(err) => {
                    let error_msg = err.to_string();

                    {
                        let db_lock = db
                            .lock()
                            .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
                        let _ = db_lock.update_step_result(
                            &step_result.id,
                            "failed",
                            None,
                            None,
                            Some(&error_msg),
                            Some(duration_ms),
                        );
                        let _ = db_lock.complete_workflow_run(
                            run_id,
                            "failed",
                            Some(&error_msg),
                        );
                    }

                    let failed_progress = StepProgress {
                        workflow_id: workflow.id.clone(),
                        run_id: run_id.to_string(),
                        step_index: index,
                        step_name: step_name.clone(),
                        status: "failed".to_string(),
                        output_preview: None,
                        error_message: Some(error_msg),
                        duration_ms: Some(duration_ms),
                    };
                    let _ = app.emit("workflow-step-failed", &failed_progress);

                    return Err(err);
                }
            }
        }

        // All remaining steps completed
        {
            let db_lock = db
                .lock()
                .map_err(|e| EngineError::ExecutionFailed(e.to_string()))?;
            let _ = db_lock.complete_workflow_run(run_id, "completed", None);
        }

        Ok(())
    }

    pub fn resolve_templates(&self, input: &str) -> String {
        let re = Regex::new(r"\{\{(\w+)\.output\}\}").unwrap();
        re.replace_all(input, |caps: &regex::Captures| {
            let step_name = &caps[1];
            self.step_outputs
                .get(step_name)
                .map(|doc| doc.content.clone())
                .unwrap_or_default()
        })
        .to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_templates() {
        let mut executor = PipelineExecutor::new();
        executor.step_outputs.insert(
            "fetch".to_string(),
            Document {
                content: "hello world".to_string(),
                content_type: "text/plain".to_string(),
                metadata: DocumentMeta {
                    step_name: "fetch".to_string(),
                    timestamp: "2024-01-01T00:00:00Z".to_string(),
                    exit_code: Some(0),
                    status_code: None,
                },
            },
        );

        let result = executor.resolve_templates("echo {{fetch.output}}");
        assert_eq!(result, "echo hello world");
    }

    #[test]
    fn test_resolve_templates_missing() {
        let executor = PipelineExecutor::new();
        let result = executor.resolve_templates("echo {{missing.output}}");
        assert_eq!(result, "echo ");
    }

    #[test]
    fn test_resolve_templates_multiple() {
        let mut executor = PipelineExecutor::new();
        executor.step_outputs.insert(
            "step1".to_string(),
            Document {
                content: "foo".to_string(),
                content_type: "text/plain".to_string(),
                metadata: DocumentMeta {
                    step_name: "step1".to_string(),
                    timestamp: "2024-01-01T00:00:00Z".to_string(),
                    exit_code: Some(0),
                    status_code: None,
                },
            },
        );
        executor.step_outputs.insert(
            "step2".to_string(),
            Document {
                content: "bar".to_string(),
                content_type: "text/plain".to_string(),
                metadata: DocumentMeta {
                    step_name: "step2".to_string(),
                    timestamp: "2024-01-01T00:00:00Z".to_string(),
                    exit_code: Some(0),
                    status_code: None,
                },
            },
        );

        let result = executor.resolve_templates("{{step1.output}} and {{step2.output}}");
        assert_eq!(result, "foo and bar");
    }

    #[test]
    fn test_resolve_templates_no_placeholders() {
        let executor = PipelineExecutor::new();
        let result = executor.resolve_templates("plain text with no templates");
        assert_eq!(result, "plain text with no templates");
    }
}
