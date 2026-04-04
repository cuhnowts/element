use std::sync::{Arc, Mutex};

use crate::commands::scheduling_commands::generate_schedule_for_date;
use crate::db::connection::Database;
use crate::models::task::TaskStatus;

/// Cached manifest state managed by Tauri.
/// The cached string is rebuilt on DB mutations (debounced 5s).
pub struct ManifestState {
    pub cached: Arc<Mutex<String>>,
}

/// Trigger for debounced manifest rebuilds. Wraps a tokio mpsc sender.
pub struct ManifestRebuildTrigger(pub tokio::sync::mpsc::Sender<()>);

/// Build a markdown manifest string summarizing all projects and their phases.
///
/// The manifest stays under 8000 characters (approx 2000-token budget).
/// Only project + phase level with task count summaries are included (no individual task details).
pub fn build_manifest_string(db: &Database) -> Result<String, String> {
    let projects = db
        .list_projects()
        .map_err(|e| format!("Failed to list projects: {}", e))?;

    if projects.is_empty() {
        return Ok("# Project Status\n\nNo projects yet.\n".to_string());
    }

    let now = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();
    let mut manifest = format!("# Project Status\n\nGenerated: {}\n", now);

    for project in &projects {
        manifest.push_str(&format!("\n## {}\n", project.name));

        let phases = db
            .list_phases(&project.id)
            .map_err(|e| format!("Failed to list phases for {}: {}", project.name, e))?;

        let tasks = db
            .list_tasks(&project.id)
            .map_err(|e| format!("Failed to list tasks for {}: {}", project.name, e))?;

        if phases.is_empty() && tasks.is_empty() {
            manifest.push_str("No phases defined.\n");
            continue;
        }

        if phases.is_empty() {
            // Has tasks but no phases
            let completed = tasks
                .iter()
                .filter(|t| t.status == TaskStatus::Complete)
                .count();
            manifest.push_str(&format!(
                "- Unassigned tasks ({}/{} complete)\n",
                completed,
                tasks.len()
            ));
            continue;
        }

        // Build a map of phase_id -> tasks
        let mut tasks_by_phase: std::collections::HashMap<String, Vec<&crate::models::task::Task>> =
            std::collections::HashMap::new();
        let mut unassigned_count = 0usize;
        let mut unassigned_complete = 0usize;

        for task in &tasks {
            match &task.phase_id {
                Some(pid) => {
                    tasks_by_phase.entry(pid.clone()).or_default().push(task);
                }
                None => {
                    unassigned_count += 1;
                    if task.status == TaskStatus::Complete {
                        unassigned_complete += 1;
                    }
                }
            }
        }

        for (i, phase) in phases.iter().enumerate() {
            let phase_tasks = tasks_by_phase.get(&phase.id);
            let total = phase_tasks.map(|t| t.len()).unwrap_or(0);
            let completed = phase_tasks
                .map(|t| t.iter().filter(|tk| tk.status == TaskStatus::Complete).count())
                .unwrap_or(0);
            manifest.push_str(&format!(
                "- Phase {}: {} ({}/{} tasks complete)\n",
                i + 1,
                phase.name,
                completed,
                total
            ));
        }

        if unassigned_count > 0 {
            manifest.push_str(&format!(
                "- Unassigned tasks ({}/{} complete)\n",
                unassigned_complete, unassigned_count
            ));
        }
    }

    // Append today's schedule data
    let schedule_section = build_schedule_section(db)?;
    manifest.push_str(&schedule_section);

    // Enforce 8000 char token budget
    if manifest.len() > 8000 {
        manifest.truncate(7900);
        manifest.push_str("\n\n[...truncated for token budget]\n");
    }

    Ok(manifest)
}

/// Build a manifest section containing today's schedule data.
///
/// Includes: task time slots with priorities, available vs scheduled minutes
/// (with OVERFLOW detection), and a list of tasks without due dates.
pub fn build_schedule_section(db: &Database) -> Result<String, String> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let blocks = generate_schedule_for_date(db, &today)?;

    let mut section = String::from("\n## Today's Schedule\n\n");

    if blocks.is_empty() {
        section.push_str("No tasks scheduled for today.\n");
        // Still show undated tasks even when no schedule
        append_undated_tasks(db, &mut section)?;
        return Ok(section);
    }

    // Calculate totals
    let mut total_task_minutes: i32 = 0;
    let mut total_available_minutes: i32 = 0;

    for block in &blocks {
        let start_mins = parse_time_to_minutes(&block.start_time);
        let end_mins = parse_time_to_minutes(&block.end_time);
        let duration = end_mins - start_mins;
        total_available_minutes += duration;
        if block.task_id.is_some() {
            total_task_minutes += duration;
        }
    }

    section.push_str(&format!(
        "Available: {} min | Scheduled: {} min{}\n\n",
        total_available_minutes,
        total_task_minutes,
        if total_task_minutes > total_available_minutes {
            " (OVERFLOW)"
        } else {
            ""
        }
    ));

    // List scheduled tasks
    for block in &blocks {
        if let Some(ref title) = block.task_title {
            let start_mins = parse_time_to_minutes(&block.start_time);
            let end_mins = parse_time_to_minutes(&block.end_time);
            let duration = end_mins - start_mins;
            let priority = block.task_priority.as_deref().unwrap_or("medium");
            section.push_str(&format!(
                "- {} ({}-{}, {}min, {})\n",
                title, block.start_time, block.end_time, duration, priority
            ));
        }
    }

    // Append undated tasks for suggestion feature
    append_undated_tasks(db, &mut section)?;

    Ok(section)
}

fn parse_time_to_minutes(time: &str) -> i32 {
    let parts: Vec<&str> = time.split(':').collect();
    if parts.len() == 2 {
        let h: i32 = parts[0].parse().unwrap_or(0);
        let m: i32 = parts[1].parse().unwrap_or(0);
        h * 60 + m
    } else {
        0
    }
}

fn append_undated_tasks(db: &Database, section: &mut String) -> Result<(), String> {
    let undated = get_undated_tasks(db)?;
    if !undated.is_empty() {
        section.push_str("\n### Tasks Without Due Dates\n\n");
        for (title, id) in undated.iter().take(10) {
            section.push_str(&format!("- {} (id: {})\n", title, id));
        }
    }
    Ok(())
}

fn get_undated_tasks(db: &Database) -> Result<Vec<(String, String)>, String> {
    let conn = db.conn();
    let mut stmt = conn
        .prepare(
            "SELECT t.title, t.id FROM tasks t
             LEFT JOIN phases p ON t.phase_id = p.id
             WHERE t.status != 'complete'
             AND t.due_date IS NULL
             AND (p.sort_order IS NULL OR p.sort_order < 999)
             LIMIT 10",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
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
    fn test_build_manifest_empty() {
        let db = setup_test_db();
        let result = build_manifest_string(&db).unwrap();
        assert!(result.contains("# Project Status"));
        assert!(result.contains("No projects yet"));
    }

    #[test]
    fn test_build_manifest_with_projects() {
        let db = setup_test_db();
        use crate::models::project::CreateProjectInput;
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".to_string(),
                description: Some("desc".to_string()),
            })
            .unwrap();
        use crate::models::phase::CreatePhaseInput;
        db.create_phase(CreatePhaseInput {
            project_id: project.id.clone(),
            name: "Alpha".to_string(),
        })
        .unwrap();
        let result = build_manifest_string(&db).unwrap();
        assert!(result.contains("## Test Project"));
        assert!(result.contains("Alpha"));
    }

    #[test]
    fn test_build_manifest_token_budget() {
        let db = setup_test_db();
        use crate::models::project::CreateProjectInput;
        for i in 0..200 {
            let p = db
                .create_project(CreateProjectInput {
                    name: format!("Project With A Long Name Number {}", i),
                    description: Some(
                        "A fairly detailed description to inflate size".to_string(),
                    ),
                })
                .unwrap();
            use crate::models::phase::CreatePhaseInput;
            for j in 0..10 {
                db.create_phase(CreatePhaseInput {
                    project_id: p.id.clone(),
                    name: format!("Phase {} with extra details", j),
                })
                .unwrap();
            }
        }
        let result = build_manifest_string(&db).unwrap();
        assert!(
            result.len() <= 8100,
            "Manifest exceeded token budget: {} chars",
            result.len()
        );
        assert!(result.contains("[...truncated for token budget]"));
    }
}
