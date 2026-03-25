# Phase 9: Embedded Terminal - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can run commands in an embedded terminal without leaving Element. This phase delivers: a PTY-backed terminal rendered via xterm.js in the output drawer as a third tab, with keyboard shortcut toggle, auto-CWD to the project's linked directory, and theme-matched appearance.

Requirements: TERM-01, TERM-02, TERM-03

</domain>

<decisions>
## Implementation Decisions

### Terminal Placement
- **D-01:** Terminal lives as a third tab ("Terminal") in the existing output drawer, alongside Logs and History
- **D-02:** User opens/closes terminal via keyboard shortcut (Ctrl+`) which toggles the drawer open to the Terminal tab. Manual tab click also works.
- **D-03:** On first project select (project with a linked directory) in a session, the drawer auto-opens to the Terminal tab. After that, manual only.

### Session Lifecycle
- **D-04:** PTY session spawns lazily — only when the Terminal tab first receives focus (tab click or keyboard shortcut)
- **D-05:** Switching projects kills the current PTY session. Next time the terminal tab is focused, a new session starts in the new project's directory. No background/zombie sessions.
- **D-06:** Multi-session support (tabs, keep-alive across project switches) is deferred to future requirements (TERM-10). Keep it simple: one session at a time.
- **D-07:** For projects without a linked directory, the Terminal tab is always visible but shows a message: "Link a directory to enable terminal" with a button to open the directory picker.

### Shell and Environment
- **D-08:** Terminal spawns the user's default login shell (read from $SHELL on macOS/Linux, system default on Windows)
- **D-09:** Shell spawns as a login shell (-l flag) so .zshrc/.bashrc and full PATH are loaded. User gets the same experience as a normal terminal.

### Visual Appearance
- **D-10:** Terminal theme matches Element's dark UI — background, foreground, and ANSI colors derived from Element's existing design tokens (bg-background, text-foreground, etc.)
- **D-11:** Good default monospace font (system monospace or bundled), no font settings UI. No font size adjustment in v1.

### Claude's Discretion
- PTY library choice for Rust backend (portable-pty, tokio-pty-process, or raw platform APIs)
- xterm.js addon selection (fit, webgl renderer, etc.)
- Exact keyboard shortcut binding mechanism (reuse existing global shortcut system or local keybinding)
- Scrollback buffer size
- Terminal resize handling implementation
- Copy/paste implementation details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Layer
- `src-tauri/src/models/project.rs` — Project model with directory_path field (from Phase 7)
- `src-tauri/src/commands/project_commands.rs` — Project commands including directory linking

### Frontend - Output Drawer
- `src/components/output/DrawerHeader.tsx` — Current drawer tab system (Logs, History) — add Terminal tab here
- `src/components/output/LogViewer.tsx` — Existing log viewer pattern in drawer
- `src/stores/useWorkspaceStore.ts` — Workspace store with drawerOpen toggle

### Frontend Patterns
- `src/components/ui/` — shadcn/ui component library
- `src/lib/tauri.ts` — Tauri invoke wrapper for backend calls

### Requirements
- `.planning/REQUIREMENTS.md` — TERM-01 through TERM-03 acceptance criteria
- `.planning/REQUIREMENTS.md` — TERM-10, TERM-11 future requirements (explicitly deferred)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DrawerHeader.tsx` — Tab system with Logs/History tabs. Extend with Terminal tab. Uses button styling with active/inactive states.
- `useWorkspaceStore` — Has `drawerOpen` and `toggleDrawer`. Extend with `activeDrawerTab` state to support tab switching.
- `shadcn/ui` Button, ScrollArea components — available for terminal controls
- Tauri invoke pattern via `src/lib/tauri.ts` — extend for PTY commands

### Established Patterns
- State management: Zustand with slice pattern
- Styling: Tailwind CSS with shadcn/ui design tokens
- Backend commands: Rust `#[tauri::command]` async functions with `State<Arc<Mutex<Database>>>`
- Event system: `app.emit()` for backend-to-frontend communication (useful for PTY output streaming)

### Integration Points
- `DrawerHeader.tsx` — Add Terminal tab
- `Cargo.toml` — Add PTY crate dependency
- `src-tauri/src/commands/mod.rs` — Register terminal commands
- `src-tauri/src/lib.rs` — Register new command handlers
- `package.json` — Add xterm.js and addons as frontend dependencies

</code_context>

<specifics>
## Specific Ideas

- Terminal tab feels native to the existing drawer — same tab styling, same resize behavior
- "Link a directory to enable terminal" empty state encourages directory linking (drives adoption of Phase 7 feature)
- Kill-on-switch keeps things simple and resource-friendly for v1; multi-session is explicitly TERM-10

</specifics>

<deferred>
## Deferred Ideas

- **Multi-session tabs** — Multiple terminal sessions per project with tab management (already tracked as TERM-10)
- **Session persistence across project switches** — Keep PTY alive when switching, restore on return (future enhancement)
- **Font customization** — Font family, size, line height settings (future enhancement)
- **Per-project shell override** — Configure shell per project in project settings (future enhancement)

</deferred>

---

*Phase: 09-embedded-terminal*
*Context gathered: 2026-03-22*
