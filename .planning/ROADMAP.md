# Roadmap: Element

## Overview

Element is a desktop task orchestration platform built with Tauri 2.x (Rust) + React 19. The roadmap moves through capability layers, each delivering a complete, usable feature set.

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-03-22) -- [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Project Manager** -- Phases 6-11 (shipped 2026-03-25) -- [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Intelligent Planning** -- Phases 12-16 (shipped 2026-03-28) -- [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Foundation & Execution** -- Phases 17-21 (shipped 2026-04-01) -- [archive](milestones/v1.3-ROADMAP.md)
- 🚧 **v1.4 Daily Hub** -- Phases 22-25 (in progress)

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

### 🚧 v1.4 Daily Hub (In Progress)

**Milestone Goal:** Replace TodayView with an AI-powered daily hub that greets the user, summarizes priorities across all projects, and provides a conversational interface to the central orchestrator.

- [ ] **Phase 22: Hub Shell and Goals Tree** - 3-column layout with goals hierarchy, CenterPanel routing, and column minimize/expand
- [ ] **Phase 23: Context Manifest and AI Briefing** - In-memory project status aggregation and LLM-generated daily summary
- [ ] **Phase 24: Hub Chat** - Conversational interface to the orchestrator with streaming markdown responses
- [ ] **Phase 25: Bot Skills and MCP Write Tools** - Chat action dispatch, shell execution, and entity CRUD for both interactive and background agent

## Phase Details

### Phase 22: Hub Shell and Goals Tree
**Goal**: Users see a structured daily hub as their home screen with a navigable goals hierarchy across all projects
**Depends on**: Phase 21 (agent lifecycle must be liftable to AppLayout)
**Requirements**: HUB-01, HUB-02, HUB-03, HUB-04, GOAL-01, GOAL-02, GOAL-03
**Success Criteria** (what must be TRUE):
  1. User sees a 3-column hub layout as the default screen on app launch (not TodayView)
  2. User can minimize any column to a sliver and restore it with a "+" button
  3. User can browse a collapsible tree of themes, projects, phases, and standalone tasks with progress indicators
  4. User can click any project or phase in the goals tree to navigate to its detail view
  5. User can return to the hub from any view via a Home button in the sidebar
**Plans**: 3 plans
Plans:
- [ ] 22-01-PLAN.md -- activeView routing and Home button
- [ ] 22-02-PLAN.md -- Hub 3-column layout with minimize/expand and persistence
- [ ] 22-03-PLAN.md -- Goals tree with progress indicators and Chores section
**UI hint**: yes

### Phase 23: Context Manifest and AI Briefing
**Goal**: Users receive an AI-generated daily summary of priorities across all projects, powered by an efficient context manifest
**Depends on**: Phase 22
**Requirements**: CTX-01, CTX-02, CTX-03, BRIEF-01, BRIEF-02, BRIEF-03
**Success Criteria** (what must be TRUE):
  1. User sees a personalized greeting and AI-generated briefing in the hub center column on load
  2. Briefing content reflects actual project state -- phases in progress, overdue tasks, upcoming deadlines
  3. Briefing streams in with visible loading state and can be manually refreshed
  4. Context manifest stays under 2000 tokens regardless of project count (no LLM quality degradation at scale)
**Plans**: TBD
**UI hint**: yes

### Phase 24: Hub Chat
**Goal**: Users can converse with the orchestrator directly from the hub to ask questions and get guidance
**Depends on**: Phase 23 (extends hub store, prompt infrastructure, streaming pipeline)
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):
  1. User can type a message in the hub and receive a streaming AI response with markdown rendering
  2. User can have a multi-turn conversation within the session (context carries forward)
  3. Hub chat operates independently from the agent panel -- opening hub chat does not trigger the agent sidebar
  4. Chat responses are context-aware (informed by the project manifest, not generic)
**Plans**: 3 plans
Plans:
- [ ] 24-01-PLAN.md -- Multi-turn chat_stream backend (Rust types, trait, 4 providers, Tauri commands)
- [ ] 24-02-PLAN.md -- Frontend chat plumbing (types, Zustand store, streaming hook, npm deps)
- [ ] 24-03-PLAN.md -- Chat UI components (markdown renderer, bubbles, input, chips, container)
**UI hint**: yes

### Phase 25: Bot Skills and MCP Write Tools
**Goal**: The orchestrator can take action on the user's behalf -- creating tasks, updating statuses, running commands -- from both interactive chat and background agent
**Depends on**: Phase 24 (action dispatch requires working chat), Phase 21 (MCP sidecar extension)
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04
**Success Criteria** (what must be TRUE):
  1. User can ask the bot to create a task or update a status via chat and see it take effect in the app
  2. MCP sidecar exposes write tools (create_task, update_task_status, create_file) for background agent use
  3. User can ask the bot to run a shell command, with an allowlist enforced at the handler level
  4. Destructive actions (delete, overwrite, risky commands) require explicit user confirmation before execution
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 22 → 23 → 24 → 25

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
| 12. CLI Settings and Schema Foundation | v1.2 | 1/2 | Complete | 2026-03-28 |
| 13. Adaptive Context Builder | v1.2 | 0/1 | Complete | 2026-03-28 |
| 14. Planning Tier Decision Tree and Execution Mode | v1.2 | 0/4 | Complete | 2026-03-28 |
| 15. .planning/ Folder Sync | v1.2 | 1/2 | Complete | 2026-03-28 |
| 16. Onboarding Skill and Context Delivery | v1.2 | 0/1 | Complete | 2026-03-28 |
| 17. Tech Debt Cleanup | v1.3 | 0/2 | Complete | 2026-03-30 |
| 18. UI Polish | v1.3 | 0/3 | Complete | 2026-03-30 |
| 19. Multi-Terminal Sessions | v1.3 | 1/3 | Complete | 2026-03-30 |
| 20. Notification System | v1.3 | 2/2 | Complete | 2026-04-01 |
| 21. Central AI Agent | v1.3 | 6/6 | Complete | 2026-04-01 |
| 22. Hub Shell and Goals Tree | v1.4 | 0/3 | Planned    |  |
| 23. Context Manifest and AI Briefing | v1.4 | 0/0 | Not started | - |
| 24. Hub Chat | v1.4 | 0/3 | Planned | - |
| 25. Bot Skills and MCP Write Tools | v1.4 | 0/0 | Not started | - |

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
