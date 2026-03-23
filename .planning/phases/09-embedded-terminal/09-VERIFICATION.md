---
status: human_needed
phase: 09-embedded-terminal
verifier: inline
verified: 2026-03-23
---

# Phase 9: Embedded Terminal — Verification

## Goal Verification

**Phase Goal:** Users can run commands in an embedded terminal without leaving Element

| # | Must-Have | Status | Evidence |
|---|-----------|--------|----------|
| 1 | PTY plugin is registered and ready to spawn shell sessions | VERIFIED | `tauri_plugin_pty::init()` in lib.rs, `tauri-plugin-pty = "0.2"` in Cargo.toml, `pty:default` in capabilities, `cargo check` passes |
| 2 | Frontend can import tauri-pty spawn function and xterm Terminal class | VERIFIED | `spawn` imported from `tauri-pty` in useTerminal.ts, `Terminal` from `@xterm/xterm`, all packages installed |
| 3 | Workspace store tracks active drawer tab and provides openTerminal action | VERIFIED | `activeDrawerTab`, `openTerminal`, `hasAutoOpenedTerminal`, `markTerminalAutoOpened` in useWorkspaceStore.ts |
| 4 | useTerminal hook manages PTY lifecycle: spawn with CWD, bidirectional data, resize, cleanup | VERIFIED | Hook in src/hooks/useTerminal.ts with spawn, onData bidirectional wiring, ResizeObserver, kill/dispose cleanup |
| 5 | User can click the Terminal tab in the output drawer to see an interactive terminal | VERIFIED | DrawerHeader has Terminal tab, OutputDrawer renders TerminalTab with xterm.js |
| 6 | Terminal automatically starts in the project's linked directory | VERIFIED | `cwd` prop passed from `directoryPath` through OutputDrawer to TerminalTab to useTerminal spawn |
| 7 | Ctrl+backtick opens the drawer to the Terminal tab | VERIFIED | `e.ctrlKey && e.key === "\`"` handler in useKeyboardShortcuts.ts calls openTerminal() |
| 8 | Projects without a linked directory show an empty state with a Link Directory button | VERIFIED | TerminalEmptyState with hasProject variants, "Link Directory" button |
| 9 | Switching projects kills the current PTY and spawns a new one on next focus | VERIFIED | `key={terminal-${selectedProjectId}-${directoryPath}}` triggers React unmount/remount |
| 10 | Global keyboard shortcuts do not fire when terminal has focus | VERIFIED | Focus guard: `document.activeElement?.closest(".xterm")` check before all shortcuts |

## Requirements Traceability

| Req ID | Description | Status | Evidence |
|--------|-------------|--------|----------|
| TERM-01 | User can open an embedded terminal in the workspace panel | VERIFIED | TerminalTab component in output drawer, Ctrl+backtick shortcut |
| TERM-02 | Terminal automatically opens in the project's linked directory | VERIFIED | cwd from project.directoryPath passed to PTY spawn |
| TERM-03 | Terminal supports copy, paste, scroll, and standard terminal interaction | VERIFIED | xterm.js handles copy/paste natively, scrollback: 5000, @xterm/addon-fit for resize |

## Automated Checks

| Check | Command | Result |
|-------|---------|--------|
| Frontend tests pass | `npx vitest run --passWithNoTests --no-coverage` | 308 passed, 0 failed |
| Cargo check passes | `cd src-tauri && cargo check` | 0 errors |
| All TERM requirements marked complete | grep REQUIREMENTS.md | TERM-01, TERM-02, TERM-03 all [x] |

## Key Files

| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| `src-tauri/Cargo.toml` | ~55 | VERIFIED | tauri-plugin-pty dependency |
| `src-tauri/src/lib.rs` | ~245 | VERIFIED | PTY plugin registration |
| `src-tauri/capabilities/default.json` | ~20 | VERIFIED | pty:default permission |
| `src/hooks/useTerminal.ts` | ~110 | VERIFIED | PTY lifecycle hook |
| `src/stores/useWorkspaceStore.ts` | ~55 | VERIFIED | Drawer tab state management |
| `src/components/output/TerminalTab.tsx` | ~25 | VERIFIED | xterm.js container |
| `src/components/output/TerminalEmptyState.tsx` | ~40 | VERIFIED | Empty state variants |
| `src/components/output/DrawerHeader.tsx` | ~55 | VERIFIED | Terminal tab button |
| `src/components/layout/OutputDrawer.tsx` | ~110 | VERIFIED | Drawer integration |
| `src/hooks/useKeyboardShortcuts.ts` | ~135 | VERIFIED | Ctrl+backtick and focus guard |

## Human Verification Needed

The following require manual testing in a running Tauri app:

1. **Terminal renders and accepts input** -- Run `npm run tauri dev`, click Terminal tab, type `ls` and Enter
2. **CWD is correct** -- Type `pwd` in terminal, verify it shows project directory
3. **Ctrl+backtick toggles** -- Press Ctrl+` to open/close terminal drawer
4. **Focus guard works** -- With terminal focused, press Cmd+K and verify command palette does NOT open
5. **Resize works** -- Drag drawer handle, verify terminal content reflows
6. **Project switching** -- Switch projects, verify terminal restarts in new directory
7. **Scrollback preserved on tab switch** -- Generate output, switch tabs, switch back
8. **No zombie processes** -- Close app, check `ps` for orphaned shell processes

## Score

**Automated: 10/10 must-haves verified**
**Human: 8 items pending manual verification**
