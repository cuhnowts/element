# Phase 29: Calendar MCP Tools - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 29-calendar-mcp-tools
**Areas discussed:** MCP tool granularity, Work block operations, Available slots response, Date/time input format

---

## MCP Tool Granularity

### Q1: How should calendar MCP tools be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Fine-grained (Recommended) | One tool per operation: list_calendar_events, get_available_slots, create_work_block, move_work_block, delete_work_block. Matches existing MCP pattern. | ✓ |
| Medium-grained | Group by domain: calendar_read, work_blocks with action param. Fewer tools but more complex schemas. | |
| Minimal | Just 3 tools matching the 3 requirements. Simplest for LLM reasoning. | |

**User's choice:** Fine-grained (Recommended)
**Notes:** None

### Q2: Should these new tools also be registered in actionRegistry for hub chat?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, dual registration (Recommended) | Add to actionRegistry.ts so hub chat bot gets calendar tools alongside existing tools. | ✓ |
| MCP-only for now | Only expose via MCP server. Hub chat has its own briefing flow. | |
| You decide | Claude's discretion. | |

**User's choice:** Yes, dual registration (Recommended)
**Notes:** None

### Q3: Should read-only calendar tools skip the approval flow?

| Option | Description | Selected |
|--------|-------------|----------|
| Reads skip approval (Recommended) | list_calendar_events and get_available_slots are non-destructive — no confirmation. Only writes require approval. | ✓ |
| All require approval | Even reading calendar data gets confirmation. Maximum control. | |
| None require approval | Trust the bot fully. Fast but inconsistent with suggest-never-auto-apply. | |

**User's choice:** Reads skip approval (Recommended)
**Notes:** None

---

## Work Block Operations

### Q1: What should 'move a work block' mean?

| Option | Description | Selected |
|--------|-------------|----------|
| Change time slot (Recommended) | Move to different start/end on same day. Cross-day is separate create+delete. | ✓ |
| Change time or day | Single tool accepts new date AND time. | |
| Reassign task | Re-link block to different task, keeping same time. | |

**User's choice:** Change time slot (Recommended)
**Notes:** None

### Q2: Should the bot be able to delete work blocks?

| Option | Description | Selected |
|--------|-------------|----------|
| Full CRUD (Recommended) | Create, move, and delete. Delete requires approval. | ✓ |
| Create and move only | No delete — user manually removes via UI. | |
| You decide | Claude's discretion. | |

**User's choice:** Full CRUD (Recommended)
**Notes:** None

### Q3: Should creating a work block require a task_id?

| Option | Description | Selected |
|--------|-------------|----------|
| Task required (Recommended) | Every block links to a task. Keeps schedule grounded in real work items. | ✓ |
| Task optional | Allow blocks with just a title and no task link. More flexible. | |
| You decide | Claude's discretion. | |

**User's choice:** Task required (Recommended)
**Notes:** None

---

## Available Slots Response

### Q1: How should available time slots be returned?

| Option | Description | Selected |
|--------|-------------|----------|
| Raw gaps (Recommended) | Array of {start, end, duration_minutes}. Simple, composable. find_open_blocks() already computes this. | ✓ |
| Enriched with context | Each gap includes what's before/after it. Richer for LLM narration. | |
| Pre-sized for tasks | Accept optional min_minutes param and filter small gaps. | |

**User's choice:** Raw gaps (Recommended)
**Notes:** None

### Q2: Single date or date range for querying slots?

| Option | Description | Selected |
|--------|-------------|----------|
| Single date (Recommended) | get_available_slots(date) for one day. Caller loops for multi-day. | ✓ |
| Date range | get_available_slots(start_date, end_date) across multiple days. | |
| You decide | Claude's discretion. | |

**User's choice:** Single date (Recommended)
**Notes:** None

---

## Date/Time Input Format

### Q1: How should MCP tools accept date and time inputs?

| Option | Description | Selected |
|--------|-------------|----------|
| ISO strings only (Recommended) | YYYY-MM-DD for dates, HH:mm for times. Matches existing codebase. LLM resolves relative terms. | ✓ |
| ISO + relative helpers | Accept both ISO and relative terms. MCP server resolves them. | |
| You decide | Claude's discretion. | |

**User's choice:** ISO strings only (Recommended)
**Notes:** None

### Q2: Should times be returned in UTC or local timezone?

| Option | Description | Selected |
|--------|-------------|----------|
| Local timezone (Recommended) | HH:mm local time. Matches existing CalendarEvent type. | ✓ |
| UTC with offset | ISO 8601 with timezone offset. More precise. | |
| You decide | Claude's discretion. | |

**User's choice:** Local timezone (Recommended)
**Notes:** None

---

## Claude's Discretion

- Error response format and error codes for MCP tool failures
- Internal SQL query structure for new tools
- File organization within mcp-server/src/tools/

## Deferred Ideas

None — discussion stayed within phase scope.
