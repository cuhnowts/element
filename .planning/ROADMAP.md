# Roadmap: Element

## Overview

Element is a desktop task orchestration platform built with Tauri 2.x (Rust) + React 19. The roadmap moves through capability layers, each delivering a complete, usable feature set.

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-03-22) -- [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Project Manager** -- Phases 6-11 (shipped 2026-03-25) -- [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Intelligent Planning** -- Phases 12-16 (shipped 2026-03-28) -- [archive](milestones/v1.2-ROADMAP.md)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) -- SHIPPED 2026-03-22</summary>

- [x] Phase 1: Desktop Shell and Task Foundation (3/3 plans) -- completed 2026-03-16
- [x] Phase 2: Task UI and Execution History (6/6 plans) -- completed 2026-03-16
- [x] Phase 2.1: Daily UX Foundation (4/4 plans, INSERTED) -- completed 2026-03-16
- [x] Phase 3: Workflows and Automation (5/5 plans) -- completed 2026-03-17
- [x] Phase 4: Plugin System (5/5 plans) -- completed 2026-03-18
- [x] Phase 5: AI and Smart Scheduling (6/6 plans) -- completed 2026-03-19

</details>

<details>
<summary>v1.1 Project Manager (Phases 6-11) -- SHIPPED 2026-03-25</summary>

- [x] Phase 6: Data Foundation and Theme System (3/3 plans) -- completed 2026-03-22
- [x] Phase 7: Project Phases and Directory Linking (3/3 plans) -- completed 2026-03-22
- [x] Phase 8: File Explorer (3/3 plans) -- completed 2026-03-22
- [x] Phase 9: Embedded Terminal (2/2 plans) -- completed 2026-03-23
- [x] Phase 10: AI Project Onboarding (3/3 plans) -- completed 2026-03-23
- [x] Phase 11: Workspace Integration and AI Context (3/3 plans) -- completed 2026-03-25

</details>

<details>
<summary>v1.2 Intelligent Planning (Phases 12-16) -- SHIPPED 2026-03-28</summary>

- [x] Phase 12: CLI Settings and Schema Foundation (2/2 plans) -- completed 2026-03-28
- [x] Phase 13: Adaptive Context Builder (1/1 plans) -- completed 2026-03-28
- [x] Phase 14: Planning Tier Decision Tree and Execution Mode (4/4 plans) -- completed 2026-03-28
- [x] Phase 15: .planning/ Folder Sync (2/2 plans) -- completed 2026-03-28
- [x] Phase 16: Onboarding Skill and Context Delivery (1/1 plans) -- completed 2026-03-28

</details>

### v1.3 Foundation & Execution (Phases 17-21)

**Milestone Goal:** Fix accumulated tech debt, improve UI intuitiveness, add multi-terminal sessions, and lay groundwork for an AI orchestration layer that auto-executes phases and notifies on human-needed items.

- [x] **Phase 17: Tech Debt Cleanup** - Fix TS errors, remove orphaned files, resolve Open AI navigation bug (completed 2026-03-30)
- [ ] **Phase 18: UI Polish** - Direct project click, collapsible sidebar, simplified task view, smart AI button
- [ ] **Phase 19: Multi-Terminal Sessions** - Per-project terminal isolation, named sessions, tab management
- [ ] **Phase 20: Notification System** - OS-native and in-app notifications with priority taxonomy
- [ ] **Phase 21: Central AI Agent** - Background orchestrator with cross-project awareness and approve-only execution

## Phase Details

### Phase 17: Tech Debt Cleanup
**Goal**: Codebase is clean and navigation is reliable before adding new state complexity
**Depends on**: Phase 16
**Requirements**: DEBT-01, DEBT-02, DEBT-03
**Success Criteria** (what must be TRUE):
  1. TypeScript compiler reports zero errors across the entire codebase
  2. ScopeInputForm.tsx and OnboardingWaitingCard.tsx no longer exist in the source tree
  3. Clicking "Open AI" on a project without proper state shows an error toast and keeps the user on ProjectDetail (no navigation to home)
**Plans**: 2 plans

Plans:
- [ ] 17-01-PLAN.md -- Fix TypeScript errors and remove orphaned files
- [ ] 17-02-PLAN.md -- Diagnose and fix Open AI navigation bug

### Phase 18: UI Polish
**Goal**: Users navigate projects intuitively and the AI button communicates the right action at every project state
**Depends on**: Phase 17
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07
**Success Criteria** (what must be TRUE):
  1. Single-clicking a project in the sidebar opens ProjectDetail directly (no context menu required)
  2. Sidebar theme/project sections have a chevron toggle that expands and collapses on click
  3. Task detail view displays essential fields with less visual clutter than the current layout
  4. The AI button label reads "Plan Project" when no plan exists, "Check Progress" when planned, and "Open AI" as fallback -- with the "Link Directory" control on the same line
  5. Terminal tab is the first and default-selected tab in the output drawer
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 18-01-PLAN.md -- Sidebar click behavior, theme collapse persistence, drawer tab reorder
- [ ] 18-02-PLAN.md -- AI button state machine and DirectoryLink layout merge
- [ ] 18-03-PLAN.md -- Task detail accordion simplification

### Phase 19: Multi-Terminal Sessions
**Goal**: Users can run multiple concurrent terminal sessions per project without losing existing sessions
**Depends on**: Phase 17
**Requirements**: TERM-01, TERM-02, TERM-03, TERM-04, TERM-05
**Success Criteria** (what must be TRUE):
  1. Each project maintains its own set of terminal sessions, isolated from other projects
  2. Terminal sessions display as named tabs (e.g., "AI Planning", "Dev Server") in the drawer
  3. Clicking "Open AI" creates a new named terminal session without killing any existing session
  4. Closing a terminal tab kills the PTY process cleanly (no zombie processes remain after 5 seconds)
  5. User can switch between active terminal sessions within a project using the tab bar
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 19-01-PLAN.md -- Session store, unit tests, workspace store cleanup, useTerminal refactor
- [ ] 19-02-PLAN.md -- Terminal UI components: SessionTabBar, TerminalSession, TerminalPane, RefreshContextDialog, OutputDrawer refactor
- [ ] 19-03-PLAN.md -- Integration: OpenAiButton session-aware launch, project delete cleanup, sidebar indicator, app quit hook

### Phase 20: Notification System
**Goal**: The app can surface critical events to the user through both OS-native and in-app channels
**Depends on**: Phase 17
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03
**Success Criteria** (what must be TRUE):
  1. Critical events trigger OS-native desktop notifications (visible even when app is not focused)
  2. In-app notification center shows a history of notifications with priority tiers (critical / informational / silent)
  3. Notification system exposes an event-driven API that the central agent can invoke (not tied to individual UI actions)
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [ ] 20-01-PLAN.md -- Notification backend: SQLite persistence, Rust commands, OS-native plugin, event bus API
- [ ] 20-02-PLAN.md -- Notification frontend: Zustand slice, event hook, bell icon with popover UI, DrawerHeader integration

### Phase 21: Central AI Agent
**Goal**: A background AI orchestrator reads project state, auto-executes safe actions, and notifies when human input is needed
**Depends on**: Phase 19, Phase 20
**Requirements**: AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05, AGENT-06
**Success Criteria** (what must be TRUE):
  1. A persistent central agent runs in its own terminal session and survives project switches
  2. The agent can read the state of all projects (phases, tasks, progress) without manual context feeding
  3. Clicking "Open AI" on a project causes the central agent to seed context into the project-specific AI session
  4. The agent auto-executes phases with no human blockers in approve-only mode (user must confirm before execution proceeds)
  5. When human input is needed (verification, decisions), a notification appears through the notification system
**Plans**: 5 plans

Plans:
- [ ] 21-01-PLAN.md -- MCP server sub-project: Node.js sidecar with read tools and orchestration tools
- [ ] 21-02-PLAN.md -- Agent types and Zustand store with activity log and approval flow
- [ ] 21-03-PLAN.md -- Agent lifecycle hooks, UI panel components, and AppLayout integration
- [ ] 21-04-PLAN.md -- Bidirectional queue watcher, OpenAiButton delegation, approval write-back
- [ ] 21-05-PLAN.md -- MCP server and agent panel tests, end-to-end verification checkpoint

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Desktop Shell and Task Foundation | v1.0 | 3/3 | Complete | 2026-03-16 |
| 2. Task UI and Execution History | v1.0 | 6/6 | Complete | 2026-03-16 |
| 2.1 Daily UX Foundation | v1.0 | 4/4 | Complete | 2026-03-16 |
| 3. Workflows and Automation | v1.0 | 5/5 | Complete | 2026-03-17 |
| 4. Plugin System | v1.0 | 5/5 | Complete | 2026-03-18 |
| 5. AI and Smart Scheduling | v1.0 | 6/6 | Complete | 2026-03-19 |
| 6. Data Foundation and Theme System | v1.1 | 3/3 | Complete | 2026-03-22 |
| 7. Project Phases and Directory Linking | v1.1 | 3/3 | Complete | 2026-03-22 |
| 8. File Explorer | v1.1 | 3/3 | Complete | 2026-03-22 |
| 9. Embedded Terminal | v1.1 | 2/2 | Complete | 2026-03-23 |
| 10. AI Project Onboarding | v1.1 | 3/3 | Complete | 2026-03-23 |
| 11. Workspace Integration and AI Context | v1.1 | 3/3 | Complete | 2026-03-25 |
| 12. CLI Settings and Schema Foundation | v1.2 | 1/2 | Complete    | 2026-03-28 |
| 13. Adaptive Context Builder | v1.2 | 0/1 | Complete    | 2026-03-28 |
| 14. Planning Tier Decision Tree and Execution Mode | v1.2 | 0/4 | Complete    | 2026-03-28 |
| 15. .planning/ Folder Sync | v1.2 | 1/2 | Complete    | 2026-03-28 |
| 16. Onboarding Skill and Context Delivery | v1.2 | 0/1 | Complete    | 2026-03-28 |
| 17. Tech Debt Cleanup | v1.3 | 0/2 | Complete    | 2026-03-30 |
| 18. UI Polish | v1.3 | 0/3 | Planned    |  |
| 19. Multi-Terminal Sessions | v1.3 | 0/3 | Planned | - |
| 20. Notification System | v1.3 | 0/2 | Not started | - |
| 21. Central AI Agent | v1.3 | 0/5 | Planned | - |

## Backlog

### Phase 999.1: Windows Cross-Platform Compatibility Fixes (BACKLOG)

**Goal:** Fix platform-specific code that prevents Windows usage. Critical: `engine/shell.rs` hardcodes `sh -c` (needs `cmd /C` on Windows). Medium: `SettingsPage.tsx` shortcut only checks `metaKey` (needs `ctrlKey` fallback), `filesystem.rs` uses `/dev/null` (needs `NUL` on Windows). Low: several test files use Unix-specific paths/commands needing conditional compilation.
**Requirements:** TBD
**Plans:** 0/3 plans executed

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.2: Wire Calendar Events to Smart Scheduler and OAuth Setup (BACKLOG)

**Goal:** Close two v1.0 tech debt items: (1) `scheduling_commands.rs:94-97` passes an empty `Vec<CalendarEvent>` to `find_open_blocks` -- replace with a query against `calendar_events` table so meetings are factored into scheduling. (2) Add runtime guard in `connect_google_calendar`/`connect_outlook_calendar` that detects placeholder OAuth client IDs and returns an actionable error, plus create `.env.example` and setup docs for registering Google/Microsoft OAuth apps.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.3: Plugin Skills and MCP Server Support (BACKLOG)

**Goal:** Extend the plugin system so plugins can expose skills (slash-command-like capabilities) and register MCP server connections, similar to Claude Code's skill/MCP architecture. Plugins would declare skills in their manifest that appear in the workflow step picker and UI command palette. MCP server plugins would provide tool access for AI-assisted task execution -- the AI gateway routes tool calls to the appropriate MCP server based on plugin registration.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.4: GSD .planning/ Directory Sync (BACKLOG)

**Goal:** When a directory is linked to a project, scan for `.planning/ROADMAP.md` and parse existing phases/tasks into the Element database. File watcher on `.planning/` syncs updates as GSD executes phases (e.g., SUMMARY.md created → mark tasks complete). This would let users run `/gsd:new-project` in a linked directory and see the resulting phases and tasks visualized in the app.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.5: Vision-Driven Goal Planning and Covey Role Management (BACKLOG)

**Goal:** Add workspace-level vision statements, SMART goals (own table), Covey 7-Habits role-based theme management, and a reconciliation layer between active work and stated goals. Helps users define where they want to be, back into themes/projects/phases/tasks, and surface when daily work drifts from what matters. Self-discovery dimension. Could be separate feature area from project management with reconciliation between the two.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.6: Multi-Terminal Sessions and Background Processes (BACKLOG)

**Goal:** Support multiple concurrent terminal sessions per project with per-project isolation. Each session is named (e.g., "GSD Planning", "Dev Server", "Tests"). Clicking "Open AI" spawns a new named session instead of killing the existing one. Background sessions continue running when switching projects. Sessions managed with timeouts or manual cleanup to prevent resource leaks. Terminal drawer shows session tabs for switching between active sessions. Terminal CWD and session state must be scoped to the selected project -- currently the terminal persists across project switches.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
