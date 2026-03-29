# Architecture Research

**Domain:** Multi-terminal sessions, background execution orchestrator, and notification system for Tauri 2.x desktop app
**Researched:** 2026-03-29
**Confidence:** HIGH

## System Overview

```
+---------------------------------------------------------------+
|                     React 19 Frontend                         |
|  +-------------+  +------------------+  +------------------+  |
|  | TerminalMgr |  | NotificationTray |  | OrchestratorUI   |  |
|  | (tab bar +  |  | (toast + badge)  |  | (status, pause,  |  |
|  |  N xterm.js)|  |                  |  |  approve)         |  |
|  +------+------+  +--------+---------+  +--------+---------+  |
|         |                  |                      |            |
+---------|------------------|----------------------|------------+
          | spawn/write/kill | listen events        | invoke cmds
+---------|------------------|----------------------|------------+
|         v                  v                      v            |
|  +------+------+  +-------+--------+  +-----------+--------+  |
|  | tauri-pty   |  | Tauri Emitter  |  | Tauri Commands     |  |
|  | (N spawns)  |  | (event bus)    |  | (orchestrator_*)   |  |
|  +-------------+  +-------+--------+  +-----------+--------+  |
|                            |                      |            |
|                    +-------+----------------------+-------+    |
|                    |       Orchestrator Daemon             |    |
|                    |  (tokio::spawn, runs in app setup)   |    |
|                    |  - poll loop on interval              |    |
|                    |  - reads project/phase/task state     |    |
|                    |  - spawns CLI tools via Command       |    |
|                    |  - emits events for UI updates        |    |
|                    +------------------+-------------------+    |
|                                       |                        |
|                    +------------------+-------------------+    |
|                    |     Arc<Mutex<Database>> (SQLite)     |    |
|                    +--------------------------------------+    |
|                         Rust Backend (Tauri 2.x)               |
+---------------------------------------------------------------+
```

## Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|----------------|-----------------|
| `TerminalSessionStore` (Zustand) | Track N terminal sessions per project: id, name, PTY ref, alive status | **NEW** slice in `useWorkspaceStore` |
| `TerminalTabBar` | Render tab bar above terminal area, add/close/rename sessions | **NEW** component |
| `TerminalPane` | Render active xterm.js, keep others mounted but hidden (preserve scrollback) | **MODIFIED** from `TerminalTab` |
| `useTerminalSession` | Manage single PTY lifecycle, extracted from `useTerminal` with session ID tracking | **MODIFIED** from `useTerminal` |
| `OutputDrawer` | Host terminal tab bar + pane instead of single TerminalTab | **MODIFIED** |
| `Orchestrator` (Rust) | Background daemon: poll project state, invoke AI CLI, track execution runs | **NEW** module `src-tauri/src/orchestrator/` |
| `OrchestratorCommands` | Tauri commands: start/stop/pause orchestrator, approve human-needed items | **NEW** command module |
| `NotificationBridge` | Dual-mode: native OS notifications (tauri-plugin-notification) + in-app toast | **NEW** Rust + React |
| `NotificationTray` (React) | In-app notification center: badge count, dropdown list, action buttons | **NEW** component |

## Recommended Architecture

### 1. Multi-Terminal Sessions

**Approach: React-side session management with direct `tauri-pty` spawn calls.**

The current `useTerminal` hook calls `spawn()` from `tauri-pty` directly in the React layer. Each call creates an independent PTY process on the Rust side. There is no need for a Rust-side "PTY pool" because:

- `tauri-plugin-pty` already manages PTY lifecycle per spawn call
- The frontend needs to own the xterm.js <-> PTY data binding (bidirectional `onData`)
- Session metadata (name, project, CWD) is UI-level state, not backend state
- A Rust pool would add IPC overhead for every keystroke (PTY data flows through Tauri events rather than direct binding)

**Session model:**

```typescript
interface TerminalSession {
  id: string;              // uuid
  projectId: string;       // scoped to project
  name: string;            // user-editable, default "Terminal 1"
  cwd: string;             // project directory
  createdAt: number;       // for ordering
  initialCommand?: { command: string; args: string[] } | null;
}
```

**State management:** Add a `terminalSessions` map to `useWorkspaceStore`, keyed by `projectId -> TerminalSession[]`. The active session ID per project is tracked separately. This replaces the current single `terminalSessionKey` / `terminalInitialCommand` pattern.

**xterm.js instance management:** Mount all sessions for the current project but only show the active one via CSS `display: none/block` (same pattern already used for drawer tabs in `OutputDrawer`). This preserves scrollback and PTY state when switching tabs. Unmount sessions only on explicit close or project switch.

**Key change from current architecture:** The `launchTerminalCommand` action currently kills the previous terminal by incrementing `terminalSessionKey` (which changes the React key, causing unmount/remount). The new architecture spawns a NEW session instead, leaving existing ones alive. The "Open AI" button creates a new session named after the AI tool rather than destroying the current one.

### 2. Background Execution Orchestrator

**Approach: Rust-side tokio daemon spawned in `app.setup()`, communicating via Tauri events.**

The orchestrator runs as a long-lived tokio task, similar to the existing `init_scheduler` pattern. Frontend polling is wrong here because:

- The orchestrator needs to run even when no frontend window is focused
- It must invoke CLI tools (`tokio::process::Command`) which requires async Rust
- It shares the `Arc<Mutex<Database>>` for reading project/phase/task state
- Tauri events push updates to the frontend without polling overhead

**Orchestrator state machine:**

```
IDLE -> CHECKING -> EXECUTING -> WAITING_HUMAN -> IDLE
         |                          |
         +-- nothing to do ---------+-- user approves --> EXECUTING
```

**Core loop (simplified):**

```rust
pub async fn orchestrator_loop(app: AppHandle) {
    let mut interval = tokio::time::interval(Duration::from_secs(30));
    loop {
        interval.tick().await;

        // Check if orchestrator is enabled (user can pause)
        if !is_enabled(&app) { continue; }

        // Read project states from DB
        let projects = get_actionable_projects(&app);

        for project in projects {
            // Determine next action for project
            match determine_next_action(&app, &project) {
                Action::AutoExecute(phase, task) => {
                    // Spawn CLI tool (e.g., claude) in background
                    let result = execute_task(&app, &project, &phase, &task).await;
                    // Record result, emit event
                    app.emit("orchestrator:task-complete", &result);
                }
                Action::NeedsHuman(phase, task, reason) => {
                    // Emit notification, don't execute
                    app.emit("orchestrator:needs-human", &HumanNeeded {
                        project_id: project.id,
                        task_id: task.id,
                        reason,
                    });
                }
                Action::None => {}
            }
        }
    }
}
```

**Database interaction:** The orchestrator accesses the same `Arc<Mutex<Database>>` managed by Tauri state. Lock contention is minimal because:
- The orchestrator polls every 30s (not continuous)
- DB reads are fast (SQLite local file)
- Writes are infrequent (only on status changes)
- The existing codebase already uses this pattern successfully in `scheduler.rs`

**CLI tool execution:** Use `tokio::process::Command` (same as `cli_commands.rs`) to invoke the configured AI CLI tool. Stream stdout/stderr via Tauri events for optional live monitoring. Record execution results in the existing `execution_records` / `execution_logs` tables.

**New DB tables needed:**

```sql
CREATE TABLE orchestrator_runs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    phase_id TEXT REFERENCES phases(id),
    task_id TEXT REFERENCES tasks(id),
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, complete, failed, needs_human
    started_at TEXT,
    completed_at TEXT,
    output_summary TEXT,
    error_message TEXT,
    human_reason TEXT  -- why human input is needed
);

CREATE TABLE orchestrator_config (
    project_id TEXT PRIMARY KEY REFERENCES projects(id),
    enabled INTEGER NOT NULL DEFAULT 0,
    auto_execute INTEGER NOT NULL DEFAULT 0,  -- 0=notify only, 1=auto-execute
    poll_interval_secs INTEGER NOT NULL DEFAULT 30,
    cli_tool TEXT,  -- override per-project CLI tool
    last_check_at TEXT
);
```

### 3. Notification Architecture

**Approach: Dual-layer -- native OS notifications for background alerts, in-app toast for foreground actions.**

Use `tauri-plugin-notification` for native OS toast notifications (works on macOS and Windows). These fire when the app is backgrounded or the user is in a different part of the UI. Use an in-app toast system (React component) for transient feedback when the user is actively looking at the app.

**When to use which:**

| Scenario | Channel | Why |
|----------|---------|-----|
| Orchestrator needs human input | Native OS + in-app badge | User might not be looking at Element |
| Task auto-completed | In-app toast only | Informational, not urgent |
| Orchestrator error/failure | Native OS + in-app toast | Needs attention |
| Terminal session exited | In-app toast only | Already in the app context |
| Background sync complete | In-app badge update only | No interruption needed |

**In-app notification center:**

```typescript
interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'action';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionPayload?: {
    type: 'approve-task' | 'view-project' | 'view-terminal';
    projectId?: string;
    taskId?: string;
    sessionId?: string;
  };
}
```

**React-side:** Add a `notificationSlice` to the main Zustand store. Listen for Tauri events (`orchestrator:needs-human`, `orchestrator:task-complete`, `orchestrator:error`) and push to the notification list. Render a bell icon with badge count in the app header. Toast component uses shadcn/ui's `Sonner` (already a shadcn component, likely available).

**Rust-side:** The orchestrator calls `app.notification().builder().title(...).body(...).show()` for native notifications via `tauri-plugin-notification`. This requires adding the plugin dependency.

## Data Flow

### Multi-Terminal Data Flow

```
User types in xterm.js
    |
    v
term.onData(data) --> pty.write(data) --> PTY process (zsh)
                                              |
                                              v
                                    pty.onData(output)
                                              |
                                              v
                                    term.write(output) --> xterm.js renders
```

Each session has its own independent `Terminal` + `PTY` pair. No data crosses between sessions. The React component manages which session is visible.

### Orchestrator Data Flow

```
orchestrator_loop (every 30s)
    |
    v
Arc<Mutex<Database>>.lock() --> read projects, phases, tasks
    |
    v
determine_next_action() --> Action::AutoExecute | Action::NeedsHuman | Action::None
    |                                |
    v                                v
tokio::process::Command         app.emit("orchestrator:needs-human")
  (run AI CLI tool)                  |
    |                                v
    v                        Frontend listener --> notificationSlice --> toast + badge
app.emit("orchestrator:task-complete")       native notification via tauri-plugin-notification
    |
    v
Update task/phase status in DB
    |
    v
app.emit("project-updated") --> Frontend refetches project state
```

### Notification Data Flow

```
Rust event emitter
    |
    +-- "orchestrator:needs-human" --> NotificationBridge
    +-- "orchestrator:task-complete"       |
    +-- "orchestrator:error"               v
                                    +------+------+
                                    | In-app toast |  (if window focused)
                                    | OS native    |  (if needs-human or error)
                                    | Badge count  |  (always increment)
                                    +-------------+
```

## Architectural Patterns

### Pattern 1: Hidden-Mount Terminal Multiplexing

**What:** Mount all terminal sessions for the active project simultaneously, hide inactive ones with CSS `display: none`.
**When to use:** When you need instant tab switching without PTY restart or scrollback loss.
**Trade-offs:** Uses more memory (each xterm.js + WebGL context stays alive), but terminals are lightweight (~2-5MB each). Acceptable for 3-8 concurrent sessions.

**Example:**
```typescript
// In the terminal pane area of OutputDrawer
{sessions.map((session) => (
  <div
    key={session.id}
    style={{ display: session.id === activeSessionId ? 'block' : 'none' }}
    className="h-full"
  >
    <TerminalPane session={session} isVisible={session.id === activeSessionId} />
  </div>
))}
```

### Pattern 2: Event-Driven Orchestrator with Manual Gating

**What:** Background daemon auto-executes tasks but pauses at "human-needed" boundaries, emitting events for approval.
**When to use:** When you want automation with human oversight -- not fully autonomous.
**Trade-offs:** More complex than pure automation or pure manual, but matches the product vision ("orchestrates, external tools execute"). The manual gate prevents runaway AI execution.

### Pattern 3: Dual-Channel Notifications

**What:** Route notifications through both native OS and in-app channels based on urgency and app focus state.
**When to use:** Desktop apps where the user may not be looking at the window.
**Trade-offs:** Requires two notification systems, but each is simple. Native notifications are ~20 lines of Rust. In-app toasts are a standard React pattern.

## Anti-Patterns

### Anti-Pattern 1: Rust-Side PTY Pool with IPC Bridging

**What people do:** Create a PTY manager in Rust that pools sessions, then bridge all terminal I/O through Tauri IPC commands/events.
**Why it's wrong:** Every keystroke becomes an IPC roundtrip. The existing `tauri-plugin-pty` already provides direct JS-to-PTY binding via its `spawn` API, bypassing Tauri's command system for data flow. A Rust pool adds latency and complexity for no benefit.
**Do this instead:** Let React own session lifecycle. Call `spawn()` directly from the hook. Track sessions in Zustand.

### Anti-Pattern 2: Frontend Polling for Orchestrator State

**What people do:** Use `setInterval` in React to poll a Tauri command for orchestrator updates.
**Why it's wrong:** Wasteful, introduces latency (poll interval), and the orchestrator may need to notify even when no component is polling.
**Do this instead:** Orchestrator pushes updates via `app.emit()`. Frontend subscribes with `listen()`. This is the established Tauri pattern already used for workflow events.

### Anti-Pattern 3: Single Global Terminal Session

**What people do:** Keep the current single-terminal architecture and "reset" it when switching projects.
**Why it's wrong:** Kills running processes (AI sessions), loses scrollback, forces users to restart context. The current `terminalSessionKey` increment pattern is explicitly identified as tech debt (backlog 999.6).
**Do this instead:** Per-project session arrays with independent PTY lifecycles.

### Anti-Pattern 4: Orchestrator Directly Modifying Frontend State

**What people do:** Have the orchestrator call Tauri commands that directly mutate Zustand stores.
**Why it's wrong:** Tauri commands are invoked by the frontend, not the backend. The backend can only communicate via events.
**Do this instead:** Orchestrator emits events. Frontend event listeners update Zustand stores. This maintains the unidirectional data flow.

## Integration Points

### New Dependencies Required

| Dependency | Type | Purpose |
|------------|------|---------|
| `tauri-plugin-notification` | Rust + JS | Native OS toast notifications |
| `sonner` (via shadcn/ui) | JS | In-app toast component |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Orchestrator -> Frontend | Tauri events (`app.emit`) | `orchestrator:*` event namespace |
| Frontend -> Orchestrator | Tauri commands (`orchestrator_start`, `orchestrator_pause`, `orchestrator_approve`) | Standard invoke pattern |
| Orchestrator -> Database | `Arc<Mutex<Database>>` (shared) | Same pattern as existing scheduler |
| Orchestrator -> CLI tools | `tokio::process::Command` | Same pattern as `cli_commands.rs` |
| Terminal sessions -> PTY | Direct `tauri-pty` spawn | No IPC, direct JS binding |
| Notification Rust -> OS | `tauri-plugin-notification` | Native toast API |
| Notification React -> UI | Zustand `notificationSlice` | Event listener populates store |

### Modified Existing Components

| Component | Current | Change |
|-----------|---------|--------|
| `useTerminal.ts` | Single PTY hook | Refactor to `useTerminalSession(sessionId, ...)` -- accept session config instead of raw CWD |
| `TerminalTab.tsx` | Single terminal renderer | Split into `TerminalTabBar` (tab management) + `TerminalPane` (single session renderer) |
| `OutputDrawer.tsx` | Renders single `TerminalTab` | Renders `TerminalTabBar` + N `TerminalPane` instances, manages active session |
| `useWorkspaceStore.ts` | `terminalSessionKey` + `terminalInitialCommand` | Replace with `terminalSessions: Record<string, TerminalSession[]>`, `activeTerminalSession: Record<string, string>` |
| `DrawerHeader.tsx` | Static "Terminal" tab button | Add session count badge to terminal tab |
| `lib.rs` | No orchestrator setup | Add orchestrator spawn in `setup()`, add `tauri-plugin-notification` |
| `commands/mod.rs` | No orchestrator commands | Add `orchestrator_commands` module |

### New Files

| File | Purpose |
|------|---------|
| `src-tauri/src/orchestrator/mod.rs` | Orchestrator module root |
| `src-tauri/src/orchestrator/daemon.rs` | Main loop, state machine, polling logic |
| `src-tauri/src/orchestrator/actions.rs` | Action determination logic (what to execute next) |
| `src-tauri/src/orchestrator/executor.rs` | CLI tool invocation, output capture |
| `src-tauri/src/commands/orchestrator_commands.rs` | Tauri commands for orchestrator control |
| `src/components/output/TerminalTabBar.tsx` | Tab bar for terminal sessions |
| `src/components/output/TerminalPane.tsx` | Single terminal session renderer (refactored from TerminalTab) |
| `src/components/notifications/NotificationTray.tsx` | Bell icon + dropdown notification list |
| `src/components/notifications/ToastProvider.tsx` | Sonner/toast wrapper with Tauri event listeners |
| `src/stores/notificationSlice.ts` | Notification state and actions |

## Build Order (Dependency-Aware)

The following order respects technical dependencies -- each phase can be shipped and tested independently.

### Phase 1: Multi-Terminal Sessions

**Why first:** No backend changes needed. Pure frontend refactor. Unblocks "Open AI" creating sessions without killing existing ones. Resolves backlog 999.6.

1. Add `TerminalSession` type and session management to `useWorkspaceStore`
2. Refactor `useTerminal` -> `useTerminalSession` (accept session config)
3. Build `TerminalTabBar` component (add/close/rename tabs)
4. Build `TerminalPane` component (from existing `TerminalTab`)
5. Update `OutputDrawer` to render tab bar + N panes
6. Update `launchTerminalCommand` to create new session instead of kill/respawn
7. Update per-project state save/restore to include terminal sessions

### Phase 2: Notification System

**Why second:** Needed by the orchestrator (Phase 3) but also useful standalone for existing workflow events.

1. Add `tauri-plugin-notification` to Rust dependencies and `lib.rs` plugin registration
2. Add `sonner` toast component (via shadcn/ui)
3. Create `notificationSlice` in Zustand store
4. Build `NotificationTray` component (bell + dropdown)
5. Build `ToastProvider` that listens to Tauri events and shows toasts
6. Wire existing workflow events (`workflow-run-completed`, `workflow-step-failed`) through notification system

### Phase 3: Execution Orchestrator MVP

**Why third:** Depends on notification system for alerting. Most complex piece, benefits from Phases 1-2 being stable.

1. Create `orchestrator` Rust module with daemon loop
2. Add `orchestrator_runs` and `orchestrator_config` DB tables (migration)
3. Implement `determine_next_action` logic (read project/phase/task state)
4. Implement CLI tool execution via `tokio::process::Command`
5. Add orchestrator Tauri commands (start/stop/pause/approve)
6. Wire orchestrator events to notification system
7. Build minimal orchestrator UI (enable/disable toggle, status indicator)
8. Add "needs human" approval flow (notification action -> approve command)

## Scaling Considerations

| Concern | At 1-3 projects | At 10+ projects | Mitigation |
|---------|-----------------|-----------------|------------|
| Terminal memory | ~10-30MB (3-9 sessions) | ~50-100MB | Cap at 5 sessions per project, warn on more |
| Orchestrator DB reads | Negligible | ~10 queries/30s | Batch queries, read all actionable state in one pass |
| PTY processes | 3-9 OS processes | 10-30 processes | Auto-close idle sessions after configurable timeout |
| Notification volume | Low | Could flood | Rate-limit notifications, batch similar events |

## Sources

- [tauri-plugin-pty GitHub](https://github.com/Tnze/tauri-plugin-pty) -- PTY spawn API, direct JS binding
- [Tauri Notification Plugin](https://v2.tauri.app/plugin/notification/) -- native OS notification API
- [Tauri Event System](https://v2.tauri.app/develop/calling-rust/#event-system) -- backend-to-frontend communication
- Existing codebase: `engine/scheduler.rs` (tokio daemon pattern), `engine/executor.rs` (pipeline execution), `cli_commands.rs` (CLI tool invocation), `useTerminal.ts` (current PTY integration)

---
*Architecture research for: Element v1.3 Foundation & Execution*
*Researched: 2026-03-29*
