---
status: complete
phase: 17-tech-debt-cleanup
source: [17-01-SUMMARY.md, 17-02-SUMMARY.md]
started: 2026-03-30T11:20:00Z
updated: 2026-03-31T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Sidebar Drag and Drop
expected: Themes in the sidebar can be dragged to reorder. Drag handles appear and respond correctly — no console errors or broken interactions after the type fixes.
result: pass

### 2. Uncategorized Section Renders
expected: Projects without a theme appear in the "Uncategorized" section of the sidebar. The section renders without errors.
result: issue
reported: "The app just crashed. Maximum update depth exceeded in <TerminalPane> component. Infinite re-render loop."
severity: blocker

### 3. Open AI Button — Normal Flow
expected: Clicking "Open AI" on a project with a linked directory opens the terminal and starts the AI session. User stays on the project detail page.
result: issue
reported: "App isn't usable right now, clicking on a project messes it up"
severity: blocker

### 4. Open AI Button — Error Handling
expected: If the plan watcher fails to start (e.g., no linked directory, permissions issue), a descriptive toast error appears and the user is NOT navigated away from the project page. The app remains usable.
result: blocked
blocked_by: other
reason: "App is in crash loop from TerminalPane infinite re-render — can't test"

## Summary

total: 4
passed: 1
issues: 2
pending: 0
skipped: 0
blocked: 1

## Gaps

- truth: "Projects without a theme appear in the Uncategorized section of the sidebar without errors"
  status: failed
  reason: "User reported: The app just crashed. Maximum update depth exceeded in <TerminalPane> component. Infinite re-render loop."
  severity: blocker
  test: 2
  artifacts: []
  missing: []

- truth: "Clicking Open AI on a project opens the terminal and starts the AI session without navigation issues"
  status: failed
  reason: "User reported: App isn't usable right now, clicking on a project messes it up"
  severity: blocker
  test: 3
  artifacts: []
  missing: []
