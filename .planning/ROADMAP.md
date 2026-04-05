# Roadmap: Element

## Overview

Element is a desktop task orchestration platform built with Tauri 2.x (Rust) + React 19. The roadmap moves through capability layers, each delivering a complete, usable feature set.

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-03-22) -- [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Project Manager** -- Phases 6-11 (shipped 2026-03-25) -- [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Intelligent Planning** -- Phases 12-16 (shipped 2026-03-28) -- [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Foundation & Execution** -- Phases 17-21 (shipped 2026-04-01) -- [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Daily Hub** -- Phases 22-25 (shipped 2026-04-03) -- [archive](milestones/v1.4-ROADMAP.md)
- ✅ **v1.5 Time Bounded** -- Phases 26-30 (shipped 2026-04-05) -- [archive](milestones/v1.5-ROADMAP.md)
- 🚧 **v1.6 Clarity** -- Phases 31-35 (in progress)

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

<details>
<summary>v1.3 Foundation & Execution (Phases 17-21) -- SHIPPED 2026-04-01</summary>

- [x] Phase 17: Tech Debt Cleanup (2/2 plans) -- completed 2026-03-30
- [x] Phase 18: UI Polish (3/3 plans) -- completed 2026-03-30
- [x] Phase 19: Multi-Terminal Sessions (3/3 plans) -- completed 2026-03-30
- [x] Phase 20: Notification System (2/2 plans) -- completed 2026-04-01
- [x] Phase 21: Central AI Agent (6/6 plans) -- completed 2026-04-01

</details>

<details>
<summary>v1.4 Daily Hub (Phases 22-25) -- SHIPPED 2026-04-03</summary>

- [x] Phase 22: Hub Shell and Goals Tree (3/3 plans) -- completed 2026-04-02
- [x] Phase 23: Context Manifest and AI Briefing (2/2 plans) -- completed 2026-04-03
- [x] Phase 24: Hub Chat (3/3 plans) -- completed 2026-04-03
- [x] Phase 25: Bot Skills and MCP Write Tools (4/4 plans) -- completed 2026-04-03

</details>

<details>
<summary>v1.5 Time Bounded (Phases 26-30) -- SHIPPED 2026-04-05</summary>

- [x] Phase 26: Calendar Sync Foundation (2/2 plans) -- completed 2026-04-04
- [x] Phase 27: Hub Calendar View (3/3 plans) -- completed 2026-04-04
- [x] Phase 28: Due Dates & Daily Planning (3/3 plans) -- completed 2026-04-04
- [x] Phase 29: Calendar MCP Tools (2/2 plans) -- completed 2026-04-04
- [x] Phase 30: Heartbeat & Schedule Negotiation (3/3 plans) -- completed 2026-04-05

</details>

### v1.6 Clarity (In Progress)

**Milestone Goal:** Strip the UI down to what matters -- goal-first projects, a hub that doesn't scroll sideways, and a briefing you actually want to read.

**Phase Numbering:**
- Integer phases (31, 32, 33...): Planned milestone work
- Decimal phases (31.1, 31.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 31: Drawer Consolidation** - Click-to-toggle drawer with AI panel as bottom drawer tab, right sidebar removed
- [x] **Phase 32: Hub Layout Overhaul** - Single center view with opt-in slide-in overlay panels replacing 3-column layout (completed 2026-04-05)
- [ ] **Phase 33: Briefing Rework** - On-demand generation with structured card-based sections
- [ ] **Phase 34: Goal-First Project Detail** - Goal hero card above phases with streamlined workspace entry
- [ ] **Phase 35: Bug Fixes & Polish** - Calendar Today label, deterministic overdue detection, minimizable workflows

## Phase Details

### Phase 31: Drawer Consolidation
**Goal**: Users interact with one unified bottom drawer that houses terminals, output, and AI -- no more right sidebar column
**Depends on**: Nothing (first phase of v1.6; simplifies AppLayout for all subsequent changes)
**Requirements**: DRAW-01, DRAW-02, DRAW-03
**Success Criteria** (what must be TRUE):
  1. User can click a tab bar or chevron to toggle the bottom drawer between fully collapsed and expanded states
  2. User can switch to an "Element AI" tab in the bottom drawer and see agent activity and terminal output
  3. The right sidebar agent panel is gone -- AppLayout renders only sidebar + center + bottom drawer
  4. Agent lifecycle (queue watcher, auto-start) continues working regardless of whether the AI drawer tab is visible
**Plans**: 2 plans

Plans:
- [x] 31-01-PLAN.md -- State layer: DrawerTab union, agent store refactor, lifecycle decoupling, keyboard shortcut rewire
- [ ] 31-02-PLAN.md -- UI: Element AI drawer pane, tab bar update, right sidebar removal, dead component cleanup

**UI hint**: yes

### Phase 32: Hub Layout Overhaul
**Goal**: Users see a focused single-view hub with optional context panels that slide in on demand -- no forced horizontal scrolling
**Depends on**: Phase 31
**Requirements**: HUB-01, HUB-02, HUB-03, HUB-04, HUB-05
**Success Criteria** (what must be TRUE):
  1. Opening the hub shows a single full-width center view (chat and briefing) with no horizontal scroll or column competition
  2. User can toggle a Goals panel that slides in from the left via a toolbar button
  3. User can toggle a Calendar panel that slides in from the right via a toolbar button
  4. User can toggle a Briefing panel from the toolbar (or briefing is accessible inline in the center view)
  5. Slide-in panels animate smoothly using CSS transforms with no layout jank or content reflow
**Plans**: 2 plans

Plans:
- [x] 32-01-PLAN.md -- Store toggle state, SlideOverPanel component, HubToolbar with Calendar/Goals buttons
- [ ] 32-02-PLAN.md -- CommandHub center view, DayPulse, ActionButtons, JumpToTop, HubView rewrite

**UI hint**: yes

### Phase 33: Briefing Rework
**Goal**: Users get a scannable, visually structured briefing they generate on demand -- not a wall of markdown auto-fired on load
**Depends on**: Nothing (component-isolated, parallelizable with Phase 32)
**Requirements**: BRIEF-01, BRIEF-02, BRIEF-03, BRIEF-04
**Success Criteria** (what must be TRUE):
  1. User sees a "Generate Briefing" button on hub load instead of an auto-triggered streaming briefing
  2. Generated briefing displays distinct sections (summary, deadlines, blockers, wins) with clear hierarchy
  3. Each briefing section renders as a visually distinct card -- not a single markdown block
  4. Briefing and hub chat share one interface with shared conversation context
**Plans**: 3 plans

Plans:
- [x] 33-01-PLAN.md -- Scoring engine (Rust) and TypeScript briefing types
- [ ] 33-02-PLAN.md -- Briefing command JSON output, store and stream hook update
- [ ] 33-03-PLAN.md -- HubCenterPanel rewrite, card components, ActionChipBar

**UI hint**: yes

### Phase 34: Goal-First Project Detail
**Goal**: Users immediately see what a project is trying to achieve and can get into workspace flow with minimal clicks
**Depends on**: Phase 31
**Requirements**: PROJ-01, PROJ-02, PROJ-03
**Success Criteria** (what must be TRUE):
  1. User sees the project goal displayed as a prominent hero card above the phase list when opening a project
  2. User can set and edit the project goal directly in the project detail view without navigating elsewhere
  3. User can reach the workspace (directory + AI terminal) from the project detail in two clicks or fewer
**Plans**: 3 plans

Plans:
- [ ] 34-00-PLAN.md -- Wave 0: test stubs for GoalHeroCard and WorkspaceButton (Nyquist compliance)
- [ ] 34-01-PLAN.md -- Data layer: goal column migration, Rust model, Tauri command, TS types
- [ ] 34-02-PLAN.md -- UI: GoalHeroCard, WorkspaceButton, ProjectDetail layout restructure

**UI hint**: yes

### Phase 35: Bug Fixes & Polish
**Goal**: Three standalone issues are resolved -- calendar labeling, overdue detection, and workflows clutter
**Depends on**: Nothing (independent of all other v1.6 phases)
**Requirements**: FIX-01, FIX-02, FIX-03
**Success Criteria** (what must be TRUE):
  1. In calendar week view, only the actual current day shows the "Today" label -- other days show only their date
  2. Overdue tasks are detected by a deterministic database query (due_date < today AND status != complete) with no LLM involvement
  3. User can fully minimize the Workflows section when not actively using it, and it stays minimized across sessions
**Plans**: 1 plan

Plans:
- [ ] 35-01-PLAN.md -- Calendar today fix, overdue audit, and collapsible workflows

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 31 -> 32 -> 33 -> 34 -> 35
Note: Phase 33 (Briefing) is parallelizable with Phase 32 (Hub) if desired.

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
| 12. CLI Settings and Schema Foundation | v1.2 | 2/2 | Complete | 2026-03-28 |
| 13. Adaptive Context Builder | v1.2 | 1/1 | Complete | 2026-03-28 |
| 14. Planning Tier Decision Tree and Execution Mode | v1.2 | 4/4 | Complete | 2026-03-28 |
| 15. .planning/ Folder Sync | v1.2 | 2/2 | Complete | 2026-03-28 |
| 16. Onboarding Skill and Context Delivery | v1.2 | 1/1 | Complete | 2026-03-28 |
| 17. Tech Debt Cleanup | v1.3 | 2/2 | Complete | 2026-03-30 |
| 18. UI Polish | v1.3 | 3/3 | Complete | 2026-03-30 |
| 19. Multi-Terminal Sessions | v1.3 | 3/3 | Complete | 2026-03-30 |
| 20. Notification System | v1.3 | 2/2 | Complete | 2026-04-01 |
| 21. Central AI Agent | v1.3 | 6/6 | Complete | 2026-04-01 |
| 22. Hub Shell and Goals Tree | v1.4 | 3/3 | Complete | 2026-04-02 |
| 23. Context Manifest and AI Briefing | v1.4 | 2/2 | Complete | 2026-04-03 |
| 24. Hub Chat | v1.4 | 3/3 | Complete | 2026-04-03 |
| 25. Bot Skills and MCP Write Tools | v1.4 | 4/4 | Complete | 2026-04-03 |
| 26. Calendar Sync Foundation | v1.5 | 2/2 | Complete | 2026-04-04 |
| 27. Hub Calendar View | v1.5 | 3/3 | Complete | 2026-04-04 |
| 28. Due Dates & Daily Planning | v1.5 | 3/3 | Complete | 2026-04-04 |
| 29. Calendar MCP Tools | v1.5 | 2/2 | Complete | 2026-04-04 |
| 30. Heartbeat & Schedule Negotiation | v1.5 | 3/3 | Complete | 2026-04-05 |
| 31. Drawer Consolidation | v1.6 | 1/2 | In Progress|  |
| 32. Hub Layout Overhaul | v1.6 | 1/2 | Complete    | 2026-04-05 |
| 33. Briefing Rework | v1.6 | 2/4 | In Progress|  |
| 34. Goal-First Project Detail | v1.6 | 0/3 | Not started | - |
| 35. Bug Fixes & Polish | v1.6 | 0/1 | Not started | - |

## Backlog

### Phase 999.1: Windows Cross-Platform Compatibility Fixes (BACKLOG)

**Goal:** Fix platform-specific code that prevents Windows usage. Critical: `engine/shell.rs` hardcodes `sh -c` (needs `cmd /C` on Windows). Medium: `SettingsPage.tsx` shortcut only checks `metaKey` (needs `ctrlKey` fallback), `filesystem.rs` uses `/dev/null` (needs `NUL` on Windows). Low: several test files use Unix-specific paths/commands needing conditional compilation.
**Requirements:** TBD
**Plans:** 2/4 plans executed

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

**Goal:** When a directory is linked to a project, scan for `.planning/ROADMAP.md` and parse existing phases/tasks into the Element database. File watcher on `.planning/` syncs updates as GSD executes phases (e.g., SUMMARY.md created -> mark tasks complete). This would let users run `/gsd:new-project` in a linked directory and see the resulting phases and tasks visualized in the app.
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

### Phase 999.7: Onboarding Installation Wizard (BACKLOG)

**Goal:** First-run setup flow that makes the app feel like a consumer product, not a config form. Steps: (1) User profile creation, (2) Add 2-3 projects/deliverables they're working on, (3) Configure AI tool (CLI setting), (4) AI-assisted goal structuring for each project — fast 2-3 min exercise once AI is set up, (5) Calendar linking (Google/Outlook OAuth), (6) Timeline walkthrough — add deadlines to projects. App is "locked" until onboarding completes, then fully unlocked with briefings enabled.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
