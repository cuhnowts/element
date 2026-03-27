# Phase 15: .planning/ Folder Sync - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

One-way sync of `.planning/ROADMAP.md` into Element's database. Parses phases and tasks from the GSD roadmap format, watches for changes via file watcher, and prevents sync loops with content hashing. GSD-tier projects automatically reflect their roadmap structure in Element's UI.

Requirements: SYNC-01, SYNC-02, SYNC-03

</domain>

<decisions>
## Implementation Decisions

### ROADMAP Parsing
- **D-01:** Success criteria become tasks in Element. Each numbered success criterion under a phase maps to a task. Phase goal text becomes the phase description.
- **D-02:** Checkbox state maps to task status: `[x]` = Complete, `[ ]` = Pending. Simple binary mapping, no "in progress" detection.
- **D-03:** Extract both phase goals and success criteria text. Phase **Goal:** line becomes phase description; success criterion text becomes task title.
- **D-04:** Skip backlog phases (999.x entries). Only parse active milestone phases — backlog items aren't actionable and would clutter the project view.

### Watcher Lifecycle
- **D-05:** Watcher activates on project select — start watching when user opens a GSD-tier project with a linked directory, stop when switching away. Follows existing `FileWatcherState` pattern.
- **D-06:** Watch the entire `.planning/` directory, not just ROADMAP.md. Enables future extensibility (VERIFICATION.md, STATE.md changes).
- **D-07:** Separate `PlanningWatcherState` alongside existing `FileWatcherState`. Independent lifecycles, clean separation of concerns.

### Sync Strategy
- **D-08:** Content hash comparison (SHA-256) to prevent sync loops. Hash ROADMAP.md after each sync, skip re-import if hash is identical on next watcher event.
- **D-09:** On parse error, skip sync and log warning. Emit warning event to frontend (toast notification). Keep existing DB state — non-destructive.
- **D-10:** Replace all synced records on update. Delete all source-tagged phases/tasks for the project, re-insert from parsed ROADMAP. Clean, no stale data. Depends on source tagging from Phase 12 (SYNC-04).

### Import UX
- **D-11:** Auto-detect on project open. When a GSD-tier project is selected and `.planning/ROADMAP.md` exists, auto-import if no synced phases exist yet. No explicit button needed.
- **D-12:** Silent update with toast notification. Phases/tasks appear in project view automatically. Small toast says "Synced N phases, M tasks from .planning/".
- **D-13:** Subtle visual indicator on synced phases/tasks. Small icon or badge (e.g., sync icon or "GSD" tag) distinguishes synced from user-created records.

### Claude's Discretion
- Debounce interval for the `.planning/` watcher (existing patterns use 500ms)
- Hash storage mechanism (in-memory vs database)
- Exact toast notification styling and duration
- Regex patterns for ROADMAP.md parsing (format is predictable GSD output)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sync Requirements
- `.planning/REQUIREMENTS.md` — SYNC-01 through SYNC-04 acceptance criteria
- `.planning/ROADMAP.md` — Phase 15 success criteria (3 items)

### Existing Watcher Patterns
- `src-tauri/src/commands/file_explorer_commands.rs` — `FileWatcherState`, `start_file_watcher`, `stop_file_watcher` patterns
- `src-tauri/src/commands/onboarding_commands.rs` — `PlanWatcherState`, `start_plan_watcher`, `batch_create_plan` patterns

### Data Models
- `src-tauri/src/models/phase.rs` — Phase struct and CreatePhaseInput
- `src-tauri/src/models/task.rs` — Task struct and status enum
- `src-tauri/src/commands/phase_commands.rs` — Phase CRUD commands and event emission

### Dependencies
- `src-tauri/Cargo.toml` — `notify` v8 and `notify-debouncer-mini` v0.7 already included

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `notify` + `notify_debouncer_mini`: Already in Cargo.toml with macOS FSEvent support
- `FileWatcherState` pattern: Managed state struct with `Mutex<Option<Debouncer>>`, proven start/stop lifecycle
- `PlanWatcherState`: Watches `.element/` for `plan-output.json` — nearly identical pattern to what's needed
- `batch_create_plan`: Transactional batch insert of phases + tasks — directly reusable for sync imports
- Tauri event emission: `app.emit("phase-created", ...)` pattern for notifying frontend of changes

### Established Patterns
- Watcher state as Tauri managed state (`app.manage(...)` in `lib.rs`)
- Debounced events with 500ms interval
- `Arc<Mutex<Database>>` for async DB access
- Frontend events for all data mutations (phase-created, phase-updated, phase-deleted)

### Integration Points
- `src-tauri/src/lib.rs`: Register new watcher state and commands
- Project selection flow: Start/stop watcher when project changes
- Phase list UI: Display synced phases alongside user-created ones
- Toast/notification system for sync feedback

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- **Git-based progress tracking**: Use git init/status/diff as a general-purpose file change tracker across linked directories (code, Excel, Word docs, etc.) to detect progress. Git handles text files well but binary files are opaque. Could complement or replace file watchers for certain use cases. Potential future phase for broader progress detection beyond `.planning/` markdown files.

</deferred>

---

*Phase: 15-planning-folder-sync*
*Context gathered: 2026-03-27*
