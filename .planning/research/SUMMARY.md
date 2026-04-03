# Project Research Summary

**Project:** Element v1.5 — Time Bounded
**Domain:** AI scheduling assistant with calendar-aware task management and proactive deadline monitoring
**Researched:** 2026-04-02
**Confidence:** HIGH

## Executive Summary

Element v1.5 extends an existing, well-structured Tauri 2.x/React 19 desktop app with scheduling features that most competitors handle poorly. The research is unusually favorable: the scheduling engine already exists and works correctly, the calendar sync infrastructure already exists, and the AI chat system already handles bot skills via action registry — the primary work is wiring these together and building the UI layer on top. The single most consequential line of code is `scheduling_commands.rs:97`, which passes an empty vec for calendar events, preventing the scheduler from knowing about meetings. Fixing that ~15-line gap unlocks the entire feature set.

The recommended architecture is opinionated: LLMs handle conversational presentation and rescheduling negotiation only; deterministic algorithms handle actual schedule generation. This is not a tradeoff — using an LLM for constraint-based scheduling is a known failure mode backed by published research. The existing greedy scheduler (`assign_tasks_to_blocks`) is already deadline-aware and priority-scored. The bot's job is to present its output conversationally and let users adjust, not to generate schedules from scratch.

The dominant risk is calendar sync reliability before anything else ships. Three pre-existing bugs must be fixed in the first phase: the Outlook timezone parsing bug that makes events appear hours off for non-EST users, the missing 410 Gone handler that permanently breaks incremental sync when Google invalidates a sync token, and the OAuth testing-mode 7-day token expiry. None of these require new libraries — they are code corrections in existing files. The second risk is user trust: auto-rescheduling without confirmation is a verified trust destroyer (documented from Motion user research). Every schedule change must be presented as a suggestion the user explicitly accepts.

## Key Findings

### Recommended Stack

The existing stack requires only one new frontend dependency (`date-fns@^4.1.0` for calendar grid date math) and one minor version bump (`@modelcontextprotocol/sdk` from `^1.28.0` to `^1.29.0`). All other features — Ollama heartbeat calls, background timer, schedule block reads — use existing Rust (`reqwest`, `tokio::time::interval`, `rusqlite`) and TypeScript (`better-sqlite3`, `@modelcontextprotocol/sdk`) dependencies already in the project. The calendar view should be built as a custom Tailwind CSS time grid (~200 lines TSX), not via `react-big-calendar` or `FullCalendar`, which fight shadcn/ui theming and have stale release cadences.

**Core technologies:**
- `tokio::time::interval` (existing): Background heartbeat timer — simpler and more precise than cron for fixed-interval work
- `reqwest` (existing): Ollama local LLM HTTP calls — the Ollama API is two endpoints; no `ollama-rs` crate needed
- `date-fns@^4.1.0` (new, only addition): Calendar grid date math — tree-shakeable, immutable, shares version with `react-day-picker` already installed
- `better-sqlite3` (existing, MCP sidecar): Calendar MCP tools — SQL queries against `calendar_events` + `scheduled_blocks` tables

### Expected Features

**Must have (table stakes, v1.5 core):**
- Calendar day view with time-grid showing meetings + work blocks side-by-side — the hub right column is currently a placeholder
- Calendar sync reliability fix — events must flow before any downstream feature works
- Daily planning bot skill — "here's what fits today" presented conversationally with user confirmation
- Due date prominence in task UI + bot skill to set them conversationally
- Backlog exemption flag — must ship alongside due date enforcement, not after

**Should have (differentiators, v1.5 extended):**
- Conversational schedule negotiation — "move the report to tomorrow" via hub chat, building on daily planning skill
- Heartbeat deadline monitoring — periodic background check with deterministic risk math, LLM summary optional
- AI-suggested due dates — bot proposes dates based on project scope and capacity during planning conversations
- Week calendar view — extends day view once daily planning habit is established
- Phase-level due dates — new column enabling heartbeat risk calculations at phase granularity

**Defer (v2+):**
- Calendar write-back to Google/Outlook — two-way sync complexity; read-only is the right v1.5 constraint
- Energy-level optimization — requires weeks of behavioral data; Morgen/Reclaim users find the learning period frustrating
- Drag-to-reschedule on calendar — nice-to-have but not essential for the chat-first UX

### Architecture Approach

The app follows a clean 3-layer pattern: React frontend communicating via Tauri IPC/events to a Rust backend, with a separate MCP sidecar process sharing the same SQLite DB via WAL mode. All new features extend this pattern — new bot skills register in `actionRegistry.ts` and dispatch to new Tauri commands; the heartbeat is a `tokio::spawn` background task following the existing `init_scheduler()` pattern; the calendar view replaces `CalendarPlaceholder.tsx` pulling from existing Zustand slices; and calendar MCP tools are new handlers in `mcp-server/src/index.ts` reading existing tables. SQLite is the single source of truth; Zustand stores are caches invalidated by Tauri events, never used as data carriers for mutations.

**Major components:**
1. `CalendarView.tsx` (new) — day/week time-grid pulling from `calendarSlice` (meetings) + `schedulingSlice` (work blocks), replaces `CalendarPlaceholder.tsx`
2. `heartbeat.rs` (new) — `tokio::spawn` interval task for deadline risk detection, Ollama LLM summary, Tauri event emission
3. `mcp-server/src/tools/calendar-tools.ts` (new) — `list_calendar_events`, `get_available_slots`, `create_work_block`, `move_work_block` via `better-sqlite3`
4. `scheduling_commands.rs::generate_schedule` (modify) — wire real `calendar_events` DB query replacing empty vec at line 97
5. `actionRegistry.ts` (modify) — add `get_todays_plan`, `set_due_date`, `block_time` skills for hub chat dispatch

### Critical Pitfalls

1. **Google OAuth 7-day token expiry in testing mode** — publish OAuth consent screen to Production status; implement `invalid_grant` detection with user-facing "reconnect" prompt; never silently lose calendar access
2. **Outlook timezone bug already in production code** — add `Prefer: outlook.timezone="UTC"` header to all Microsoft Graph requests; remove the hardcoded `-05:` check in `calendar.rs:282-307` before calendar data is consumed by the scheduler
3. **410 Gone sync token invalidation not handled** — on 410 response, clear stored sync token and automatically retry as full sync; this must be transparent to users
4. **LLM cannot reliably generate schedules** — use the existing `assign_tasks_to_blocks` algorithm for scheduling; the LLM presents and narrates its output conversationally and processes user adjustment requests; never have the LLM generate a schedule from scratch
5. **Auto-rescheduling destroys user trust** — every AI-suggested schedule change must be presented as a proposal with explicit accept/reject; never auto-apply; this pattern must be established in the daily planning skill phase before schedule negotiation is built

## Implications for Roadmap

Based on research, the dependency graph is clear: calendar sync correctness is a hard prerequisite for everything; the calendar UI can be built in parallel once data flows; the daily planning skill is the headline feature that depends on both; heartbeat and schedule negotiation extend the planning loop once it works.

### Phase 1: Calendar Sync Foundation

**Rationale:** Three pre-existing bugs prevent any calendar-aware feature from working. All downstream features depend on reliable calendar data in `calendar_events` table. The scheduling engine already supports calendar events — it just isn't connected. This phase unblocks everything.
**Delivers:** Working Google + Outlook OAuth, events flowing into SQLite, scheduler using real meeting data, background 15-min auto-sync
**Addresses:** Calendar sync reliability (table stakes), wired scheduler (tech debt fix)
**Avoids:** Outlook timezone bug (Pitfall 2), Google 410 handling (Pitfall 4), OAuth 7-day expiry (Pitfall 1), empty calendar events vec (Pitfall 3)

### Phase 2: Hub Calendar View

**Rationale:** Users need to see their calendar before the AI can meaningfully plan against it. The right column of HubView already has a placeholder slot. This phase is high visual impact and validates that sync is working correctly by making data visible.
**Delivers:** Day/week time-grid in hub showing meetings (external, read-only) + work blocks (internal, styled differently), date navigation
**Uses:** `date-fns@^4.1.0` (only new dependency), existing `calendarSlice` + `schedulingSlice`
**Implements:** `CalendarView.tsx`, `CalendarDayColumn.tsx`, `CalendarEventCard.tsx` replacing `CalendarPlaceholder.tsx`
**Avoids:** Calendar rendering jank pitfall — virtualize events, render only visible viewport; visual distinction between meetings and work blocks

### Phase 3: Daily Planning Skill + Due Date Curation

**Rationale:** With calendar working and visible, the AI can reason about the user's day. This is the v1.5 headline feature. Due date enforcement must ship with backlog exemption in the same phase to avoid anxiety/nag patterns documented in pitfall research.
**Delivers:** Bot skill that presents "here's what fits today" using greedy scheduler output, conversational due date setting, backlog exemption flag
**Uses:** Enriched context manifest (calendar events + schedule blocks + available time), new `actionRegistry.ts` skills (`get_todays_plan`, `set_due_date`, `block_time`)
**Implements:** Daily planning bot skill, `backlog_exempt` column on tasks, due date type distinction (hard vs. target)
**Avoids:** LLM schedule generation failure (Pitfall 5) — algorithm generates, LLM presents; due date anxiety (Pitfall 8) — backlog exemption ships in same phase

### Phase 4: Calendar MCP Tools

**Rationale:** External agents (Claude Code via MCP) need calendar awareness. Building after core daily planning works ensures the data model is stable. MCP tools are read-heavy with a few controlled write operations.
**Delivers:** `list_calendar_events`, `get_available_slots`, `create_work_block`, `move_work_block` tools registered in MCP sidecar
**Implements:** `mcp-server/src/tools/calendar-tools.ts`, registration in `mcp-server/src/index.ts`
**Avoids:** MCP write safety pitfall — all write operations require approval flow; only Element-managed events are modifiable, never real user meetings

### Phase 5: Heartbeat + Schedule Negotiation

**Rationale:** Background monitoring is a differentiator but meaningless without due dates populated and calendar events flowing. This phase adds proactive deadline risk detection and closes the conversational loop by letting users negotiate schedule changes. The suggest-never-auto-apply pattern must be locked from day 1.
**Delivers:** Periodic background deadline risk detection, Ollama LLM summarization with CLI fallback, heartbeat alerts via Tauri events, conversational schedule negotiation ("move X to tomorrow"), undo support for accepted AI suggestions
**Implements:** `heartbeat.rs`, `heartbeat_commands.rs`, `useHeartbeat.ts`, `012_heartbeat.sql` migration, schedule negotiation skills in action registry
**Avoids:** Heartbeat resource drain (Pitfall 6) — system load gating, 30-min default interval, 1-3B model size cap, graceful Ollama degradation; auto-rescheduling trust loss (Pitfall 7) — suggest-only UI pattern

### Phase Ordering Rationale

- Phase 1 before all others: three pre-existing bugs block every downstream feature; no calendar feature can be tested without them fixed
- Phase 2 before Phase 3: users need to see their calendar to validate daily planning output; also provides immediate visual feedback that Phase 1 work is correct
- Phase 3 before Phase 5: heartbeat is meaningless without due dates populated and daily planning established as a habit loop
- Phase 4 after Phase 3: MCP tool data model should be stable before exposing to external agents; calendar schema won't change after Phase 3
- Phase 5 last: heartbeat and negotiation are enhancements to a working core, not prerequisites

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Google OAuth production verification flow, Microsoft Graph delta link expiration handling, pagination for `nextPageToken` — these are API-specific edge cases with limited documentation
- **Phase 5:** Ollama model selection and system load gating APIs on macOS — Tauri system metrics access is not well-documented

Phases with standard patterns (skip research-phase):
- **Phase 2:** Custom Tailwind time-grid is a well-documented pattern; absolute positioning by time offset is straightforward
- **Phase 3:** Action registry pattern is established and well-tested in the codebase; no new integration patterns needed
- **Phase 4:** MCP tool registration follows existing `write-tools.ts` pattern exactly

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on direct codebase inspection + official docs; only one new npm dependency |
| Features | HIGH | Competitor analysis + codebase confirmation that data models already support features |
| Architecture | HIGH | Based on direct codebase analysis; integration patterns verified against existing code |
| Pitfalls | HIGH | Pre-existing bugs confirmed in specific file:line references; API behavior verified against official docs |

**Overall confidence:** HIGH

### Gaps to Address

- **Google OAuth production mode verification:** Research confirms the 7-day testing-mode expiry, but the exact Google verification process for `calendar.readonly` scope (sensitive scope review timeline) is unclear. May affect Phase 1 timeline if Google's review takes weeks. Mitigation: implement `invalid_grant` recovery regardless, so testing-mode builds recover gracefully while awaiting production approval.
- **Ollama system availability detection on macOS:** Research recommends checking CPU load before heartbeat LLM calls, but the Tauri API for system metrics (`sysinfo` crate availability, Process priority APIs) was not fully verified. Phase 5 planning should confirm the right Rust approach before implementation.
- **`@modelcontextprotocol/sdk` v2 timeline:** Research notes v2 was anticipated Q1 2026 but v1.x is still current as of April 2026. If v2 ships during development, MCP sidecar may need updates. Low risk since v1.x will receive security fixes for 6+ months post-v2.
- **Calendar event pagination:** The research flags that current `sync_google_calendar` does not paginate (`nextPageToken`). This only affects users with 300+ events in a 30-day window and is not a Phase 1 blocker, but should be addressed before shipping to general users.

## Sources

### Primary (HIGH confidence)
- Element codebase direct analysis — `scheduling_commands.rs`, `calendar.rs`, `time_blocks.rs`, `assignment.rs`, `actionRegistry.ts`, `mcp-server/src/index.ts`
- [Google Calendar API Sync Guide](https://developers.google.com/workspace/calendar/api/guides/sync) — incremental sync and 410 handling
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2) — token lifecycle
- [Microsoft Graph Throttling Limits](https://learn.microsoft.com/en-us/graph/throttling-limits) — rate limits
- [Ollama API docs](https://github.com/ollama/ollama/blob/main/docs/api.md) — endpoint format
- [tokio::time::interval docs](https://docs.rs/tokio/latest/tokio/time/fn.interval.html) — periodic timer pattern
- [@modelcontextprotocol/sdk npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) — v1.29.0 current

### Secondary (MEDIUM confidence)
- [LLMs Can't Optimize Schedules (Timefold)](https://timefold.ai/blog/llms-cant-optimize-schedules-but-ai-can) — architectural decision to use deterministic scheduler
- [Morgen AI Planning Assistants Review](https://www.morgen.so/blog-posts/best-ai-planning-assistants) — competitor feature analysis
- [Motion](https://www.usemotion.com/), [Reclaim.ai](https://reclaim.ai/), [Trevor AI](https://www.trevorai.com/) — competitor UX patterns
- [Google OAuth Testing Mode Token Expiry](https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked) — 7-day expiry confirmation

### Tertiary (LOW confidence)
- [Microsoft Graph All-Day Events Timezone Issue](https://learn.microsoft.com/en-us/answers/questions/5760696/microsoft-graph-all-day-events-return-incorrect-ut) — organizer timezone gap, needs validation during Phase 1

---
*Research completed: 2026-04-02*
*Ready for roadmap: yes*
