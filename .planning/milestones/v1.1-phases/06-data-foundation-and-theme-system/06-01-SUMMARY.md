---
phase: 06-data-foundation-and-theme-system
plan: 01
subsystem: database
tags: [sqlite, rusqlite, themes, migration, tauri-commands, crud]

# Dependency graph
requires: []
provides:
  - Theme CRUD backend (create, list, update, delete, reorder)
  - Theme assignment to projects and tasks
  - Nullable project_id on tasks (standalone task support)
  - Theme item count queries for UI confirmation dialogs
  - list_standalone_tasks and list_tasks_by_theme queries
affects: [06-02-theme-frontend, project-management-ui, task-creation-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [theme-model-pattern, nullable-fk-migration, table-recreation-for-nullable-columns]

key-files:
  created:
    - src-tauri/src/db/sql/007_themes.sql
    - src-tauri/src/models/theme.rs
    - src-tauri/src/commands/theme_commands.rs
  modified:
    - src-tauri/src/db/migrations.rs
    - src-tauri/src/models/project.rs
    - src-tauri/src/models/task.rs
    - src-tauri/src/models/mod.rs
    - src-tauri/src/models/execution.rs
    - src-tauri/src/models/workflow.rs
    - src-tauri/src/models/tag.rs
    - src-tauri/src/commands/task_commands.rs
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/commands/ai_commands.rs
    - src-tauri/src/lib.rs

key-decisions:
  - "Table recreation approach for making project_id nullable (SQLite ALTER TABLE limitation)"
  - "Theme assignment via separate commands rather than embedding in create/update"
  - "Combined model and command changes in Task 1 for compilation correctness"

patterns-established:
  - "Theme model follows exact same pattern as Project model (impl Database with CRUD)"
  - "Nullable FK migration uses PRAGMA foreign_keys=OFF, CREATE new table, INSERT SELECT, DROP old, RENAME"
  - "Theme sort_order uses COALESCE(MAX(sort_order), -1) + 1 for auto-increment"

requirements-completed: [THEME-01, THEME-02, THEME-04]

# Metrics
duration: 8min
completed: 2026-03-22
---

# Phase 6 Plan 01: Theme Backend Summary

**SQLite migration 007 with themes table, nullable project_id via table recreation, theme CRUD model with 8 tests, and 10 Tauri commands registered**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-22T20:01:08Z
- **Completed:** 2026-03-22T20:09:00Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Migration 007 creates themes table, adds theme_id to projects, recreates tasks with nullable project_id and theme_id
- Theme model with full CRUD, reorder, item counts, and assignment operations (8 unit tests)
- 10 new Tauri commands registered: 8 theme commands + 2 task query commands
- All 151 existing + new tests pass with zero failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration SQL + Theme Model + Theme Commands** - `bf18bfe` (feat)
2. **Task 2: Modify Task and Project Models for Theme Support** - `529d04f` (feat)

## Files Created/Modified
- `src-tauri/src/db/sql/007_themes.sql` - Migration: themes table, theme_id columns, nullable project_id
- `src-tauri/src/models/theme.rs` - Theme struct, CreateThemeInput, UpdateThemeInput, Database impl with 10 methods, 8 tests
- `src-tauri/src/commands/theme_commands.rs` - 8 Tauri commands for theme CRUD and assignment
- `src-tauri/src/db/migrations.rs` - Added version < 7 migration block
- `src-tauri/src/models/project.rs` - Added theme_id: Option<String> to Project, updated queries
- `src-tauri/src/models/task.rs` - Nullable project_id, theme_id field, TASK_COLUMNS updated, row_to_task shifted, standalone/theme queries added
- `src-tauri/src/commands/task_commands.rs` - Updated create_task signature, added list_standalone_tasks and list_tasks_by_theme
- `src-tauri/src/commands/ai_commands.rs` - Fixed get_project call for nullable project_id
- `src-tauri/src/lib.rs` - Registered all 10 new commands

## Decisions Made
- Combined Task 1 and Task 2 model changes into Task 1 commit because theme.rs tests depend on updated Task/Project models -- splitting would cause compilation failures
- Used table recreation approach for nullable project_id since SQLite does not support ALTER COLUMN
- Theme assignment uses dedicated assign_project_theme/assign_task_theme commands rather than modifying existing create/update commands

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing 002_execution.sql in worktree**
- **Found during:** Task 1 (cargo build)
- **Issue:** The worktree was missing src-tauri/src/db/sql/002_execution.sql causing include_str! to fail
- **Fix:** Copied file from main repo to worktree
- **Files modified:** src-tauri/src/db/sql/002_execution.sql
- **Verification:** cargo build succeeded
- **Committed in:** bf18bfe (Task 1 commit)

**2. [Rule 3 - Blocking] Missing dist directory for Tauri build**
- **Found during:** Task 1 (cargo build)
- **Issue:** Tauri generate_context! macro requires frontendDist path to exist
- **Fix:** Created stub dist/index.html
- **Files modified:** dist/index.html (not committed, runtime artifact)
- **Verification:** cargo build succeeded

**3. [Rule 1 - Bug] ai_commands.rs used task.project_id as &str**
- **Found during:** Task 1 (cargo build)
- **Issue:** After making project_id Option<String>, ai_commands.rs passed &task.project_id to get_project(&str)
- **Fix:** Changed to task.project_id.as_deref().and_then(|pid| db.get_project(pid)...)
- **Files modified:** src-tauri/src/commands/ai_commands.rs
- **Verification:** cargo build succeeded
- **Committed in:** bf18bfe (Task 1 commit)

**4. [Rule 3 - Blocking] Model changes needed in Task 1 for compilation**
- **Found during:** Task 1 planning
- **Issue:** Theme model tests reference CreateTaskInput with theme_id and project.theme_id -- these require Task 2's model changes
- **Fix:** Pulled model changes (project.rs theme_id, task.rs nullable project_id/theme_id) into Task 1
- **Files modified:** All model files updated in Task 1 instead of Task 2
- **Verification:** All 151 tests pass

---

**Total deviations:** 4 auto-fixed (1 bug, 3 blocking)
**Impact on plan:** All auto-fixes necessary for compilation. Task boundary shifted slightly but all planned work completed.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Theme backend complete, ready for frontend consumption (Plan 02)
- All 10 Tauri commands available for invoke() from React
- Theme CRUD, assignment, reorder, and item count APIs ready
- Standalone task support (project_id: null) available for task creation UI

---
*Phase: 06-data-foundation-and-theme-system*
*Completed: 2026-03-22*
