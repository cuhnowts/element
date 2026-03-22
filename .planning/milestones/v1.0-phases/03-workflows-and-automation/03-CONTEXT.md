# Phase 3: Workflows and Automation - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Multi-step task workflow composition, cron scheduling, and shell command / HTTP call step execution. Users can define workflows as ordered step lists, assign executors to steps, schedule recurring runs, and promote manual tasks into automated workflows. Plugin-based executors and AI-assisted workflow creation are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Workflow builder UX
- Insert-anywhere step list: "+" buttons between every step allow inserting at any position
- Steps form a linear sequence — sequential execution only, no parallel groups for v1
- Separate read-only flowchart visualization in the center panel (execution diagram from Phase 2)
- The editable step list and the flowchart are separate views — list for editing, flowchart for visualization
- Promote manual task to workflow via both: "Automate" button in task detail AND "Convert to workflow" in task list context menu
- Promoting a task creates a new workflow with the task pre-filled as step 1

### Step configuration
- Shell command steps use a Monaco-style code editor — syntax highlighting, multi-line support, power-user feel
- HTTP/API call steps use a structured form: method dropdown, URL field, headers (key-value rows), body (JSON editor)
- Agent/tool/skill assignment via dropdown picker on each step — for v1, built-in types: shell, HTTP, manual
- Automatic piping: each step's output (stdout for shell, response body for HTTP) becomes the next step's input
- Explicit references like {{step_name.output}} available for non-linear access to prior step outputs

### Cron scheduling
- Quick presets (hourly, daily, weekly, monthly) with an "Advanced" toggle revealing raw cron expression input
- Schedule UI lives inline in the task/workflow detail panel — toggle "Recurring" on/off, configure cron
- Schedules can be toggled on/off without deleting — pause/resume preserves the cron configuration
- Next 3 upcoming run times displayed below cron configuration for verification
- Any task or workflow can be scheduled — not limited to multi-step workflows
- In-process scheduler (Rust backend checks schedules while app is running) — workflows only run when Element is open
- Catch-up on missed runs: when Element launches, check for missed schedules and run them immediately

### Execution and feedback
- Step-by-step progress indicator on the flowchart diagram: current step highlighted, completed steps show checkmarks, failed steps show X
- On step failure: workflow halts, "Retry step" button appears on the failed step — user can fix and retry from that point
- "Run now" button on any workflow for manual triggering — works whether or not a schedule is set
- Timestamped run log: each workflow run logged with start time, per-step timing, output, and success/failure status
- Users can browse past runs and see exactly what happened per step

### Claude's Discretion
- Flowchart rendering library/approach (could be SVG, canvas, or a charting lib)
- Workflow definition file format (YAML/JSON/TOML — deferred from Phase 1)
- Step editor layout and spacing details
- Error message formatting and presentation
- Keyboard shortcuts for workflow editing
- Loading states during workflow execution

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture and stack
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, Tauri IPC patterns
- `.planning/research/SUMMARY.md` — Stack decisions: Tauri 2.x, React 19, shadcn/ui, Zustand, Rust + rusqlite
- `.planning/research/STACK.md` — Full stack recommendation with version pins

### Requirements
- `.planning/REQUIREMENTS.md` — TASK-05, TASK-06, AUTO-01 through AUTO-04 define the exact capabilities this phase delivers
- `.planning/ROADMAP.md` §Phase 3 — Success criteria, dependency on Phase 2

### Prior phase context
- `.planning/phases/01-desktop-shell-and-task-foundation/01-CONTEXT.md` — Task data model, SQLite schema, Tauri IPC patterns, sidebar+main layout
- `.planning/phases/02-task-ui-and-execution-history/02-CONTEXT.md` — Multi-panel layout (two-column + bottom drawer), execution diagram in center panel, output/logs panel

### Project context
- `.planning/PROJECT.md` — BSD-style piping execution model, structured list over node graph, local-first data, native desktop feel

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Project is early-stage: Vite + React scaffold with no Tauri backend yet
- `workflows/` directory exists (empty) — ready for workflow definition files
- Dependencies already include: React 19, Tailwind v4, Zustand, @tauri-apps/api

### Established Patterns
- shadcn/ui for UI components (decided in Phase 1)
- Zustand for centralized state management
- Tauri IPC (invoke commands) bridges React frontend to Rust backend
- Rust backend owns SQLite — no frontend DB bypass

### Integration Points
- Phase 1 establishes: Tauri IPC commands, SQLite data layer, task CRUD, desktop shell
- Phase 2 establishes: multi-panel layout, execution diagram in center panel, output drawer
- This phase adds: workflow engine (Rust), cron scheduler (Rust), step executors (shell/HTTP), workflow builder UI (React)

</code_context>

<specifics>
## Specific Ideas

- BSD-style piping is the core execution model — step outputs flow automatically to next step's input
- Flowchart should be read-only visualization, not a drag-and-drop editor — keeps the structured list as the single source of truth
- Schedule presets cover 90% of use cases; advanced cron for power users
- "Retry step" on failure is critical — users shouldn't have to re-run an entire workflow because one step failed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-workflows-and-automation*
*Context gathered: 2026-03-15*
