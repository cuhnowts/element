# Pitfalls Research

**Domain:** Adding multi-terminal, background AI execution, notifications, and tech debt cleanup to a Tauri 2.x desktop app
**Researched:** 2026-03-29
**Confidence:** HIGH (based on codebase analysis + ecosystem research)

## Critical Pitfalls

### Pitfall 1: PTY Zombie Processes on Terminal Kill/Respawn

**What goes wrong:**
The current `useTerminal.ts` spawns a PTY via `tauri-pty` and kills it on cleanup (`ptyRef.current?.kill()`). When moving to multi-terminal, the kill/respawn pattern (already used via `terminalSessionKey` increment in `useWorkspaceStore`) creates a race: if the React effect cleanup fires but the PTY process tree is not fully terminated (e.g., a running `claude` subprocess), zombie processes accumulate. On macOS this manifests as orphaned zsh/claude processes in Activity Monitor; on Windows it is worse -- Tauri issue #5611 documents that closing the window does not kill sidecar processes, and PTY daemon processes accumulate in Task Manager.

**Why it happens:**
`pty.kill()` sends SIGHUP to the PTY master, but child processes that ignore SIGHUP (common in CLI tools) survive. The current code has no process-group kill or SIGKILL fallback. With a single terminal this is manageable (one orphan per session). With N terminals, it multiplies.

**How to avoid:**
- Kill the entire process group, not just the PTY master. On POSIX, use `killpg(pgid, SIGTERM)` followed by a timed `SIGKILL` fallback. This requires a Rust-side command since `tauri-pty`'s JS API only exposes `kill()`.
- Track all spawned PTY PIDs in a Rust-side registry (HashMap<SessionId, PtyHandle>). On app close (`tauri::RunEvent::ExitRequested`), iterate and force-kill all.
- Implement a PTY health check: if a PTY's `onExit` fires but the process group is still alive after 2 seconds, escalate to SIGKILL.
- On project switch, decide policy: keep background terminals alive (tab model) or kill them (single-session model). Do not leave them in limbo.

**Warning signs:**
- Activity Monitor shows growing zsh/node/claude processes after repeated "Open AI" clicks
- Memory usage climbs without corresponding UI state
- `ps aux | grep -c zsh` returns more processes than open terminals

**Phase to address:**
Multi-terminal sessions phase. Must be the first thing designed -- the session registry is the foundation for everything else.

---

### Pitfall 2: Unbounded xterm.js Instance Memory Growth

**What goes wrong:**
Each xterm.js `Terminal` instance with 5000-line scrollback and WebGL renderer consumes ~34MB when the buffer is full. With 5 concurrent terminals per project and 3 projects visited in a session, that is 15 Terminal instances = ~510MB just for terminal buffers. The WebGL addon allocates GPU textures per instance. The current code creates a new Terminal on every mount (the `useEffect` in `useTerminal.ts` runs on `[containerRef, cwd, initialCommand]` changes).

**Why it happens:**
xterm.js issue #1518 documents that `Terminal.dispose()` does not fully release DOM event listeners -- document-level listeners retain references to the Terminal object, preventing GC. The WebGL addon compounds this by retaining GPU texture references. Developers assume `dispose()` is a complete cleanup, but it is not.

**How to avoid:**
- Cap maximum concurrent Terminal instances (recommend: 5 total, not per-project). Use a tab UI that shows terminal metadata but only mounts the active Terminal's DOM element.
- For inactive terminals: keep the PTY alive (so processes continue) but dispose the xterm.js Terminal instance and store the scrollback buffer as a plain string array. Re-create the Terminal and replay the buffer when the tab becomes active.
- Reduce scrollback from 5000 to 2000 for non-focused terminals (or 1000 for background terminals).
- After `Terminal.dispose()`, explicitly null out all addon references and remove any document-level event listeners the WebGL addon may have attached.
- Use the canvas renderer instead of WebGL for background terminals -- WebGL per-instance GPU cost is not justified for terminals the user is not looking at.

**Warning signs:**
- Electron/Tauri process memory exceeds 1GB after extended use
- WebGL context lost errors in console (GPU texture exhaustion)
- UI becomes sluggish when switching between terminal tabs

**Phase to address:**
Multi-terminal sessions phase. The terminal manager architecture must include instance pooling from day one.

---

### Pitfall 3: Runaway AI Background Execution Costs

**What goes wrong:**
The execution pipeline MVP will spawn background AI processes (likely Claude Code or similar) that auto-execute phases. Without cost controls, a single stuck loop -- e.g., an AI agent retrying a failing build command indefinitely -- can consume hundreds of dollars in API tokens in hours. The user is not watching because it is a background process.

**Why it happens:**
AI agents have no inherent concept of "this is taking too long" or "I have spent too much." The orchestrator hands off work and does not enforce budgets. Token consumption is invisible until the bill arrives. The 2026 industry consensus is that this is the #1 operational risk with agentic AI.

**How to avoid:**
- **Token budget per execution**: Set a max token count per phase execution (e.g., 100K input + 50K output). The Rust orchestrator must track cumulative usage and kill the process when exceeded.
- **Wall-clock timeout**: No single AI execution should run longer than 30 minutes without human check-in. Use `tokio::time::timeout` on the process spawn.
- **Iteration cap**: If the AI agent has attempted the same command more than 3 times with failures, abort and notify the user.
- **Cost estimation before launch**: Show the user an estimated token cost range before starting auto-execution. Require confirmation for executions estimated above a threshold (e.g., $5).
- **Kill switch**: A prominent "Stop All AI" button in the UI that sends SIGKILL to all AI processes. This must work even if the UI is partially frozen.
- **Dry-run mode**: The first implementation should be "suggest and wait for approval" rather than fully autonomous execution.

**Warning signs:**
- AI process running for more than 10 minutes without producing a commit or output
- Repeated error messages in AI output logs
- Token counter climbing rapidly (if tracked)

**Phase to address:**
Execution pipeline MVP phase. Cost controls are not a "nice to have" -- they are a launch blocker. Ship the dry-run/approval mode first, autonomous execution second.

---

### Pitfall 4: "Open AI" Navigation Bug Masks Deeper State Management Issue

**What goes wrong:**
The known bug -- "Open AI navigates to home screen instead of showing toast" -- is intermittent and undiagnosed. Based on code analysis, the likely cause is a state race in `launchTerminalCommand()`. This function calls `set()` with `drawerOpen: true` and `activeDrawerTab: "terminal"`, but if another effect (e.g., `restoreProjectState` or a sidebar click handler) runs in the same React render cycle, the state update can be overwritten. The `terminalSessionKey` increment triggers a terminal remount, and during remount, if the project context changes (sidebar click registered first), the whole view resets to the home/today screen.

**Why it happens:**
Zustand's `set()` is synchronous but React batches renders. Multiple `set()` calls in rapid succession during the same event loop tick get batched, and the last write wins for conflicting keys. The workspace store mixes global state (drawerOpen, activeDrawerTab) with project-scoped state (projectStates), creating implicit coupling.

**How to avoid:**
- Reproduce first: Add `console.log` to `launchTerminalCommand`, `restoreProjectState`, and the sidebar click handler. Log the call stack and current state. The intermittent nature suggests a click event bubbling issue or a useEffect dependency triggering a project switch.
- Separate terminal launch state from navigation state. The terminal command should not also control drawer visibility -- those should be two sequential operations with the navigation completing first.
- Consider using Zustand's `subscribeWithSelector` to trace which state changes trigger re-renders during "Open AI" flow.
- Add a behavioral test: click "Open AI" while on ProjectDetail, assert that ProjectDetail remains visible and terminal tab opens in drawer.

**Warning signs:**
- Bug frequency increases after adding multi-terminal (more state changes per terminal operation)
- Users reporting "lost my place" after AI actions

**Phase to address:**
Tech debt cleanup phase -- this MUST be fixed before multi-terminal work begins. Multi-terminal will add more state transitions to the same store, amplifying the race condition.

---

### Pitfall 5: Tech Debt Cleanup Causes Regression Cascade

**What goes wrong:**
The 3 TS errors in ThemeSidebar.tsx and UncategorizedSection.tsx have been present since Phase 6. They are "runtime unaffected" because TypeScript errors do not block Vite builds. Fixing them may require changing prop types or component interfaces, which can ripple through the sidebar component tree. Deleting orphaned files (ScopeInputForm.tsx, OnboardingWaitingCard.tsx) seems safe but may break dynamic imports, lazy routes, or barrel exports that are not caught by static analysis.

**Why it happens:**
TS errors that "don't affect runtime" get deprioritized, but they mask real type mismatches. The longer they persist, the more code is written assuming the broken types are correct. Deleting "orphaned" files based on import analysis misses: dynamic `import()` calls, string-based component registries, test files that import the component, and storybook stories.

**How to avoid:**
- Fix TS errors one file at a time, with a passing test suite between each fix. Do not batch all 3 into one commit.
- Before deleting any file: `grep -r "ScopeInputForm" --include="*.ts" --include="*.tsx" --include="*.test.*"` across the entire project, including test files and config files.
- Run the full app manually after each deletion -- dynamic imports will not be caught by `tsc`.
- Enable `strict: true` in tsconfig as part of this phase (if not already enabled) to prevent future drift. If too many errors, enable strict checks incrementally (`strictNullChecks`, then `noImplicitAny`, etc.).
- The navigation bug fix should happen in this phase too, since it is existing tech debt that will compound with new features.

**Warning signs:**
- "Fixed TS errors" PR that touches 15+ files
- Sidebar rendering breaks after "cleanup" merge
- Test suite passes but app crashes on a specific route

**Phase to address:**
Tech debt cleanup phase. This must be the FIRST phase in the milestone -- cleaning up before adding new features prevents compounding.

---

### Pitfall 6: Terminal Not Scoped Per-Project Creates Session Bleed

**What goes wrong:**
Currently, terminal state is global in `useWorkspaceStore` -- `terminalSessionKey` and `terminalInitialCommand` are not keyed by project. When a user switches from Project A to Project B, the terminal still shows Project A's session (or kills it and starts fresh, losing context). With multi-terminal, this becomes worse: which project's terminals should be visible? If all terminals are shown globally, the user drowns in tabs. If only the current project's terminals show, switching projects feels like terminals disappear.

**Why it happens:**
The original terminal was a single global instance. The `launchTerminalCommand` function in the workspace store has no concept of "which project owns this terminal." The per-project workspace state (`projectStates`) stores `drawerTab` but not terminal sessions.

**How to avoid:**
- Design the terminal registry as `Map<ProjectId, TerminalSession[]>` from the start. Each project owns its terminals.
- When switching projects: hide (not destroy) the previous project's terminals, show the new project's terminals. PTY processes continue in background.
- Add a visual indicator showing how many terminals are running across all projects (e.g., a badge on the terminal tab).
- Limit total terminals across all projects (recommend: 8 max) to prevent resource exhaustion.
- The "Open AI" button should create a terminal scoped to its project, not a global terminal.

**Warning signs:**
- User runs "Open AI" on Project B and sees Project A's terminal output
- `cd` to wrong directory because CWD belongs to another project's terminal
- Confusion about which terminal belongs to which project

**Phase to address:**
Multi-terminal sessions phase. The per-project scoping must be designed before any multi-terminal UI work begins.

---

### Pitfall 7: Notification Spam from Background AI Processes

**What goes wrong:**
The execution pipeline will generate many events: "Phase started," "Step completed," "Error encountered," "Human input needed," "Phase completed." If each event produces a toast notification, the user gets overwhelmed (notification fatigue). If only errors are shown, the user has no visibility into progress. If system-level notifications (macOS Notification Center) are used for everything, the user disables them entirely and misses the critical "human input needed" alert.

**Why it happens:**
Developers implement notifications feature-by-feature without a holistic notification strategy. Each feature author thinks "my notification is important," resulting in death by a thousand toasts.

**How to avoid:**
- Define a notification priority taxonomy BEFORE implementing any notifications:
  - **Critical** (system notification + persistent banner): "Human input required," "Execution failed after retries," "Cost limit reached"
  - **Informational** (toast, auto-dismiss 5s): "Phase completed successfully," "AI started execution"
  - **Silent** (log only, visible in history panel): "Step completed," "File written," "Command executed"
- Implement notification coalescing: if 5 steps complete within 10 seconds, show one toast "5 steps completed" not 5 toasts.
- Never use system notifications for success states -- only for states that require user action.
- Add a notification center/history panel where users can review all past notifications at their own pace.
- Respect focus state: if the user is actively viewing the project's terminal, suppress toasts for that project's events (they can already see the output).

**Warning signs:**
- Multiple toasts stacking and covering UI content
- Users reporting "I stopped reading the notifications"
- Critical notifications (human input needed) being ignored because they look like success toasts

**Phase to address:**
Execution pipeline MVP phase. The notification taxonomy must be defined in the phase plan before any implementation begins.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Global terminal state instead of per-project | Simpler store, fewer state transitions | Session bleed between projects, impossible to manage multi-terminal | Never (the current state is tech debt, fix before extending) |
| setTimeout(500ms) for PTY shell readiness | Works on fast machines | Fails on slow machines, Windows, or under load. Command may be sent before shell prompt renders | Only in prototype. Replace with shell prompt detection (watch for `$` or `%` in PTY output) |
| Hardcoded `/bin/zsh` shell path | Works on macOS | Breaks on Windows (`cmd.exe`/`pwsh`), breaks on Linux with bash default | Never for cross-platform. Use `$SHELL` env var with fallback chain |
| Killing terminal on "Open AI" (session key increment) | Clean slate for AI | Loses user's terminal history and running processes | Acceptable only if user explicitly chooses "new terminal" vs "reuse existing" |
| Storing scrollback in xterm.js only | No extra code needed | Cannot persist terminal history across app restarts, cannot search across terminals | Acceptable for MVP, but design the Terminal interface to allow adding persistence later |

## Integration Gotchas

Common mistakes when connecting components in this system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PTY + React lifecycle | Creating PTY in useEffect without proper cleanup ordering (dispose terminal before killing PTY) | Kill PTY first (stops data flow), then dispose Terminal (cleans up DOM). Current code does it in wrong order: `pty.kill()` then `term.dispose()` -- actually correct, but add a guard to stop writing to disposed terminal |
| Zustand persist + session state | Persisting terminal session keys or project states that reference runtime resources (PTY handles) | Use `partialize` to exclude runtime state (already done correctly in current code -- maintain this discipline) |
| xterm.js WebGL + multiple instances | Loading WebGL addon on every terminal instance | Share a single WebGL context where possible, or use canvas renderer for background terminals. WebGL has a per-browser limit (~16 contexts) |
| Background AI process + app close | Spawning a background process and relying on React cleanup to kill it | Register all background processes with the Rust backend. Use `tauri::RunEvent::ExitRequested` to kill them on app shutdown, not frontend cleanup |
| Toast notifications (sonner) + async operations | Showing toast for every async result | Debounce/coalesce toasts. Use `toast.promise()` for operations with loading/success/error states |
| File watcher + terminal CWD | File watcher triggers re-render while terminal is mid-operation | Debounce file watcher events. Do not re-render terminal-containing components on file changes |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| One xterm.js Terminal per tab (always mounted) | Memory grows linearly with terminal count | Virtualize: only mount active terminal, serialize inactive scrollback | At 5+ terminals |
| ResizeObserver per terminal | Multiple resize callbacks per frame during drawer resize | Use a single ResizeObserver on the container, distribute resize events to active terminal only | At 8+ terminals with frequent resize |
| Unbounded PTY output buffering | Memory spike when AI produces large output (e.g., `cat` a large file) | xterm.js has 50MB buffer hardcap, but PTY side can buffer too. Implement flow control per xterm.js docs | When AI outputs >10MB in one command |
| Polling for AI process status | CPU usage from setInterval checking process state | Use event-driven: PTY onData + onExit for terminal processes, Tauri events for background orchestrator status | At 3+ concurrent AI processes |
| Storing all execution history in memory | Zustand store grows with every execution record | Page execution history from SQLite. Keep only last 10 records in memory, load more on scroll | After 50+ executions in a session |

## Security Mistakes

Domain-specific security issues for a desktop AI orchestration app.

| Mistake | Risk | Prevention |
|---------|------|------------|
| AI process inherits full user shell environment | AI agent has access to all env vars including secrets, SSH keys, cloud credentials | Spawn AI processes with a sanitized environment. Whitelist only necessary env vars (PATH, HOME, SHELL) |
| No confirmation before AI executes destructive commands | AI could `rm -rf`, `git push --force`, or deploy to production | Implement a command allowlist/blocklist in the orchestrator. Flag destructive patterns for human approval |
| Terminal scrollback contains secrets | API keys, passwords visible in terminal history that may be persisted | Do not persist terminal scrollback to disk by default. If persisted, encrypt at rest |
| Background execution with `--dangerously-skip-permissions` | Claude Code runs without safety guardrails | This is a known decision (see KEY DECISIONS in PROJECT.md). Document the risk clearly to users. Add a settings toggle to disable skip-permissions |
| Cost data not shown to user | User unaware of API spend until bill arrives | Show cumulative token usage and estimated cost in the execution panel |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auto-switching to terminal tab on every AI event | Disrupts user who is reading code or editing tasks | Only auto-switch on explicit "Open AI" click. Background events go to notification center |
| Terminal tabs with no identifying labels | "Terminal 1, Terminal 2" -- user cannot tell which is which | Label with project name + running command: "element: claude ...", "api: npm test" |
| Notification toast covers the content user is interacting with | User must wait for toast to dismiss or manually close it | Position toasts in bottom-right (away from sidebar and center content). Never cover interactive elements |
| "Stop AI" button that takes 10+ seconds to actually stop | User panic-clicks, spawns multiple kill signals, corrupts state | Kill signal should be immediate (SIGKILL after 2s SIGTERM). Show "Stopping..." state. Disable the button after first click |
| No way to see what AI did while user was away | User returns to completed execution with no summary | Execution history with diff summary: "Modified 3 files, ran 12 commands, completed in 4m 23s" |
| Modal confirmation for every AI action | Approval fatigue -- user starts clicking "Yes" without reading | Batch approvals: show a plan of N steps, approve all or edit. Not one-by-one |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Multi-terminal:** Works with 2 tabs -- verify with 8 concurrent terminals, switching rapidly between projects. Check memory after 30 minutes.
- [ ] **PTY cleanup:** Terminal tab closes cleanly -- verify no orphan processes with `ps aux | grep -v grep | grep zsh | wc -l` before and after closing 5 terminals.
- [ ] **Background execution:** AI completes a phase -- verify it stops consuming tokens after completion (check API dashboard, not just UI).
- [ ] **Notifications:** Toast shows for errors -- verify toast does NOT show for every step completion when 10 steps finish in 5 seconds.
- [ ] **Tech debt TS fixes:** TypeScript compiles with zero errors -- verify the APP still renders correctly on every route (TS correctness != runtime correctness).
- [ ] **Terminal per-project scoping:** Switching projects shows correct terminals -- verify by running `pwd` in each terminal after switching back and forth 3 times.
- [ ] **Kill switch:** "Stop AI" button works -- verify by running a long AI task and clicking stop mid-execution. Check that no orphan processes remain AND no partial file writes corrupt the project.
- [ ] **Notification coalescing:** Single notification for batch events -- verify by triggering 10 rapid events and counting toast appearances (should be 1-2, not 10).

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| PTY zombie processes | LOW | Add a "Kill All Terminals" command that iterates the Rust-side registry and force-kills all. Can be triggered from app menu |
| xterm.js memory bloat | MEDIUM | Implement terminal instance pooling retroactively. Requires refactoring useTerminal hook to support detach/reattach pattern |
| Runaway AI cost | HIGH | Cannot recover spent tokens. Add monitoring dashboard and alerts. Set up provider-side spending limits (OpenAI/Anthropic dashboards) as a safety net |
| Navigation bug amplified | MEDIUM | Revert to single-terminal while investigating. The workspace store state can be reset by clearing localStorage (`element-workspace` key) |
| Tech debt regression | LOW | Git revert the offending commit. This is why one-file-at-a-time cleanup matters -- easy to identify which fix broke things |
| Notification fatigue (users disabled all notifications) | MEDIUM | Cannot un-train user behavior. Must redesign notification taxonomy and re-earn user trust. Ship with conservative defaults from the start |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Navigation bug / state race | Tech debt cleanup (FIRST phase) | Behavioral test: "Open AI" keeps user on ProjectDetail view |
| TS error regression cascade | Tech debt cleanup (FIRST phase) | Zero TS errors + full manual smoke test of sidebar |
| Orphaned file deletion safety | Tech debt cleanup (FIRST phase) | Full-text search for file references before deletion |
| Terminal session bleed | Multi-terminal sessions | `pwd` test after project switch shows correct CWD |
| PTY zombie processes | Multi-terminal sessions | Process count before/after closing all terminals matches |
| xterm.js memory growth | Multi-terminal sessions | Memory stays under 500MB after 30 min with 5 terminals |
| Runaway AI costs | Execution pipeline MVP | Token budget enforced, wall-clock timeout kills process |
| Notification spam | Execution pipeline MVP | Coalescing verified: 10 rapid events = 1-2 toasts |
| AI process orphans on app close | Execution pipeline MVP | Force-quit app during AI execution, verify no orphan processes |
| Hardcoded `/bin/zsh` | Multi-terminal sessions | Terminal launches on Linux (bash) and Windows (pwsh) |

## Sources

- [Tauri issue #5611: Closing window does not kill process on Windows](https://github.com/tauri-apps/tauri/issues/5611)
- [Tauri issue #11686: Plugin-shell cannot fully terminate multi-process executables](https://github.com/tauri-apps/tauri/issues/11686)
- [Tauri discussion #3273: Kill process on exit](https://github.com/tauri-apps/tauri/discussions/3273)
- [xterm.js issue #1518: Memory leaks on Terminal.dispose](https://github.com/xtermjs/xterm.js/issues/1518)
- [xterm.js issue #4175: Poor performance with wide containers](https://github.com/xtermjs/xterm.js/issues/4175)
- [xterm.js flow control documentation](https://xtermjs.org/docs/guides/flowcontrol/)
- [xterm.js issue #791: Buffer performance / ~34MB per full terminal](https://github.com/xtermjs/xterm.js/issues/791)
- [Carbon Design System: Notification patterns](https://carbondesignsystem.com/patterns/notification-pattern/)
- [NN/g: Indicators, Validations, and Notifications](https://www.nngroup.com/articles/indicators-validations-notifications/)
- [Microsoft: Toast notification UX guidance](https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/toast-ux-guidance)
- [LangChain: State of Agent Engineering (cost control patterns)](https://www.langchain.com/state-of-agent-engineering)
- [tauri-plugin-pty GitHub (Tnze)](https://github.com/Tnze/tauri-plugin-pty)
- Codebase analysis: `useTerminal.ts`, `useWorkspaceStore.ts`, `OpenAiButton.tsx`, `TerminalTab.tsx`

---
*Pitfalls research for: Element v1.3 Foundation & Execution milestone*
*Researched: 2026-03-29*
