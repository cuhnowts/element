---
phase: 01-desktop-shell-and-task-foundation
plan: 02
subsystem: api
tags: [tauri, rust, ipc, commands, system-tray, menus, crud]

# Dependency graph
requires:
  - phase: 01-desktop-shell-and-task-foundation (plan 01)
    provides: SQLite schema, Database struct, Project/Task/Tag models with CRUD methods
provides:
  - Tauri IPC commands for all project CRUD (create/list/get/update/delete)
  - Tauri IPC commands for all task CRUD (create/list/get/update/update_status/delete)
  - Tauri IPC commands for tag management (add_tag_to_task/remove_tag_from_task/list_tags)
  - TaskWithTags response struct for get_task
  - Native macOS menu bar (Element/File/Edit submenus)
  - System tray with Show/Quit functionality
  - Tauri event emission on all mutations
affects: [01-desktop-shell-and-task-foundation plan 03, 02-task-ui-and-execution-history]

# Tech tracking
tech-stack:
  added: [tauri-plugin-global-shortcut]
  patterns: [Mutex<Database> state pattern for commands, event emission on mutations, get-or-create for tags]

key-files:
  created:
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/commands/project_commands.rs
    - src-tauri/src/commands/task_commands.rs
  modified:
    - src-tauri/src/lib.rs
    - src-tauri/tauri.conf.json

key-decisions:
  - "Used show_menu_on_left_click instead of deprecated menu_on_left_click"
  - "TaskWithTags uses serde flatten for get_task response to include tags alongside task fields"
  - "add_tag_to_task uses get-or-create pattern via list_tags scan"

patterns-established:
  - "Tauri command pattern: lock Mutex<Database>, call db method, emit event, return result"
  - "Event naming: entity-action (task-created, project-updated, task-deleted)"
  - "Menu event forwarding: menu IDs emitted as menu-{id} events to frontend"

requirements-completed: [TASK-01, TASK-02, TASK-03, UI-06]

# Metrics
duration: 3min
completed: 2026-03-16
---

# Phase 01 Plan 02: Tauri Commands and Desktop Shell Summary

**14 Tauri IPC commands for project/task/tag CRUD with event emission, native macOS menu bar (Element/File/Edit), and system tray (Show/Quit)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-16T01:05:15Z
- **Completed:** 2026-03-16T01:08:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All 14 Tauri commands registered and compilable: 5 project, 7 task, 2 tag management
- Native macOS menu bar with Element (About/Quit), File (New Project/New Task/Close), Edit (Undo/Redo/Cut/Copy/Paste/Select All)
- System tray with Show Element and Quit options
- Event emission on all mutations (project-created/updated/deleted, task-created/updated/deleted)
- Menu events forwarded to frontend (menu-new-project, menu-new-task)

## Task Commits

Each task was committed atomically:

1. **Task 1: Tauri CRUD commands for projects, tasks, and tags** - `f8b02c8` (feat)
2. **Task 2: Desktop shell -- menus, system tray, and command registration** - `ec53e6c` (feat)

## Files Created/Modified
- `src-tauri/src/commands/mod.rs` - Module declarations for project and task commands
- `src-tauri/src/commands/project_commands.rs` - 5 project CRUD Tauri commands with event emission
- `src-tauri/src/commands/task_commands.rs` - 9 task/tag Tauri commands with TaskWithTags struct
- `src-tauri/src/lib.rs` - Full app setup with menu bar, system tray, global shortcut plugin, and invoke_handler
- `src-tauri/tauri.conf.json` - withGlobalTauri set to true

## Decisions Made
- Used `show_menu_on_left_click` instead of deprecated `menu_on_left_click` (Tauri API change)
- TaskWithTags struct uses `#[serde(flatten)]` to merge task fields with tags array in get_task response
- add_tag_to_task implements get-or-create by scanning list_tags for existing tag by name before creating

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed deprecated Tauri API method**
- **Found during:** Task 2 (Desktop shell configuration)
- **Issue:** `menu_on_left_click` is deprecated in current Tauri 2.x
- **Fix:** Replaced with `show_menu_on_left_click`
- **Files modified:** src-tauri/src/lib.rs
- **Verification:** cargo check passes without deprecation warning
- **Committed in:** ec53e6c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial API rename. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Tauri commands ready for frontend consumption via `invoke`
- Frontend can listen for mutation events (task-created, etc.) for reactive updates
- Menu events (menu-new-project, menu-new-task) ready for frontend handlers
- Plan 03 (React UI) can now build against the complete command API surface

---
*Phase: 01-desktop-shell-and-task-foundation*
*Completed: 2026-03-16*
