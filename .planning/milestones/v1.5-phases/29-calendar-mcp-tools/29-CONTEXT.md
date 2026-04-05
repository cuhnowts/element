# Phase 29: Calendar MCP Tools - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Expose calendar read and work block management as MCP tools so external AI agents (and the hub chat bot) can read meetings, query available time, and create/move/delete work blocks through the existing MCP server.

</domain>

<decisions>
## Implementation Decisions

### MCP Tool Granularity
- **D-01:** Fine-grained tools — one tool per operation: `list_calendar_events`, `get_available_slots`, `create_work_block`, `move_work_block`, `delete_work_block`. Matches the existing MCP pattern (separate list_tasks, create_task, update_task, etc.).
- **D-02:** Dual registration — all new tools are added to both the MCP server (`mcp-server/src/tools/`) AND `actionRegistry.ts` so the hub chat bot can use them directly alongside existing task/project tools.
- **D-03:** Read-only tools (`list_calendar_events`, `get_available_slots`) skip the approval flow (non-destructive). Write tools (`create_work_block`, `move_work_block`, `delete_work_block`) require user confirmation. Consistent with the suggest-never-auto-apply principle.

### Work Block Operations
- **D-04:** Full CRUD — bot can create, move, and delete work blocks. Delete is destructive and requires approval.
- **D-05:** "Move" means change time slot on the same day (new start_time/end_time). Cross-day moves are modeled as delete + create.
- **D-06:** Every work block must link to a task via `task_id` (required parameter). No free-form blocks without a task. If the user wants generic focus time, a task must be created first.

### Available Slots Response
- **D-07:** Return raw gaps as an array of `{start, end, duration_minutes}` for each open slot. No enrichment with adjacent meeting context. The existing `find_open_blocks()` function already computes this.
- **D-08:** Single date per query — `get_available_slots(date)` returns gaps for one day. Caller loops for multi-day queries. Aligns with the daily planning focus.

### Date/Time Format
- **D-09:** ISO strings only — dates as `YYYY-MM-DD`, times as `HH:mm`. Matches existing codebase patterns in `scheduling_commands.rs` and `CalendarEvent` types. The LLM is responsible for resolving relative terms ("tomorrow") before calling tools.
- **D-10:** Times returned in local timezone (HH:mm format). Matches existing `CalendarEvent` type. LLM can narrate directly without timezone conversion.

### Claude's Discretion
- Error response format and error codes for MCP tool failures
- Internal implementation of SQL queries for the new tools
- How to structure the new tool files within `mcp-server/src/tools/`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### MCP Server
- `mcp-server/src/tools/orchestration-tools.ts` — Existing MCP tool pattern (handler functions, queue-based approval)
- `mcp-server/src/tools/task-tools.ts` — Existing fine-grained tool pattern for CRUD operations
- `mcp-server/src/tools/project-tools.ts` — Existing read tool pattern

### Action Registry
- `src/lib/actionRegistry.ts` — Shared bot skill definitions (tool name, inputSchema, destructive flag, tauriCommand)

### Calendar & Scheduling Backend
- `src-tauri/src/commands/calendar_commands.rs` — Existing calendar Tauri commands (list_calendar_events, sync)
- `src-tauri/src/commands/scheduling_commands.rs` — Existing scheduling commands (generate_schedule, apply_schedule, work hours)
- `src-tauri/src/scheduling/types.rs` — ScheduleBlock, CalendarEvent, WorkHoursConfig, TaskWithPriority types
- `src-tauri/src/scheduling/time_blocks.rs` — find_open_blocks() function for gap detection
- `src-tauri/src/plugins/core/calendar.rs` — Calendar provider logic (Google/Outlook sync, event storage)

### Hub Integration
- `src/hooks/useAgentMcp.ts` — MCP config generation and system prompt (tool list needs updating)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `find_open_blocks()` in `scheduling/time_blocks.rs` — already computes available time gaps given work hours and calendar events. Direct reuse for `get_available_slots` MCP tool.
- `ScheduleBlock` type — existing model for work blocks with all needed fields (id, schedule_date, block_type, start_time, end_time, task_id, is_confirmed).
- `ACTION_REGISTRY` pattern — tool definitions with `name`, `inputSchema`, `destructive`, `tauriCommand` fields. New tools follow this exact shape.
- MCP server uses `better-sqlite3` for direct DB access — new tools follow the same pattern as existing task/project tools.

### Established Patterns
- MCP tools are handler functions in `mcp-server/src/tools/` that receive `(db, dbPath, args)` and return `{content: [{type: "text", text: ...}]}`.
- Destructive actions in actionRegistry have `destructive: true` which triggers the approval flow in hub chat.
- Calendar events stored in SQLite with `list_events_for_range(conn, start, end)` query pattern.

### Integration Points
- `mcp-server/` — new tool file(s) for calendar tools, registered in MCP server index
- `src/lib/actionRegistry.ts` — new entries for all 5 calendar tools
- `src/hooks/useAgentMcp.ts` — system prompt needs new tools listed
- `scheduled_blocks` table — existing SQLite table for work block CRUD
- `calendar_events` table — existing SQLite table for calendar event reads

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches following existing MCP server patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 29-calendar-mcp-tools*
*Context gathered: 2026-04-03*
