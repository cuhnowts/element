# Roadmap: Element

## Overview

Element is a desktop task orchestration platform built with Tauri 2.x (Rust) + React 19. The roadmap moves through capability layers, each delivering a complete, usable feature set.

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-03-22) -- [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Project Manager** -- Phases 6-11 (shipped 2026-03-25) -- [archive](milestones/v1.1-ROADMAP.md)
- **v1.2 Intelligent Planning** -- Phases 12-15 (in progress)

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

### v1.2 Intelligent Planning (Phases 12-15)

- [ ] **Phase 12: CLI Settings and Schema Foundation** - Configurable AI tool command, schema additions for tier and sync, watcher safety patterns
- [ ] **Phase 13: Adaptive Context Builder** - Mode-aware context file generation with token budget enforcement
- [ ] **Phase 14: Planning Tier Decision Tree and Execution Mode** - Tier selection dialog, Quick/Medium/GSD flows, "What's next?" execution guidance
- [ ] **Phase 15: .planning/ Folder Sync** - ROADMAP.md parsing, file watcher, one-way disk-to-database sync for GSD tier

## Phase Details

### Phase 12: CLI Settings and Schema Foundation
**Goal**: Users can configure their AI terminal tool and the app is ready to store tier and sync metadata
**Depends on**: Phase 11
**Requirements**: CLI-01, CLI-02, PLAN-05, SYNC-04
**Success Criteria** (what must be TRUE):
  1. User can open Settings, enter a custom CLI command (e.g., `aider`, `codex`), and the "Open AI" button launches that command instead of hardcoded claude
  2. App checks whether the configured CLI tool exists on the system before launching, and shows an actionable error message if it is missing
  3. User's planning tier choice persists per-project -- selecting a tier on one project does not affect other projects
  4. Phases and tasks created by external sync are distinguishable from user-created ones in the database (source tagging exists)
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [ ] 12-01-PLAN.md — Migration 010, model updates, validate_cli_tool and set_planning_tier commands
- [ ] 12-02-PLAN.md — CLI Tool settings UI, tab rename, OpenAiButton wiring with validation

### Phase 13: Adaptive Context Builder
**Goal**: The AI context file intelligently adapts its content based on what the project needs right now
**Depends on**: Phase 12
**Requirements**: CTX-01, CTX-02, CTX-04
**Success Criteria** (what must be TRUE):
  1. Context file for a project with no plan contains planning instructions; context file for a project with tasks in progress contains execution guidance with progress summary
  2. A project with 50+ tasks generates a context file that summarizes completed work rather than listing every task, staying within token budget
  3. Context file for a Quick-tier project contains simple todo-list prompts; context file for a GSD-tier project contains GSD command instructions
**Plans**: 1 plan

Plans:
- [ ] 13-01-PLAN.md -- Adaptive context builder with state detection, instruction matrix, and token budget rollup (TDD)

### Phase 14: Planning Tier Decision Tree and Execution Mode
**Goal**: Users get the right level of AI planning for their project -- from a quick todo list to full GSD breakdown -- and planned projects get "what's next?" execution guidance
**Depends on**: Phase 13
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, CTX-03
**Success Criteria** (what must be TRUE):
  1. Clicking "Open AI" on a project with no plan shows a tier selection dialog (Quick / Medium / GSD) before launching the terminal
  2. Selecting Quick tier and providing a brief description produces a flat task list that is saved directly to the project (no phases)
  3. Selecting Medium tier starts an AI conversation that asks focused questions, then generates phases and tasks for user review via the existing AiPlanReview UI
  4. Selecting GSD tier launches the AI with instructions to run GSD commands, and the selected tier is stored on the project
  5. Clicking "Open AI" on a project that already has tasks shows progress, highlights blockers, and suggests the next action to work on
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [ ] 12-01-PLAN.md — Migration 010, model updates, validate_cli_tool and set_planning_tier commands
- [ ] 12-02-PLAN.md — CLI Tool settings UI, tab rename, OpenAiButton wiring with validation

### Phase 15: .planning/ Folder Sync
**Goal**: GSD-tier projects automatically reflect their .planning/ROADMAP.md structure in Element's UI
**Depends on**: Phase 14
**Requirements**: SYNC-01, SYNC-02, SYNC-03
**Success Criteria** (what must be TRUE):
  1. User can trigger an import of .planning/ROADMAP.md and see the parsed phases and tasks appear in the project's phase list
  2. When GSD executes and updates ROADMAP.md on disk, Element detects the change and syncs the updates into the database automatically
  3. App-side writes to .planning/ (if any) do not trigger a re-import loop -- content hashing prevents infinite sync cycles

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
| 12. CLI Settings and Schema Foundation | v1.2 | 0/2 | Planning | - |
| 13. Adaptive Context Builder | v1.2 | 0/1 | Planning | - |
| 14. Planning Tier Decision Tree and Execution Mode | v1.2 | 0/0 | Not started | - |
| 15. .planning/ Folder Sync | v1.2 | 0/0 | Not started | - |

## Backlog

### Phase 999.1: Windows Cross-Platform Compatibility Fixes (BACKLOG)

**Goal:** Fix platform-specific code that prevents Windows usage. Critical: `engine/shell.rs` hardcodes `sh -c` (needs `cmd /C` on Windows). Medium: `SettingsPage.tsx` shortcut only checks `metaKey` (needs `ctrlKey` fallback), `filesystem.rs` uses `/dev/null` (needs `NUL` on Windows). Low: several test files use Unix-specific paths/commands needing conditional compilation.
**Requirements:** TBD
**Plans:** 3/3 plans complete

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
