# Phase 2: Task UI and Execution History - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-panel workspace showing calendar view, today's tasks, task details with execution diagrams, and execution output/logs. Users can navigate tasks, see assigned agents/skills/tools, and view execution history. Building workflows, scheduling, and plugins are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Panel layout and workspace arrangement
- Two-column layout with bottom drawer: left sidebar | center panel | bottom output drawer
- Left sidebar: fixed width, always visible. Calendar toggle at top, today's tasks and workflows listed below
- Center panel: task detail and execution diagram — gets maximum vertical space
- Bottom drawer: output and logs panel, open by default at ~30% height, resizable
- All panel sizes and drawer open/closed state persist across sessions (local storage)
- When no task is selected, center panel shows a welcome dashboard: recent tasks, upcoming scheduled workflows, quick-create button

### Claude's Discretion
- Calendar view specifics (day/week/month toggle, visual style)
- Task detail layout and information density in the central panel
- Execution diagram visual representation (flow chart, step list, etc.)
- Output/log formatting (terminal-style vs structured cards)
- Keyboard shortcuts for panel toggling and navigation
- Loading states and transition animations
- Welcome dashboard exact content and layout

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture and stack
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, frontend is purely presentational via Tauri IPC events
- `.planning/research/SUMMARY.md` — Stack decisions: React 19, shadcn/ui (resizable panels), Tailwind v4, Zustand for state

### Requirements
- `.planning/REQUIREMENTS.md` — UI-01 through UI-05 and TASK-04 define the exact capabilities this phase delivers
- `.planning/ROADMAP.md` §Phase 2 — Success criteria and dependency on Phase 1

### Project context
- `.planning/PROJECT.md` — App should feel like Discord or Outlook (native desktop experience), not a web page

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No code exists yet — Phase 1 builds the foundation this phase extends

### Established Patterns
- shadcn/ui resizable panels: ship out-of-the-box support for the two-column + drawer layout
- Zustand: centralized store for panel state (sizes, drawer open/closed, selected task)
- Tauri event listeners: frontend receives state updates reactively from Rust backend (no polling)

### Integration Points
- Phase 1 will establish: Tauri IPC commands, SQLite data layer, task CRUD operations, basic desktop shell
- This phase connects to: task data model (Phase 1), execution history table (Phase 1 schema), Tauri event stream for live updates

</code_context>

<specifics>
## Specific Ideas

- App should feel like Discord or Outlook — native desktop, not a web page (from PROJECT.md)
- Two-column + bottom drawer chosen over three-column to maximize vertical space for execution diagrams
- Welcome dashboard preferred over auto-selecting a task — gives users an overview landing experience

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-task-ui-and-execution-history*
*Context gathered: 2026-03-15*
