use chrono::{Local, NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::db::connection::Database;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum ProjectTag {
    Overdue,
    ApproachingDeadline,
    Blocked,
    OnTrack,
    RecentlyCompleted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoredProject {
    pub project_id: String,
    pub name: String,
    pub priority_score: f64,
    pub tags: Vec<ProjectTag>,
    pub blockers: Vec<String>,
    pub deadlines: Vec<String>,
    pub wins: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoringResult {
    pub projects: Vec<ScoredProject>,
    pub busy_score: f64,
    pub total_meetings: i32,
    pub total_tasks_due: i32,
}

struct TaskRow {
    _id: String,
    title: String,
    status: String,
    due_date: Option<NaiveDate>,
    updated_at: String,
    project_id: Option<String>,
    project_name: Option<String>,
}

/// Compute scoring results using today's date from the local clock.
pub fn compute_scores(db: &Database) -> Result<ScoringResult, String> {
    let today = Local::now().date_naive();
    compute_scores_for_date(db, today)
}

/// Internal: compute scoring results for a specific date (enables deterministic testing).
fn compute_scores_for_date(db: &Database, today: NaiveDate) -> Result<ScoringResult, String> {
    let conn = db.conn();

    // Batch query: all non-cancelled tasks with project info, excluding backlog phases (sort_order >= 999)
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.title, t.status, t.due_date, t.updated_at,
                    p.id as project_id, p.name as project_name
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             LEFT JOIN phases ph ON t.phase_id = ph.id
             WHERE t.status != 'cancelled'
             AND (ph.sort_order IS NULL OR ph.sort_order < 999)",
        )
        .map_err(|e| format!("Failed to prepare task query: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            let due_date_str: Option<String> = row.get(3)?;
            let due_date = due_date_str
                .as_deref()
                .and_then(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok());
            Ok(TaskRow {
                _id: row.get(0)?,
                title: row.get(1)?,
                status: row.get(2)?,
                due_date,
                updated_at: row.get(4)?,
                project_id: row.get(5)?,
                project_name: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to query tasks: {}", e))?;

    // Group tasks by project
    let mut project_tasks: HashMap<String, (String, Vec<TaskRow>)> = HashMap::new();

    for row in rows {
        let task = row.map_err(|e| format!("Failed to read task row: {}", e))?;
        if let (Some(ref pid), Some(ref pname)) = (&task.project_id, &task.project_name) {
            let entry = project_tasks
                .entry(pid.clone())
                .or_insert_with(|| (pname.clone(), Vec::new()));
            entry.1.push(task);
        }
    }

    // Score each project
    let mut scored_projects: Vec<ScoredProject> = Vec::new();

    for (project_id, (name, tasks)) in &project_tasks {
        let tags = compute_project_tags(tasks, today);

        // Compute priority_score: 1000.0 - days_to_soonest_deadline
        let soonest_deadline = tasks
            .iter()
            .filter(|t| t.status != "complete" && t.due_date.is_some())
            .filter_map(|t| t.due_date)
            .min();

        let priority_score = match soonest_deadline {
            Some(d) => 1000.0 - (d - today).num_days() as f64,
            None => 0.0,
        };

        // Build blockers list
        let blockers: Vec<String> = tasks
            .iter()
            .filter(|t| t.status == "blocked")
            .map(|t| t.title.clone())
            .collect();

        // Build deadlines list (tasks due within 3 days)
        let deadlines: Vec<String> = tasks
            .iter()
            .filter(|t| {
                t.status != "complete"
                    && t.due_date
                        .map(|d| {
                            let days = (d - today).num_days();
                            (0..=3).contains(&days)
                        })
                        .unwrap_or(false)
            })
            .map(|t| format_deadline_item(&t.title, t.due_date.unwrap(), today))
            .collect();

        // Build wins list (recently completed tasks)
        let wins: Vec<String> = tasks
            .iter()
            .filter(|t| t.status == "complete" && is_recently_completed(&t.updated_at, today))
            .map(|t| t.title.clone())
            .collect();

        scored_projects.push(ScoredProject {
            project_id: project_id.clone(),
            name: name.clone(),
            priority_score,
            tags,
            blockers,
            deadlines,
            wins,
        });
    }

    // Sort by priority_score descending
    scored_projects.sort_by(|a, b| {
        b.priority_score
            .partial_cmp(&a.priority_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    // Compute busy_score from scheduled_blocks for today
    let today_str = today.format("%Y-%m-%d").to_string();

    let block_minutes: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(
                (CAST(substr(end_time,1,2) AS INTEGER)*60 + CAST(substr(end_time,4,2) AS INTEGER))
                - (CAST(substr(start_time,1,2) AS INTEGER)*60 + CAST(substr(start_time,4,2) AS INTEGER))
            ), 0) FROM scheduled_blocks WHERE schedule_date = ?1",
            rusqlite::params![today_str],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let event_minutes: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(
                (CAST(substr(end_time,12,2) AS INTEGER)*60 + CAST(substr(end_time,15,2) AS INTEGER))
                - (CAST(substr(start_time,12,2) AS INTEGER)*60 + CAST(substr(start_time,15,2) AS INTEGER))
            ), 0) FROM calendar_events
            WHERE start_time LIKE ?1 AND all_day = 0",
            rusqlite::params![format!("{}%", today_str)],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let committed_minutes = block_minutes + event_minutes;
    let busy_score = (committed_minutes as f64 / 480.0).clamp(0.0, 1.0);

    // Count total meetings for today
    let total_meetings: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM calendar_events WHERE start_time LIKE ?1 AND all_day = 0",
            rusqlite::params![format!("{}%", today_str)],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Count total tasks due today that are not complete
    let total_tasks_due: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE due_date = ?1 AND status != 'complete'",
            rusqlite::params![today_str],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(ScoringResult {
        projects: scored_projects,
        busy_score,
        total_meetings,
        total_tasks_due,
    })
}

fn compute_project_tags(tasks: &[TaskRow], today: NaiveDate) -> Vec<ProjectTag> {
    let mut tags = Vec::new();

    let has_overdue = tasks
        .iter()
        .any(|t| t.due_date.map(|d| d < today).unwrap_or(false) && t.status != "complete");
    let has_approaching = tasks.iter().any(|t| {
        t.due_date
            .map(|d| {
                let days = (d - today).num_days();
                (0..=3).contains(&days)
            })
            .unwrap_or(false)
            && t.status != "complete"
    });
    let has_blocked = tasks.iter().any(|t| t.status == "blocked");
    let has_recent_completions = tasks
        .iter()
        .any(|t| t.status == "complete" && is_recently_completed(&t.updated_at, today));

    if has_overdue {
        tags.push(ProjectTag::Overdue);
    }
    if has_approaching {
        tags.push(ProjectTag::ApproachingDeadline);
    }
    if has_blocked {
        tags.push(ProjectTag::Blocked);
    }
    if has_recent_completions {
        tags.push(ProjectTag::RecentlyCompleted);
    }
    if tags.is_empty() {
        tags.push(ProjectTag::OnTrack);
    }

    tags
}

fn is_recently_completed(updated_at: &str, today: NaiveDate) -> bool {
    // Try parsing as RFC3339 first, then as NaiveDateTime
    let updated_date = if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(updated_at) {
        dt.date_naive()
    } else if let Ok(dt) = NaiveDateTime::parse_from_str(updated_at, "%Y-%m-%d %H:%M:%S") {
        dt.date()
    } else if let Ok(dt) = NaiveDateTime::parse_from_str(updated_at, "%Y-%m-%dT%H:%M:%S") {
        dt.date()
    } else {
        return false;
    };

    let yesterday = today - chrono::Duration::days(1);
    updated_date >= yesterday
}

fn format_deadline_item(title: &str, due_date: NaiveDate, today: NaiveDate) -> String {
    let days = (due_date - today).num_days();
    if days == 0 {
        format!("{} due today", title)
    } else if days == 1 {
        format!("{} due tomorrow", title)
    } else {
        format!("{} due in {} days", title, days)
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

    fn today() -> NaiveDate {
        NaiveDate::from_ymd_opt(2026, 4, 5).unwrap()
    }

    #[test]
    fn test_empty_database_returns_empty_result() {
        let db = setup_test_db();
        let result = compute_scores_for_date(&db, today()).unwrap();
        assert!(result.projects.is_empty());
        assert_eq!(result.busy_score, 0.0);
        assert_eq!(result.total_meetings, 0);
        assert_eq!(result.total_tasks_due, 0);
    }

    #[test]
    fn test_overdue_task_gets_overdue_tag() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".to_string(),
                description: None,
            })
            .unwrap();
        db.create_task(CreateTaskInput {
            project_id: Some(project.id.clone()),
            theme_id: None,
            title: "Overdue task".to_string(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: Some("2026-04-03".to_string()),
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        let result = compute_scores_for_date(&db, today()).unwrap();
        assert_eq!(result.projects.len(), 1);
        assert!(result.projects[0].tags.contains(&ProjectTag::Overdue));
    }

    #[test]
    fn test_approaching_deadline_tag() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".to_string(),
                description: None,
            })
            .unwrap();
        db.create_task(CreateTaskInput {
            project_id: Some(project.id.clone()),
            theme_id: None,
            title: "Approaching task".to_string(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: Some("2026-04-07".to_string()),
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        let result = compute_scores_for_date(&db, today()).unwrap();
        assert_eq!(result.projects.len(), 1);
        assert!(result.projects[0]
            .tags
            .contains(&ProjectTag::ApproachingDeadline));
    }

    #[test]
    fn test_blocked_task_gets_blocked_tag() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".to_string(),
                description: None,
            })
            .unwrap();
        let task_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        db.conn()
            .execute(
                "INSERT INTO tasks (id, project_id, title, status, priority, source, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'blocked', 'medium', 'user', ?4, ?5)",
                rusqlite::params![task_id, project.id, "Blocked task", now, now],
            )
            .unwrap();

        let result = compute_scores_for_date(&db, today()).unwrap();
        assert_eq!(result.projects.len(), 1);
        assert!(result.projects[0].tags.contains(&ProjectTag::Blocked));
    }

    #[test]
    fn test_on_track_tag_when_no_issues() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".to_string(),
                description: None,
            })
            .unwrap();
        db.create_task(CreateTaskInput {
            project_id: Some(project.id.clone()),
            theme_id: None,
            title: "Normal task".to_string(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: Some("2026-04-20".to_string()),
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        let result = compute_scores_for_date(&db, today()).unwrap();
        assert_eq!(result.projects.len(), 1);
        assert!(result.projects[0].tags.contains(&ProjectTag::OnTrack));
    }

    #[test]
    fn test_recently_completed_tag() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".to_string(),
                description: None,
            })
            .unwrap();
        let task_id = uuid::Uuid::new_v4().to_string();
        // Use a timestamp that is "today" for the test
        let now = format!("{}T12:00:00+00:00", today());
        db.conn()
            .execute(
                "INSERT INTO tasks (id, project_id, title, status, priority, source, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'complete', 'medium', 'user', ?4, ?5)",
                rusqlite::params![task_id, project.id, "Done task", now, now],
            )
            .unwrap();

        let result = compute_scores_for_date(&db, today()).unwrap();
        assert_eq!(result.projects.len(), 1);
        assert!(result.projects[0]
            .tags
            .contains(&ProjectTag::RecentlyCompleted));
    }

    #[test]
    fn test_projects_sorted_by_priority_score() {
        let db = setup_test_db();
        let proj_a = db
            .create_project(CreateProjectInput {
                name: "Project A".to_string(),
                description: None,
            })
            .unwrap();
        db.create_task(CreateTaskInput {
            project_id: Some(proj_a.id.clone()),
            theme_id: None,
            title: "Far task".to_string(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: Some("2026-04-30".to_string()),
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        let proj_b = db
            .create_project(CreateProjectInput {
                name: "Project B".to_string(),
                description: None,
            })
            .unwrap();
        db.create_task(CreateTaskInput {
            project_id: Some(proj_b.id.clone()),
            theme_id: None,
            title: "Soon task".to_string(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: Some("2026-04-06".to_string()),
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        let result = compute_scores_for_date(&db, today()).unwrap();
        assert_eq!(result.projects.len(), 2);
        assert_eq!(result.projects[0].name, "Project B");
        assert_eq!(result.projects[1].name, "Project A");
        assert!(result.projects[0].priority_score > result.projects[1].priority_score);
    }

    #[test]
    fn test_blockers_list_contains_blocked_task_titles() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".to_string(),
                description: None,
            })
            .unwrap();
        let task_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        db.conn()
            .execute(
                "INSERT INTO tasks (id, project_id, title, status, priority, source, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'blocked', 'medium', 'user', ?4, ?5)",
                rusqlite::params![task_id, project.id, "Fix the pipeline", now, now],
            )
            .unwrap();

        let result = compute_scores_for_date(&db, today()).unwrap();
        assert_eq!(result.projects[0].blockers, vec!["Fix the pipeline"]);
    }

    #[test]
    fn test_deadlines_list_contains_formatted_strings() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".to_string(),
                description: None,
            })
            .unwrap();
        db.create_task(CreateTaskInput {
            project_id: Some(project.id.clone()),
            theme_id: None,
            title: "Deploy feature".to_string(),
            description: None,
            context: None,
            priority: None,
            external_path: None,
            due_date: Some("2026-04-07".to_string()),
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        let result = compute_scores_for_date(&db, today()).unwrap();
        assert_eq!(result.projects.len(), 1);
        assert_eq!(result.projects[0].deadlines.len(), 1);
        assert!(result.projects[0].deadlines[0].contains("Deploy feature"));
        assert!(result.projects[0].deadlines[0].contains("2 days"));
    }

    #[test]
    fn test_wins_list_contains_recently_completed_tasks() {
        let db = setup_test_db();
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".to_string(),
                description: None,
            })
            .unwrap();
        let task_id = uuid::Uuid::new_v4().to_string();
        let now = format!("{}T12:00:00+00:00", today());
        db.conn()
            .execute(
                "INSERT INTO tasks (id, project_id, title, status, priority, source, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'complete', 'medium', 'user', ?4, ?5)",
                rusqlite::params![task_id, project.id, "Ship the update", now, now],
            )
            .unwrap();

        let result = compute_scores_for_date(&db, today()).unwrap();
        assert_eq!(result.projects.len(), 1);
        assert_eq!(result.projects[0].wins, vec!["Ship the update"]);
    }
}
