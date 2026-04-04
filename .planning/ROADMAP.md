# Roadmap: Element

## Overview

Element is a desktop task orchestration platform built with Tauri 2.x (Rust) + React 19. The roadmap moves through capability layers, each delivering a complete, usable feature set.

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-03-22) -- [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Project Manager** -- Phases 6-11 (shipped 2026-03-25) -- [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Intelligent Planning** -- Phases 12-16 (shipped 2026-03-28) -- [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Foundation & Execution** -- Phases 17-21 (shipped 2026-04-01) -- [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Daily Hub** -- Phases 22-25 (shipped 2026-04-03) -- [archive](milestones/v1.4-ROADMAP.md)
- 🚧 **v1.5 Time Bounded** -- Phases 26-30 (in progress)

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

### v1.5 Time Bounded (In Progress)

**Milestone Goal:** Turn Element into a daily scheduling assistant that reads your calendar, knows your tasks and deadlines, and opens with "Here's what you have time for today."

**Phase Numbering:**
- Integer phases (26, 27, 28...): Planned milestone work
- Decimal phases (26.1, 26.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 26: Calendar Sync Foundation** - Fix OAuth bugs and wire calendar events to scheduling engine
- [ ] **Phase 27: Hub Calendar View** - Day/week time-grid showing meetings and work blocks
- [ ] **Phase 28: Due Dates & Daily Planning** - Due date enforcement with backlog exemption and AI daily planning skill
- [ ] **Phase 29: Calendar MCP Tools** - Bot tools for reading calendar and managing work blocks
- [ ] **Phase 30: Heartbeat & Schedule Negotiation** - Background deadline monitoring and conversational rescheduling

## Phase Details

### Phase 26: Calendar Sync Foundation
**Goal**: Calendar events reliably flow from Google and Outlook into the app and feed the scheduling engine
**Depends on**: Nothing (first phase of v1.5; built on v1.4 infrastructure)
**Requirements**: CAL-01, CAL-02, CAL-03, CAL-04
**Success Criteria** (what must be TRUE):
  1. User with a Google Calendar connected sees their events appear in the app within one sync cycle, including after token refresh and 410 sync token invalidation
  2. User with an Outlook Calendar connected sees events with correct times regardless of their timezone
  3. The scheduling engine detects busy time from real calendar events when generating a schedule (empty vec tech debt resolved)
  4. Calendar sync runs automatically in the background on a timer without user intervention
**Plans**: 2 plans

Plans:
- [ ] 26-01-PLAN.md -- Fix Google/Outlook sync bugs (410, timezone, invalid_grant, cancelled events, placeholder guards)
- [ ] 26-02-PLAN.md -- Wire scheduler to real calendar events and finalize background sync timing

### Phase 27: Hub Calendar View
**Goal**: Users can see their day at a glance -- meetings from external calendars and AI-scheduled work blocks in one view
**Depends on**: Phase 26
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04
**Success Criteria** (what must be TRUE):
  1. Hub right column displays a time-grid day view with time slots showing both external meetings and internal work blocks
  2. User can toggle between day view and week view
  3. Work blocks scheduled by the AI are visually distinct from external calendar meetings
  4. Clicking a work block navigates the user to the associated task's detail view
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 27-01-PLAN.md -- Types, layout math (TDD), Zustand state, and data hooks
- [ ] 27-02-PLAN.md -- Day view UI components and HubView wiring
- [ ] 27-03-PLAN.md -- Week view, meeting popover, MiniCalendar coordination, and integration tests

### Phase 28: Due Dates & Daily Planning
**Goal**: Users get a conversational daily planning experience -- the AI presents what fits today, suggests due dates, and adapts when plans change, while backlog items stay out of the way
**Depends on**: Phase 26, Phase 27
**Requirements**: DUE-01, DUE-02, DUE-03, PLAN-01, PLAN-02, PLAN-03, PLAN-04
**Success Criteria** (what must be TRUE):
  1. User can set a due date on any task or phase via a date picker in the UI
  2. Overdue and upcoming-soon tasks are visually flagged in the goals tree and task detail views
  3. Tasks in backlog phases (999.x) do not show due date warnings or nag the user
  4. On hub load, the bot presents a prioritized daily plan showing tasks ranked against available calendar time
  5. User can tell the bot about lost time or changed priorities and get an updated plan suggestion (not auto-applied)
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [ ] 28-01-PLAN.md -- Date utilities, badge warning variant, DatePickerPopover, SchedulingBadges three-tier, GoalsTreeNode overdue badges
- [ ] 28-02-PLAN.md -- Rust manifest extension with today's schedule data and briefing prompt update
- [ ] 28-03-PLAN.md -- DailyPlanSection, DueDateSuggestion, BriefingPanel wiring, HubChat rescheduling

### Phase 29: Calendar MCP Tools
**Goal**: External AI agents can read the user's calendar and manage work blocks through the MCP server
**Depends on**: Phase 26, Phase 28
**Requirements**: MCP-01, MCP-02, MCP-03
**Success Criteria** (what must be TRUE):
  1. An MCP client can list calendar events for any date range and receive structured event data
  2. An MCP client can create and move work blocks, which then appear in the hub calendar view
  3. An MCP client can query available time slots for a given day and receive gap data
**Plans**: TBD

### Phase 30: Heartbeat & Schedule Negotiation
**Goal**: The app proactively warns about deadline risks and lets users conversationally renegotiate their schedule
**Depends on**: Phase 28
**Requirements**: BEAT-01, BEAT-02, BEAT-03, BEAT-04
**Success Criteria** (what must be TRUE):
  1. A background process periodically evaluates whether remaining work can fit before deadlines, without user action
  2. When deadline risk is detected, the user sees a notification and the daily briefing reflects the risk
  3. Heartbeat uses a local LLM (Ollama) for risk summaries when available, falling back to the configured CLI tool
  4. Backlog items (999.x phases) are ignored by the heartbeat -- no false alarms on intentionally unscheduled work
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 26 -> 27 -> 28 -> 29 -> 30

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
| 26. Calendar Sync Foundation | v1.5 | 0/2 | Not started | - |
| 27. Hub Calendar View | v1.5 | 0/3 | Not started | - |
| 28. Due Dates & Daily Planning | v1.5 | 0/3 | Not started | - |
| 29. Calendar MCP Tools | v1.5 | 0/? | Not started | - |
| 30. Heartbeat & Schedule Negotiation | v1.5 | 0/? | Not started | - |

## Backlog

### Phase 999.1: Windows Cross-Platform Compatibility Fixes (BACKLOG)

**Goal:** Fix platform-specific code that prevents Windows usage. Critical: `engine/shell.rs` hardcodes `sh -c` (needs `cmd /C` on Windows). Medium: `SettingsPage.tsx` shortcut only checks `metaKey` (needs `ctrlKey` fallback), `filesystem.rs` uses `/dev/null` (needs `NUL` on Windows). Low: several test files use Unix-specific paths/commands needing conditional compilation.
**Requirements:** TBD
**Plans:** 4/4 plans complete

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
