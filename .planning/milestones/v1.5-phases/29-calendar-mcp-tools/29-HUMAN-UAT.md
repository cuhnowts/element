---
status: partial
phase: 29-calendar-mcp-tools
source: [29-VERIFICATION.md]
started: 2026-04-04T12:30:00Z
updated: 2026-04-04T12:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Work blocks appear in hub calendar view after MCP write
expected: Using an MCP client, call `create_work_block` for today's date with a valid `taskId`. The calendar view refreshes (via the `schedule-applied` Tauri event) and the new work block is visible in the correct time slot, visually distinct from external calendar meetings.
result: [pending]

### 2. Read tools execute without approval prompt; write tools show approval card
expected: In the hub chat, ask "What meetings do I have tomorrow?" (triggers `list_calendar_events`) — executes immediately with no approval prompt. Then ask "Schedule 2 hours for task X at 10am" (triggers `create_work_block`) — shows an `ApprovalRequest` card before the block is created.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
