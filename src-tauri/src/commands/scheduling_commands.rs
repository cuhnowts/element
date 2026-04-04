use rusqlite::OptionalExtension;
use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::models::task::TaskPriority;
use crate::plugins::core::calendar as cal_mod;
use crate::scheduling::types::{ScheduleBlock, TaskWithPriority, WorkHoursConfig};

/// Default work hours used when none are configured in the database.
fn default_work_hours() -> WorkHoursConfig {
    WorkHoursConfig {
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
    }
}

/// Query non-complete, non-backlog tasks that have no confirmed schedule block for the given date.
fn query_schedulable_tasks(db: &Database, date: &str) -> Result<Vec<TaskWithPriority>, String> {
    let conn = db.conn();
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.title, t.priority, t.due_date, t.estimated_minutes
             FROM tasks t
             LEFT JOIN phases p ON t.phase_id = p.id
             WHERE t.status != 'complete'
             AND (p.sort_order IS NULL OR p.sort_order < 999)
             AND t.id NOT IN (
                 SELECT sb.task_id FROM scheduled_blocks sb
                 WHERE sb.schedule_date = ?1 AND sb.is_confirmed = 1 AND sb.task_id IS NOT NULL
             )
             ORDER BY t.created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![date], |row| {
            let priority_str: String = row.get(2)?;
            let due_date_str: Option<String> = row.get(3)?;
            let due_date =
                due_date_str.and_then(|s| chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());
            let priority = TaskPriority::from_db_str(&priority_str).unwrap_or(TaskPriority::Medium);

            Ok(TaskWithPriority {
                id: row.get(0)?,
                title: row.get(1)?,
                priority,
                due_date,
                estimated_minutes: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// Generate a schedule for a given date using a direct `&Database` reference.
///
/// This is the shared implementation used by both the Tauri command and the
/// manifest builder (which has no async/Tauri context).
pub fn generate_schedule_for_date(
    db: &Database,
    date: &str,
) -> Result<Vec<ScheduleBlock>, String> {
    // 1. Get work hours (default to 09:00-17:00 Mon-Fri if not configured)
    let work_hours = read_work_hours_from_db(db)?.unwrap_or_else(default_work_hours);

    // 2. Check if date's day-of-week is in work_days
    let parsed_date = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid date format: {}", e))?;
    let day_str = parsed_date.format("%a").to_string().to_lowercase();
    let day_abbrev = day_str[..3].to_string();

    if !work_hours.work_days.contains(&day_abbrev) {
        return Ok(vec![]);
    }

    // 3. Fetch real calendar events for this date and convert to scheduler format
    let calendar_events: Vec<crate::scheduling::types::CalendarEvent> = {
        let date_start = format!("{}T00:00:00Z", date);
        let date_end = format!("{}T23:59:59Z", date);
        match cal_mod::list_events_for_range(db.conn(), &date_start, &date_end) {
            Ok(db_events) => db_events
                .iter()
                .filter(|e| !e.all_day) // All-day events don't block specific time slots
                .filter(|e| e.status != "cancelled") // Skip cancelled events
                .filter_map(|e| {
                    // Parse RFC3339 timestamps to local HH:mm for the scheduling algorithm
                    let start = chrono::DateTime::parse_from_rfc3339(&e.start_time).ok()?;
                    let end = chrono::DateTime::parse_from_rfc3339(&e.end_time).ok()?;
                    let local_start = start.with_timezone(&chrono::Local);
                    let local_end = end.with_timezone(&chrono::Local);
                    Some(crate::scheduling::types::CalendarEvent {
                        id: e.id.clone(),
                        title: e.title.clone(),
                        start_time: local_start.format("%H:%M").to_string(),
                        end_time: local_end.format("%H:%M").to_string(),
                        account_color: None,
                    })
                })
                .collect(),
            Err(e) => {
                eprintln!("Warning: failed to load calendar events for {}: {}", date, e);
                vec![] // Graceful fallback -- schedule without calendar awareness
            }
        }
    };

    // 4. Get non-backlog tasks with no confirmed schedule block for this date
    let tasks = query_schedulable_tasks(db, date)?;

    // 5. Find open blocks
    let open_blocks = crate::scheduling::time_blocks::find_open_blocks(
        &work_hours,
        &calendar_events,
        work_hours.buffer_minutes,
        work_hours.min_block_minutes,
    );

    // 6. Assign tasks to blocks
    let today = chrono::Local::now().date_naive();
    let schedule_blocks =
        crate::scheduling::assignment::assign_tasks_to_blocks(&open_blocks, &tasks, date, today);

    // 7. Sort by start_time and return
    let mut all_blocks = schedule_blocks;
    all_blocks.sort_by(|a, b| a.start_time.cmp(&b.start_time));

    Ok(all_blocks)
}

fn read_work_hours_from_db(db: &Database) -> Result<Option<WorkHoursConfig>, String> {
    let conn = db.conn();
    let mut stmt = conn
        .prepare("SELECT start_time, end_time, work_days, buffer_minutes, min_block_minutes FROM work_hours WHERE id = 1")
        .map_err(|e| e.to_string())?;

    stmt.query_row([], |row| {
        let work_days_str: String = row.get(2)?;
        let work_days: Vec<String> = work_days_str.split(',').map(|s| s.trim().to_string()).collect();
        Ok(WorkHoursConfig {
            start_time: row.get(0)?,
            end_time: row.get(1)?,
            work_days,
            buffer_minutes: row.get(3)?,
            min_block_minutes: row.get(4)?,
        })
    })
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_work_hours(
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<Option<WorkHoursConfig>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    read_work_hours_from_db(&db)
}

#[tauri::command]
pub async fn save_work_hours(
    config: WorkHoursConfig,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    app: AppHandle,
) -> Result<WorkHoursConfig, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    let work_days_str = config.work_days.join(",");

    db.conn()
        .execute(
            "INSERT OR REPLACE INTO work_hours (id, start_time, end_time, work_days, buffer_minutes, min_block_minutes, updated_at) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                config.start_time,
                config.end_time,
                work_days_str,
                config.buffer_minutes,
                config.min_block_minutes,
                now,
            ],
        )
        .map_err(|e| e.to_string())?;

    app.emit("work-hours-updated", &config)
        .map_err(|e| e.to_string())?;

    Ok(config)
}

#[tauri::command]
pub async fn generate_schedule(
    date: String,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<Vec<ScheduleBlock>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    generate_schedule_for_date(&db, &date)
}

#[tauri::command]
pub async fn apply_schedule(
    blocks: Vec<ScheduleBlock>,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    app: AppHandle,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;

    if blocks.is_empty() {
        return Ok(());
    }

    let schedule_date = &blocks[0].schedule_date;
    let now = chrono::Utc::now().to_rfc3339();

    // 1. DELETE existing scheduled_blocks for the same schedule_date
    db.conn()
        .execute(
            "DELETE FROM scheduled_blocks WHERE schedule_date = ?1",
            rusqlite::params![schedule_date],
        )
        .map_err(|e| e.to_string())?;

    // 2. INSERT all blocks
    {
        let conn = db.conn();
        let mut stmt = conn
            .prepare(
                "INSERT INTO scheduled_blocks (id, schedule_date, task_id, block_type, start_time, end_time, is_confirmed, source_event_id, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8)"
            )
            .map_err(|e| e.to_string())?;

        for block in &blocks {
            stmt.execute(rusqlite::params![
                block.id,
                block.schedule_date,
                block.task_id,
                block.block_type.to_string(),
                block.start_time,
                block.end_time,
                block.event_title,  // stored as source_event_id for meeting blocks
                now,
            ])
            .map_err(|e| e.to_string())?;
        }
    }

    // 3. Emit schedule-applied event
    app.emit("schedule-applied", schedule_date)
        .map_err(|e| e.to_string())?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Calendar tool Tauri commands (Phase 29, Plan 02)
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn list_calendar_events_for_range(
    start_date: String,
    end_date: String,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let conn = db.conn();
    let start_iso = format!("{}T00:00:00", start_date);
    let end_iso = format!("{}T23:59:59", end_date);
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, location, start_time, end_time, all_day, status
             FROM calendar_events WHERE start_time >= ?1 AND end_time <= ?2 ORDER BY start_time",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![start_iso, end_iso], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "title": row.get::<_, String>(1)?,
                "description": row.get::<_, String>(2)?,
                "location": row.get::<_, Option<String>>(3)?,
                "start_time": row.get::<_, String>(4)?,
                "end_time": row.get::<_, String>(5)?,
                "all_day": row.get::<_, bool>(6)?,
                "status": row.get::<_, String>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_available_slots(
    date: String,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let work_hours = read_work_hours_from_db(&db)?.unwrap_or_else(default_work_hours);

    let conn = db.conn();
    let start_iso = format!("{}T00:00:00", date);
    let end_iso = format!("{}T23:59:59", date);

    // Fetch calendar events for this date, convert ISO datetime -> HH:mm
    let mut evt_stmt = conn
        .prepare(
            "SELECT id, title, start_time, end_time FROM calendar_events
             WHERE start_time >= ?1 AND start_time < ?2",
        )
        .map_err(|e| e.to_string())?;
    let cal_events: Vec<crate::scheduling::types::CalendarEvent> = evt_stmt
        .query_map(rusqlite::params![start_iso, end_iso], |row| {
            let start_full: String = row.get(2)?;
            let end_full: String = row.get(3)?;
            let start_hm = if start_full.len() >= 16 {
                start_full[11..16].to_string()
            } else {
                "00:00".to_string()
            };
            let end_hm = if end_full.len() >= 16 {
                end_full[11..16].to_string()
            } else {
                "23:59".to_string()
            };
            Ok(crate::scheduling::types::CalendarEvent {
                id: row.get(0)?,
                title: row.get(1)?,
                start_time: start_hm,
                end_time: end_hm,
                account_color: None,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Fetch existing confirmed work blocks as additional occupied ranges
    let mut blk_stmt = conn
        .prepare(
            "SELECT start_time, end_time FROM scheduled_blocks
             WHERE schedule_date = ?1 AND is_confirmed = 1",
        )
        .map_err(|e| e.to_string())?;
    let work_blocks: Vec<(String, String)> = blk_stmt
        .query_map(rusqlite::params![&date], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Step 1: Get open blocks considering calendar events (with buffer)
    let open_after_cal = crate::scheduling::time_blocks::find_open_blocks(
        &work_hours,
        &cal_events,
        work_hours.buffer_minutes,
        work_hours.min_block_minutes,
    );

    // Step 2: Subtract confirmed work blocks from open blocks
    let mut result_slots: Vec<serde_json::Value> = Vec::new();
    for open in &open_after_cal {
        let mut sub_ranges = vec![(open.start, open.end)];
        for (wb_start_str, wb_end_str) in &work_blocks {
            let wb_start = chrono::NaiveTime::parse_from_str(wb_start_str, "%H:%M")
                .unwrap_or(chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap());
            let wb_end = chrono::NaiveTime::parse_from_str(wb_end_str, "%H:%M")
                .unwrap_or(chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap());
            let mut new_ranges = Vec::new();
            for (rs, re) in &sub_ranges {
                if wb_end <= *rs || wb_start >= *re {
                    new_ranges.push((*rs, *re));
                } else {
                    if *rs < wb_start {
                        new_ranges.push((*rs, wb_start));
                    }
                    if wb_end < *re {
                        new_ranges.push((wb_end, *re));
                    }
                }
            }
            sub_ranges = new_ranges;
        }
        for (s, e) in sub_ranges {
            let dur = (e - s).num_minutes() as i32;
            if dur >= work_hours.min_block_minutes {
                result_slots.push(serde_json::json!({
                    "start": s.format("%H:%M").to_string(),
                    "end": e.format("%H:%M").to_string(),
                    "duration_minutes": dur,
                }));
            }
        }
    }

    Ok(result_slots)
}

#[tauri::command]
pub async fn create_work_block(
    date: String,
    task_id: String,
    start_time: String,
    end_time: String,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    app: AppHandle,
) -> Result<serde_json::Value, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    // Verify task exists
    let task_exists: bool = db
        .conn()
        .prepare("SELECT 1 FROM tasks WHERE id = ?1")
        .map_err(|e| e.to_string())?
        .exists(rusqlite::params![&task_id])
        .map_err(|e| e.to_string())?;
    if !task_exists {
        return Err("Task not found. Search for a task first, then schedule it.".to_string());
    }
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    db.conn()
        .execute(
            "INSERT INTO scheduled_blocks (id, schedule_date, task_id, block_type, start_time, end_time, is_confirmed, created_at)
             VALUES (?1, ?2, ?3, 'work', ?4, ?5, 1, ?6)",
            rusqlite::params![&id, &date, &task_id, &start_time, &end_time, &now],
        )
        .map_err(|e| e.to_string())?;
    app.emit("schedule-applied", &date)
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "id": id,
        "date": date,
        "taskId": task_id,
        "startTime": start_time,
        "endTime": end_time,
    }))
}

#[tauri::command]
pub async fn move_work_block(
    block_id: String,
    start_time: String,
    end_time: String,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    app: AppHandle,
) -> Result<serde_json::Value, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let schedule_date: String = db
        .conn()
        .prepare("SELECT schedule_date FROM scheduled_blocks WHERE id = ?1")
        .map_err(|e| e.to_string())?
        .query_row(rusqlite::params![&block_id], |row| row.get(0))
        .map_err(|_| "Work block not found.".to_string())?;
    db.conn()
        .execute(
            "UPDATE scheduled_blocks SET start_time = ?1, end_time = ?2 WHERE id = ?3",
            rusqlite::params![&start_time, &end_time, &block_id],
        )
        .map_err(|e| e.to_string())?;
    app.emit("schedule-applied", &schedule_date)
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "blockId": block_id,
        "startTime": start_time,
        "endTime": end_time,
    }))
}

#[tauri::command]
pub async fn delete_work_block(
    block_id: String,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    app: AppHandle,
) -> Result<serde_json::Value, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let schedule_date: String = db
        .conn()
        .prepare("SELECT schedule_date FROM scheduled_blocks WHERE id = ?1")
        .map_err(|e| e.to_string())?
        .query_row(rusqlite::params![&block_id], |row| row.get(0))
        .map_err(|_| "Work block not found.".to_string())?;
    db.conn()
        .execute(
            "DELETE FROM scheduled_blocks WHERE id = ?1",
            rusqlite::params![&block_id],
        )
        .map_err(|e| e.to_string())?;
    app.emit("schedule-applied", &schedule_date)
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "blockId": block_id,
        "deleted": true,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calendar_event_type_conversion() {
        // Verify the RFC3339 to HH:MM conversion logic works correctly
        let db_event = cal_mod::CalendarEvent {
            id: "evt-1".to_string(),
            account_id: "acct-1".to_string(),
            title: "Team Meeting".to_string(),
            description: String::new(),
            location: None,
            start_time: "2026-03-17T14:00:00Z".to_string(),
            end_time: "2026-03-17T15:00:00Z".to_string(),
            all_day: false,
            attendees: vec![],
            status: "confirmed".to_string(),
            updated_at: String::new(),
        };

        let start = chrono::DateTime::parse_from_rfc3339(&db_event.start_time).unwrap();
        let end = chrono::DateTime::parse_from_rfc3339(&db_event.end_time).unwrap();
        let local_start = start.with_timezone(&chrono::Local);
        let local_end = end.with_timezone(&chrono::Local);

        let scheduler_event = crate::scheduling::types::CalendarEvent {
            id: db_event.id.clone(),
            title: db_event.title.clone(),
            start_time: local_start.format("%H:%M").to_string(),
            end_time: local_end.format("%H:%M").to_string(),
            account_color: None,
        };

        // Verify format is HH:MM
        assert!(scheduler_event.start_time.len() == 5, "Start time should be HH:MM format");
        assert!(scheduler_event.end_time.len() == 5, "End time should be HH:MM format");
        assert!(scheduler_event.start_time.contains(':'), "Start time should contain :");
    }

    #[test]
    fn test_all_day_events_filtered_out() {
        let all_day = cal_mod::CalendarEvent {
            id: "evt-allday".to_string(),
            account_id: "acct-1".to_string(),
            title: "Vacation".to_string(),
            description: String::new(),
            location: None,
            start_time: "2026-03-17T00:00:00Z".to_string(),
            end_time: "2026-03-18T00:00:00Z".to_string(),
            all_day: true,
            attendees: vec![],
            status: "confirmed".to_string(),
            updated_at: String::new(),
        };

        let events = vec![all_day];
        let filtered: Vec<_> = events
            .iter()
            .filter(|e| !e.all_day)
            .filter(|e| e.status != "cancelled")
            .collect();

        assert!(filtered.is_empty(), "All-day events should be filtered out");
    }

    #[test]
    fn test_cancelled_events_filtered_out() {
        let cancelled = cal_mod::CalendarEvent {
            id: "evt-cancel".to_string(),
            account_id: "acct-1".to_string(),
            title: "Cancelled Meeting".to_string(),
            description: String::new(),
            location: None,
            start_time: "2026-03-17T14:00:00Z".to_string(),
            end_time: "2026-03-17T15:00:00Z".to_string(),
            all_day: false,
            attendees: vec![],
            status: "cancelled".to_string(),
            updated_at: String::new(),
        };

        let events = vec![cancelled];
        let filtered: Vec<_> = events
            .iter()
            .filter(|e| !e.all_day)
            .filter(|e| e.status != "cancelled")
            .collect();

        assert!(filtered.is_empty(), "Cancelled events should be filtered out");
    }
}
