---
status: testing
phase: 03-workflows-and-automation
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md]
started: 2026-03-17T12:00:00Z
updated: 2026-03-17T12:05:00Z
---

## Current Test

number: 6
name: Run a Workflow
expected: |
  Click "Run Now" on a workflow with at least one shell step (e.g., `echo hello`). The run starts, step indicators show a spinner while running, then a checkmark on success. The run completes and you get output.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running Element instance. Launch the app fresh. It boots without errors, the main window appears, and the sidebar shows your existing tasks/projects from prior phases.
result: pass

### 2. Create a Workflow
expected: From the sidebar WorkflowList, click the create workflow button. A new workflow appears in the list and the WorkflowDetail view opens in the center panel.
result: pass

### 3. Add Shell Step to Workflow
expected: In the WorkflowBuilder, click an insert button to add a step. Select "Shell" from the type picker. A CodeMirror editor appears with shell syntax highlighting where you can type a command (e.g., `echo hello`).
result: pass

### 4. Add HTTP Step to Workflow
expected: Add another step and select "HTTP". A structured form appears with fields for method (GET/POST/etc.), URL, headers, and body (JSON editor with syntax highlighting).
result: pass

### 5. Reorder and Edit Steps
expected: You can expand/collapse steps (only one expanded at a time). Insert buttons appear between steps for insert-anywhere. Steps can be moved up/down, duplicated, or deleted.
result: pass

### 6. Run a Workflow
expected: Click "Run Now" on a workflow with at least one shell step (e.g., `echo hello`). The run starts, step indicators show a spinner while running, then a checkmark on success. The run completes and you get output.
result: [pending]

### 7. Execution Progress Indicators
expected: During a workflow run, each step shows real-time status: spinner (running), checkmark (completed), or X (failed) overlaid on the step number.
result: [pending]

### 8. Retry Failed Step
expected: Create a workflow with a step that will fail (e.g., `exit 1`). After it fails (X icon), a Retry button appears on the failed step. Clicking it retries from that step.
result: [pending]

### 9. Run History
expected: After running a workflow, open the OutputDrawer. A "Run History" tab appears. It shows past runs with status, trigger type, and timing. Clicking a run shows per-step output breakdown.
result: [pending]

### 10. Schedule a Workflow (Cron)
expected: In WorkflowDetail, the CronScheduler section shows quick presets (hourly, daily, weekly, monthly) and an advanced raw cron input. Selecting a preset enables the schedule. A CronPreview below shows the next 3 run times in human-readable format.
result: [pending]

### 11. Pause/Resume Schedule
expected: With a schedule active, toggle it off (pause). The schedule shows as inactive. Toggle it back on to resume.
result: [pending]

### 12. Task-to-Workflow Promotion
expected: Open a task in TaskDetail. An "Automate" (PromoteButton) button appears. Clicking it creates a workflow linked to that task and navigates to the WorkflowDetail view.
result: [pending]

### 13. Convert to Workflow from Context Menu
expected: In the task list, right-click (or hover for context menu) on a TaskListItem. A "Convert to Workflow" option appears. Clicking it promotes the task to a workflow.
result: [pending]

### 14. Workflow List Sidebar
expected: The sidebar shows a WorkflowList section with all created workflows. Clicking a workflow opens its WorkflowDetail in the center panel.
result: [pending]

## Summary

total: 14
passed: 5
issues: 0
pending: 9
skipped: 0

## Gaps

[none yet]
