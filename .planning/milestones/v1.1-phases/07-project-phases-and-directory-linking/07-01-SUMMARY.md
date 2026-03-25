---
phase: 07-project-phases-and-directory-linking
plan: 01
subsystem: database
tags: [sqlite, rusqlite, tauri-commands, phases, directory-linking, migrations]

requires:
  - phase: 06-data-foundation-and-theme-system
    provides: themes table, theme_id on projects/tasks, nullable project_id on tasks
provides:
  - phases table with CRUD and reorder operations
  - directory_path field on projects with link_directory method
  - phase_id FK on tasks with set_task_phase method (nullable, ON DELETE SET NULL)
  - 7 Tauri commands for phase management, directory linking, and task phase assignment
  - tauri-plugin-dialog registered for native directory picker
affects: [07-02, frontend-phase-ui, project-workspace]

tech-stack:
  added: [tauri-plugin-dialog]
  patterns: [dedicated nullable-field command pattern (set_task_phase)]

key-files:
  created:
    - src-tauri/src/db/sql/008_phases.sql
    - src-tauri/src/models/phase.rs
    - src-tauri/src/commands/phase_commands.rs
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/src/db/migrations.rs
    - src-tauri/src/models/mod.rs
    - src-tauri/src/models/project.rs
    - src-tauri/src/models/task.rs
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/lib.rs
    - src-tauri/capabilities/default.json

key-decisions:
  - "Used migration 008 instead of 007 (007 already taken by themes migration)"
  - "Dedicated set_task_phase command rather than extending update_task, because Option pattern cannot distinguish 'no change' from 'set to NULL'"

patterns-established:
  - "Dedicated nullable-field command: when a generic update cannot distinguish None (skip) from None (set NULL), create a separate command"
  - "Phase reorder via transaction: iterate ordered IDs with enumerate, set sort_order = index"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03]

duration: 11min
completed: 2026-03-23
---

# Phase 07 Plan 01: Backend Data Layer for Phases and Directory Linking Summary

**Phases table with CRUD/reorder, directory_path on projects, phase_id FK on tasks, and 7 Tauri commands registered with dialog plugin**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-23T00:50:33Z
- **Completed:** 2026-03-23T01:01:44Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Created 008_phases.sql migration adding phases table, directory_path column on projects, and phase_id FK on tasks
- Built Phase model with full CRUD + reorder methods, all with comprehensive tests (7 tests)
- Extended Project model with directory_path field and link_directory method (2 new tests)
- Extended Task model with phase_id field and dedicated set_task_phase method (2 new tests)
- Created 7 Tauri commands for phase CRUD, directory linking, and task phase assignment
- Registered tauri-plugin-dialog for native directory picker with capability permissions
- All 162 tests pass across the full Rust test suite

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration, Phase model, and Project/Task model extensions** - `204556e` (feat)
2. **Task 2: Tauri commands, plugin registration, and capabilities** - `cdc1c8e` (feat)

## Files Created/Modified
- `src-tauri/src/db/sql/008_phases.sql` - Migration: phases table, directory_path on projects, phase_id on tasks
- `src-tauri/src/models/phase.rs` - Phase struct, CreatePhaseInput, CRUD + reorder methods with tests
- `src-tauri/src/commands/phase_commands.rs` - 7 Tauri commands for phase/directory/task-phase operations
- `src-tauri/Cargo.toml` - Added tauri-plugin-dialog dependency
- `src-tauri/src/db/migrations.rs` - Added version < 8 migration block
- `src-tauri/src/models/mod.rs` - Added pub mod phase
- `src-tauri/src/models/project.rs` - Added directory_path field, link_directory method, updated SQL queries
- `src-tauri/src/models/task.rs` - Added phase_id to Task/CreateTaskInput/UpdateTaskInput, set_task_phase method
- `src-tauri/src/commands/mod.rs` - Added pub mod phase_commands
- `src-tauri/src/lib.rs` - Registered dialog plugin and 7 new commands
- `src-tauri/capabilities/default.json` - Added dialog:default permission
- `src-tauri/src/models/theme.rs` - Added phase_id: None to test CreateTaskInput
- `src-tauri/src/models/workflow.rs` - Added phase_id: None to test CreateTaskInput
- `src-tauri/src/models/execution.rs` - Added phase_id: None to test CreateTaskInput (6 instances)
- `src-tauri/src/models/tag.rs` - Added phase_id: None to test CreateTaskInput
- `src-tauri/src/commands/task_commands.rs` - Added phase_id param to create_task and update_task commands

## Decisions Made
- Used migration 008 instead of 007 because 007_themes.sql already existed (plan assumed 007 was available)
- Created dedicated set_task_phase command because the generic update_task Option pattern cannot distinguish "don't change" (None) from "set to NULL" (unassign)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration number changed from 007 to 008**
- **Found during:** Task 1 (Migration creation)
- **Issue:** Plan specified 007_phases.sql but 007_themes.sql already exists (from Phase 06)
- **Fix:** Created 008_phases.sql with version < 8 migration block instead
- **Files modified:** src-tauri/src/db/sql/008_phases.sql, src-tauri/src/db/migrations.rs
- **Verification:** All tests pass with correct migration ordering
- **Committed in:** 204556e (Task 1 commit)

**2. [Rule 3 - Blocking] Added phase_id: None to CreateTaskInput across 6 additional files**
- **Found during:** Task 1 (Compilation)
- **Issue:** Adding phase_id to CreateTaskInput broke all existing struct literals in theme.rs, workflow.rs, execution.rs, tag.rs, project.rs, task_commands.rs
- **Fix:** Added phase_id: None to all existing CreateTaskInput instances and phase_id param to task command functions
- **Files modified:** theme.rs, workflow.rs, execution.rs, tag.rs, project.rs, task_commands.rs
- **Verification:** cargo test passes all 162 tests
- **Committed in:** 204556e (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for compilation. No scope creep.

## Issues Encountered
- The dist/ directory was missing in the worktree, causing tauri::generate_context! macro to panic. Created empty dist/ to satisfy the macro. This is a worktree artifact, not a code issue.

## Known Stubs
None - all data methods are fully wired with working implementations and tests.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All backend phase/directory infrastructure is complete and tested
- Frontend (plan 02) can now consume: create_phase, list_phases, update_phase, delete_phase, reorder_phases, link_project_directory, set_task_phase
- Dialog plugin ready for native directory picker UI

---
*Phase: 07-project-phases-and-directory-linking*
*Completed: 2026-03-23*

## Self-Check: PASSED
- All 3 key created files exist on disk
- Both task commits (204556e, cdc1c8e) found in git history
- All 162 tests pass
