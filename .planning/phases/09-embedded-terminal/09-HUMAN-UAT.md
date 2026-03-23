---
status: complete
phase: 09-embedded-terminal
source: [09-VERIFICATION.md]
started: 2026-03-23T02:15:13Z
updated: 2026-03-23T04:35:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Terminal renders and accepts input
expected: Run `npm run tauri dev`, click Terminal tab, type `ls` and Enter -- terminal shows file listing
result: pass

### 2. CWD is correct
expected: Type `pwd` in terminal, verify it shows the project's linked directory path
result: pass

### 3. Ctrl+backtick toggles
expected: Press Ctrl+` to open/close terminal drawer; if on terminal tab, closes drawer; otherwise opens to terminal
result: issue
reported: "It hid the terminal, but there is no footer that completely shows them at the bottom when hidden. I dont want it completely gone, it should still show a hint that its down there"
severity: major

### 4. Focus guard works
expected: With terminal focused, press Cmd+K and verify command palette does NOT open
result: pass

### 5. Resize works
expected: Drag drawer handle, verify terminal content reflows correctly
result: pass

### 6. Project switching
expected: Switch projects, verify terminal restarts in new project's directory
result: pass

### 7. Scrollback preserved on tab switch
expected: Generate output, switch to Logs tab and back to Terminal, verify scrollback is preserved
result: pass

### 8. No zombie processes
expected: Close app, check `ps` for orphaned shell processes -- none should exist
result: pass

## Summary

total: 8
passed: 6
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Drawer should show a persistent footer with tab buttons even when collapsed, so the terminal (and other tabs) remain discoverable"
  status: failed
  reason: "User reported: drawer hides completely when toggled — no persistent footer showing tabs are available. Terminal tab was hard to discover initially."
  severity: major
  test: 1, 3
  artifacts: [src/components/layout/OutputDrawer.tsx, src/components/output/DrawerHeader.tsx]
  missing: [persistent footer bar component that stays visible when drawer is collapsed]
