use rusqlite::OptionalExtension;
use tauri::{AppHandle, Emitter, State};

use crate::db::connection::Database;
use crate::models::task::TaskPriority;
use crate::scheduling::types::{ScheduleBlock, TaskWithPriority, WorkHoursConfig};

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

    // 1. Get work hours (default to 09:00-17:00 Mon-Fri if not configured)
    let work_hours = read_work_hours_from_db(&db)?
        .unwrap_or(WorkHoursConfig {
            start_time: "09:00".to_string(),
            end_time: "17:00".to_string(),
            work_days: vec!["mon".into(), "tue".into(), "wed".into(), "thu".into(), "fri".into()],
            buffer_minutes: 10,
            min_block_minutes: 30,
        });

    // 2. Check if date's day-of-week is in work_days
    let parsed_date = chrono::NaiveDate::parse_from_str(&date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid date format: {}", e))?;
    let day_str = parsed_date.format("%a").to_string().to_lowercase();
    let day_abbrev = day_str[..3].to_string();

    if !work_hours.work_days.contains(&day_abbrev) {
        return Ok(vec![]);
    }

    // 3. Calendar events placeholder
    // TODO: Read from calendar_events table once Phase 4 calendar integration is wired up.
    // For now, use an empty vec -- the scheduling algorithm will treat the entire work day as open.
    let calendar_events: Vec<crate::scheduling::types::CalendarEvent> = vec![];

    // 4. Get tasks with status != 'complete' that have no confirmed schedule block for this date
    let tasks: Vec<TaskWithPriority> = {
        let conn = db.conn();
        let mut stmt = conn
            .prepare(
                "SELECT t.id, t.title, t.priority, t.due_date, t.estimated_minutes
                 FROM tasks t
                 WHERE t.status != 'complete'
                 AND t.id NOT IN (
                     SELECT sb.task_id FROM scheduled_blocks sb
                     WHERE sb.schedule_date = ?1 AND sb.is_confirmed = 1 AND sb.task_id IS NOT NULL
                 )
                 ORDER BY t.created_at ASC"
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt.query_map(rusqlite::params![&date], |row| {
            let priority_str: String = row.get(2)?;
            let due_date_str: Option<String> = row.get(3)?;
            let due_date = due_date_str.and_then(|s| chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok());
            let priority = TaskPriority::from_db_str(&priority_str)
                .unwrap_or(TaskPriority::Medium);

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
            .map_err(|e| e.to_string())?
    };

    // 5. Find open blocks
    let open_blocks = crate::scheduling::time_blocks::find_open_blocks(
        &work_hours,
        &calendar_events,
        work_hours.buffer_minutes,
        work_hours.min_block_minutes,
    );

    // 6. Assign tasks to blocks
    let today = chrono::Local::now().date_naive();
    let schedule_blocks = crate::scheduling::assignment::assign_tasks_to_blocks(
        &open_blocks,
        &tasks,
        &date,
        today,
    );

    // 7. No calendar events to create Meeting/Buffer blocks for (placeholder),
    //    so just return the work blocks sorted by start_time
    let mut all_blocks = schedule_blocks;
    all_blocks.sort_by(|a, b| a.start_time.cmp(&b.start_time));

    Ok(all_blocks)
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
