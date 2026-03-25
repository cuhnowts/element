# Phase 7: Project Phases and Directory Linking - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can structure projects into ordered phases, track progress across phases and the overall project, and link projects to filesystem directories. This phase adds the phases schema, phase CRUD, task-to-phase assignment, directory linking via native picker, and a redesigned project detail view with progress tracking.

Requirements: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05

</domain>

<decisions>
## Implementation Decisions

### Project Detail Layout
- **D-01:** Stacked sections layout — directory link at top, overall progress bar, then phase list as expandable/collapsible sections with tasks shown inside each expanded phase.
- **D-02:** Header area includes all four metadata items: directory path with change button, overall progress bar, editable project description, and created date + task count.
- **D-03:** Directory picker uses Tauri's native OS directory dialog. Button shows "Link Directory" when unset, shows path + "Change" button when linked.

### Phase Management UX
- **D-04:** New phases created via inline "+ Add phase" button at bottom of phase list. Clicking adds a new phase with auto-focused name field — no modal.
- **D-05:** Phase reordering via drag and drop on phase rows.
- **D-06:** Phase rename and delete via right-click context menu on phase rows (consistent with existing ProjectList context menu pattern).

### Task-to-Phase Assignment
- **D-07:** Tasks assigned to phases via a "Phase" dropdown in the task detail/edit view.
- **D-08:** New tasks created within expanded phase sections via "+ Add task" button inside each phase — task automatically assigned to that phase.
- **D-09:** Tasks without a phase assignment appear in a collapsible "Unassigned" bucket at the bottom of the phase list in the project detail view.

### Progress Visualization
- **D-10:** Phase-level progress: task count + inline progress bar next to each phase header (e.g., "███████▓░░░░ 3/5").
- **D-11:** Overall project progress: full-width progress bar in header with fraction text below (e.g., "3 of 12 tasks complete").
- **D-12:** Sidebar project list shows small progress indicator next to each project name (thin bar or fraction like "3/12").

### Claude's Discretion
- Schema design for phases table (columns, constraints, ordering mechanism)
- How drag-and-drop reordering persists sort order (integer position field, etc.)
- Progress bar component implementation (shadcn Progress or custom)
- How the "Unassigned" bucket is represented in the data model (null phase_id)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Layer
- `src-tauri/src/db/sql/001_initial.sql` — Current projects and tasks schema (no phases, no directory_path)
- `src-tauri/src/models/project.rs` — Project model and CRUD (needs directory_path field, phase methods)
- `src-tauri/src/commands/project_commands.rs` — Tauri commands for project CRUD (needs phase commands, directory link command)

### Frontend
- `src/components/center/ProjectDetail.tsx` — Current bare-bones project detail (needs full redesign with phases, progress, directory link)
- `src/components/sidebar/ProjectList.tsx` — Sidebar project list (needs progress indicator addition)
- `src/components/center/TaskDetail.tsx` — Task detail view (needs Phase dropdown field)

### Requirements
- `.planning/REQUIREMENTS.md` — PROJ-01 through PROJ-05 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shadcn/ui` components: Progress, ScrollArea, Button, Input, DropdownMenu, ContextMenu — all available
- `useStore` (Zustand) pattern for state management — projects, tasks, selection all managed here
- `api` wrapper (`src/lib/tauri.ts`) for Tauri invoke calls — extend with phase and directory commands
- Existing project event pattern: `project-created`, `project-updated`, `project-deleted` events via `app.emit()`

### Established Patterns
- Tauri command pattern: `#[tauri::command]` async functions with `State<Arc<Mutex<Database>>>`
- SQLite migrations in numbered SQL files (`001_initial.sql`, etc.)
- Model pattern: struct + input struct + Database impl block with CRUD methods
- Frontend: components read from Zustand store, call `api.*` methods, store refreshes via `load*` functions

### Integration Points
- New SQL migration file needed (007 or next available number) for phases table + project directory_path column
- New Rust model file for phases (`src-tauri/src/models/phase.rs`)
- New Rust commands file (`src-tauri/src/commands/phase_commands.rs`)
- Register new commands in `src-tauri/src/lib.rs` command handler
- Extend Zustand store with phases state, selection, and load functions
- ProjectDetail.tsx gets full redesign; TaskDetail.tsx gets Phase dropdown

</code_context>

<specifics>
## Specific Ideas

- Phase list uses expand/collapse (chevron) to show/hide tasks within each phase
- "+ Add phase" at bottom mirrors the inline creation pattern — auto-focus name field, no modal
- "+ Add task" inside each expanded phase — task is auto-assigned to that phase
- Right-click context menu on phases matches the existing ProjectList interaction pattern
- Sidebar progress: thin bar or "3/12" fraction next to project names for at-a-glance health

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-project-phases-and-directory-linking*
*Context gathered: 2026-03-22*
