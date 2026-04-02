---
status: partial
phase: 25-bot-skills-and-mcp-write-tools
source: [25-VERIFICATION.md]
started: 2026-04-02T06:00:00Z
updated: 2026-04-02T06:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Hub Chat Tool Use End-to-End Flow
expected: Open Hub chat, send "Create a task called Test Verification" — bot responds with tool_use block, non-destructive action result card shows "create_task completed successfully", task appears in database
result: [pending]

### 2. Destructive Action Confirmation Flow
expected: Send "Delete task [id]" in hub chat — ActionConfirmCard appears with Yes/No buttons, chat input disabled, Escape rejects, Enter/click deletes task and re-enables input
result: [pending]

### 3. Shell Allowlist Settings Persistence
expected: Settings > AI > Shell Allowlist — add "docker" as custom command, close and reopen settings — "docker" persists as custom badge
result: [pending]

### 4. Shell Output Collapsible Behavior
expected: Bot runs a shell command — output appears in collapsible ShellOutputBlock, auto-expands for short output, collapses for long output, truncates at 200 lines with "show all" option
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
