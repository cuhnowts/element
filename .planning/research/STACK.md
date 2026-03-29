# Stack Research

**Domain:** Desktop workflow orchestration -- multi-terminal, background execution, notifications
**Researched:** 2026-03-29
**Confidence:** HIGH

## Scope

This research covers ONLY new stack additions for v1.3. The existing stack (Tauri 2.x, React 19, SQLite, Zustand, shadcn/ui, Tailwind, xterm.js, tauri-plugin-pty, tokio, notify) is validated and not re-evaluated.

## Recommended Stack Additions

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| tauri-plugin-notification | 2 (latest ~2.3.3) | OS-native desktop notifications | Official Tauri plugin. Covers macOS/Windows/Linux. Builder pattern on Rust side, JS API for frontend-triggered notifications. Already in the Tauri plugin ecosystem so zero friction to add. |
| tokio::sync::mpsc | (bundled with tokio 1.x) | Background orchestrator communication | Already available via `tokio = { features = ["full"] }` in Cargo.toml. Standard pattern for async task control: send commands to background loop, receive status updates. No new dependency. |
| tokio_util::sync::CancellationToken | (bundled with tokio-util) | Graceful shutdown of background orchestrator | Clean cancellation of long-running tokio::spawn tasks. Drop the token to signal all listeners. Better than ad-hoc booleans. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tokio-util | 0.7 | CancellationToken for background task lifecycle | Add to Cargo.toml. Use for orchestrator start/stop/restart. Lightweight, maintained by tokio team. |
| sonner | 2.0.7 (already installed) | In-app toast notifications | Already in package.json. Use for non-critical in-app alerts (task completed, phase advanced). Pairs with OS notifications for critical items. |

### No New Frontend Dependencies Needed

The following features can be built with existing dependencies:

| Feature | Built With | Already Available |
|---------|-----------|-------------------|
| Multi-terminal tabs | `tauri-pty` 0.2.1 + `@xterm/xterm` 6.0 + Zustand | Yes -- `spawn()` returns independent `IPty` instances with `kill()`, `resize()`, `onData`, `onExit` |
| Collapsible sidebar sections | shadcn/ui Collapsible or manual with Tailwind transitions | Yes -- `@radix-ui/react-collapsible` ships with shadcn/ui |
| Simplified task view | shadcn/ui existing primitives | Yes |
| Session tabs UI | Existing Tailwind + lucide-react icons | Yes |
| Background task status | Zustand store + Tauri event listener | Yes -- `@tauri-apps/api` event system |

## Architecture Decisions for New Features

### 1. Multi-Terminal PTY Management

**Approach:** Frontend-managed session map in Zustand, one `spawn()` call per tab.

The existing `useTerminal` hook creates a single PTY session tied to a React effect lifecycle. For multi-terminal:

- **Session store (Zustand):** Map of `sessionId -> { name, projectId, cwd, status, ptyRef }`. Each project gets its own namespace.
- **Per-tab component:** Each tab mounts its own `<TerminalInstance>` with a dedicated `containerRef` and `IPty`. The `IPty` reference is owned by the component, not the store (DOM refs cannot live in Zustand).
- **Tab lifecycle:** Create tab = `spawn()` new PTY. Close tab = `pty.kill()` + `term.dispose()`. Switch tab = hide/show containers (keep PTY alive in background).
- **Session key pattern:** `{projectId}:{sessionName}` -- enables per-project terminal isolation.

**Why not a Rust-side PTY manager?** `tauri-plugin-pty` already manages PTY processes on the Rust side. The JS `spawn()` function communicates with the Rust plugin via Tauri's IPC. Adding another Rust layer would duplicate what the plugin already does. Keep session orchestration in the frontend.

**Verified API surface** (from `tauri-pty` 0.2.1 type definitions):
- `spawn(file, args, options)` -- returns `IPty` with `pid`, `cols`, `rows`
- `IPty.kill(signal?)` -- terminate the session
- `IPty.resize(cols, rows)` -- resize individual session
- `IPty.onData` / `IPty.onExit` -- per-session event listeners
- `IPty.write(data)` -- write to individual session

Multiple `spawn()` calls create fully independent sessions. No shared state or conflicts.

### 2. Background AI Orchestrator (Rust Side)

**Approach:** Single `tokio::spawn` loop in Rust, controlled via `mpsc` channels, communicates to frontend via Tauri events.

```
Frontend                    Rust Backend
   |                            |
   |-- invoke "start_orchestrator" -->  spawns tokio task
   |                            |       loop {
   |<-- event "orchestrator:status" --    poll project state
   |<-- event "orchestrator:action" --    determine next action
   |                            |         if auto-executable: spawn CLI
   |<-- event "orchestrator:notify" --    if human-needed: emit notification
   |                            |         sleep(interval)
   |-- invoke "stop_orchestrator" -->   cancel via CancellationToken
   |                            |       }
```

**Key components:**
- **OrchestratorState** managed in Tauri app state: `Arc<tokio::sync::Mutex<Option<OrchestratorHandle>>>`
- **OrchestratorHandle** holds: `CancellationToken`, `mpsc::Sender<OrchestratorCommand>`
- **OrchestratorCommand** enum: `Start { project_id }`, `Stop`, `Pause`, `SetInterval(Duration)`
- **Poll loop:** Read project phases/tasks from DB, determine if current phase has actionable work, check if it requires human input or can auto-execute

**Why tokio::spawn, not std::thread?** The app already uses tokio throughout (scheduler, calendar sync, workflow execution). Staying in the async runtime avoids thread-pool bloat and integrates naturally with existing `Arc<Mutex<Database>>` access patterns. The orchestrator is I/O-bound (DB reads, process spawning), not CPU-bound.

**CLI execution:** Use `tokio::process::Command` to spawn the configured CLI tool (e.g., `claude`). Capture stdout/stderr via piped streams. Emit progress events to frontend. This is separate from the PTY terminals -- orchestrator-spawned processes are headless/background, not interactive.

### 3. Notification System (Dual-Layer)

**Approach:** Two notification channels serving different purposes.

| Channel | Technology | When Used | Example |
|---------|-----------|-----------|---------|
| In-app toast | sonner (already installed) | Non-critical, app-focused | "Phase 3 auto-completed", "Terminal exited" |
| OS notification | tauri-plugin-notification | Human attention needed, app may be in background | "Phase 4 blocked -- needs manual review", "Orchestrator error" |

**Rust-side notification:** The orchestrator emits Tauri events. A thin Tauri command or the orchestrator itself calls `app.notification().builder().title(...).body(...).show()` for critical items. No frontend involvement needed for OS notifications from background tasks.

**Frontend notification:** sonner's `toast()` function for in-app feedback. Already wired (package installed). Listen to Tauri events and translate to toasts where appropriate.

**Permission handling:** `tauri-plugin-notification` requires permission on macOS. Call `isPermissionGranted()` at app startup; if not granted, call `requestPermission()`. Fall back to in-app-only if denied.

### 4. UI Polish (No New Dependencies)

All UI improvements use existing stack:

- **Collapsible sidebar:** Radix Collapsible primitive (ships with shadcn/ui) or a simple `useState` + CSS `max-height` transition. Radix is cleaner for accessibility.
- **Simplified task view:** Existing shadcn/ui Card, Badge, and layout primitives.
- **Smart AI button labels:** Zustand state + conditional rendering. No new deps.
- **Terminal defaults:** Configuration stored in SQLite via existing `app_settings` table.

## Installation

```bash
# Rust -- add to src-tauri/Cargo.toml [dependencies]
# tauri-plugin-notification = "2"
# tokio-util = { version = "0.7", features = ["rt"] }

# Frontend -- add to package.json
npm install @tauri-apps/plugin-notification
```

```json
// src-tauri/capabilities/default.json -- add to permissions array:
// "notification:default"
```

```rust
// src-tauri/src/lib.rs -- add plugin registration:
// .plugin(tauri_plugin_notification::init())
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| tauri-plugin-notification (official) | tauri-plugin-notifications (community, 0.4.3) | Only if you need push notifications via FCM/APNs on mobile. Element is desktop-only, so the official plugin is simpler and better maintained. |
| tokio mpsc + CancellationToken | crossbeam channels + Arc<AtomicBool> | Only if leaving the async runtime. Element is fully async/tokio, so staying in-ecosystem is cleaner. |
| Frontend-managed PTY sessions | Custom Rust-side PTY manager | Only if you need PTY sessions that survive frontend reloads. Element's terminals are ephemeral per-project, so frontend management is simpler. |
| sonner (in-app toasts) | react-hot-toast, react-toastify | No reason to switch. sonner is already installed, well-maintained (2.0.7), and has the best API for shadcn/ui integration. |
| No React terminal wrapper lib | react-xtermjs, xterm-react | Element already has a working custom hook (`useTerminal`). Adding a wrapper library would conflict with the existing PTY integration pattern. Extend the hook instead. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-xtermjs / xterm-react | Adds abstraction layer over xterm.js that conflicts with direct `tauri-pty` spawn() integration. Element already has `useTerminal` hook that works. | Extend existing `useTerminal` hook to support session IDs |
| tauri-plugin-shell for orchestrator | Shell plugin is for simple command execution, not long-running monitored processes. No stdout streaming, no cancellation. | `tokio::process::Command` with piped stdout/stderr in the orchestrator loop |
| Electron-style IPC for orchestrator | Tauri events are lighter weight and already used throughout the app. Don't invent a custom message bus. | `app.emit()` / `app.listen()` Tauri event system |
| std::process::Command | Blocks the thread. The orchestrator needs async. | `tokio::process::Command` for async process spawning |
| Separate notification micro-service | Over-engineering for a desktop app. | Direct tauri-plugin-notification calls from the orchestrator |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| tauri-plugin-notification 2.x | tauri ~2.10 | Must match Tauri 2.x major version. The `"2"` version spec in Cargo.toml auto-resolves. |
| tokio-util 0.7 | tokio 1.x | Direct compatibility. tokio-util tracks tokio major versions. |
| @tauri-apps/plugin-notification (npm) | @tauri-apps/api ^2.10.1 | Must match the Tauri API version already in package.json. |
| @xterm/xterm 6.0 | tauri-pty 0.2.1 | Already working together in current codebase. No changes needed. |

## Sources

- [Tauri Notification Plugin docs](https://v2.tauri.app/plugin/notification/) -- installation, API, permissions (HIGH confidence)
- [tauri-plugin-pty GitHub](https://github.com/Tnze/tauri-plugin-pty) -- plugin capabilities (HIGH confidence)
- `tauri-pty` 0.2.1 TypeScript definitions (`node_modules/tauri-pty/dist/types/index.d.ts`) -- verified IPty API: spawn, kill, resize, onData, onExit (HIGH confidence)
- [Long-running async tasks in Tauri v2](https://sneakycrow.dev/blog/2024-05-12-running-async-tasks-in-tauri-v2) -- spawn + event pattern (MEDIUM confidence)
- [Tauri async_runtime docs](https://docs.rs/tauri/latest/tauri/async_runtime/index.html) -- official Tauri async patterns (HIGH confidence)
- Existing codebase: `src/hooks/useTerminal.ts`, `src-tauri/src/lib.rs`, `Cargo.toml`, `package.json` -- current integration points (HIGH confidence)

---
*Stack research for: Element v1.3 Foundation & Execution*
*Researched: 2026-03-29*
