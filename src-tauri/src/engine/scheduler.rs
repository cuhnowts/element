use std::sync::{Arc, Mutex};
use tokio_cron_scheduler::{Job, JobScheduler};
use tauri::{AppHandle, Emitter, Manager};

use crate::db::connection::Database;

/// Initialize the cron scheduler, catch up missed runs, and register active schedules.
pub async fn init_scheduler(
    app: AppHandle,
) -> Result<JobScheduler, Box<dyn std::error::Error + Send + Sync>> {
    let sched = JobScheduler::new().await?;

    // Load active schedules from DB via managed state
    let schedules = {
        let db_state = app.state::<Mutex<Database>>();
        let db_lock = db_state.lock().map_err(|e| format!("DB lock error: {}", e))?;
        db_lock
            .list_active_schedules()
            .map_err(|e| format!("Failed to list schedules: {}", e))?
    };

    for schedule in &schedules {
        // Check for missed runs
        if let Some(ref last_run) = schedule.last_run_at {
            if should_catch_up(&schedule.cron_expression, last_run) {
                let app_clone = app.clone();
                let wf_id = schedule.workflow_id.clone();
                tokio::spawn(async move {
                    if let Err(e) = catch_up_run(&app_clone, &wf_id).await {
                        eprintln!("Catch-up run failed for workflow {}: {}", wf_id, e);
                    }
                });
            }
        }

        // Register recurring job
        let cron_expr = schedule.cron_expression.clone();
        let app_clone = app.clone();
        let wf_id = schedule.workflow_id.clone();
        let sched_id = schedule.id.clone();

        sched
            .add(Job::new_async(cron_expr.as_str(), move |_uuid, _lock| {
                let app = app_clone.clone();
                let id = wf_id.clone();
                let sid = sched_id.clone();
                Box::pin(async move {
                    if let Err(e) = scheduled_run(&app, &id, &sid).await {
                        eprintln!("Scheduled run failed for workflow {}: {}", id, e);
                    }
                })
            })?)
            .await?;
    }

    sched.start().await?;

    // Store scheduler in app state
    let scheduler_state = app.state::<Arc<tokio::sync::Mutex<Option<JobScheduler>>>>();
    let mut lock = scheduler_state.lock().await;
    *lock = Some(sched.clone());

    Ok(sched)
}

/// Check if a cron expression indicates a missed run between last_run_at and now.
fn should_catch_up(cron_expression: &str, last_run_at: &str) -> bool {
    use cron::Schedule;
    use std::str::FromStr;

    let Ok(schedule) = Schedule::from_str(cron_expression) else {
        return false;
    };

    let Ok(last_run) = chrono::DateTime::parse_from_rfc3339(last_run_at) else {
        return false;
    };

    let last_run_utc = last_run.with_timezone(&chrono::Utc);
    let now = chrono::Utc::now();

    // Check if there's at least one scheduled occurrence between last_run and now
    schedule
        .after(&last_run_utc)
        .take(1)
        .any(|next| next < now)
}

/// Execute a catch-up run for a workflow that missed its scheduled execution.
async fn catch_up_run(
    app: &AppHandle,
    workflow_id: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let run = {
        let db_state = app.state::<Mutex<Database>>();
        let db_lock = db_state.lock().map_err(|e| format!("DB lock error: {}", e))?;
        let _workflow = db_lock
            .get_workflow(workflow_id)
            .map_err(|e| format!("Failed to get workflow: {}", e))?;
        db_lock
            .create_workflow_run(workflow_id, "catch-up")
            .map_err(|e| format!("Failed to create run: {}", e))?
    };

    // Emit event for frontend awareness
    let _ = app.emit("workflow-run-started", &run);

    // Mark as completed (actual step execution will be handled by the pipeline executor)
    {
        let db_state = app.state::<Mutex<Database>>();
        let db_lock = db_state.lock().map_err(|e| format!("DB lock error: {}", e))?;
        db_lock
            .complete_workflow_run(&run.id, "completed", None)
            .map_err(|e| format!("Failed to complete run: {}", e))?;
    }

    let _ = app.emit("workflow-run-completed", &run.id);

    Ok(())
}

/// Execute a scheduled run for a workflow.
async fn scheduled_run(
    app: &AppHandle,
    workflow_id: &str,
    schedule_id: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let run = {
        let db_state = app.state::<Mutex<Database>>();
        let db_lock = db_state.lock().map_err(|e| format!("DB lock error: {}", e))?;
        let _workflow = db_lock
            .get_workflow(workflow_id)
            .map_err(|e| format!("Failed to get workflow: {}", e))?;
        db_lock
            .create_workflow_run(workflow_id, "scheduled")
            .map_err(|e| format!("Failed to create run: {}", e))?
    };

    // Emit event for frontend awareness
    let _ = app.emit("workflow-run-started", &run);

    // Mark as completed (actual step execution will be handled by the pipeline executor)
    {
        let db_state = app.state::<Mutex<Database>>();
        let db_lock = db_state.lock().map_err(|e| format!("DB lock error: {}", e))?;
        db_lock
            .complete_workflow_run(&run.id, "completed", None)
            .map_err(|e| format!("Failed to complete run: {}", e))?;
    }

    // Update schedule last_run_at
    {
        let cron_expr = {
            let db_state = app.state::<Mutex<Database>>();
            let db_lock = db_state.lock().map_err(|e| format!("DB lock error: {}", e))?;
            let schedule = db_lock
                .get_schedule(schedule_id)
                .map_err(|e| format!("Failed to get schedule: {}", e))?;
            schedule.cron_expression
        };

        let now = chrono::Utc::now().to_rfc3339();
        let next_runs = compute_next_runs(&cron_expr, 1)
            .ok()
            .and_then(|v| v.into_iter().next());

        let db_state = app.state::<Mutex<Database>>();
        let db_lock = db_state.lock().map_err(|e| format!("DB lock error: {}", e))?;
        db_lock
            .update_schedule_last_run(schedule_id, &now, next_runs.as_deref())
            .map_err(|e| format!("Failed to update schedule: {}", e))?;
    }

    let _ = app.emit("workflow-run-completed", &run.id);

    Ok(())
}

/// Register a single new schedule job (called when user creates/updates a schedule).
pub async fn add_schedule_job(
    sched: &JobScheduler,
    app: AppHandle,
    workflow_id: String,
    schedule_id: String,
    cron_expression: String,
) -> Result<uuid::Uuid, Box<dyn std::error::Error + Send + Sync>> {
    let job_id = sched
        .add(Job::new_async(
            cron_expression.as_str(),
            move |_uuid, _lock| {
                let app = app.clone();
                let id = workflow_id.clone();
                let sid = schedule_id.clone();
                Box::pin(async move {
                    if let Err(e) = scheduled_run(&app, &id, &sid).await {
                        eprintln!("Scheduled run failed for workflow {}: {}", id, e);
                    }
                })
            },
        )?)
        .await?;

    Ok(job_id)
}

/// Compute the next N run times for a cron expression from now.
/// Returns ISO 8601 strings. Used by CronPreview via a Tauri command.
pub fn compute_next_runs(cron_expression: &str, count: usize) -> Result<Vec<String>, String> {
    use cron::Schedule;
    use std::str::FromStr;

    let schedule = Schedule::from_str(cron_expression)
        .map_err(|e| format!("Invalid cron expression: {}", e))?;

    let now = chrono::Utc::now();
    let runs: Vec<String> = schedule
        .after(&now)
        .take(count)
        .map(|dt| dt.to_rfc3339())
        .collect();

    Ok(runs)
}
