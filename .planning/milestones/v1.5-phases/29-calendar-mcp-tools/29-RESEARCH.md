# Phase 29: Calendar MCP Tools - Research

**Researched:** 2026-04-03
**Domain:** MCP tool implementation (TypeScript), SQLite queries, action registry integration
**Confidence:** HIGH

## Summary

Phase 29 adds five new MCP tools to the existing MCP server so external AI agents (and the hub chat bot) can read calendar events, query available time slots, and manage work blocks. The implementation is highly constrained by existing patterns -- every architectural decision is already made and documented in CONTEXT.md. The MCP server uses `better-sqlite3` for direct DB access, tools are handler functions with a `(db, dbPath, args)` signature, and the action registry in `src/lib/actionRegistry.ts` provides dual registration for hub chat bot use.

The critical reusable asset is `find_open_blocks()` in Rust, but the MCP server runs in Node.js. The `get_available_slots` tool must reimplement the gap-detection algorithm in TypeScript against the same SQLite tables. This is the only non-trivial piece -- the rest is straightforward CRUD following established patterns.

**Primary recommendation:** Create a single new file `mcp-server/src/tools/calendar-tools.ts` containing all 5 handler functions, following the exact patterns in `write-tools.ts` and `task-tools.ts`. Register them in `index.ts`, add to `ACTION_REGISTRY`, and update the system prompt in `useAgentMcp.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Fine-grained tools -- one tool per operation: `list_calendar_events`, `get_available_slots`, `create_work_block`, `move_work_block`, `delete_work_block`
- D-02: Dual registration -- all new tools added to both MCP server (`mcp-server/src/tools/`) AND `actionRegistry.ts`
- D-03: Read-only tools (`list_calendar_events`, `get_available_slots`) skip approval flow (non-destructive). Write tools (`create_work_block`, `move_work_block`, `delete_work_block`) require user confirmation.
- D-04: Full CRUD -- bot can create, move, and delete work blocks. Delete is destructive and requires approval.
- D-05: "Move" means change time slot on the same day (new start_time/end_time). Cross-day moves are modeled as delete + create.
- D-06: Every work block must link to a task via `task_id` (required parameter). No free-form blocks without a task.
- D-07: Return raw gaps as an array of `{start, end, duration_minutes}` for each open slot. No enrichment. Existing `find_open_blocks()` computes this.
- D-08: Single date per query -- `get_available_slots(date)` returns gaps for one day.
- D-09: ISO strings only -- dates as `YYYY-MM-DD`, times as `HH:mm`.
- D-10: Times returned in local timezone (HH:mm format).

### Claude's Discretion
- Error response format and error codes for MCP tool failures
- Internal implementation of SQL queries for the new tools
- How to structure the new tool files within `mcp-server/src/tools/`

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MCP-01 | MCP server exposes tools to read calendar events for a date range | `list_calendar_events` tool queries `calendar_events` table with start/end range filter -- mirrors existing `list_events_for_range()` Rust function |
| MCP-02 | MCP server exposes tools to create/move work blocks on the calendar | `create_work_block` inserts into `scheduled_blocks` table; `move_work_block` updates start_time/end_time; `delete_work_block` removes row. All require task_id per D-06 |
| MCP-03 | MCP server exposes tools to query available time slots | `get_available_slots` reads work_hours config + calendar_events + scheduled_blocks for a date, computes gaps in TypeScript (port of `find_open_blocks()`) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | (already installed) | Direct SQLite access from MCP server | Used by all existing MCP tools |
| @modelcontextprotocol/sdk | (already installed) | MCP protocol server | Already running in mcp-server/ |

### Supporting
No new dependencies required. Zero new npm packages -- this phase is pure application code using existing infrastructure.

## Architecture Patterns

### Recommended Project Structure
```
mcp-server/src/tools/
  calendar-tools.ts          # NEW: all 5 calendar tool handlers
  task-tools.ts              # Existing pattern reference
  write-tools.ts             # Existing pattern reference (emitDataChanged)
  orchestration-tools.ts     # Existing pattern reference

src/lib/
  actionRegistry.ts          # ADD: 5 new ActionDefinition entries

src/hooks/
  useAgentMcp.ts             # UPDATE: system prompt tool list
```

### Pattern 1: MCP Tool Handler (Read)
**What:** Handler function that queries SQLite and returns JSON text content
**When to use:** `list_calendar_events`, `get_available_slots`
**Example:**
```typescript
// Source: mcp-server/src/tools/task-tools.ts (existing pattern)
export function handleListCalendarEvents(
  db: Database.Database,
  args: { startDate: string; endDate: string }
) {
  const rows = db.prepare(
    `SELECT id, title, description, location, start_time, end_time, all_day, status
     FROM calendar_events
     WHERE start_time >= ? AND end_time <= ?
     ORDER BY start_time`
  ).all(args.startDate, args.endDate);

  return {
    content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
  };
}
```

### Pattern 2: MCP Tool Handler (Write with data-changed notification)
**What:** Handler that mutates SQLite, then emits a data-changed notification so the UI refreshes
**When to use:** `create_work_block`, `move_work_block`, `delete_work_block`
**Example:**
```typescript
// Source: mcp-server/src/tools/write-tools.ts (existing pattern)
import { emitDataChanged } from "./write-tools.js";

export function handleCreateWorkBlock(
  db: Database.Database,
  dbPath: string,
  args: { date: string; taskId: string; startTime: string; endTime: string }
) {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO scheduled_blocks (id, schedule_date, task_id, block_type, start_time, end_time, is_confirmed, created_at)
     VALUES (?, ?, ?, 'work', ?, ?, 1, ?)`
  ).run(id, args.date, args.taskId, args.startTime, args.endTime, now);

  emitDataChanged(dbPath, "schedule-changed");

  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({ id, date: args.date, taskId: args.taskId, startTime: args.startTime, endTime: args.endTime }),
    }],
  };
}
```

### Pattern 3: Action Registry Entry
**What:** Dual registration for hub chat bot access
**When to use:** All 5 tools
**Example:**
```typescript
// Source: src/lib/actionRegistry.ts (existing pattern)
{
  name: "create_work_block",
  description: "Create a work block on the calendar for a specific task and time slot.",
  inputSchema: {
    type: "object",
    properties: {
      date: { type: "string", description: "Date in YYYY-MM-DD format" },
      taskId: { type: "string", description: "Task ID to assign to this block" },
      startTime: { type: "string", description: "Start time in HH:mm format" },
      endTime: { type: "string", description: "End time in HH:mm format" },
    },
    required: ["date", "taskId", "startTime", "endTime"],
  },
  destructive: false,  // create is not destructive per existing pattern (create_task is false)
  tauriCommand: "create_work_block",  // Will need corresponding Tauri command or alternate dispatch
},
```

### Pattern 4: Gap Detection Algorithm (TypeScript port)
**What:** Port of `find_open_blocks()` from Rust to TypeScript for the MCP server
**When to use:** `get_available_slots` tool
**Key logic:**
1. Read work_hours config from `work_hours` table (default 09:00-17:00 if not set)
2. Read calendar_events for the given date from `calendar_events` table
3. Read existing scheduled_blocks (type='work') for the date from `scheduled_blocks` table
4. Treat both calendar events AND existing work blocks as "occupied" time
5. Apply buffer_minutes around calendar events (not work blocks)
6. Merge overlapping occupied ranges
7. Walk from work_start to work_end, collecting gaps >= min_block_minutes
8. Return array of `{start: "HH:mm", end: "HH:mm", duration_minutes: number}`

### Anti-Patterns to Avoid
- **Calling Tauri commands from MCP server:** The MCP server runs as a standalone Node process with direct SQLite access. It does NOT go through Tauri IPC. All data access is via `better-sqlite3`.
- **Forgetting data-changed notifications:** Write tools MUST call `emitDataChanged()` so the UI refreshes when the bot creates/moves/deletes blocks.
- **Forgetting to update the tool-registry test:** The existing test in `mcp-server/src/__tests__/tool-registry.test.ts` asserts "exactly 18 tools". This must be updated to 23.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID scheme | `crypto.randomUUID()` | Existing pattern in write-tools.ts |
| Data change notifications | Custom event system | `emitDataChanged()` from write-tools.ts | Already handles file-based agent queue |
| Date validation | Manual regex | Simple string format check | ISO dates are easy to validate; full date-fns is unnecessary here |

**Key insight:** The entire MCP tool pattern is already established. This phase is pure pattern replication with one algorithmic addition (gap detection).

## Common Pitfalls

### Pitfall 1: calendar_events time format mismatch
**What goes wrong:** The `calendar_events` table stores `start_time` and `end_time` as full ISO datetime strings (e.g., `2026-04-03T10:00:00`), not `HH:mm`. But the scheduling types use `HH:mm`.
**Why it happens:** Two different CalendarEvent types exist -- `plugins/core/calendar.rs` (full datetime) vs `scheduling/types.rs` (HH:mm only). The MCP tools read from the DB directly and must handle the full datetime format.
**How to avoid:** For `list_calendar_events`, return raw DB values. For `get_available_slots`, extract HH:mm from the full datetime strings when computing gaps.
**Warning signs:** Gap detection returning wrong results or no results.

### Pitfall 2: Existing scheduled_blocks not considered in gap detection
**What goes wrong:** `get_available_slots` returns slots that are already occupied by confirmed work blocks.
**Why it happens:** The Rust `find_open_blocks()` only considers calendar events, not existing scheduled_blocks. An AI creating a second work block in an already-filled slot would double-book.
**How to avoid:** The TypeScript port MUST also query `scheduled_blocks WHERE schedule_date = ? AND is_confirmed = 1` and treat them as occupied time alongside calendar events.
**Warning signs:** Bot creating overlapping work blocks.

### Pitfall 3: Destructive flag inconsistency
**What goes wrong:** `move_work_block` and `delete_work_block` don't trigger confirmation in hub chat.
**Why it happens:** Forgetting to set `destructive: true` in the action registry entries.
**How to avoid:** Per D-03: `delete_work_block` MUST be `destructive: true`. For `move_work_block`, follow the same principle -- it mutates existing data. `create_work_block` should be `destructive: false` (consistent with `create_task`).
**Warning signs:** Bot silently moving/deleting blocks without user confirmation.

### Pitfall 4: Tool registry test count hardcoded
**What goes wrong:** Tests fail because `tool-registry.test.ts` asserts exactly 18 tools.
**Why it happens:** The test has a hardcoded count that must be updated when adding tools.
**How to avoid:** Update the test to assert 23 tools and add the 5 new tool definitions to EXPECTED_TOOLS.
**Warning signs:** CI failure on `npm test`.

### Pitfall 5: actionRegistry tauriCommand for calendar tools
**What goes wrong:** Hub chat bot tries to invoke Tauri commands that don't exist for calendar operations.
**Why it happens:** The action registry pattern maps tools to `tauriCommand` names. Calendar CRUD operations may not have 1:1 Tauri command equivalents.
**How to avoid:** Check whether `create_work_block`, `move_work_block`, `delete_work_block` Tauri commands exist. If not, they need to be created in `scheduling_commands.rs` or the hub chat dispatch needs an alternative path. The MCP server has direct DB access and doesn't need Tauri commands, but the hub chat bot invokes via Tauri.
**Warning signs:** Hub chat bot errors when trying to use calendar tools.

## Code Examples

### calendar_events table schema
```sql
-- Source: src-tauri/src/db/sql/005_plugins_credentials_calendar.sql
CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location TEXT,
    start_time TEXT NOT NULL,    -- Full ISO datetime
    end_time TEXT NOT NULL,      -- Full ISO datetime
    all_day INTEGER NOT NULL DEFAULT 0,
    attendees TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'confirmed',
    updated_at TEXT NOT NULL
);
```

### scheduled_blocks table schema
```sql
-- Source: src-tauri/src/db/sql/006_ai_scheduling.sql
CREATE TABLE IF NOT EXISTS scheduled_blocks (
    id TEXT PRIMARY KEY,
    schedule_date TEXT NOT NULL,              -- YYYY-MM-DD
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL CHECK(block_type IN ('work', 'meeting', 'buffer')),
    start_time TEXT NOT NULL,                 -- HH:mm
    end_time TEXT NOT NULL,                   -- HH:mm
    is_confirmed INTEGER NOT NULL DEFAULT 0,
    source_event_id TEXT,
    created_at TEXT NOT NULL
);
```

### work_hours table query
```sql
-- Source: src-tauri/src/commands/scheduling_commands.rs
SELECT start_time, end_time, work_days, buffer_minutes, min_block_minutes
FROM work_hours WHERE id = 1
```

### MCP Tool Registration in index.ts
```typescript
// Source: mcp-server/src/index.ts -- pattern for adding to ListToolsRequestSchema handler
{
  name: "list_calendar_events",
  description: "List calendar events for a date range",
  inputSchema: {
    type: "object" as const,
    properties: {
      startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
      endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
    },
    required: ["startDate", "endDate"],
  },
},
```

### MCP Tool Dispatch in index.ts
```typescript
// Source: mcp-server/src/index.ts -- pattern for adding to CallToolRequestSchema handler
case "list_calendar_events":
  return handleListCalendarEvents(
    db,
    args as { startDate: string; endDate: string }
  );
```

## Tool Input Schema Specifications

### list_calendar_events
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | yes | Start date YYYY-MM-DD |
| endDate | string | yes | End date YYYY-MM-DD |

### get_available_slots
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string | yes | Date YYYY-MM-DD |

### create_work_block
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string | yes | Date YYYY-MM-DD |
| taskId | string | yes | Task ID (must exist in tasks table) |
| startTime | string | yes | Start time HH:mm |
| endTime | string | yes | End time HH:mm |

### move_work_block
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blockId | string | yes | Scheduled block ID |
| startTime | string | yes | New start time HH:mm |
| endTime | string | yes | New end time HH:mm |

### delete_work_block
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blockId | string | yes | Scheduled block ID |

## Integration Points Checklist

| File | Change | Type |
|------|--------|------|
| `mcp-server/src/tools/calendar-tools.ts` | NEW: 5 handler functions + gap algorithm | Create |
| `mcp-server/src/index.ts` | ADD: 5 tool definitions + 5 switch cases + import | Modify |
| `src/lib/actionRegistry.ts` | ADD: 5 ActionDefinition entries | Modify |
| `src/hooks/useAgentMcp.ts` | ADD: 5 tool descriptions in system prompt | Modify |
| `mcp-server/src/__tests__/tool-registry.test.ts` | UPDATE: tool count 18->23, add 5 tool schemas | Modify |

## Open Questions

1. **Tauri commands for work block CRUD**
   - What we know: The MCP server has direct DB access and doesn't need Tauri commands. The hub chat bot dispatches via `tauriCommand` in actionRegistry.
   - What's unclear: Do Tauri commands for `create_work_block`, `move_work_block`, `delete_work_block` already exist? `apply_schedule` exists but it's a batch operation (delete all + insert all for a date), not individual CRUD.
   - Recommendation: Create individual Tauri commands in `scheduling_commands.rs` for the 3 write operations. OR modify hub chat dispatch to handle these tools differently. The planner should investigate `scheduling_commands.rs` for existing individual block CRUD. If missing, add them as a task.

2. **calendar_events start_time format for gap detection**
   - What we know: DB stores full ISO datetimes. Gap algorithm needs HH:mm. The Rust scheduling types have a separate `CalendarEvent` with HH:mm fields.
   - What's unclear: Exact format stored (e.g., `2026-04-03T10:00:00` vs `2026-04-03T10:00:00Z` vs `2026-04-03 10:00:00`).
   - Recommendation: Use substring extraction or simple split to get HH:mm from whatever ISO format is stored. Test with actual synced data.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest |
| Config file | mcp-server/vitest.config.ts or package.json |
| Quick run command | `cd mcp-server && npx vitest run` |
| Full suite command | `cd mcp-server && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCP-01 | list_calendar_events returns events for date range | unit | `cd mcp-server && npx vitest run src/__tests__/calendar-tools.test.ts` | No -- Wave 0 |
| MCP-02 | create/move/delete work blocks via MCP | unit | `cd mcp-server && npx vitest run src/__tests__/calendar-tools.test.ts` | No -- Wave 0 |
| MCP-03 | get_available_slots returns gap data | unit | `cd mcp-server && npx vitest run src/__tests__/calendar-tools.test.ts` | No -- Wave 0 |
| REGISTRY | Tool registry updated to 23 tools | unit | `cd mcp-server && npx vitest run src/__tests__/tool-registry.test.ts` | Yes -- needs update |

### Sampling Rate
- **Per task commit:** `cd mcp-server && npx vitest run`
- **Per wave merge:** `cd mcp-server && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `mcp-server/src/__tests__/calendar-tools.test.ts` -- covers MCP-01, MCP-02, MCP-03
- [ ] Update `tool-registry.test.ts` to expect 23 tools with 5 new definitions

## Sources

### Primary (HIGH confidence)
- `mcp-server/src/index.ts` -- MCP server tool registration pattern (18 existing tools)
- `mcp-server/src/tools/write-tools.ts` -- Write tool handler pattern with emitDataChanged
- `mcp-server/src/tools/task-tools.ts` -- Read tool handler pattern
- `src/lib/actionRegistry.ts` -- Action registry dual registration pattern (10 existing actions)
- `src-tauri/src/db/sql/005_plugins_credentials_calendar.sql` -- calendar_events schema
- `src-tauri/src/db/sql/006_ai_scheduling.sql` -- scheduled_blocks schema
- `src-tauri/src/scheduling/time_blocks.rs` -- find_open_blocks() algorithm to port
- `src-tauri/src/commands/scheduling_commands.rs` -- work_hours query, apply_schedule pattern
- `src/hooks/useAgentMcp.ts` -- System prompt that lists available tools

### Secondary (MEDIUM confidence)
- `src-tauri/src/plugins/core/calendar.rs` -- list_events_for_range() SQL query pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing infrastructure
- Architecture: HIGH - pure pattern replication from existing MCP tools
- Pitfalls: HIGH - identified from direct code analysis of both DB schemas and existing tools
- Gap detection algorithm: MEDIUM - TypeScript port is straightforward but time format handling needs runtime verification

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- internal codebase, no external API changes)
