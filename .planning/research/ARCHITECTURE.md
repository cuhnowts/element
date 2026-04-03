# Architecture Research

**Domain:** Time-bounded scheduling features for existing Tauri 2.x desktop app
**Researched:** 2026-04-02
**Confidence:** HIGH (based on direct codebase analysis of existing architecture)

## System Overview

```
+-----------------------------------------------------------------------+
|                          React 19 Frontend                             |
|  +-------------+  +-----------------+  +----------------------------+  |
|  | GoalsTree   |  | HubCenterPanel  |  | CalendarView (NEW)         |  |
|  | Panel       |  | Briefing + Chat |  | replaces CalendarPlaceholder|  |
|  +------+------+  +--------+--------+  +-------------+--------------+  |
|         |                  |                          |                 |
|  +------+------------------+-------+------------------+--------------+ |
|  |  Zustand Store (calendarSlice, schedulingSlice, briefingStore)    | |
|  +------+------------------+-------+------------------+--------------+ |
|         |                  |                          |                 |
+---------+------------------+------ -------------------+-----------------+
          |                  |                          |
          | Tauri IPC        | Tauri Events             | Tauri IPC
          |                  |                          |
+---------+------------------+-------------- -----------+-----------------+
|                         Rust Backend (Tauri 2.x)                        |
|  +------------------+  +------------------+  +----------------------+   |
|  | calendar_commands|  | scheduling_cmds  |  | manifest_commands    |   |
|  | (OAuth, sync)    |  | (generate, apply)|  | (briefing, context)  |   |
|  +--------+---------+  +--------+---------+  +-----------+----------+   |
|           |                     |                        |              |
|  +--------+---------+  +-------+--------+  +-------------+----------+  |
|  | plugins/calendar |  | scheduling/    |  | ai/gateway             |  |
|  | (Google/Outlook   |  | time_blocks   |  | (provider dispatch)    |  |
|  |  API calls)       |  | assignment    |  +------------------------+  |
|  +--------+---------+  | types         |                               |
|           |            +-------+--------+                               |
|           |                    |                                        |
|  +--------+--------------------+--------------------------------------+ |
|  |                    SQLite (rusqlite)                                | |
|  |  calendar_accounts | calendar_events | scheduled_blocks            | |
|  |  work_hours        | tasks (due_date, estimated_minutes)           | |
|  +--------------------------------------------------------------------+ |
+-------------------------------------------------------------------------+
          |
          | stdio (separate process)
          |
+---------+----------------------------+
|        MCP Server Sidecar            |
|  better-sqlite3 reads element.db     |
|  project-tools | task-tools          |
|  phase-tools   | write-tools         |
|  orchestration-tools                 |
|  + calendar-tools (NEW)              |
+--------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Current State |
|-----------|----------------|---------------|
| `calendar_commands.rs` | OAuth flows, sync orchestration, event queries | Exists, full OAuth + sync implemented |
| `plugins/core/calendar.rs` | Google/Outlook API calls, token refresh, event parsing | Exists, ~600 lines, provider-specific logic |
| `scheduling/time_blocks.rs` | Gap-finding: work hours - occupied = open blocks | Exists, well-tested, accepts `CalendarEvent[]` |
| `scheduling/assignment.rs` | Greedy task-to-block allocation by score | Exists, well-tested, score = priority + due_date urgency |
| `scheduling_commands.rs` | IPC: `generate_schedule`, `apply_schedule`, `get_work_hours` | Exists, **but line 97 passes empty `calendar_events` vec** |
| `manifest_commands.rs` | Context manifest + AI briefing via streaming events | Exists, used by daily briefing |
| `calendarSlice.ts` | Frontend calendar state (accounts, events, sync) | Exists, full CRUD |
| `schedulingSlice.ts` | Frontend schedule state (generate, apply, work hours) | Exists |
| `actionRegistry.ts` | Bot skill definitions for hub chat tool_use | Exists, 10 skills registered |
| `CalendarPlaceholder.tsx` | Empty "Coming Soon" placeholder in hub right column | Exists, needs replacement |
| `MCP server` | External tool access to element.db for AI agents | Exists, 17 tools, no calendar tools yet |
| **Heartbeat (NEW)** | Periodic background deadline check | Does not exist |
| **Daily planning skill (NEW)** | AI-driven "what should we work on?" conversation | Does not exist |
| **Calendar MCP tools (NEW)** | Bot reads/writes meetings and work blocks via MCP | Does not exist |
| **CalendarView (NEW)** | Real day/week view replacing placeholder | Does not exist |

## New Components vs Modified Components

### New Components to Build

| Component | Layer | Purpose | Depends On |
|-----------|-------|---------|------------|
| `CalendarView.tsx` | Frontend | Day/week calendar showing meetings + work blocks | calendarSlice, schedulingSlice, working calendar sync |
| `CalendarDayColumn.tsx` | Frontend | Single-day time column with event/block rendering | CalendarView |
| `CalendarEventCard.tsx` | Frontend | Individual event/block visual representation | CalendarDayColumn |
| `heartbeat.rs` | Rust backend | Periodic tokio timer that checks deadlines, calls LLM | ai/gateway, scheduling, manifest |
| `heartbeat_commands.rs` | Rust backend | IPC to start/stop/configure heartbeat | heartbeat.rs |
| `useHeartbeat.ts` | Frontend hook | Listen for heartbeat Tauri events, surface alerts | Tauri event listener |
| `mcp-server/src/tools/calendar-tools.ts` | MCP sidecar | `list_calendar_events`, `create_work_block`, `move_work_block`, `get_available_slots` | element.db calendar_events + scheduled_blocks tables |
| Daily planning skill entries | actionRegistry.ts | `get_todays_plan`, `suggest_schedule`, `set_due_date` | scheduling_commands, calendar data |

### Existing Components to Modify

| Component | Change | Why |
|-----------|--------|-----|
| `scheduling_commands.rs::generate_schedule` | Wire real `calendar_events` from DB instead of empty vec (line 94-97) | **Critical**: scheduling engine already supports calendar events but was never connected |
| `manifest_commands.rs::generate_briefing` | Include today's calendar events + schedule blocks in context manifest | Daily planning needs the AI to see the user's day |
| `models/manifest.rs::build_manifest_string` | Add calendar events section and scheduled blocks to manifest output | Feed calendar awareness into briefing |
| `actionRegistry.ts` | Add scheduling/calendar skills: `get_todays_plan`, `suggest_schedule`, `set_due_date`, `block_time` | Bot needs to manipulate schedule via chat |
| `HubChat.tsx` | No structural change needed -- ACTION dispatch already handles arbitrary skills | Just register new skills in action registry |
| `CalendarPlaceholder.tsx` | Replace entirely with `CalendarView` | Placeholder was always temporary |
| `HubView.tsx` | Swap `CalendarPlaceholder` import to `CalendarView` | One-line change |
| `calendarSlice.ts` | Add `selectedDate`, `viewMode` (day/week), auto-refresh on sync events | Calendar view needs date navigation state |
| `schedulingSlice.ts` | Expose `getScheduledBlocksForDate` query, listen for schedule-applied events | Calendar view needs to show work blocks alongside meetings |
| `mcp-server/src/index.ts` | Register new calendar tools in ListTools + CallTool dispatch | MCP agents need calendar access |
| `tasks` table | Ensure `due_date` column is used consistently (exists since migration 003) | Due date enforcement requires populated due_dates |
| `lib.rs` | Register heartbeat commands, start heartbeat on app launch | Heartbeat lifecycle management |

## Architectural Patterns

### Pattern 1: Tauri Event-Driven Streaming (Existing)

**What:** Backend emits named events (`briefing-chunk`, `calendar-synced`, `schedule-applied`), frontend subscribes via `listen()`.
**When to use:** For all heartbeat notifications, schedule updates, sync progress -- any async backend-to-frontend communication.
**Trade-offs:** Simple and decoupled, but no built-in back-pressure or error retry.

**Example (heartbeat will follow this pattern):**
```rust
// Rust: emit heartbeat alert
app.emit("heartbeat-alert", HeartbeatAlert {
    alert_type: "deadline_risk",
    message: "Task X is due tomorrow with 4h estimated, only 2h available",
    affected_task_ids: vec!["task-123"],
    suggested_action: "Reschedule or reduce scope",
}).ok();
```
```typescript
// Frontend: listen for heartbeat alerts
listen<HeartbeatAlert>("heartbeat-alert", (e) => {
  addNotification(e.payload);
});
```

### Pattern 2: Bot Skill via Action Registry (Existing)

**What:** New bot capabilities are added by registering an `ActionDefinition` in `actionRegistry.ts` with a `tauriCommand` mapping. The hub chat LLM sees the tool definition and emits `ACTION:{"name":"...", "input":{...}}` blocks that get dispatched to Tauri IPC.
**When to use:** For all new scheduling/calendar skills the bot needs.
**Trade-offs:** Zero changes to HubChat.tsx for new skills. LLM quality depends on good tool descriptions.

**New skills to register:**
```typescript
{
  name: "get_todays_plan",
  description: "Get the user's schedule for today including meetings and work blocks",
  tauriCommand: "get_todays_plan",
  destructive: false,
},
{
  name: "set_due_date",
  description: "Set or update the due date for a task",
  tauriCommand: "set_task_due_date",
  destructive: false,
},
{
  name: "block_time",
  description: "Create a work block for a task at a specific time slot",
  tauriCommand: "create_work_block",
  destructive: false,
},
```

### Pattern 3: MCP Tool Registration (Existing)

**What:** The MCP sidecar exposes tools via `ListToolsRequestSchema` + `CallToolRequestSchema` handlers. It reads/writes element.db directly via better-sqlite3 (separate process from Tauri). Changes trigger file-based events that the Tauri watcher picks up.
**When to use:** For calendar MCP tools that external AI agents (Claude Code, etc.) need.
**Important:** MCP server has its own DB connection -- it writes directly to SQLite. The Tauri backend picks up changes via its file watcher polling. Calendar tools follow the same pattern as existing write-tools.

## Data Flow

### Calendar Sync Flow (Existing, needs fixing)

```
User triggers "sync" (or background timer)
    |
    v
sync_calendar() / sync_all_calendars()  [calendar_commands.rs]
    |
    v
refresh_{google|outlook}_token()  [plugins/core/calendar.rs]
    |
    v
sync_{google|outlook}_calendar()  [plugins/core/calendar.rs]
    |
    v
save_events() -> INSERT INTO calendar_events  [SQLite]
    |
    v
app.emit("calendar-synced")  [Tauri event]
    |
    v
Frontend calendarSlice re-fetches events
```

### Schedule Generation Flow (Existing, broken connection at step 3)

```
1. User/bot requests schedule for date
       |
       v
2. generate_schedule(date)  [scheduling_commands.rs]
       |
       v
3. *** calendar_events = empty vec ***  <-- FIX: query calendar_events table
       |
       v
4. find_open_blocks(work_hours, calendar_events)  [time_blocks.rs]
       |
       v
5. assign_tasks_to_blocks(open_blocks, tasks)  [assignment.rs]
       |
       v
6. Return Vec<ScheduleBlock> to frontend
```

### Daily Planning Flow (NEW)

```
User opens Hub (or bot initiates)
    |
    v
AI briefing runs with enriched manifest (calendar + schedule context)
    |
    v
Bot presents: "You have 3 meetings today (2h). 5h available. Here are your priorities..."
    |
    v
User converses: "Let's work on X first, push Y to tomorrow"
    |
    v
Bot dispatches ACTION:{"name":"block_time","input":{...}}
    |
    v
schedule updated -> emit "schedule-applied" -> CalendarView refreshes
```

### Heartbeat Flow (NEW)

```
App startup
    |
    v
init_heartbeat() spawns tokio::interval task (configurable: 15-60 min)
    |
    v
Every tick:
  1. Query tasks with due_dates in next 48h
  2. Query today's scheduled_blocks vs estimated_minutes
  3. Detect: overdue, at-risk (not enough time), unscheduled urgent
  4. If alerts found:
     a. Build short prompt with alerts
     b. Call LLM (prefer Ollama local, fallback CLI) for natural-language summary
     c. app.emit("heartbeat-alert", alert_payload)
     d. Create notification in notifications table
  5. If no alerts: silent (no event emitted)
```

### Calendar MCP Tools Flow (NEW)

```
External AI agent (Claude Code via MCP)
    |
    v
MCP tool call: list_calendar_events({date: "2026-04-02"})
    |
    v
mcp-server reads calendar_events + scheduled_blocks from element.db
    |
    v
Returns merged view: meetings (external) + work blocks (internal)
    |
    v
Agent can then: create_work_block / move_work_block / get_available_slots
    |
    v
Writes to scheduled_blocks table
    |
    v
Tauri file watcher detects DB change -> re-emits schedule events
```

## Key Integration Points

### 1. The Critical Fix: Wire Calendar Events to Scheduler

**File:** `scheduling_commands.rs`, lines 94-97
**Current:** `let calendar_events: Vec<CalendarEvent> = vec![];`
**Fix:** Query `calendar_events` table for the given date, map to `scheduling::types::CalendarEvent`

This is the single most important integration. The scheduling engine (`time_blocks.rs`, `assignment.rs`) already fully supports calendar events with buffer handling, merging, and gap detection. It was designed for this but never connected. The fix is approximately 15 lines of SQL query + mapping.

### 2. Manifest Enrichment for Daily Planning

The context manifest (`build_manifest_string`) currently aggregates project/task state. For daily planning, it needs to also include:
- Today's calendar events (from `calendar_events` table)
- Today's scheduled blocks (from `scheduled_blocks` table)  
- Available time remaining
- Tasks approaching due dates

This enriched manifest feeds both the daily briefing and the hub chat system prompt.

### 3. CalendarView Replacing Placeholder

`HubView.tsx` already has a 3-column layout with the right column designated for calendar. The `CalendarPlaceholder` component is a simple swap target. The new `CalendarView` needs:
- Day view (default) showing 24h timeline with events + work blocks
- Week view toggle
- Date navigation (prev/next day/week)
- Pull data from both `calendarSlice` (meetings) and `schedulingSlice` (work blocks)
- Visual distinction: meetings (external, read-only) vs work blocks (internal, draggable)

### 4. Heartbeat as Background tokio Task

Follow the same pattern as `init_scheduler()` in `engine/scheduler.rs`:
- Spawn on app startup in `lib.rs`
- Store handle in app state for lifecycle management
- Use `tokio::time::interval` (not cron -- heartbeat is fixed-interval)
- Configurable interval via settings (default: 30 min)
- LLM call is optional/best-effort (degrade gracefully if no provider)

### 5. Due Date Enforcement via Conversation

Rather than forcing due dates through UI forms, the bot suggests them conversationally:
- During daily planning: "This task has no due date. When do you need it done?"
- During heartbeat alerts: "Task X has no due date but seems urgent based on priority"
- New action: `set_due_date` in action registry -> `update_task` with `due_date` field

This requires adding `due_date` to the `update_task` Tauri command's accepted parameters (currently supports title, description, priority but not due_date).

## Suggested Build Order

Build order is driven by dependency chains:

### Phase 1: Calendar Sync Fix + Wire to Scheduler
**Rationale:** Everything downstream depends on calendar data flowing. The OAuth infrastructure exists. The scheduling engine exists. The gap is literally one empty vec on line 97.

1. Debug/fix Google OAuth token refresh (reported as "broken")
2. Debug/fix Outlook OAuth token refresh  
3. Wire `calendar_events` query into `generate_schedule`
4. Add background auto-sync timer (tokio interval, every 15 min)
5. Test: calendar events now appear in generated schedule

### Phase 2: Calendar View UI
**Rationale:** Users need to see their calendar before the AI can meaningfully plan against it.

1. Build `CalendarView` component with day timeline
2. Overlay meetings (from calendarSlice) + work blocks (from schedulingSlice)
3. Date navigation + week view toggle
4. Replace `CalendarPlaceholder` in HubView
5. Wire drag-to-reschedule for work blocks (optional, nice-to-have)

### Phase 3: Daily Planning Skill + Due Date Curation
**Rationale:** With calendar working, the AI can now reason about the user's day.

1. Enrich context manifest with calendar + schedule data
2. Register new bot skills: `get_todays_plan`, `set_due_date`, `block_time`
3. Add corresponding Tauri commands
4. Update briefing prompt to present day-plan format
5. Implement conversational due date suggestion logic

### Phase 4: Calendar MCP Tools
**Rationale:** External agents need calendar access. Building after the core works.

1. Add `list_calendar_events` MCP tool
2. Add `get_available_slots` MCP tool
3. Add `create_work_block` / `move_work_block` MCP tools
4. Test with Claude Code via MCP

### Phase 5: Heartbeat + Schedule Negotiation
**Rationale:** Heartbeat is a background enhancement. Needs working calendar + scheduling to be meaningful.

1. Implement `heartbeat.rs` with tokio interval
2. Deadline risk detection queries
3. LLM summarization (Ollama preferred, CLI fallback)
4. Heartbeat alert events + notification persistence
5. Schedule negotiation: conversational rescheduling when conflicts detected
6. Backlog exemption flag on tasks/phases

## Anti-Patterns

### Anti-Pattern 1: Polling SQLite from MCP on Every Change

**What people do:** Have the MCP server poll the DB to detect changes for real-time updates.
**Why it's wrong:** SQLite has no built-in change notification across processes. Polling wastes CPU and adds latency.
**Do this instead:** Use the existing file-based event queue pattern. When Tauri writes schedule changes, it also writes to the agent queue file. MCP tools are request-response (not streaming), so they just read current state on each call.

### Anti-Pattern 2: Building a Custom Calendar Rendering Engine

**What people do:** Build pixel-precise calendar time grids from scratch.
**Why it's wrong:** Calendar time layout is surprisingly complex (overlapping events, all-day events, timezone handling, DST).
**Do this instead:** Keep it simple -- vertical time slots at 30-min intervals. Events are absolutely positioned by `top` (start time) and `height` (duration). No need for a library. The data model already stores HH:mm strings which map directly to pixel offsets.

### Anti-Pattern 3: Running Heartbeat LLM Calls on Main Thread

**What people do:** Block the scheduler or main async runtime with LLM API calls.
**Why it's wrong:** LLM calls can take 5-30 seconds. Blocking the main tokio runtime degrades the entire app.
**Do this instead:** Spawn heartbeat LLM calls in a dedicated `tokio::spawn` with timeout. If the call fails or times out, log and skip -- heartbeat is best-effort.

### Anti-Pattern 4: Dual-Writing Schedule State

**What people do:** Keep schedule state in both frontend Zustand and backend SQLite, trying to sync them.
**Why it's wrong:** Leads to stale state, race conditions, and UI showing data that doesn't match the DB.
**Do this instead:** SQLite is the source of truth. Frontend always fetches after mutations. Use Tauri events (`schedule-applied`, `calendar-synced`) as invalidation signals to re-fetch, never as data carriers for state updates.

## Integration Boundaries

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend <-> Rust backend | Tauri IPC (invoke) + Tauri events (emit/listen) | ~60+ existing commands, add ~5-8 new ones |
| Rust backend <-> SQLite | rusqlite direct queries via `Arc<Mutex<Database>>` | Existing pattern, no changes needed |
| MCP server <-> SQLite | better-sqlite3 separate connection | Read-write, same DB file, WAL mode handles concurrent access |
| MCP server <-> Tauri | File-based event queue (agent_queue in DB) | MCP writes queue entries, Tauri polls and processes |
| Heartbeat <-> AI gateway | `AiGateway::stream_completion` or CLI fallback | Same pattern as daily briefing |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Calendar API | OAuth 2.0 + REST via reqwest | Exists, reported broken -- likely token refresh issue |
| Microsoft Graph API | OAuth 2.0 + REST via reqwest | Exists, same suspected issue |
| LLM providers | API calls via ai/gateway or CLI subprocess | Exists, model-agnostic |
| Ollama (local) | HTTP to localhost:11434 | Preferred for heartbeat (no API key needed, fast, private) |

## Database Schema Impact

### Existing Tables Used (No Schema Changes)

- `calendar_accounts` -- OAuth accounts, sync tokens
- `calendar_events` -- Cached external events
- `scheduled_blocks` -- Work blocks, meeting blocks, buffer blocks
- `work_hours` -- Work day configuration
- `tasks` -- Already has `due_date`, `estimated_minutes`, `scheduled_date` columns

### New Migration Needed (012_heartbeat.sql)

```sql
-- Heartbeat configuration (singleton)
CREATE TABLE IF NOT EXISTS heartbeat_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    enabled INTEGER NOT NULL DEFAULT 1,
    interval_minutes INTEGER NOT NULL DEFAULT 30,
    lookahead_hours INTEGER NOT NULL DEFAULT 48,
    prefer_local_llm INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

-- Heartbeat log (audit trail)
CREATE TABLE IF NOT EXISTS heartbeat_log (
    id TEXT PRIMARY KEY,
    checked_at TEXT NOT NULL,
    alerts_count INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    created_at TEXT NOT NULL
);
```

### Possible Addition to tasks Table

Consider adding a `backlog_exempt` boolean column to mark tasks/phases that should be immune to due date enforcement. Alternatively, use a convention: tasks with `priority = 'low'` and `due_date IS NULL` under a phase named "Backlog" are exempt. Convention is simpler; column is more explicit. **Recommend:** Column, as conventions break.

```sql
ALTER TABLE tasks ADD COLUMN backlog_exempt INTEGER NOT NULL DEFAULT 0;
```

## Sources

- Direct codebase analysis of `/Users/cuhnowts/projects/element/`
- `scheduling_commands.rs` lines 94-97 confirming empty calendar_events vec
- `time_blocks.rs` confirming CalendarEvent support in gap-finding algorithm
- `assignment.rs` confirming score_task uses due_date urgency
- `actionRegistry.ts` confirming bot skill registration pattern
- `mcp-server/src/index.ts` confirming MCP tool registration pattern
- `CalendarPlaceholder.tsx` confirming placeholder status
- `engine/scheduler.rs` confirming tokio background task pattern

---
*Architecture research for: Element v1.5 Time Bounded*
*Researched: 2026-04-02*
