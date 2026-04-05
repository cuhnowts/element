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
    pub project_id: i64,
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
    id: String,
    title: String,
    status: String,
    due_date: Option<NaiveDate>,
    updated_at: String,
    project_id: Option<i64>,
    project_name: Option<String>,
}

pub fn compute_scores(db: &Database) -> Result<ScoringResult, String> {
    todo!()
}

fn compute_project_tags(tasks: &[TaskRow], today: NaiveDate) -> Vec<ProjectTag> {
    todo!()
}

fn is_recently_completed(updated_at: &str, today: NaiveDate) -> bool {
    todo!()
}

fn format_deadline_item(title: &str, due_date: NaiveDate, today: NaiveDate) -> String {
    todo!()
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
        let result = compute_scores(&db).unwrap();
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
            due_date: Some("2026-04-03".to_string()), // 2 days ago
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        let result = compute_scores(&db).unwrap();
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
            due_date: Some("2026-04-07".to_string()), // 2 days from now
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        let result = compute_scores(&db).unwrap();
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
        // Create a blocked task by inserting directly (create_task defaults to pending)
        let task_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        db.conn()
            .execute(
                "INSERT INTO tasks (id, project_id, title, status, priority, source, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'blocked', 'medium', 'manual', ?4, ?5)",
                rusqlite::params![task_id, project.id, "Blocked task", now, now],
            )
            .unwrap();

        let result = compute_scores(&db).unwrap();
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
            due_date: Some("2026-04-20".to_string()), // far future
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        let result = compute_scores(&db).unwrap();
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
        // Insert a recently completed task
        let task_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        db.conn()
            .execute(
                "INSERT INTO tasks (id, project_id, title, status, priority, source, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'complete', 'medium', 'manual', ?4, ?5)",
                rusqlite::params![task_id, project.id, "Done task", now, now],
            )
            .unwrap();

        let result = compute_scores(&db).unwrap();
        assert_eq!(result.projects.len(), 1);
        assert!(result.projects[0]
            .tags
            .contains(&ProjectTag::RecentlyCompleted));
    }

    #[test]
    fn test_projects_sorted_by_priority_score() {
        let db = setup_test_db();
        // Project A: task due far away
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
            due_date: Some("2026-04-30".to_string()), // far away
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        // Project B: task due very soon
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
            due_date: Some("2026-04-06".to_string()), // tomorrow
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        let result = compute_scores(&db).unwrap();
        assert_eq!(result.projects.len(), 2);
        // Project B should be first (soonest deadline = highest priority)
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
                 VALUES (?1, ?2, ?3, 'blocked', 'medium', 'manual', ?4, ?5)",
                rusqlite::params![task_id, project.id, "Fix the pipeline", now, now],
            )
            .unwrap();

        let result = compute_scores(&db).unwrap();
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
            due_date: Some("2026-04-07".to_string()), // 2 days from today
            scheduled_date: None,
            scheduled_time: None,
            duration_minutes: None,
            recurrence_rule: None,
            estimated_minutes: None,
            phase_id: None,
        })
        .unwrap();

        let result = compute_scores(&db).unwrap();
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
        let now = chrono::Utc::now().to_rfc3339();
        db.conn()
            .execute(
                "INSERT INTO tasks (id, project_id, title, status, priority, source, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'complete', 'medium', 'manual', ?4, ?5)",
                rusqlite::params![task_id, project.id, "Ship the update", now, now],
            )
            .unwrap();

        let result = compute_scores(&db).unwrap();
        assert_eq!(result.projects.len(), 1);
        assert_eq!(result.projects[0].wins, vec!["Ship the update"]);
    }
}
