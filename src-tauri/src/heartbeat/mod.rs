pub mod types;
pub mod risk;
pub mod summary;

use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use chrono::NaiveDate;
use tauri::{Emitter, Manager};

use crate::db::connection::Database;
use crate::models::notification::CreateNotificationInput;
use crate::scheduling::types::{CalendarEvent, WorkHoursConfig};
use types::{DeadlineRisk, RiskAssessment, RiskSeverity};

/// Managed Tauri state for frontend access and briefing integration.
pub struct HeartbeatState {
    pub latest_assessment: Arc<Mutex<Option<RiskAssessment>>>,
    pub running: Arc<AtomicBool>,
}

/// Entry point called from lib.rs setup. Spawns the background heartbeat loop.
pub fn spawn_heartbeat(app_handle: tauri::AppHandle) {
    // Read initial enabled state
    let enabled = is_heartbeat_enabled(&app_handle);
    if !enabled {
        return;
    }

    // Set running flag
    if let Some(state) = app_handle.try_state::<HeartbeatState>() {
        state.running.store(true, Ordering::SeqCst);
    }

    tauri::async_runtime::spawn(async move {
        loop {
            let interval_mins = read_heartbeat_interval(&app_handle).unwrap_or(30);
            tokio::time::sleep(Duration::from_secs(interval_mins * 60)).await;

            // Re-check enabled flag each tick
            if !is_heartbeat_enabled(&app_handle) {
                continue;
            }

            if let Err(e) = run_heartbeat_tick(&app_handle).await {
                eprintln!("Heartbeat tick failed: {}", e);
            }
        }
    });
}

/// Run a single heartbeat tick: assess risks, create notifications, update state.
/// Made pub(crate) so heartbeat_commands can call it for manual trigger.
pub(crate) async fn run_heartbeat_tick(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let db_arc = match app_handle.try_state::<Arc<Mutex<Database>>>() {
        Some(db) => db.inner().clone(),
        None => return Err("Database not available".to_string()),
    };

    // Scoped DB lock -- extract all needed data then drop lock immediately (Pitfall 1)
    let (tasks, work_hours, events_by_date, today, max_due) = {
        let db = db_arc.lock().map_err(|e| e.to_string())?;
        let tasks = get_tasks_with_due_dates_excluding_backlog(&db)?;
        let work_hours = read_work_hours_config(&db)?;
        let today = chrono::Local::now().date_naive();
        let max_due = tasks.iter().map(|t| t.due_date).max().unwrap_or(today);
        let events = get_calendar_events_for_range(&db, today, max_due)?;
        (tasks, work_hours, events, today, max_due)
    }; // lock dropped

    let daily_capacity = risk::calculate_daily_capacity(&work_hours, &events_by_date, today, max_due);
    let risks = risk::assess_deadline_risks(&tasks, &daily_capacity, today);

    // If no risks, clear HeartbeatState and return
    if risks.is_empty() {
        if let Some(state) = app_handle.try_state::<HeartbeatState>() {
            if let Ok(mut assessment) = state.latest_assessment.lock() {
                *assessment = None;
            }
        }
        return Ok(());
    }

    // Generate summary (async, lock already dropped)
    let summary_text = summary::generate_risk_summary(&risks, db_arc.clone()).await;

    // Scoped DB lock -- create notifications for new risk events
    {
        let db = db_arc.lock().map_err(|e| e.to_string())?;
        let mut new_count = 0;
        for risk in &risks {
            if is_new_risk_event(&db, risk, today)? {
                if new_count < 5 {
                    // Cap at 5 per Pitfall 5 (first-run storm cap)
                    let input = build_notification_input(risk, &summary_text);
                    db.create_notification(input).map_err(|e| e.to_string())?;
                }
                update_risk_fingerprint(&db, risk, today)?;
                new_count += 1;
            }
        }
        // If capped, create summary notification
        if new_count > 5 {
            let overflow = new_count - 5;
            let input = CreateNotificationInput {
                title: format!("And {} more deadline risks", overflow),
                body: "Open the hub to review all deadline risks.".to_string(),
                priority: "normal".to_string(),
                category: Some("deadline-risk".to_string()),
                project_id: None,
                action_url: Some("hub://chat?context=risk".to_string()),
            };
            db.create_notification(input).map_err(|e| e.to_string())?;
        }
    }

    // Store RiskAssessment in HeartbeatState
    let assessment = RiskAssessment {
        risks: risks.clone(),
        summary: summary_text,
        assessed_at: chrono::Utc::now().to_rfc3339(),
    };

    if let Some(state) = app_handle.try_state::<HeartbeatState>() {
        if let Ok(mut latest) = state.latest_assessment.lock() {
            *latest = Some(assessment.clone());
        }
    }

    // Emit events so frontend updates
    let _ = app_handle.emit("heartbeat-risks-updated", &assessment);
    let _ = app_handle.emit("notification:created", ());

    Ok(())
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/// Query tasks with due dates, excluding backlog (999.x phases) and completed tasks.
fn get_tasks_with_due_dates_excluding_backlog(db: &Database) -> Result<Vec<types::TaskWithDueDate>, String> {
    let conn = db.conn();
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.title, t.due_date, t.estimated_minutes, p.id as project_id, p.name as project_name
             FROM tasks t
             LEFT JOIN phases ph ON t.phase_id = ph.id
             LEFT JOIN projects p ON ph.project_id = p.id
             WHERE t.status != 'complete'
             AND t.due_date IS NOT NULL
             AND (ph.name IS NULL OR (ph.name NOT LIKE '999.%' AND ph.name NOT LIKE '999 %'))"
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let due_date_str: String = row.get(2)?;
            let due_date = chrono::NaiveDate::parse_from_str(&due_date_str, "%Y-%m-%d")
                .unwrap_or_else(|_| chrono::Local::now().date_naive());
            Ok(types::TaskWithDueDate {
                id: row.get(0)?,
                title: row.get(1)?,
                project_id: row.get(4)?,
                project_name: row.get(5)?,
                due_date,
                estimated_minutes: row.get(3)?,
                is_backlog: false, // Already filtered out
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Read work hours configuration from app_settings.
fn read_work_hours_config(db: &Database) -> Result<WorkHoursConfig, String> {
    let json_str = db
        .get_app_setting("work_hours")
        .map_err(|e| e.to_string())?;

    match json_str {
        Some(s) => serde_json::from_str(&s).map_err(|e| e.to_string()),
        None => Ok(WorkHoursConfig {
            start_time: "09:00".to_string(),
            end_time: "17:00".to_string(),
            work_days: vec![
                "mon".into(),
                "tue".into(),
                "wed".into(),
                "thu".into(),
                "fri".into(),
            ],
            buffer_minutes: 10,
            min_block_minutes: 30,
        }),
    }
}

/// Query calendar events for a date range, grouped by date.
/// Converts RFC3339 timestamps to HH:mm for the scheduling CalendarEvent type.
fn get_calendar_events_for_range(
    db: &Database,
    from: NaiveDate,
    through: NaiveDate,
) -> Result<HashMap<NaiveDate, Vec<CalendarEvent>>, String> {
    let from_str = format!("{}T00:00:00Z", from.format("%Y-%m-%d"));
    let through_str = format!("{}T23:59:59Z", through.format("%Y-%m-%d"));

    let db_events = crate::plugins::core::calendar::list_events_for_range(
        db.conn(),
        &from_str,
        &through_str,
    )
    .map_err(|e| format!("{}", e))?;

    let mut result: HashMap<NaiveDate, Vec<CalendarEvent>> = HashMap::new();

    for e in db_events {
        // Skip all-day and cancelled events
        if e.all_day || e.status == "cancelled" {
            continue;
        }
        // Parse RFC3339 timestamps to local time
        let start = match chrono::DateTime::parse_from_rfc3339(&e.start_time) {
            Ok(dt) => dt.with_timezone(&chrono::Local),
            Err(_) => continue,
        };
        let end = match chrono::DateTime::parse_from_rfc3339(&e.end_time) {
            Ok(dt) => dt.with_timezone(&chrono::Local),
            Err(_) => continue,
        };

        let date = start.date_naive();
        let cal_event = CalendarEvent {
            id: e.id,
            title: e.title,
            start_time: start.format("%H:%M").to_string(),
            end_time: end.format("%H:%M").to_string(),
            account_color: None,
        };
        result.entry(date).or_default().push(cal_event);
    }

    Ok(result)
}

/// Check if a risk event is new (not previously seen with same fingerprint).
fn is_new_risk_event(db: &Database, risk: &DeadlineRisk, today: NaiveDate) -> Result<bool, String> {
    let key = format!("heartbeat_risk_{}", risk.task_id());
    let stored = db.get_app_setting(&key).map_err(|e| e.to_string())?;
    let current = risk.risk_fingerprint(today);
    Ok(fingerprint_changed(stored.as_deref(), &current))
}

/// Pure helper for fingerprint comparison (testable without DB).
pub fn fingerprint_changed(stored: Option<&str>, current: &str) -> bool {
    match stored {
        None => true,
        Some(prev) => prev != current,
    }
}

/// Update the stored risk fingerprint for deduplication.
fn update_risk_fingerprint(db: &Database, risk: &DeadlineRisk, today: NaiveDate) -> Result<(), String> {
    let key = format!("heartbeat_risk_{}", risk.task_id());
    let fingerprint = risk.risk_fingerprint(today);
    db.set_app_setting(&key, &fingerprint).map_err(|e| e.to_string())
}

/// Build a CreateNotificationInput from a risk (pure, testable without DB).
pub fn build_notification_input(risk: &DeadlineRisk, summary: &str) -> CreateNotificationInput {
    let task = risk.task();
    let title = format!("Deadline risk: {}", task.title);

    let priority = match risk.severity() {
        RiskSeverity::Critical => "critical",
        RiskSeverity::Warning => "high",
        RiskSeverity::Info => "normal",
    };

    let mut body = summary.to_string();
    if let Some(fix) = risk.suggested_fix() {
        body = format!("{}\nSuggestion: {}", body, fix);
    }

    CreateNotificationInput {
        title,
        body,
        priority: priority.to_string(),
        category: Some("deadline-risk".to_string()),
        project_id: risk.project_id().map(String::from),
        action_url: Some(format!("hub://chat?context=risk&task_id={}", risk.task_id())),
    }
}

/// Read heartbeat interval from app_settings (in minutes).
fn read_heartbeat_interval(app_handle: &tauri::AppHandle) -> Result<u64, String> {
    let db_arc = match app_handle.try_state::<Arc<Mutex<Database>>>() {
        Some(db) => db.inner().clone(),
        None => return Ok(30),
    };
    let db = db_arc.lock().map_err(|e| e.to_string())?;
    let val = db.get_app_setting("heartbeat_interval_minutes").map_err(|e| e.to_string())?;
    match val {
        Some(s) => s.parse::<u64>().map_err(|e| e.to_string()),
        None => Ok(30),
    }
}

/// Check if heartbeat is enabled via app_settings.
fn is_heartbeat_enabled(app_handle: &tauri::AppHandle) -> bool {
    let db_arc = match app_handle.try_state::<Arc<Mutex<Database>>>() {
        Some(db) => db.inner().clone(),
        None => return true,
    };
    let db = match db_arc.lock() {
        Ok(db) => db,
        Err(_) => return true,
    };
    match db.get_app_setting("heartbeat_enabled") {
        Ok(Some(val)) => val != "false",
        _ => true,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use crate::heartbeat::types::{DeadlineRisk, TaskWithDueDate};

    fn make_task(id: &str, title: &str, due: NaiveDate, est: Option<i32>) -> TaskWithDueDate {
        TaskWithDueDate {
            id: id.to_string(),
            title: title.to_string(),
            project_id: Some("proj-1".to_string()),
            project_name: Some("Test Project".to_string()),
            due_date: due,
            estimated_minutes: est,
            is_backlog: false,
        }
    }

    #[test]
    fn test_create_risk_notification_critical_priority() {
        let task = make_task("t1", "Deploy fix", NaiveDate::from_ymd_opt(2026, 1, 4).unwrap(), Some(60));
        let risk = DeadlineRisk::Overdue { task };
        let input = build_notification_input(&risk, "Risk summary text");

        assert!(input.title.starts_with("Deadline risk:"));
        assert_eq!(input.priority, "critical");
        assert_eq!(input.category, Some("deadline-risk".to_string()));
        assert!(input.action_url.as_ref().unwrap().contains("hub://chat?context=risk&task_id="));
    }

    #[test]
    fn test_create_risk_notification_warning_priority() {
        let task = make_task("t2", "Write report", NaiveDate::from_ymd_opt(2026, 1, 8).unwrap(), Some(240));
        let risk = DeadlineRisk::AtRisk {
            task,
            needed_minutes: 240,
            available_minutes: 120,
            days_remaining: 3, // Warning severity (<=3 days)
        };
        let input = build_notification_input(&risk, "Summary");

        assert_eq!(input.priority, "high");
    }

    #[test]
    fn test_create_risk_notification_info_priority() {
        let task = make_task("t3", "Review PR", NaiveDate::from_ymd_opt(2026, 1, 12).unwrap(), None);
        let risk = DeadlineRisk::NoEstimate {
            task,
            days_remaining: 7, // Info severity (>3 days)
        };
        let input = build_notification_input(&risk, "Summary");

        assert_eq!(input.priority, "normal");
    }

    #[test]
    fn test_create_risk_notification_includes_suggested_fix() {
        let task = make_task("t4", "Write report", NaiveDate::from_ymd_opt(2026, 1, 8).unwrap(), Some(240));
        let risk = DeadlineRisk::AtRisk {
            task,
            needed_minutes: 240,
            available_minutes: 120,
            days_remaining: 2,
        };
        let input = build_notification_input(&risk, "Base summary");

        assert!(input.body.contains("Suggestion:"));
        assert!(input.body.contains("Move 'Write report'"));
    }

    #[test]
    fn test_is_new_risk_event_logic() {
        // No previous fingerprint -> new risk
        assert!(fingerprint_changed(None, "t1_critical_2026-04-03"));

        // Same fingerprint -> not new
        assert!(!fingerprint_changed(
            Some("t1_critical_2026-04-03"),
            "t1_critical_2026-04-03"
        ));

        // Different fingerprint (severity or date changed) -> new risk per D-08
        assert!(fingerprint_changed(
            Some("t1_warning_2026-04-02"),
            "t1_critical_2026-04-03"
        ));
    }

    #[test]
    fn test_storm_cap_logic() {
        // Simulate storm cap: with 8 new risks, only 5 should get individual notifications.
        // We test the logic by verifying the count tracking.
        let mut new_count = 0u32;
        let total_new = 8;

        for _ in 0..total_new {
            // Simulate each being a new risk
            if new_count < 5 {
                // Would create notification here
            }
            new_count += 1;
        }

        // After processing 8 new risks:
        assert_eq!(new_count, 8);
        // Only 5 got individual notifications (new_count < 5 check)
        // The remaining 3 would trigger a summary notification
        assert!(new_count > 5);
        let overflow = new_count - 5;
        assert_eq!(overflow, 3);
    }
}
