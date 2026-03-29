# Project Research Summary

**Project:** Element v1.3 — Foundation & Execution
**Domain:** Tauri 2.x desktop app — multi-terminal, background AI orchestration, contextual UI
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

Element v1.3 is a Tauri 2.x desktop project-management app that needs to evolve from a single-terminal, manual-AI-launch tool into a multi-terminal workspace with a background AI orchestrator. The research confirms that the existing stack (Tauri 2.x, React 19, SQLite, Zustand, xterm.js, tauri-plugin-pty, tokio) requires minimal net-new dependencies: only `tauri-plugin-notification` (for OS-native alerts) and `tokio-util` (for `CancellationToken`) need to be added. All terminal, UI, and execution features can be built on what is already installed. The recommended approach is a layered build order: fix tech debt and existing state-management bugs first, add multi-terminal sessions second, wire in the notification system third, and build the background orchestrator last — because every later phase depends on the earlier ones being stable.

The core architectural pattern is React-managed terminal sessions (via a Zustand `terminalSessions` store keyed by project ID) combined with a Rust-side tokio daemon that polls project state and communicates exclusively through Tauri events. The "Open AI" button becomes a state-machine-driven action surface that reflects the full project lifecycle (`NO_DIRECTORY` → `NO_PLAN` → `READY` → `AI_RUNNING` → `NEEDS_ATTENTION` → `ALL_COMPLETE`). This is the primary UX differentiator — one button that always shows the right next action.

The most critical risk is the existing "Open AI" navigation bug (state race in `launchTerminalCommand` / `restoreProjectState`) which will be amplified by every multi-terminal state transition added later. This must be resolved before multi-terminal work begins. The second major risk is runaway AI execution cost: the orchestrator MVP must ship in "suggest and approve" (dry-run) mode before enabling autonomous execution. Treat cost controls as a launch blocker, not a nice-to-have.

## Key Findings

### Recommended Stack

The existing stack is validated and unchanged. Two small additions unlock all v1.3 features: `tauri-plugin-notification = "2"` in Cargo.toml (plus `@tauri-apps/plugin-notification` npm package) for OS-native toasts, and `tokio-util = "0.7"` for `CancellationToken` to cleanly shut down the orchestrator daemon. `sonner` for in-app toasts is already installed at 2.0.7. All terminal, sidebar, and UI features build on existing shadcn/ui primitives, Zustand, and the verified `tauri-pty` 0.2.1 API (`spawn`, `kill`, `resize`, `onData`, `onExit`, `write`).

**Core technologies:**
- `tauri-plugin-notification 2.x`: OS-native desktop notifications — official Tauri plugin, zero friction, covers macOS/Windows/Linux
- `tokio::sync::mpsc` + `CancellationToken`: background orchestrator lifecycle control — already available via `tokio = { features = ["full"] }`, no new async runtime needed
- `tauri-pty 0.2.1` (existing): multi-terminal sessions — each `spawn()` call creates a fully independent PTY; no Rust-side pool needed
- `sonner 2.0.7` (existing): in-app toasts for non-critical informational notifications

### Expected Features

Research confirms a clear P1/P2/P3 split. The foundational dependency is the `TerminalSession` store refactor — everything else (named AI sessions, background orchestrator, contextual button) builds on it.

**Must have for v1.3 (P1):**
- Direct project-click navigation (single-click navigates, right-click = context menu) — most basic UI convention, currently violated
- Collapsible sidebar sections with chevron toggle — standard pattern, currently non-standard slider
- Simplified task detail view (progressive disclosure) — reduces cognitive overload
- Smart AI button with full 7-state machine — primary UX differentiator
- Multi-terminal tabs with per-project session registry — foundational for everything else
- Named AI session terminals (Bot icon, distinct from manual shells) — users need to know which tab the AI is in
- Kill/respawn per tab + tab naming — every terminal app expects this
- Terminal as default drawer tab — it is the primary workspace tool
- Basic notification system (OS + in-app) — required by orchestrator
- Background orchestrator MVP in approve-only mode — core product value proposition

**Should have for v1.3.x (P2):**
- Risk-tiered auto-execution (once orchestrator is stable)
- Execution progress drawer tab (richer agent visibility)
- Notification badges on sidebar projects
- Session persistence across project switches (hidden DOM approach)

**Defer to v2+ (P3):**
- Launch configurations / saved terminal presets (Warp-style)
- Autonomy slider (user calibrates AI autonomy level)
- Inter-agent coordination (multiple parallel AI sessions)
- Split-pane terminals, in-app code editor/diff viewer, push notifications

### Architecture Approach

The architecture is three independent layers built in strict dependency order. The terminal layer is entirely frontend-managed: a Zustand `terminalSessions: Record<ProjectId, TerminalSession[]>` store replaces the current global `terminalSessionKey`, and all sessions for the active project are mounted simultaneously with CSS `display: none` on inactive ones to preserve scrollback. The orchestrator layer is a Rust-side `tokio::spawn` daemon that reads project/phase/task state from the shared `Arc<Mutex<Database>>`, determines the next action, and communicates exclusively via `app.emit()` events — never by directly mutating frontend state. The notification layer bridges these two: Rust-side `tauri-plugin-notification` for OS alerts when the orchestrator needs human input, `sonner` toasts for foreground informational feedback, and a Zustand `notificationSlice` for persistent in-app notification history.

**Major components:**
1. `TerminalSessionStore` (Zustand slice) — `Map<ProjectId, TerminalSession[]>`, active session per project, replaces `terminalSessionKey`
2. `TerminalTabBar` + `TerminalPane` (React) — tab management UI; N panes mounted simultaneously, only active one visible
3. `orchestrator/` (Rust module) — daemon loop, action determination, CLI tool execution via `tokio::process::Command`
4. `OrchestratorCommands` (Tauri commands) — `start`, `stop`, `pause`, `approve` — frontend-to-orchestrator control
5. `NotificationBridge` (Rust + React) — routes orchestrator events to OS notifications and Zustand notification slice
6. `NotificationTray` (React) — bell icon with badge count, dropdown history, action buttons

**New DB tables:** `orchestrator_runs` (execution history) and `orchestrator_config` (per-project orchestrator settings including `enabled`, `auto_execute`, `poll_interval_secs`).

### Critical Pitfalls

1. **"Open AI" navigation state race** — `launchTerminalCommand` and `restoreProjectState` fight over the same Zustand keys; multi-terminal adds more transitions and amplifies the bug. Fix: separate terminal-launch state from navigation state; add a behavioral test asserting ProjectDetail stays visible after "Open AI" click. Must be resolved BEFORE multi-terminal work.

2. **PTY zombie processes on close** — `pty.kill()` sends SIGHUP but child processes (e.g., Claude Code) that ignore it survive. With N terminals this multiplies. Fix: track all PTY PIDs in a Rust-side registry; on `tauri::RunEvent::ExitRequested` force-kill all with SIGKILL fallback after 2s SIGTERM.

3. **xterm.js instance memory growth** — each Terminal with WebGL renderer and 5000-line scrollback consumes ~34MB. Five terminals per project × 3 projects = ~510MB minimum. `Terminal.dispose()` does not fully GC due to document-level listener leaks (xterm.js issue #1518). Fix: cap at 5 total instances; use canvas renderer for background terminals; serialize inactive scrollback to a string array and re-create on tab focus.

4. **Runaway AI execution costs** — background AI with no budget controls can consume hundreds of dollars before the user notices. Fix: ship orchestrator MVP in approve-only mode; add per-execution token budget, 30-minute wall-clock timeout, and 3-attempt retry cap before escalating to human. Cost controls are a launch blocker.

5. **Notification spam / fatigue** — without a taxonomy defined upfront, every feature author adds notifications and users disable them entirely, missing critical "human input needed" alerts. Fix: define Critical / Informational / Silent taxonomy before implementation; coalesce batched events; never use OS notifications for success states.

## Implications for Roadmap

Based on the dependency graph in FEATURES.md and the pitfall-to-phase mapping in PITFALLS.md, the research strongly supports a four-phase build order.

### Phase 1: Tech Debt & Navigation Fixes

**Rationale:** The "Open AI" navigation bug and existing TypeScript errors will compound with every new feature added. Research explicitly identifies this as a must-fix-first. The bug is a state-management race; adding multi-terminal state transitions before fixing it guarantees regression amplification.

**Delivers:** Stable foundation — zero TS errors, reliable project navigation, "Open AI" keeps user on ProjectDetail view, confirmed no orphaned file imports.

**Addresses:** Direct project-click navigation, Link Directory on same line as AI button (low-effort layout fixes bundled here), sidebar collapsible with chevron toggle.

**Avoids:** Tech debt regression cascade (Pitfall 5), navigation bug amplification (Pitfall 4).

**Research flag:** Skip research-phase. Patterns are well-documented; this is codebase-specific debugging and cleanup.

### Phase 2: Multi-Terminal Sessions

**Rationale:** Everything downstream (named AI sessions, the orchestrator, the contextual button's "View AI" state) depends on the session registry existing. This is the foundational refactor that enables the rest of v1.3.

**Delivers:** `TerminalSessionStore`, `TerminalTabBar`, `TerminalPane`, per-project PTY isolation, kill/respawn per tab, tab naming, terminal as default drawer tab, named AI session terminals, updated `launchTerminalCommand` that creates new sessions instead of killing existing ones.

**Uses:** `tauri-pty 0.2.1` verified spawn/kill API, Zustand, existing xterm.js, Radix Collapsible for sidebar.

**Avoids:** Terminal session bleed between projects (Pitfall 6), PTY zombie processes (Pitfall 1), xterm.js memory growth (Pitfall 2) — instance pooling must be designed in, not added later.

**Research flag:** Skip research-phase. Architecture is well-specified; the hidden-mount pattern and session data model are fully designed in ARCHITECTURE.md.

### Phase 3: Notification System

**Rationale:** The orchestrator (Phase 4) needs notifications to communicate human-needed events. Building notifications separately ensures they are stable and properly taxonomized before the orchestrator generates high-volume events. Standalone value: existing workflow events (workflow-run-completed, workflow-step-failed) can be wired through the new system immediately.

**Delivers:** `tauri-plugin-notification` integration, `notificationSlice` in Zustand, `NotificationTray` (bell + badge + dropdown), `ToastProvider` listening to Tauri events, notification taxonomy (Critical / Informational / Silent), coalescing logic, existing workflow event wiring.

**Uses:** `tauri-plugin-notification 2.x` (new dependency), `sonner 2.0.7` (existing), Tauri event system.

**Avoids:** Notification spam / fatigue (Pitfall 7) — taxonomy must be locked before any events are wired.

**Research flag:** Skip research-phase. Dual-channel pattern is well-documented; taxonomy is fully specified in FEATURES.md notification categories table.

### Phase 4: Background Orchestrator MVP

**Rationale:** Depends on Phases 2 (session registry — orchestrator needs to launch AI in named terminals) and 3 (notification system — orchestrator communicates via human-needed events). Most complex piece; benefits from all prior phases being stable. Ship in approve-only mode first.

**Delivers:** Rust `orchestrator/` module (daemon, actions, executor), `orchestrator_runs` and `orchestrator_config` DB tables, `OrchestratorCommands` Tauri commands, approve-only execution mode with notification-based approval flow, smart AI button full state machine (`NO_DIRECTORY` → `ALL_COMPLETE`), minimal orchestrator UI (enable/disable toggle, status indicator), token budget enforcement and wall-clock timeout.

**Uses:** `tokio-util` CancellationToken (new dependency), `tokio::process::Command`, `Arc<Mutex<Database>>` (same pattern as existing scheduler), Tauri event system.

**Avoids:** Runaway AI costs (Pitfall 3) — approve-only mode ships first; autonomous execution is a v1.3.x follow-up.

**Research flag:** Needs research-phase during planning. The orchestrator `determine_next_action` logic (reading `.planning/` structure, classifying what is actionable vs. human-needed) requires deeper specification based on the actual project/phase/task schema. The integration between CLI tool output parsing and task status updates also needs definition.

### Phase Ordering Rationale

- **Phases must be sequential:** Multi-terminal (Phase 2) requires the navigation bug to be fixed (Phase 1) or risk regression amplification. The orchestrator (Phase 4) requires both the session registry (Phase 2) and notifications (Phase 3). There is no safe reordering.
- **Notification system as a bridge (Phase 3):** Building it standalone rather than inside the orchestrator phase keeps Phase 4 scope manageable and allows existing workflow events to benefit immediately.
- **Approve-only mode for orchestrator MVP:** Research (FEATURES.md, PITFALLS.md) converges on shipping conservative defaults. Risk-tiered auto-execution is a v1.3.x iteration after the orchestrator is proven stable.
- **UI polish is distributed:** Low-effort P1 UI fixes (collapsible sidebar, task detail simplification) are bundled into Phase 1 tech debt cleanup to deliver visible value immediately without requiring the session registry to be done first.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 4 (Orchestrator MVP):** The `determine_next_action` logic must be specified against the actual DB schema (project/phase/task state fields, status enums). CLI tool output parsing to detect completion vs. failure vs. human-needed states is domain-specific and sparsely documented. Token budget tracking mechanism needs definition.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Tech Debt):** Codebase-specific debugging; no external research needed.
- **Phase 2 (Multi-Terminal):** Architecture is fully specified; `tauri-pty` API is verified against type definitions in `node_modules`.
- **Phase 3 (Notifications):** Both notification channels have official documentation; taxonomy and coalescing patterns are well-established.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All existing dependencies verified against installed versions; new dependencies (`tauri-plugin-notification`, `tokio-util`) verified against official Tauri 2.x docs and compatibility matrix |
| Features | MEDIUM-HIGH | Table-stakes and differentiator features well-grounded in competitor analysis (VS Code, Warp, Cursor, Devin); background orchestrator patterns are emerging territory (2026 agentic AI) |
| Architecture | HIGH | Hidden-mount terminal pattern, event-driven orchestrator, and dual-channel notifications are all verified against existing codebase patterns (`scheduler.rs`, `useTerminal.ts`) and official Tauri docs |
| Pitfalls | HIGH | PTY and xterm.js pitfalls sourced from open GitHub issues with specific issue numbers; cost-control patterns sourced from LangChain State of Agent Engineering 2026; navigation bug based on codebase analysis |

**Overall confidence:** HIGH

### Gaps to Address

- **Orchestrator action classification logic:** Research describes the `determine_next_action` interface but not its implementation. Specifically: what project/phase/task state fields determine "actionable," "human-needed," or "nothing to do"? This needs to be resolved during Phase 4 planning by reviewing the actual DB schema and current `phases`/`tasks` status enum values.
- **CLI tool output parsing strategy:** The orchestrator must determine from AI CLI output whether a phase is complete, failed, or needs human input. The parsing approach (structured output, exit codes, log pattern matching) is not specified. Needs definition in Phase 4 planning.
- **Windows cross-platform compatibility:** Research notes that `pty.kill()` on Windows has documented issues (Tauri issue #5611), and hardcoded `/bin/zsh` breaks on Windows. The fix (`$SHELL` env var with fallback chain, process-group kill) is specified, but Windows-specific testing is needed during Phase 2 to confirm behavior. This is flagged as a known risk, not a blocker.
- **Token budget tracking mechanism:** The orchestrator must track per-execution token consumption to enforce budgets. The AI CLI tools (Claude Code) may or may not expose token counts via stdout. The exact tracking approach depends on which CLI tools are supported and needs to be validated during Phase 4 planning.

## Sources

### Primary (HIGH confidence)
- [Tauri Notification Plugin docs](https://v2.tauri.app/plugin/notification/) — installation, API, permissions
- [tauri-plugin-pty GitHub](https://github.com/Tnze/tauri-plugin-pty) — spawn API, direct JS binding model
- `tauri-pty 0.2.1` TypeScript definitions (`node_modules/tauri-pty/dist/types/index.d.ts`) — verified IPty API surface
- [Tauri async_runtime docs](https://docs.rs/tauri/latest/tauri/async_runtime/index.html) — tokio daemon patterns
- [Tauri Event System](https://v2.tauri.app/develop/calling-rust/#event-system) — backend-to-frontend communication
- Existing codebase: `src/hooks/useTerminal.ts`, `src-tauri/src/lib.rs`, `engine/scheduler.rs`, `engine/executor.rs`, `Cargo.toml`, `package.json`
- [Tauri issue #5611](https://github.com/tauri-apps/tauri/issues/5611) — PTY process kill on Windows
- [xterm.js issue #1518](https://github.com/xtermjs/xterm.js/issues/1518) — Terminal.dispose memory leak

### Secondary (MEDIUM confidence)
- [VS Code Terminal docs](https://code.visualstudio.com/docs/terminal/advanced) — competitor multi-terminal patterns
- [Warp Session Management](https://docs.warp.dev/terminal/sessions) — competitor session persistence patterns
- [Cursor Background Agents](https://ameany.io/cursor-background-agents/) — agentic execution model comparison
- [Designing for Agentic AI (Smashing Magazine)](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/) — human-in-the-loop UX patterns
- [LangChain State of Agent Engineering](https://www.langchain.com/state-of-agent-engineering) — cost control patterns
- [Long-running async tasks in Tauri v2](https://sneakycrow.dev/blog/2024-05-12-running-async-tasks-in-tauri-v2) — tokio spawn + event pattern

### Tertiary (LOW confidence)
- [Google Cloud Agentic AI Design Patterns](https://docs.google.com/architecture/choose-design-pattern-agentic-ai-system) — risk-tiered execution model (validates direction; not specific to Tauri)
- [NN/g Button States](https://www.nngroup.com/articles/button-states-communicate-interaction/) — smart button UX rationale

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
