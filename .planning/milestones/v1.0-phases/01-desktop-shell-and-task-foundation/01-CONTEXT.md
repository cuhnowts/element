# Phase 1: Desktop Shell and Task Foundation - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Native desktop app (Tauri 2.x) where users can create, organize, and track tasks with all data persisting locally in SQLite. Workflow definitions stored as structured files. This phase delivers the app shell, task CRUD, and data layer. Multi-panel layout (calendar, output logs), workflow execution, and automation are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Task data model
- Tasks have: title, description, context (freeform markdown/rich-text notes field), status, priority, project, tags
- Context is a flexible notes area for links, code snippets, reference material — not structured metadata
- Projects are the top-level organizational unit — every task belongs to a project
- Tags provide secondary categorization (type, custom labels) within projects
- Priority is a fixed 4-level scale: Urgent, High, Medium, Low
- Status is a fixed 4-value enum: Pending, In Progress, Complete, Blocked

### Initial UI layout
- Sidebar + main area layout (like Linear)
- Left sidebar split into two sections: project list (top) and task list for selected project (bottom)
- Main area shows selected task detail (title, status, priority, tags, context)
- Sidebar is resizable via drag (using shadcn resizable panels) — establishes the pattern for Phase 2's multi-panel layout
- Task list uses compact rows: status icon + title + priority badge — one line per task, dense and scannable
- Empty state on first launch: clean onboarding prompt with "Create your first project" CTA
- Dark and light mode supported, defaulting to OS system preference (Tailwind v4 + shadcn theming)

### Claude's Discretion
- Desktop shell details: system tray behavior, menu structure, keyboard shortcuts
- Workflow definition file format (YAML vs JSON vs TOML) — user chose not to discuss
- Task detail panel layout specifics (field ordering, edit interactions)
- Loading states and error handling patterns
- Exact color scheme / design tokens beyond dark/light mode

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project definition
- `.planning/PROJECT.md` — Core vision, constraints, key decisions (local-first, orchestrator boundary, open source core)
- `.planning/REQUIREMENTS.md` — v1 requirements with traceability to phases; Phase 1 covers DATA-01, DATA-02, DATA-03, UI-06, TASK-01, TASK-02, TASK-03

### Technology stack
- `.planning/research/STACK.md` — Full stack recommendation with version pins, alternatives considered, and architecture rationale
- `.planning/research/SUMMARY.md` — Research synthesis including architecture approach, pitfalls, and phase ordering rationale

### Architecture
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, event bus design, IPC patterns
- `.planning/research/PITFALLS.md` — Critical pitfalls to avoid (scope creep, error handling, plugin security boundaries)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing code — greenfield project. All components built from scratch.

### Established Patterns
- Stack decided: Tauri 2.x + Rust backend + React 19 + shadcn/ui + Tailwind v4 + Zustand + SQLite (rusqlite)
- shadcn/ui provides ResizablePanelGroup, Sidebar, and other components that map directly to the decided layout
- Zustand for centralized state management (active project, selected task, panel state)

### Integration Points
- Tauri IPC (invoke commands) bridges React frontend to Rust backend
- Rust backend owns SQLite via rusqlite — no frontend DB bypass
- Frontend receives state updates via Tauri event listeners

</code_context>

<specifics>
## Specific Ideas

- App should feel like Discord or Outlook — native desktop experience, not a web page (from PROJECT.md)
- Task list inspired by Linear's issue list — compact, scannable rows
- Sidebar + main area pattern sets up natural expansion into Phase 2's multi-panel layout

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-desktop-shell-and-task-foundation*
*Context gathered: 2026-03-15*
