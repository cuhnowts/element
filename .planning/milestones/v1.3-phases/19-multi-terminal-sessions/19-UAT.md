---
status: complete
phase: 19-multi-terminal-sessions
source: [19-01-SUMMARY.md, 19-02-SUMMARY.md, 19-03-SUMMARY.md]
started: 2026-03-31T00:00:00Z
updated: 2026-03-31T01:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Session Tab Bar Visible
expected: Open a project. The terminal area should show a tab bar with at least one session tab and a "+" button to create new sessions.
result: pass

### 2. Create New Terminal Session
expected: Click the "+" button in the session tab bar. A new terminal session tab should appear and become the active tab. A new terminal instance should be running in the pane below.
result: pass

### 3. Switch Between Sessions
expected: With multiple sessions open, click an inactive tab. The terminal pane should switch to that session's terminal. Scroll history from the previous session should be preserved when you switch back.
result: pass

### 4. Close a Terminal Session
expected: Hover over a session tab to reveal a close button. Click it. The tab should be removed and a neighboring tab should become active. The PTY process for that session should be killed.
result: pass

### 5. No-Sessions Empty State
expected: If all sessions are closed, the terminal pane should show an empty state (not a blank area or error).
result: pass

### 6. AI Button With Existing Session (Refresh Dialog)
expected: With an AI terminal session already running, click the OpenAI button. A dialog should appear asking whether to refresh the context or keep the existing session — not silently create a duplicate.
result: pass

### 7. Sidebar Session Indicator
expected: Projects that have running terminal sessions should show a green indicator dot next to the project name in the sidebar.
result: pass

### 8. Project Delete Cleans Up Sessions
expected: Delete a project that has running terminal sessions. The sessions should be killed before the project is removed — no orphaned PTY processes.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
