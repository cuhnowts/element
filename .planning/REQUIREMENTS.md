# Requirements: Element

**Defined:** 2026-04-04
**Core Value:** The AI agent must reliably orchestrate project work -- planning, executing, and monitoring across all projects so the user focuses on decisions, not mechanics.

## v1.7 Requirements

Requirements for v1.7 Test Foundations milestone. Each maps to roadmap phases.

### Linting

- [x] **LINT-01**: Biome schema migrated from v1.9.4 to v2.x and `biome check` passes on full codebase
- [x] **LINT-02**: Biome rules incrementally tightened with project-specific TypeScript/React rules enforced
- [x] **LINT-03**: All clippy warnings resolved including `await_holding_lock` concurrency bug in calendar.rs
- [x] **LINT-04**: rustfmt enforced across all Rust source files with consistent formatting config

### Backend Testing

- [x] **TEST-01**: Vitest configured with coverage reporting (`@vitest/coverage-v8`) for TypeScript utility functions
- [x] **TEST-02**: Rust model tests expanded with per-test SQLite isolation using established `setup_test_db()` pattern
- [ ] **TEST-03**: Tauri command integration tests using `tauri::test::mock_builder()` for core commands
- [ ] **TEST-04**: Coverage baselines established for both Vitest and cargo test suites

### Error Logger

- [ ] **ELOG-01**: Console.error interceptor captures frontend errors and writes to `.element/errors.log` via Tauri IPC
- [ ] **ELOG-02**: Error logger has re-entrancy guard and buffered writes to prevent performance impact

### Claude Code Hooks

- [ ] **HOOK-01**: Pre-commit hook blocks commits when lint or test failures are detected (exit code 2)
- [ ] **HOOK-02**: Test-on-save hook runs related tests when Claude Code edits a file
- [ ] **HOOK-03**: Auto-format hook runs Biome format on TypeScript files after edits
- [ ] **HOOK-04**: Hooks configured with appropriate timeouts (300s for cargo builds)

### Testing MCP Server

- [x] **TMCP-01**: Testing MCP server discovers available test suites (Vitest + cargo test) and lists test files/modules
- [x] **TMCP-02**: Testing MCP server runs specified tests and returns structured results (pass/fail/error per test)
- [x] **TMCP-03**: Testing MCP server reads coverage reports and identifies uncovered files/functions
- [x] **TMCP-04**: Testing MCP server uses argument arrays for command execution (no shell string interpolation)

## v1.6 Requirements (Complete)

### Hub Layout

- [x] **HUB-01**: User sees a single full-width center view when opening the hub (no horizontal scroll)
- [x] **HUB-02**: User can toggle a goals slide-in panel from the hub toolbar
- [x] **HUB-03**: User can toggle a calendar slide-in panel from the hub toolbar
- [x] **HUB-04**: User can trigger a daily briefing from the hub center view (D-09: action button, not toolbar toggle)
- [x] **HUB-05**: Slide-in panels animate smoothly using CSS transforms (no layout jank)

### Briefing

- [x] **BRIEF-01**: User sees a "Generate Briefing" button instead of auto-generated briefing on hub load
- [x] **BRIEF-02**: Generated briefing displays structured sections (summary, deadlines, blockers, wins)
- [x] **BRIEF-03**: Briefing sections render as visually distinct cards with clear hierarchy
- [x] **BRIEF-04**: Briefing and hub chat are consolidated into one interface with shared context

### Project Detail

- [x] **PROJ-01**: User sees the project goal prominently displayed as a hero card above phases
- [x] **PROJ-02**: User can set and edit the project goal directly in the project detail UI
- [x] **PROJ-03**: Project detail provides a streamlined workspace entry (goal → directory + AI terminal → work)

### Drawer

- [x] **DRAW-01**: User can click to toggle the bottom drawer between fully collapsed and expanded (~450px)
- [x] **DRAW-02**: Agent panel is accessible as an "Element AI" tab in the bottom drawer
- [x] **DRAW-03**: Right sidebar agent panel is removed from the app layout

### Bug Fixes

- [x] **FIX-01**: Calendar week view shows "Today" label only on the actual current day
- [x] **FIX-02**: Overdue tasks are detected deterministically (due_date < today and not complete) without LLM
- [x] **FIX-03**: Workflows section can be fully minimized when not in use

## v1.5 Requirements (Complete)

### Calendar Sync

- [x] **CAL-01**: Google Calendar OAuth sync works reliably with token refresh and 410 handling
- [x] **CAL-02**: Outlook Calendar OAuth sync works with correct timezone parsing
- [x] **CAL-03**: Calendar events are wired to the scheduling engine for gap detection
- [x] **CAL-04**: Calendar sync runs on a background interval with debounced refresh

### Calendar View

- [x] **VIEW-01**: Hub right column shows a day view with time slots, meetings, and work blocks
- [x] **VIEW-02**: User can switch between day and week view
- [x] **VIEW-03**: AI-scheduled work blocks appear alongside external calendar events
- [x] **VIEW-04**: Clicking a work block navigates to the associated task

### Due Dates

- [x] **DUE-01**: User can set due dates on tasks and phases via a date picker
- [x] **DUE-02**: Overdue and upcoming tasks are visually indicated in the goals tree and task views
- [x] **DUE-03**: Backlog items (999.x phases) are exempt from due date enforcement and alerts

### Calendar MCP Tools

- [x] **MCP-01**: MCP server exposes tools to read calendar events for a date range
- [x] **MCP-02**: MCP server exposes tools to create/move work blocks on the calendar
- [x] **MCP-03**: MCP server exposes tools to query available time slots

### Daily Planning

- [x] **PLAN-01**: Bot presents a prioritized daily plan on hub load: tasks ranked by importance against available time
- [x] **PLAN-02**: Bot asks "What should we work on today?" when there's more work than time
- [x] **PLAN-03**: Bot suggests due dates for tasks without them through conversation
- [x] **PLAN-04**: Bot can reschedule work when the user reports lost time or new priorities

### Heartbeat

- [x] **BEAT-01**: Background process periodically evaluates deadline risk (remaining work vs remaining capacity)
- [x] **BEAT-02**: Heartbeat prefers local LLM (Ollama) for summary, falls back to CLI tool
- [x] **BEAT-03**: Deadline risks surface as notifications and briefing updates
- [x] **BEAT-04**: Heartbeat respects backlog exemption -- does not alert on 999.x items

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Calendar Enhancements

- **CAL-10**: Push events back to Google/Outlook (write to external calendar)
- **CAL-11**: Microsoft Graph as alternative calendar source (no OAuth needed)

### Intelligence

- **INT-01**: Hub urgency scoring -- AI-driven priority scoring for tasks and projects
- **INT-02**: Hub email signal ingestion -- email context fed into daily briefing
- **INT-03**: Memory system -- full context model that learns user preferences, habits, and patterns

### Platform

- **PLAT-01**: Windows support
- **PLAT-02**: Plugin marketplace with paid workflow plugins

### Testing Enhancements

- **TMCP-10**: Test stub generation from coverage gap analysis
- **TMCP-11**: "Suggest what to test next" AI-powered recommendation

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Frontend component tests (RTL) | UI verified via screenshots + user feedback, not automated component tests |
| E2E tests (WebDriver/Playwright) | Too heavy for current stage; manual UAT sufficient |
| Snapshot tests | Brittle, high maintenance for fast-moving UI |
| Coverage percentage targets | Baselines yes, enforcement no — coverage gates create perverse incentives |
| Husky/lint-staged | Claude Code hooks handle enforcement; git hooks add complexity |
| Drag-to-resize drawer | Click toggle is sufficient; drag adds complexity without value |
| Animation framework (framer-motion) | CSS transforms + tw-animate-css sufficient; 40KB+ overhead not justified |
| Full autonomous rescheduling without confirmation | Users must approve schedule changes |
| LLM-generated schedules | LLM narrates algorithm output, does not generate schedules |
| Full node-graph visual editor | Structured list covers 90% of use cases at 20% cost |
| Mobile app | Desktop-first, mobile notifications via existing channels |
| Real-time collaboration | Personal work OS, single-user focus |
| Built-in calendar/email clients | Ingest signals via plugins, don't replicate source apps |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LINT-01 | Phase 36 | Complete |
| LINT-02 | Phase 36 | Complete |
| LINT-03 | Phase 36 | Complete |
| LINT-04 | Phase 36 | Complete |
| TEST-01 | Phase 37 | Complete |
| TEST-02 | Phase 37 | Complete |
| TEST-03 | Phase 37 | Pending |
| TEST-04 | Phase 37 | Pending |
| ELOG-01 | Phase 38 | Pending |
| ELOG-02 | Phase 38 | Pending |
| HOOK-01 | Phase 39 | Pending |
| HOOK-02 | Phase 39 | Pending |
| HOOK-03 | Phase 39 | Pending |
| HOOK-04 | Phase 39 | Pending |
| TMCP-01 | Phase 40 | Complete |
| TMCP-02 | Phase 40 | Complete |
| TMCP-03 | Phase 40 | Complete |
| TMCP-04 | Phase 40 | Complete |

**Coverage:**
- v1.7 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after roadmap creation*
