---
status: partial
phase: 10-ai-project-onboarding
source: [10-VERIFICATION.md]
started: 2026-03-22T00:30:00Z
updated: 2026-03-22T00:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Empty project shows "Plan with AI" button
expected: Empty project detail view shows "No phases yet" with "Plan with AI" button and "+ Add phase manually" option
result: [pending]

### 2. AI Mode dropdown visible and functional
expected: AI Mode dropdown in project header shows "On-demand" by default, can change to "Track + Suggest" or "Track + Auto-execute", persists on page refresh
result: [pending]

### 3. Scope input form appears on "Plan with AI" click
expected: Clicking "Plan with AI" shows scope textarea (required) and goals input with "Start AI Planning" button
result: [pending]

### 4. Submit validation works
expected: "Start AI Planning" is disabled when scope is empty, enabled when scope has text
result: [pending]

### 5. Directory guard prevents planning without linked directory
expected: Submitting without a linked project directory shows toast: "Link a project directory first..."
result: [pending]

### 6. CLI tool launch and terminal auto-open
expected: Submit triggers skill file write, terminal tab opens, waiting card with scope summary appears
result: [pending]

### 7. File watcher detects plan output
expected: Creating .element/plan-output.json in project directory triggers transition to review screen
result: [pending]

### 8. Review screen shows accordion with phases
expected: Review screen displays phases in accordion layout with task lists, "Review AI Plan" heading, and phase/task counts
result: [pending]

### 9. Drag-and-drop phase reorder
expected: Dragging a phase via GripVertical handle reorders it
result: [pending]

### 10. Inline editing of phases and tasks
expected: Clicking phase or task name shows input, Enter/blur saves, empty name removes item
result: [pending]

### 11. Confirm & Save works
expected: "Confirm & Save" creates all phases and tasks, shows success toast with counts, returns to populated project view
result: [pending]

### 12. Discard shows confirmation dialog
expected: "Discard plan" shows dialog with "Keep reviewing" and "Discard plan" options, discarding returns to empty state
result: [pending]

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0
blocked: 0

## Gaps
