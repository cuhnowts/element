---
status: testing
phase: 17-tech-debt-cleanup
source: [17-01-SUMMARY.md, 17-02-SUMMARY.md]
started: 2026-03-30T11:20:00Z
updated: 2026-03-30T11:20:00Z
---

## Current Test

number: 1
name: Sidebar Drag and Drop
expected: |
  Themes in the sidebar can be dragged to reorder. Drag handles appear and respond correctly — no console errors or broken interactions after the type fixes.
awaiting: user response

## Tests

### 1. Sidebar Drag and Drop
expected: Themes in the sidebar can be dragged to reorder. Drag handles appear and respond correctly — no console errors or broken interactions after the type fixes.
result: [pending]

### 2. Uncategorized Section Renders
expected: Projects without a theme appear in the "Uncategorized" section of the sidebar. The section renders without errors.
result: [pending]

### 3. Open AI Button — Normal Flow
expected: Clicking "Open AI" on a project with a linked directory opens the terminal and starts the AI session. User stays on the project detail page.
result: [pending]

### 4. Open AI Button — Error Handling
expected: If the plan watcher fails to start (e.g., no linked directory, permissions issue), a descriptive toast error appears and the user is NOT navigated away from the project page. The app remains usable.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

[none yet]
