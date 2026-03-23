---
status: partial
phase: 09-embedded-terminal
source: [09-VERIFICATION.md]
started: 2026-03-23T02:15:13Z
updated: 2026-03-23T02:15:13Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Terminal renders and accepts input
expected: Run `npm run tauri dev`, click Terminal tab, type `ls` and Enter -- terminal shows file listing
result: [pending]

### 2. CWD is correct
expected: Type `pwd` in terminal, verify it shows the project's linked directory path
result: [pending]

### 3. Ctrl+backtick toggles
expected: Press Ctrl+` to open/close terminal drawer; if on terminal tab, closes drawer; otherwise opens to terminal
result: [pending]

### 4. Focus guard works
expected: With terminal focused, press Cmd+K and verify command palette does NOT open
result: [pending]

### 5. Resize works
expected: Drag drawer handle, verify terminal content reflows correctly
result: [pending]

### 6. Project switching
expected: Switch projects, verify terminal restarts in new project's directory
result: [pending]

### 7. Scrollback preserved on tab switch
expected: Generate output, switch to Logs tab and back to Terminal, verify scrollback is preserved
result: [pending]

### 8. No zombie processes
expected: Close app, check `ps` for orphaned shell processes -- none should exist
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
