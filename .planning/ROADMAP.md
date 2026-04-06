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
- ✅ **v1.6 Clarity** -- Phases 31-35 (shipped 2026-04-05)
- 🚧 **v1.7 Test Foundations** -- Phases 36-40 (in progress)

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

<details>
<summary>v1.6 Clarity (Phases 31-35) -- SHIPPED 2026-04-05</summary>

- [x] Phase 31: Drawer Consolidation (2/2 plans) -- completed 2026-04-05
- [x] Phase 32: Hub Layout Overhaul (2/2 plans) -- completed 2026-04-05
- [x] Phase 33: Briefing Rework (4/4 plans) -- completed 2026-04-05
- [x] Phase 34: Goal-First Project Detail (3/3 plans) -- completed 2026-04-05
- [x] Phase 35: Bug Fixes & Polish (1/1 plans) -- completed 2026-04-05

</details>

### v1.7 Test Foundations (In Progress)

**Milestone Goal:** Establish code quality infrastructure -- linting, backend test coverage, error logging, enforcement hooks, and a testing MCP server -- so Claude Code can autonomously verify its own work.

**Phase Numbering:**
- Integer phases (36, 37, 38...): Planned milestone work
- Decimal phases (36.1, 36.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 36: Linting Foundation** - Biome v2 migration, clippy warnings resolved, rustfmt enforced, unified lint scripts (completed 2026-04-05)
- [x] **Phase 37: Test Infrastructure & Core Tests** - Vitest coverage config, Rust test expansion with SQLite isolation, coverage baselines (completed 2026-04-06)
- [x] **Phase 38: Error Logger** - Console.error interceptor with re-entrancy guard writing to log file via Tauri IPC (completed 2026-04-06)
- [x] **Phase 39: Claude Code Hooks** - Pre-commit gate, test-on-save, auto-format hooks with appropriate timeouts (completed 2026-04-06)
- [x] **Phase 40: Testing MCP Server** - Test lifecycle MCP server: discover, run, read results, check coverage gaps (completed 2026-04-06)

## Phase Details

### Phase 36: Linting Foundation
**Goal**: The full codebase passes lint and format checks across both TypeScript and Rust with zero warnings and zero config errors
**Depends on**: Nothing (first phase of v1.7; everything downstream needs clean lint baseline)
**Requirements**: LINT-01, LINT-02, LINT-03, LINT-04
**Success Criteria** (what must be TRUE):
  1. Running `biome check src/` completes with no config errors and no lint violations (Biome v2 schema migration complete)
  2. Running `cargo clippy -- -D warnings` passes with zero warnings, including the `await_holding_lock` concurrency bug in calendar.rs fixed
  3. Running `cargo fmt --check` passes with consistent formatting across all Rust source files
  4. A single `npm run check:all` script runs both TS and Rust lint/format checks and reports pass/fail
**Plans**: 3 plans

Plans:
- [x] 36-01-PLAN.md -- Biome v2 migration and TypeScript lint violations
- [x] 36-02-PLAN.md -- Clippy warnings, rustfmt, and await_holding_lock fix
- [ ] 36-03-PLAN.md -- Unified check:all script

### Phase 37: Test Infrastructure & Core Tests
**Goal**: Both TypeScript and Rust test suites run reliably with coverage reporting, establishing the baseline that hooks and MCP tools will enforce
**Depends on**: Phase 36 (tests must pass lint before test gates are meaningful)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. Running `npx vitest run --coverage` produces a coverage report for TypeScript utility functions with `@vitest/coverage-v8`
  2. Rust model tests use per-test in-memory SQLite isolation (`setup_test_db()` pattern) and pass reliably with default parallel thread count
  3. Tauri command integration tests using `tauri::test::mock_builder()` exist for core commands and pass
  4. Coverage baselines are documented for both suites (which modules are tested, which are not) so coverage gaps are visible
**Plans**: 3 plans

Plans:
- [x] 37-01-PLAN.md -- Vitest coverage config with @vitest/coverage-v8
- [x] 37-02-PLAN.md -- Shared setup_test_db() fixture and Rust test refactor
- [x] 37-03-PLAN.md -- Tauri command integration tests and COVERAGE.md baselines

### Phase 38: Error Logger
**Goal**: Frontend errors are captured to a log file that Claude Code and MCP tools can read, providing observability without component tests
**Depends on**: Phase 36 (Rust command must pass lint; logger benefits from test infra but is not blocked by it)
**Requirements**: ELOG-01, ELOG-02
**Success Criteria** (what must be TRUE):
  1. A `console.error()` call in the frontend results in an entry appearing in `.element/errors.log` via Tauri IPC
  2. An error inside the logging path itself does not freeze the app or cause infinite recursion (re-entrancy guard works)
  3. Error writes are buffered (not per-call IPC) and do not cause observable UI lag during rapid error sequences
**Plans**: 2 plans

Plans:
- [x] 38-01-PLAN.md -- TypeScript error logger module with TDD (interceptor, re-entrancy guard, buffer)
- [x] 38-02-PLAN.md -- Rust backend command, registration, and main.tsx wiring

### Phase 39: Claude Code Hooks
**Goal**: Claude Code automatically enforces code quality -- commits are blocked on lint/test failures, edited files get auto-formatted, and related tests run on save
**Depends on**: Phase 37 (hooks invoke lint and test commands that must be stable first)
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04
**Success Criteria** (what must be TRUE):
  1. When Claude Code attempts to commit code with a lint or test failure, the commit is blocked with a clear error message (exit code 2)
  2. When Claude Code edits a file, related tests run automatically and results are visible
  3. When Claude Code commits TypeScript files, Biome auto-formats them before the commit completes
  4. Hooks complete within their configured timeouts (300s for cargo builds on cold cache) without hanging
**Plans**: 1 plan

Plans:
- [x] 39-01-PLAN.md -- Pre-commit gate, test-on-save, and auto-format hooks configuration

### Phase 40: Testing MCP Server
**Goal**: Claude Code can discover, run, and analyze tests through MCP tools -- making it a self-directed test-writing agent
**Depends on**: Phase 37 (MCP server wraps test commands that must produce reliable output)
**Requirements**: TMCP-01, TMCP-02, TMCP-03, TMCP-04
**Success Criteria** (what must be TRUE):
  1. Claude Code can call `discover_tests` and receive a structured list of available test suites, files, and modules for both Vitest and cargo test
  2. Claude Code can call `run_tests` with a specific test name/file and receive structured results (pass/fail/error per test)
  3. Claude Code can call `check_coverage_gaps` and receive a list of uncovered files/functions from coverage reports
  4. All MCP server command execution uses argument arrays (no shell string interpolation) to prevent injection attacks
**Plans**: 2 plans

Plans:
- [x] 40-01-PLAN.md -- Project scaffold, types, secure runner, and output parsers
- [x] 40-02-PLAN.md -- Tool handlers, MCP server wiring, and build

## Progress

**Execution Order:**
Phases execute in numeric order: 36 -> 37 -> 38 -> 39 -> 40
Note: Phase 38 (Error Logger) is parallelizable with Phase 37 (Tests) if desired.

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
| 31. Drawer Consolidation | v1.6 | 2/2 | Complete | 2026-04-05 |
| 32. Hub Layout Overhaul | v1.6 | 2/2 | Complete | 2026-04-05 |
| 33. Briefing Rework | v1.6 | 4/4 | Complete | 2026-04-05 |
| 34. Goal-First Project Detail | v1.6 | 3/3 | Complete | 2026-04-05 |
| 35. Bug Fixes & Polish | v1.6 | 1/1 | Complete | 2026-04-05 |
| 36. Linting Foundation | v1.7 | 2/3 | Complete    | 2026-04-05 |
| 37. Test Infrastructure & Core Tests | v1.7 | 3/3 | Complete    | 2026-04-06 |
| 38. Error Logger | v1.7 | 2/2 | Complete    | 2026-04-06 |
| 39. Claude Code Hooks | v1.7 | 1/1 | Complete    | 2026-04-06 |
| 40. Testing MCP Server | v1.7 | 0/2 | Complete    | 2026-04-06 |

## Backlog

### Phase 999.1: Windows Cross-Platform Compatibility Fixes (BACKLOG)

**Goal:** Fix platform-specific code that prevents Windows usage. Critical: `engine/shell.rs` hardcodes `sh -c` (needs `cmd /C` on Windows). Medium: `SettingsPage.tsx` shortcut only checks `metaKey` (needs `ctrlKey` fallback), `filesystem.rs` uses `/dev/null` (needs `NUL` on Windows). Low: several test files use Unix-specific paths/commands needing conditional compilation.
**Requirements:** TBD
**Plans:** 1/1 plans complete

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

### Phase 999.8: Create Test Work Week (BACKLOG)

**Goal:** Populate the app with realistic test data to simulate a typical work week: fake projects with phases/tasks (including overdue, blocked, approaching-deadline, and recently-completed states), fake calendar meetings spread across the week, scheduled work blocks, and varied task priorities. Enables demo, QA testing, and visual verification of features like the daily briefing, calendar view, and scoring engine without requiring real user data.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
