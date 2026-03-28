// Planning sync: ROADMAP.md parser, content hashing, and DB sync engine

#[cfg(test)]
mod tests {
    use crate::db::connection::Database;
    use crate::db::migrations;
    use crate::models::project::CreateProjectInput;
    use rusqlite::Connection;

    fn setup_test_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrations::run_migrations(&conn).unwrap();
        Database::from_connection(conn)
    }

    fn create_test_project(db: &Database) -> String {
        let project = db
            .create_project(CreateProjectInput {
                name: "Test Project".into(),
                description: None,
            })
            .unwrap();
        project.id
    }

    fn sample_roadmap() -> &'static str {
        r#"# Roadmap: Test Project

## Phases

### Phase 1: Desktop Shell
**Goal**: Build the core desktop application shell
**Success Criteria** (what must be TRUE):
  1. [ ] App window launches with correct title
  2. [x] Menu bar has File and Edit menus
  3. [ ] System tray icon appears

### Phase 2: Task Foundation
**Goal**: Implement basic task CRUD operations
**Success Criteria** (what must be TRUE):
  1. [x] User can create a task
  2. [x] User can list tasks
  3. [ ] User can delete a task

### Phase 3: Workflows
**Goal**: Add workflow automation
**Success Criteria** (what must be TRUE):
  1. [ ] User can create workflows
  2. [ ] User can run workflows
"#
    }

    #[test]
    fn test_parse_roadmap_extracts_phase_names() {
        let result = super::parse_roadmap(sample_roadmap()).unwrap();
        assert_eq!(result.phases.len(), 3);
        assert_eq!(result.phases[0].name, "Desktop Shell");
        assert_eq!(result.phases[1].name, "Task Foundation");
        assert_eq!(result.phases[2].name, "Workflows");
    }

    #[test]
    fn test_parse_roadmap_extracts_goal_as_description() {
        let result = super::parse_roadmap(sample_roadmap()).unwrap();
        assert_eq!(
            result.phases[0].description,
            "Build the core desktop application shell"
        );
        assert_eq!(
            result.phases[1].description,
            "Implement basic task CRUD operations"
        );
    }

    #[test]
    fn test_parse_roadmap_extracts_success_criteria_as_tasks() {
        let result = super::parse_roadmap(sample_roadmap()).unwrap();
        assert_eq!(result.phases[0].tasks.len(), 3);
        assert_eq!(
            result.phases[0].tasks[0].title,
            "App window launches with correct title"
        );
        assert!(!result.phases[0].tasks[0].is_complete);
    }

    #[test]
    fn test_parse_roadmap_maps_checkbox_state() {
        let result = super::parse_roadmap(sample_roadmap()).unwrap();
        // Phase 1: [ ], [x], [ ]
        assert!(!result.phases[0].tasks[0].is_complete);
        assert!(result.phases[0].tasks[1].is_complete);
        assert!(!result.phases[0].tasks[2].is_complete);
        // Phase 2: [x], [x], [ ]
        assert!(result.phases[1].tasks[0].is_complete);
        assert!(result.phases[1].tasks[1].is_complete);
        assert!(!result.phases[1].tasks[2].is_complete);
    }

    #[test]
    fn test_parse_roadmap_skips_backlog_phases() {
        let content = r#"
### Phase 1: Active Phase
**Goal**: Do active work
**Success Criteria** (what must be TRUE):
  1. [ ] Active task

### Phase 999.1: Backlog Phase
**Goal**: Deferred work
**Success Criteria** (what must be TRUE):
  1. [ ] Backlog task

### Phase 999.2: Another Backlog
**Goal**: More deferred
**Success Criteria** (what must be TRUE):
  1. [ ] Another backlog task
"#;
        let result = super::parse_roadmap(content).unwrap();
        assert_eq!(result.phases.len(), 1);
        assert_eq!(result.phases[0].name, "Active Phase");
    }

    #[test]
    fn test_parse_roadmap_returns_err_when_no_phases() {
        let content = "# Just a title\n\nSome text without any phases.";
        let result = super::parse_roadmap(content);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("No phases found"));
    }

    #[test]
    fn test_parse_roadmap_handles_realistic_format() {
        let content = r#"# Roadmap: Element

## Overview

Element is a desktop task orchestration platform.

## Phases

### v1.2 Intelligent Planning (Phases 12-16)

### Phase 12: CLI Settings and Schema Foundation
**Goal**: Users can configure their AI terminal tool
**Depends on**: Phase 11
**Requirements**: CLI-01, CLI-02
**Success Criteria** (what must be TRUE):
  1. [x] User can open Settings, enter a custom CLI command
  2. [x] App checks whether the configured CLI tool exists
  3. [ ] User's planning tier choice persists per-project
**Plans**: 2 plans

### Phase 13: Adaptive Context Builder
**Goal**: The AI context file intelligently adapts its content
**Success Criteria** (what must be TRUE):
  1. [ ] Context file for a project with no plan contains planning instructions
  2. [x] A project with 50+ tasks generates a context file that summarizes
**Plans**: 1 plan

## Backlog

### Phase 999.1: Windows Fixes (BACKLOG)
**Goal**: Fix platform-specific code
**Success Criteria** (what must be TRUE):
  1. [ ] Should not appear
"#;
        let result = super::parse_roadmap(content).unwrap();
        assert_eq!(result.phases.len(), 2);
        assert_eq!(result.phases[0].name, "CLI Settings and Schema Foundation");
        assert_eq!(result.phases[0].tasks.len(), 3);
        assert!(result.phases[0].tasks[0].is_complete);
        assert!(result.phases[0].tasks[1].is_complete);
        assert!(!result.phases[0].tasks[2].is_complete);
        assert_eq!(result.phases[1].name, "Adaptive Context Builder");
        assert_eq!(result.phases[1].tasks.len(), 2);
    }

    #[test]
    fn test_compute_content_hash_consistent() {
        let hash1 = super::compute_content_hash("test content");
        let hash2 = super::compute_content_hash("test content");
        assert_eq!(hash1, hash2);
        assert!(!hash1.is_empty());
    }

    #[test]
    fn test_compute_content_hash_different_for_different_input() {
        let hash1 = super::compute_content_hash("content A");
        let hash2 = super::compute_content_hash("content B");
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_sync_roadmap_to_db_inserts_and_returns_counts() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);
        let parsed = super::parse_roadmap(sample_roadmap()).unwrap();

        let result = super::sync_roadmap_to_db(&db, &project_id, &parsed).unwrap();
        assert_eq!(result.phase_count, 3);
        assert_eq!(result.task_count, 8); // 3 + 3 + 2

        // Verify phases in DB
        let phases = db.list_phases(&project_id).unwrap();
        let sync_phases: Vec<_> = phases.iter().filter(|p| p.source == "sync").collect();
        assert_eq!(sync_phases.len(), 3);
    }

    #[test]
    fn test_sync_roadmap_to_db_sets_source_sync() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);
        let parsed = super::parse_roadmap(sample_roadmap()).unwrap();

        super::sync_roadmap_to_db(&db, &project_id, &parsed).unwrap();

        let phases = db.list_phases(&project_id).unwrap();
        for phase in &phases {
            assert_eq!(phase.source, "sync");
        }

        let tasks = db.list_tasks(&project_id).unwrap();
        for task in &tasks {
            assert_eq!(task.source, "sync");
        }
    }

    #[test]
    fn test_sync_roadmap_to_db_does_not_affect_user_records() {
        let db = setup_test_db();
        let project_id = create_test_project(&db);

        // Create a user phase and task first
        use crate::models::phase::CreatePhaseInput;
        use crate::models::task::CreateTaskInput;

        db.create_phase(CreatePhaseInput {
            project_id: project_id.clone(),
            name: "User Phase".into(),
        })
        .unwrap();

        db.create_task(CreateTaskInput {
            project_id: Some(project_id.clone()),
            theme_id: None,
            title: "User Task".into(),
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

        // Now sync
        let parsed = super::parse_roadmap(sample_roadmap()).unwrap();
        super::sync_roadmap_to_db(&db, &project_id, &parsed).unwrap();

        // User records should still exist
        let phases = db.list_phases(&project_id).unwrap();
        let user_phases: Vec<_> = phases.iter().filter(|p| p.source == "user").collect();
        assert_eq!(user_phases.len(), 1);
        assert_eq!(user_phases[0].name, "User Phase");

        let tasks = db.list_tasks(&project_id).unwrap();
        let user_tasks: Vec<_> = tasks.iter().filter(|t| t.source == "user").collect();
        assert_eq!(user_tasks.len(), 1);
        assert_eq!(user_tasks[0].title, "User Task");
    }

    #[test]
    fn test_parse_roadmap_assigns_sequential_sort_order() {
        let result = super::parse_roadmap(sample_roadmap()).unwrap();
        assert_eq!(result.phases[0].sort_order, 0);
        assert_eq!(result.phases[1].sort_order, 1);
        assert_eq!(result.phases[2].sort_order, 2);
    }
}
