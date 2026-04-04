---
status: complete
phase: 18-ui-polish
source: 18-01-SUMMARY.md, 18-02-SUMMARY.md, 18-03-SUMMARY.md
started: 2026-03-31T00:00:00Z
updated: 2026-03-31T01:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Theme Collapse Persistence
expected: Collapse a theme section in the sidebar. Reload the app (or navigate away and back). The theme section should remain collapsed. Expand it again, reload — it should remain expanded.
result: pass

### 2. Terminal as Default Drawer Tab
expected: Open the output drawer. The Terminal tab should be selected by default (not Logs). Tab order should be Terminal, Logs, History from left to right.
result: pass

### 3. Sidebar Theme Click Behavior
expected: Left-click on a theme header in the sidebar. It should expand/collapse the theme without flashing a dropdown menu. Right-click or context menu should still work if applicable.
result: pass

### 4. AI Button Dynamic Labels
expected: The AI button in the center panel should show contextual labels based on project state: "Link Directory" (disabled with tooltip) when no directory is linked, "Plan Project" when no planning tier is set, "Check Progress" when AI is executing, and "Open AI" as the default fallback.
result: pass

### 5. AI Button and Directory Link Layout
expected: The AI button and the directory link should appear on the same row in the project detail view — AI button on the left, directory link on the right. The old standalone "Directory" section label should be gone.
result: pass

### 6. Task Detail Primary Fields
expected: Open a task detail view. Title, status, priority, and description should be immediately visible without expanding anything. These are the primary fields always shown.
result: pass

### 7. Task Detail Accordion Sections
expected: Below the primary fields in task detail, secondary fields (context, tags, scheduling, execution history) should be in collapsible accordion sections. Multiple sections can be open at the same time. Clicking a section header toggles it open/closed.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
