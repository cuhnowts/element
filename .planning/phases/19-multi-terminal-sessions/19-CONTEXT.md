# Phase 19: Multi-Terminal Sessions - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can run multiple concurrent terminal sessions per project without losing existing sessions. Each project maintains isolated sessions with named tabs, and "Open AI" no longer kills existing terminals.

</domain>

<decisions>
## Implementation Decisions

### Session Lifecycle
- **D-01:** "Open AI" checks for an existing AI session for the project. If one exists, prompt: "Refresh context? You will lose all current memory." User can refresh (kill & recreate) or keep existing. If no AI session exists, create a new one without prompting.
- **D-02:** New non-AI sessions are created via a "+" button on the session tab bar. Creates a plain shell session with auto-generated name ("Shell 1", "Shell 2").
- **D-03:** No hard limit on concurrent sessions per project. Trust the user.
- **D-04:** Session names must be specific and descriptive — derived from the actual work. AI sessions are named after the phase being worked on (e.g., "Phase 19: Multi-Terminal") or the command being run (e.g., "GSD Manager", "Dev Server", "Caffeine"). Not generic labels like "AI" or "Shell 1".

### Tab Bar Design
- **D-05:** Session tabs live as a sub-row inside the "Terminal" drawer tab. Top-level drawer tabs (Logs, History, Terminal) remain unchanged. When Terminal is active, a second row of session tabs appears below.
- **D-06:** Close button (x) on tabs kills the PTY immediately — no confirmation dialog, even if a process is running.
- **D-07:** When a shell process exits (user types `exit`), auto-remove the tab after ~3 seconds with a brief "Process exited" message.
- **D-08:** Tab overflow handled by horizontal scrolling with subtle scroll indicators (like VS Code terminal tabs).

### Per-Project Isolation
- **D-09:** On project switch, PTY processes keep running in the background. Tab bar swaps to show the new project's sessions. Switching back restores tabs with full scroll history.
- **D-10:** A small dot/badge on sidebar projects that have running terminal sessions. Gives background activity awareness.
- **D-11:** When a project is removed or unlinked from its directory, kill all its terminal sessions immediately. Clean break.

### PTY Cleanup
- **D-12:** Graceful shutdown: SIGTERM first, wait 3 seconds, then SIGKILL. Meets TERM-04 requirement ("no zombie processes after 5 seconds") with margin.
- **D-13:** On app quit, explicitly iterate all sessions and run the SIGTERM/SIGKILL sequence on each before closing. No reliance on OS cleanup.

### Claude's Discretion
- Implementation details for session state management (Zustand store structure, session ID generation)
- Terminal tab sub-row styling and active indicator design
- Exact auto-remove delay timing and animation for exited sessions
- Scroll indicator appearance for tab overflow

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Terminal Infrastructure
- `src/hooks/useTerminal.ts` — Current single-session PTY hook (spawn, resize, cleanup). Must be refactored to support multiple sessions.
- `src/components/output/TerminalTab.tsx` — Current single-terminal renderer. Will need per-session instances.
- `src/components/output/TerminalEmptyState.tsx` — Empty state when no project/directory linked.
- `src/components/output/DrawerHeader.tsx` — Current drawer tab bar (Logs/History/Terminal). Terminal tab becomes container for session sub-tabs.

### State Management
- `src/stores/useWorkspaceStore.ts` — Contains `terminalSessionKey`, `terminalInitialCommand`, `launchTerminalCommand()`. Kill/respawn pattern must be replaced with multi-session management.

### AI Integration
- `src/components/center/OpenAiButton.tsx` — Calls `launchTerminalCommand()`. Must be updated to check for existing AI session and prompt for refresh.

### Requirements
- `.planning/REQUIREMENTS.md` — TERM-01 through TERM-05 define the acceptance criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTerminal` hook: Core PTY logic (xterm.js + tauri-pty spawn + resize observer) can be extracted into a per-session instance manager.
- `TerminalTab` component: Simple container — can be instantiated per session with minor refactoring.
- `TerminalEmptyState`: Reusable as-is for projects without linked directories.
- `DrawerHeader`: Tab rendering pattern can be extended for the session sub-tab row.
- xterm.js addons already configured: FitAddon, WebglAddon.

### Established Patterns
- Zustand with `persist` middleware for workspace state. Session state should NOT be persisted (session-only, like current `terminalSessionKey`).
- `tauri-pty` `spawn()` for PTY creation — no custom Rust commands needed for basic PTY ops.
- ResizeObserver pattern for terminal fitting — reuse per session.

### Integration Points
- `useWorkspaceStore.launchTerminalCommand()` is the entry point for "Open AI" → terminal. Must be refactored to session-aware API.
- `DrawerHeader` tab switching controls which content pane is visible — Terminal pane will now contain session tabs + active terminal.
- Sidebar project list needs a small indicator for projects with running sessions.

</code_context>

<specifics>
## Specific Ideas

- Session names are critical UX — user wants names that reflect actual work: phase names for AI sessions, descriptive names for manual sessions (e.g., "Dev Server", "Caffeine", "GSD Manager"). Auto-generated "Shell N" names are acceptable only for the "+" button quick-create.
- The "Refresh context?" prompt for existing AI sessions is important — it acknowledges that Claude Code sessions have memory/context that would be lost on recreation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 19-multi-terminal-sessions*
*Context gathered: 2026-03-29*
