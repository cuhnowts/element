# Phase 19: Multi-Terminal Sessions - Research

**Researched:** 2026-03-29
**Domain:** Terminal session management (xterm.js + tauri-pty + Zustand state)
**Confidence:** HIGH

## Summary

Phase 19 transforms the single-terminal-per-project model into a multi-session architecture. The current system uses a kill/respawn pattern (`terminalSessionKey` increment forces React to remount the `TerminalTab` component, destroying the previous PTY). This must be replaced with a session manager that tracks multiple concurrent PTY instances per project, each rendered in its own xterm.js Terminal, and shown as sub-tabs within the existing Terminal drawer tab.

The core technical challenge is lifecycle management: each session owns a PTY process (via `tauri-pty`) and an xterm.js Terminal instance (~34MB memory each per STATE.md). The session store must coordinate creation, switching, cleanup (SIGTERM/SIGKILL), and app-quit teardown. The UI challenge is fitting a session tab bar as a sub-row below the existing drawer header without disrupting the Logs/History/Terminal navigation.

**Primary recommendation:** Build a `useTerminalSessionStore` (Zustand, session-only, not persisted) that maps `projectId -> Session[]`, where each Session holds the PTY ref, xterm Terminal ref, and metadata. The existing `useTerminal` hook becomes a per-session instance creator. The `OutputDrawer` renders the active session's terminal container and hides inactive ones (keeping them mounted to preserve scroll history).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** "Open AI" checks for an existing AI session for the project. If one exists, prompt: "Refresh context? You will lose all current memory." User can refresh (kill & recreate) or keep existing. If no AI session exists, create a new one without prompting.
- **D-02:** New non-AI sessions are created via a "+" button on the session tab bar. Creates a plain shell session with auto-generated name ("Shell 1", "Shell 2").
- **D-03:** No hard limit on concurrent sessions per project. Trust the user.
- **D-04:** Session names must be specific and descriptive -- derived from the actual work. AI sessions are named after the phase being worked on (e.g., "Phase 19: Multi-Terminal") or the command being run (e.g., "GSD Manager", "Dev Server", "Caffeine"). Not generic labels like "AI" or "Shell 1".
- **D-05:** Session tabs live as a sub-row inside the "Terminal" drawer tab. Top-level drawer tabs (Logs, History, Terminal) remain unchanged. When Terminal is active, a second row of session tabs appears below.
- **D-06:** Close button (x) on tabs kills the PTY immediately -- no confirmation dialog, even if a process is running.
- **D-07:** When a shell process exits (user types `exit`), auto-remove the tab after ~3 seconds with a brief "Process exited" message.
- **D-08:** Tab overflow handled by horizontal scrolling with subtle scroll indicators (like VS Code terminal tabs).
- **D-09:** On project switch, PTY processes keep running in the background. Tab bar swaps to show the new project's sessions. Switching back restores tabs with full scroll history.
- **D-10:** A small dot/badge on sidebar projects that have running terminal sessions. Gives background activity awareness.
- **D-11:** When a project is removed or unlinked from its directory, kill all its terminal sessions immediately. Clean break.
- **D-12:** Graceful shutdown: SIGTERM first, wait 3 seconds, then SIGKILL. Meets TERM-04 requirement ("no zombie processes after 5 seconds") with margin.
- **D-13:** On app quit, explicitly iterate all sessions and run the SIGTERM/SIGKILL sequence on each before closing. No reliance on OS cleanup.

### Claude's Discretion
- Implementation details for session state management (Zustand store structure, session ID generation)
- Terminal tab sub-row styling and active indicator design
- Exact auto-remove delay timing and animation for exited sessions
- Scroll indicator appearance for tab overflow

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TERM-01 | Each project has its own terminal session(s) isolated from other projects | Session store keyed by projectId; D-09 project-switch behavior preserves all sessions |
| TERM-02 | Terminal sessions are named and shown as tabs | Session metadata includes name; sub-tab row in drawer header per D-05 |
| TERM-03 | Clicking "Open AI" spawns a new named session instead of killing existing | OpenAiButton refactored to check for existing AI session (D-01), creates new session via store |
| TERM-04 | PTY processes properly cleaned up on session close (SIGKILL fallback) | SIGTERM + 3s timeout + SIGKILL pattern per D-12; tauri-pty `kill(signal)` API verified |
| TERM-05 | Terminal drawer shows session tabs for switching between active sessions | Sub-tab row component with horizontal scroll overflow per D-05/D-08 |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xterm/xterm | 6.0.0 | Terminal emulator in browser | Already in use, current version |
| @xterm/addon-fit | 0.11.0 | Auto-fit terminal to container | Already in use |
| @xterm/addon-webgl | 0.19.0 | GPU-accelerated rendering | Already in use |
| tauri-pty | 0.2.1 | PTY process spawning from Tauri | Already in use, provides `kill(signal)` |
| zustand | 5.0.11 (latest: 5.0.12) | State management | Already in use for workspace state |
| @tauri-apps/api | 2.10.1 | Window events for close_requested | Already installed |

### Supporting (No New Dependencies)
No new packages needed. The existing stack covers all requirements:
- `crypto.randomUUID()` for session IDs (already used in `aiSlice.ts`)
- Tauri window API for close_requested event handling (already installed)
- React refs for holding PTY/Terminal instances per session

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand session store | React Context | Zustand is project standard; Context would fight established patterns |
| crypto.randomUUID() | nanoid | randomUUID already used in codebase, no dependency needed |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  stores/
    useTerminalSessionStore.ts    # NEW: Multi-session state management
  hooks/
    useTerminal.ts                # REFACTOR: Extract session-aware instance creator
    useTerminalCleanup.ts         # NEW: App-quit and project-delete cleanup
  components/
    output/
      TerminalTab.tsx             # REFACTOR: Per-session terminal renderer
      TerminalSessionTabs.tsx     # NEW: Sub-tab row for session switching
      TerminalPane.tsx            # NEW: Container managing all sessions for active project
      DrawerHeader.tsx            # MODIFY: Render session sub-tabs when Terminal active
    center/
      OpenAiButton.tsx            # MODIFY: Session-aware AI launch
    sidebar/
      ProjectList.tsx             # MODIFY: Add running-session badge
```

### Pattern 1: Session Store (Zustand, session-only)

**What:** A dedicated Zustand store holding all terminal sessions keyed by project ID. Session state is NOT persisted (terminals don't survive app restart).

**When to use:** All terminal session CRUD operations.

**Example:**
```typescript
interface TerminalSession {
  id: string;                    // crypto.randomUUID()
  projectId: string;
  name: string;                  // "Phase 19: Multi-Terminal", "Dev Server", "Shell 1"
  type: "ai" | "shell";
  status: "running" | "exiting" | "exited";
  ptyRef: IPty | null;           // tauri-pty instance
  termRef: Terminal | null;      // xterm.js instance
  initialCommand?: { command: string; args: string[] } | null;
  createdAt: number;
}

interface TerminalSessionStore {
  // State
  sessions: Record<string, TerminalSession[]>;  // projectId -> sessions
  activeSessionId: Record<string, string | null>; // projectId -> active session ID

  // Actions
  createSession: (projectId: string, name: string, type: "ai" | "shell", initialCommand?: {...}) => string;
  closeSession: (sessionId: string) => void;     // SIGTERM -> wait -> SIGKILL
  switchSession: (projectId: string, sessionId: string) => void;
  getProjectSessions: (projectId: string) => TerminalSession[];
  getActiveSession: (projectId: string) => TerminalSession | null;
  findAiSession: (projectId: string) => TerminalSession | null;
  killAllProjectSessions: (projectId: string) => void;  // For D-11
  killAllSessions: () => void;  // For D-13 app quit

  // Refs (set by component after xterm/pty creation)
  attachRefs: (sessionId: string, ptyRef: IPty, termRef: Terminal) => void;
  markExiting: (sessionId: string) => void;
  removeSession: (sessionId: string) => void;
}
```

**Key design choice:** PTY and Terminal refs are stored in the Zustand store but NOT serialized. They are attached by the component after creation. This keeps the store as the single source of truth for session existence while React components own the DOM lifecycle.

### Pattern 2: Mount-All, Show-One Rendering

**What:** All terminal sessions for the current project are mounted in the DOM simultaneously, but only the active one is visible. This preserves scroll history and xterm.js state.

**When to use:** Terminal pane rendering.

**Example:**
```typescript
// TerminalPane.tsx
function TerminalPane({ projectId, isVisible }: Props) {
  const sessions = useTerminalSessionStore(s => s.getProjectSessions(projectId));
  const activeId = useTerminalSessionStore(s => s.activeSessionId[projectId]);

  return (
    <div className="h-full w-full relative">
      {sessions.map(session => (
        <div
          key={session.id}
          style={{ display: session.id === activeId ? "block" : "none" }}
          className="h-full w-full absolute inset-0"
        >
          <TerminalTab
            sessionId={session.id}
            cwd={directoryPath}
            isVisible={isVisible && session.id === activeId}
            initialCommand={session.initialCommand}
          />
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: Graceful PTY Shutdown

**What:** SIGTERM first, 3-second timeout, then SIGKILL. Used for individual close and bulk cleanup.

**When to use:** Tab close (D-06), project delete (D-11), app quit (D-13).

**Example:**
```typescript
async function gracefulKillPty(pty: IPty): Promise<void> {
  try {
    pty.kill("SIGTERM");
  } catch {
    return; // Already dead
  }

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      try {
        pty.kill("SIGKILL");
      } catch {
        // Already dead
      }
      resolve();
    }, 3000);

    // If process exits before timeout, clear it
    pty.onExit(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
```

**Note:** The tauri-pty `kill(signal?: string)` method accepts signal strings. Default is likely SIGTERM on Unix. Verified from the type definition: `kill(signal?: string): void`.

### Pattern 4: App Quit Cleanup (D-13)

**What:** Listen to Tauri's `close-requested` window event, run graceful shutdown on all sessions, then allow the window to close.

**Example:**
```typescript
// useTerminalCleanup.ts
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useTerminalCleanup() {
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.onCloseRequested(async (event) => {
      event.preventDefault();
      const store = useTerminalSessionStore.getState();
      await store.killAllSessions();  // SIGTERM/SIGKILL all PTYs
      await appWindow.destroy();      // Now actually close
    });

    return () => { unlisten.then(fn => fn()); };
  }, []);
}
```

### Anti-Patterns to Avoid
- **Storing xterm Terminal in React state:** Terminal is a mutable class instance with internal state. Store it as a ref, not in React state. Zustand store holds a reference, not a serializable snapshot.
- **Remounting xterm on tab switch:** Destroying and recreating Terminal instances loses scroll history and costs ~34MB allocation per instance. Use `display: none` to hide inactive terminals.
- **Relying on OS to clean up PTY processes:** macOS does not reliably SIGKILL orphaned PTY children on app crash. Explicit cleanup is required (D-13).
- **Using `terminalSessionKey` increment pattern:** The current kill/respawn approach must be fully replaced, not extended. It is fundamentally incompatible with multi-session.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Terminal emulation | Custom terminal parser | xterm.js (already used) | Years of escape sequence handling |
| PTY process management | Custom Rust PTY commands | tauri-pty `spawn`/`kill`/`resize` | Already handles platform differences |
| Session ID generation | Counter-based IDs | `crypto.randomUUID()` | Avoids collisions across project boundaries |
| Tab overflow scrolling | Custom scroll logic | CSS `overflow-x: auto` + scroll-snap | Browser handles smooth scrolling natively |

## Common Pitfalls

### Pitfall 1: xterm.js Memory Leaks on Dispose
**What goes wrong:** Terminal instances retain memory after dispose() if WebGL addon or event listeners are not cleaned up first.
**Why it happens:** WebGL contexts are a limited browser resource. xterm.js v6 has improved dispose() but addon cleanup order matters.
**How to avoid:** Dispose addons before the terminal: `webglAddon.dispose()` then `terminal.dispose()`. Null all refs after disposal.
**Warning signs:** Memory usage climbing after closing many sessions. Browser console warnings about too many WebGL contexts (limit is ~16).

### Pitfall 2: PTY Zombie Processes
**What goes wrong:** Closing a tab or the app leaves shell processes running.
**Why it happens:** `pty.kill()` sends SIGTERM to the PTY master, but the child shell may ignore it (especially if running a subprocess). Also, if the JS side crashes before cleanup runs, PTYs become orphans.
**How to avoid:** Always use the SIGTERM + 3s + SIGKILL pattern (D-12). Register cleanup on `onCloseRequested` for app quit (D-13). On `deleteProject`, call `killAllProjectSessions` before removing state.
**Warning signs:** `ps aux | grep zsh` shows extra shell processes after closing tabs.

### Pitfall 3: xterm.js Instance Cap and Memory
**What goes wrong:** Each xterm.js Terminal + WebGL instance uses ~34MB. With no session limit (D-03), a user could open 10+ sessions and consume >340MB.
**Why it happens:** STATE.md already flags this: "xterm.js memory growth with multiple terminals (~34MB per instance, dispose() leaks)".
**How to avoid:** While D-03 says no hard limit, the WebGL context limit (~16 across ALL browser contexts) is a hard ceiling. Consider falling back to canvas renderer for sessions beyond ~5 per project. At minimum, properly dispose closed sessions immediately.
**Warning signs:** Black terminal screens (WebGL context lost), high memory in Activity Monitor.

### Pitfall 4: Race Condition on Rapid Session Creation
**What goes wrong:** User clicks "Open AI" while a previous session is still initializing. Two AI sessions get created.
**Why it happens:** `createSession` is synchronous (store update) but PTY spawn is async. The `findAiSession` check may not see the in-progress session.
**How to avoid:** Set session in store synchronously (with status "initializing") before spawning PTY. The `findAiSession` check catches it immediately.
**Warning signs:** Duplicate AI sessions appearing for the same project.

### Pitfall 5: Fit/Resize When Hidden
**What goes wrong:** Terminal has zero dimensions when first rendered in a hidden container, producing a 0-col 0-row PTY.
**Why it happens:** `FitAddon.fit()` returns 0x0 when the container has `display: none`.
**How to avoid:** Only call `fit()` when the session becomes visible (the current `isVisible` pattern already handles this). Defer initial fit until first visibility.
**Warning signs:** Terminal content crammed into a single character column.

## Code Examples

### Existing Code to Refactor

**Current kill/respawn pattern (to be removed):**
```typescript
// useWorkspaceStore.ts - REMOVE these fields:
terminalSessionKey: number;
terminalInitialCommand: { command: string; args: string[] } | null;
launchTerminalCommand: (command: string, args: string[]) => void;
```

**Current OutputDrawer single-terminal rendering (to be replaced):**
```typescript
// OutputDrawer.tsx line 94-108 - REPLACE with TerminalPane
<TerminalTab
  key={`terminal-${selectedProjectId}-${directoryPath}-${terminalSessionKey}`}
  cwd={directoryPath}
  isVisible={activeDrawerTab === "terminal"}
  initialCommand={terminalInitialCommand}
/>
```

### OpenAiButton Session-Aware Launch Pattern
```typescript
// OpenAiButton.tsx - handleOpenAi refactored
const existingAiSession = useTerminalSessionStore.getState().findAiSession(projectId);
if (existingAiSession) {
  // D-01: Show refresh prompt
  const shouldRefresh = await showRefreshDialog();
  if (shouldRefresh) {
    await useTerminalSessionStore.getState().closeSession(existingAiSession.id);
    // Create new AI session (falls through to creation below)
  } else {
    // Switch to existing session
    useTerminalSessionStore.getState().switchSession(projectId, existingAiSession.id);
    return;
  }
}
// Create new AI session with descriptive name
const sessionName = buildAiSessionName(projectId); // e.g., "Phase 19: Multi-Terminal"
useTerminalSessionStore.getState().createSession(projectId, sessionName, "ai", { command, args: fullArgs });
```

### Project Delete Cleanup Hook Point
```typescript
// projectSlice.ts - deleteProject must be extended:
deleteProject: async (projectId) => {
  // Kill all terminal sessions for this project FIRST (D-11)
  useTerminalSessionStore.getState().killAllProjectSessions(projectId);
  await api.deleteProject(projectId);
  set((s) => ({
    projects: s.projects.filter((p) => p.id !== projectId),
    selectedProjectId: s.selectedProjectId === projectId ? null : s.selectedProjectId,
  }));
},
```

### Session Badge on Sidebar Projects (D-10)
```typescript
// ProjectList.tsx - badge addition
const sessionsForProject = useTerminalSessionStore(
  s => (s.sessions[project.id] || []).filter(s => s.status === "running").length
);
// In JSX:
{sessionsForProject > 0 && (
  <span className="size-1.5 rounded-full bg-green-500 ml-1 flex-shrink-0" />
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| xterm.js `destroy()` | xterm.js `dispose()` | xterm.js v4+ | dispose() is the correct cleanup method |
| Manual addon cleanup | Addons auto-dispose with terminal | xterm.js v5+ (improved in v6) | Still recommended to dispose WebGL addon explicitly |
| node-pty for Electron | tauri-pty for Tauri | tauri-pty 0.1.0 | Same API shape, Tauri-native IPC |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (via vite.config.ts) |
| Config file | vite.config.ts (`test` section) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TERM-01 | Sessions isolated per project | unit | `npx vitest run src/stores/useTerminalSessionStore.test.ts -t "project isolation" -x` | Wave 0 |
| TERM-02 | Sessions have names shown as tabs | unit | `npx vitest run src/stores/useTerminalSessionStore.test.ts -t "session name" -x` | Wave 0 |
| TERM-03 | Open AI creates new session, not kills existing | unit | `npx vitest run src/stores/useTerminalSessionStore.test.ts -t "ai session" -x` | Wave 0 |
| TERM-04 | PTY cleanup SIGTERM+SIGKILL | unit | `npx vitest run src/stores/useTerminalSessionStore.test.ts -t "graceful kill" -x` | Wave 0 |
| TERM-05 | Session tabs for switching | unit | `npx vitest run src/stores/useTerminalSessionStore.test.ts -t "switch session" -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/stores/useTerminalSessionStore.test.ts` -- covers TERM-01 through TERM-05 (store logic)
- [ ] Mock for `tauri-pty` spawn/kill in test environment (PTY cannot run in jsdom)
- [ ] Mock for `@xterm/xterm` Terminal class in test environment

## Open Questions

1. **Session naming for AI sessions (D-04)**
   - What we know: AI sessions should be named after the phase being worked on
   - What's unclear: How to determine the current phase name from the OpenAiButton context. The button has `projectId` but not phase info.
   - Recommendation: Use the project name + "AI" as default (e.g., "Element - AI"). If context file path is available, extract phase name from it. This is a minor UX detail that can be refined.

2. **WebGL context limit with many sessions**
   - What we know: Browsers limit WebGL contexts to ~16 total. Each xterm.js WebGL addon uses one.
   - What's unclear: Exact limit varies by browser/OS. Hidden terminals may release contexts.
   - Recommendation: Wrap WebGL addon creation in try/catch (already done). Fall back gracefully to canvas renderer. Log a console warning when approaching limit.

3. **Tauri onCloseRequested async behavior**
   - What we know: `event.preventDefault()` stops the window from closing. We need async cleanup.
   - What's unclear: Whether `await appWindow.destroy()` reliably closes after preventDefault.
   - Recommendation: Test this pattern early. Fallback: use `appWindow.close()` instead of `destroy()`.

## Sources

### Primary (HIGH confidence)
- tauri-pty type definitions (`node_modules/tauri-pty/dist/types/index.d.ts`) - IPty interface, kill(signal) API
- Existing codebase files (useTerminal.ts, OutputDrawer.tsx, useWorkspaceStore.ts) - current architecture
- @tauri-apps/api v2.10.1 - window event API

### Secondary (MEDIUM confidence)
- [xterm.js memory retention fixes PR #4185](https://github.com/xtermjs/xterm.js/pull/4185) - dispose improvements
- [xterm.js dispose() as trapdoor discussion](https://github.com/xtermjs/xterm.js/issues/3939) - lifecycle semantics
- [Tauri kill processes on close discussion](https://github.com/tauri-apps/tauri/discussions/5870) - app quit cleanup patterns
- [Tauri window API reference](https://v2.tauri.app/reference/javascript/api/namespacewindow/) - onCloseRequested

### Tertiary (LOW confidence)
- WebGL context limit (~16) is commonly cited but browser-specific; needs runtime validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and verified in codebase
- Architecture: HIGH - patterns derived from reading actual source code, well-understood domain
- Pitfalls: HIGH - xterm memory and PTY cleanup are well-documented; STATE.md already flagged the ~34MB concern

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable domain, no fast-moving dependencies)
