---
status: testing
phase: 01-desktop-shell-and-task-foundation
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md]
started: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:00:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running dev server. Start the application from scratch with `cargo tauri dev`. The Tauri app window opens without errors, the SQLite database initializes (migration runs), and the frontend loads showing the welcome/empty state screen.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Start the application from scratch with `cargo tauri dev`. The Tauri app window opens without errors, the SQLite database initializes (migration runs), and the frontend loads showing the welcome/empty state screen.
result: [pending]

### 2. Welcome Empty State
expected: With no projects or tasks created, the main panel shows a "Welcome to Element" message with a call-to-action to create your first project or task.
result: [pending]

### 3. Create a Project
expected: Using Cmd+Shift+N (or the menu File > New Project), a new project is created. It appears in the sidebar project list immediately.
result: [pending]

### 4. Create a Task
expected: Using Cmd+N (or the menu File > New Task), a new task is created under the selected project. It appears in the task list in the sidebar.
result: [pending]

### 5. Task List Display
expected: Tasks in the sidebar show a compact row with a status icon and a priority badge. Priority badges are color-differentiated (urgent=red, high=orange, medium=amber outline, low=grey outline).
result: [pending]

### 6. Task Detail and Inline Editing
expected: Clicking a task in the sidebar shows its detail in the main panel. Title, description, status, priority, and tags are all editable inline with debounced auto-save (changes persist without a save button).
result: [pending]

### 7. Resizable Sidebar
expected: The sidebar panel can be resized by dragging the border between the sidebar and the detail panel. The resize persists visually.
result: [pending]

### 8. Native Menu Bar
expected: The macOS menu bar shows Element (About/Quit), File (New Project/New Task/Close), and Edit (Undo/Redo/Cut/Copy/Paste/Select All) menus.
result: [pending]

### 9. System Tray
expected: A system tray icon appears in the macOS menu bar area. Clicking it shows at least "Show Element" and "Quit" options.
result: [pending]

### 10. Dark/Light Mode
expected: The app follows the OS appearance preference. If your Mac is in dark mode, the app uses dark theme colors. Switching the OS appearance updates the app theme accordingly.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps

[none yet]
