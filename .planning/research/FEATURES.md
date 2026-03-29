# Feature Research

**Domain:** Desktop project management with multi-terminal, background AI execution, and contextual UI
**Researched:** 2026-03-29
**Confidence:** MEDIUM-HIGH (multi-terminal and UI patterns well-established; background execution pipeline is emerging territory)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist once they see a terminal or AI integration. Missing these = product feels broken.

#### Multi-Terminal

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multiple terminal tabs | VS Code, iTerm2, Warp all have tabs. Single terminal feels like a toy. | MEDIUM | Need terminal session registry in Zustand + per-tab PTY lifecycle. Current `useTerminal` hook couples one xterm instance to one PTY -- must refactor to session-based model. |
| Per-project terminal isolation | Users switch projects constantly. Terminal must follow project CWD. | LOW | Already have CWD per project. Extend to per-project session list in workspace store. |
| Terminal as default drawer tab | Terminal is the primary workspace tool. Burying it behind "Logs" is wrong. | LOW | Reorder tabs in DrawerHeader: Terminal first, Logs second, History third. Persist selection. |
| Kill and respawn terminal | Process hangs, wrong state, need a fresh shell. Every terminal app has this. | LOW | Already have `pty.kill()` in cleanup. Add explicit kill button per tab + respawn action. |
| Terminal tab naming | Must distinguish "AI session" from "manual shell" from "build watcher". | LOW | Auto-name from command (e.g. "claude", "zsh") + allow manual rename via double-click on tab. |

#### UI Polish

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Direct project click opens project | Click on item = navigate to it. This is the most basic UI convention. Current context-menu-on-click violates expectations. | LOW | Change sidebar click handler: single-click navigates, right-click opens context menu. |
| Collapsible sidebar sections with +/- toggle | Every sidebar with sections has expand/collapse. Slider is non-standard. | LOW | Replace slider with simple chevron toggle. Persist collapsed state in Zustand. |
| Simplified task detail view | Cluttered detail views cause cognitive overload. Show essentials, hide advanced behind expand. | MEDIUM | Progressive disclosure: title, status, notes visible. Due date, project link, metadata in collapsible "Details" section. |
| Link Directory on same line as AI button | Related actions in the same row. Putting them on separate lines wastes space and breaks visual grouping. | LOW | Flexbox row with both buttons. Straightforward layout change. |

#### Contextual AI Button

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| State-aware button label | Users need to know what clicking will DO. "Open AI" is generic. Label should reflect current project state. | LOW | Compute label from project state: no directory = "Link Directory", no phases = "Plan Project", has phases + incomplete = "Check Progress", all complete = "Review Project". |
| Loading/launching state feedback | NN/g button states research: users must see acknowledgment that their click registered. | LOW | Already have `isLaunching` state. Keep spinner + "Launching..." text. |
| Disabled state with reason | Button grayed out with no explanation is hostile UX. | LOW | Tooltip on disabled button explaining why (e.g., "Link a directory first"). |

### Differentiators (Competitive Advantage)

Features that set Element apart. These are where the product competes.

#### Multi-Terminal

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Named AI session terminals | When "Open AI" launches, it creates a named terminal tab ("AI: project-name") that's visually distinct from manual shells. User always knows which tab is the AI. | LOW | Tag terminal sessions with a `source` field ("ai" vs "manual"). Render AI tabs with Bot icon. |
| Session persistence across project switches | Switch projects, come back, terminal is still there with scroll history intact. VS Code does this. Warp does this. Most Electron/Tauri apps don't. | HIGH | Requires keeping xterm instances alive in DOM (hidden) rather than destroying on tab switch. Or serialize scrollback buffer and restore. Hidden DOM approach is simpler but memory-heavier. |
| Launch configurations (saved terminal presets) | Warp's killer feature: save a window/tab/pane layout and restore it. For Element, save "my dev environment" = 3 terminals (server, client, AI). | HIGH | Defer to v1.4+. Requires terminal session serialization, command replay, layout persistence. Nice differentiator but not MVP. |

#### Background AI Execution Pipeline

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Background orchestrator reads project state | AI agent that monitors `.planning/` and project DB state, determines what's actionable, and proceeds without waiting for human. This is the Devin/Cursor Background Agents pattern for project management. | HIGH | Rust-side tokio task that polls project state on interval or file-watch trigger. Needs state machine: IDLE -> ANALYZING -> EXECUTING -> WAITING_HUMAN -> COMPLETE. |
| Risk-tiered auto-execution | Low-risk actions (run tests, check status) execute automatically. Medium-risk (code changes) pause for confirmation. High-risk (deploy, delete) require explicit approval. Mirrors the agentic AI checkpoint pattern from Smashing Magazine and Google Cloud architecture guides. | HIGH | Define risk taxonomy for actions. Low-risk = auto-proceed + notify after. Medium = notify + wait for go/no-go. High = block until explicit approval. |
| Human-needed notifications | Desktop notifications when AI hits a blocker: needs decision, verification, or discussion. The interrupt + notify + review + resume pattern. | MEDIUM | Use `tauri-plugin-notification` for OS-native toasts. In-app notification center for history. Notification has action context: "Phase 3 complete -- verify output?" with deep-link to relevant project view. |
| Execution progress in drawer | Real-time visibility into what the background agent is doing. Cursor shows file modifications, decisions, estimated completion. | MEDIUM | New drawer tab or overlay showing agent state, current action, recent decisions, and a timeline. Reuse existing Logs infrastructure. |

#### Contextual UI

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Smart button with full state machine | Beyond just label changes: the button becomes the primary project action surface. One button, always the right next action. Like GitHub's merge button that changes between "Merge", "Squash", "Rebase" based on context. | LOW | State machine: `NO_DIRECTORY` -> "Link Directory", `NO_PLAN` -> "Plan Project", `HAS_PLAN` -> "Check Progress", `AI_RUNNING` -> "View AI" (switches to terminal), `NEEDS_ATTENTION` -> "Review" (pulsing). |
| Notification badges on sidebar projects | Small dot/badge on project in sidebar when background AI needs attention. Pulls you to the right project without hunting. | LOW | Badge component on sidebar project item. Driven by notification state in store. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Split pane terminals | VS Code has them, power users ask for them | Massive complexity for a project management app. Element's drawer is not an IDE terminal area. Split panes need drag handles, resize logic, nested layout. ROI is low for this product. | Multiple tabs are sufficient. If user needs split panes, they have a real terminal app. |
| Full terminal customization (fonts, colors, keybindings) | Power users want to tweak everything | Settings surface area explosion. Every option is a bug surface and support burden. | Ship one well-designed theme that matches the app. Expose font size only if needed. |
| Autonomous AI with no human checkpoints | "Just let the AI do everything" | Trust erosion. Cursor and Devin both learned: users need visibility and control. Fully autonomous execution without checkpoints leads to wasted work and rejected outputs. | Risk-tiered execution with clear checkpoints. Start conservative (more pauses), let user increase autonomy over time. |
| In-app code editor for AI output review | "Show me the diff inline" | Element is not an IDE. Building a diff viewer is massive scope. Users already have VS Code/Cursor open. | Deep-link to file in external editor. Show summary of changes in notification, let user review in their editor. |
| Real-time streaming of AI terminal output to notification | "Show me what AI is typing as a notification" | Notification spam. Terminal output is noisy. Streaming raw output to notifications is hostile. | Structured status updates only: "Started phase 3", "Tests passing", "Needs review". Parse meaningful events from output, not raw text. |
| Push notifications (mobile/remote) | "Notify me on my phone when AI is done" | Requires server infrastructure, push notification services, accounts. Violates local-first principle. | Desktop-only native notifications. If user is away from desk, the work waits. This is a personal desktop tool. |

## Feature Dependencies

```
[Direct project click] (independent, no deps)

[Collapsible sidebar sections] (independent, no deps)

[Simplified task detail] (independent, no deps)

[Terminal as default tab]
    +-- requires --> [Multi-terminal tabs]
                        +-- requires --> [Terminal session registry]
                                            +-- requires --> [Refactor useTerminal to session model]

[Named AI session terminals]
    +-- requires --> [Multi-terminal tabs]
    +-- requires --> [Terminal session registry]

[Smart AI button labels]
    +-- requires --> [Project state computation]
    +-- enhances --> [Named AI session terminals] (button label = "View AI" when session active)

[Background orchestrator]
    +-- requires --> [Multi-terminal tabs] (orchestrator launches AI in named terminal)
    +-- requires --> [Terminal session registry] (track which sessions are orchestrator-managed)
    +-- requires --> [Project state computation] (determine what's actionable)

[Risk-tiered auto-execution]
    +-- requires --> [Background orchestrator]
    +-- requires --> [Notification system]

[Human-needed notifications]
    +-- requires --> [tauri-plugin-notification setup]
    +-- requires --> [In-app notification state/store]
    +-- enhances --> [Background orchestrator]
    +-- enhances --> [Smart AI button] (button pulses when notification pending)

[Notification badges on sidebar]
    +-- requires --> [In-app notification state/store]
    +-- enhances --> [Human-needed notifications]

[Execution progress in drawer]
    +-- requires --> [Background orchestrator]
    +-- enhances --> [Multi-terminal tabs] (progress tab alongside terminal tabs)
```

### Dependency Notes

- **Multi-terminal tabs require terminal session registry:** The current `useTerminal` hook creates a single PTY tied to component lifecycle. Multi-terminal needs a session manager that owns PTY instances independently of React component mount/unmount cycles. This is the foundational refactor.
- **Background orchestrator requires multi-terminal:** The orchestrator needs to spawn AI sessions in named terminals. Without multi-terminal, it would kill the user's active terminal (the current bug).
- **Smart AI button enhances both terminal and orchestrator:** The button state machine bridges UI and execution -- "View AI" switches to the AI terminal tab, "Review" opens the notification that needs attention.
- **Notifications require both native OS integration and in-app state:** `tauri-plugin-notification` handles OS toasts. In-app state (Zustand slice) tracks notification history, unread counts, and deep-link targets. Both are needed for a complete experience.
- **Risk-tiered execution conflicts with early shipping:** It requires a risk taxonomy, action classification, and approval flow. Ship the orchestrator first with conservative defaults (always pause), add risk tiers as a follow-up.

## MVP Definition

### Launch With (v1.3)

These are the minimum features to ship multi-terminal and lay execution pipeline groundwork.

- [x] Direct project click navigation -- fixes the most annoying existing bug
- [x] Collapsible sidebar sections with +/- toggle -- low effort, high polish
- [x] Simplified task detail view -- progressive disclosure
- [x] Link Directory on same line as AI button -- layout fix
- [x] Smart AI button with state-aware labels -- low effort, high UX value
- [x] Terminal as default drawer tab -- reorder + persist
- [x] Multi-terminal tabs with session registry -- foundational for everything else
- [x] Named AI session terminals -- AI launches create distinct tabs
- [x] Kill/respawn per terminal tab -- basic terminal management
- [x] Tab naming (auto from command + manual rename) -- distinguish sessions
- [x] Basic notification system (tauri-plugin-notification + in-app store) -- needed for execution pipeline
- [x] Background orchestrator MVP -- state reader + auto-execute low-risk + notify for human items

### Add After Validation (v1.3.x)

- [ ] Risk-tiered auto-execution -- once orchestrator is stable, add risk classification
- [ ] Execution progress drawer tab -- richer visibility into agent activity
- [ ] Notification badges on sidebar projects -- visual indicator without opening project
- [ ] Session persistence across project switches -- keep terminals alive when switching

### Future Consideration (v2+)

- [ ] Launch configurations (saved terminal presets) -- Warp-style workspace templates
- [ ] Autonomy slider (user controls how much the AI does without asking) -- trust calibration
- [ ] Inter-agent coordination (multiple AI sessions working on different phases) -- multi-agent

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Direct project click | HIGH | LOW | P1 |
| Collapsible sidebar sections | MEDIUM | LOW | P1 |
| Simplified task detail | MEDIUM | MEDIUM | P1 |
| Link Directory same line | MEDIUM | LOW | P1 |
| Smart AI button labels | HIGH | LOW | P1 |
| Terminal as default tab | MEDIUM | LOW | P1 |
| Multi-terminal tabs + session registry | HIGH | HIGH | P1 |
| Named AI session terminals | HIGH | LOW (after registry) | P1 |
| Kill/respawn per tab | HIGH | LOW | P1 |
| Tab naming | MEDIUM | LOW | P1 |
| Basic notification system | HIGH | MEDIUM | P1 |
| Background orchestrator MVP | HIGH | HIGH | P1 |
| Risk-tiered execution | HIGH | HIGH | P2 |
| Execution progress drawer | MEDIUM | MEDIUM | P2 |
| Notification badges | MEDIUM | LOW | P2 |
| Session persistence | MEDIUM | HIGH | P2 |
| Launch configurations | LOW | HIGH | P3 |
| Autonomy slider | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.3 launch
- P2: Should have, add when orchestrator is stable
- P3: Nice to have, future milestone

## Competitor Feature Analysis

| Feature | VS Code | Warp | Cursor | Element Approach |
|---------|---------|------|--------|-----------------|
| **Multi-terminal** | Tabs + split panes + groups + editor terminals. Full terminal management system. | Tabs + panes + session restoration + launch configs + colored tabs. | Single terminal panel, background agents use cloud VMs. | Tabs only (no splits). Named sessions. AI sessions visually distinct. Simpler than VS Code/Warp but sufficient for project management context. |
| **Terminal persistence** | Reconnects to previous PTY on reload. Restores layout across restarts. | Full session restoration including scroll history. | N/A (cloud-based). | Hidden DOM approach: keep xterm instances alive when switching tabs. Serialize on app quit for restart restoration. |
| **Background AI** | Copilot chat + agent mode runs in terminal. Not truly background. | Oz agents (cloud-based, separate from terminal). | Background agents on cloud VMs. Up to 8 parallel. Git worktree isolation. PR-based output. | Local background orchestrator. Single agent at a time. Reads project state, executes in named terminal, notifies for human items. Simpler than Cursor but integrated into project management workflow. |
| **AI notifications** | Inline chat responses. No OS notifications for AI. | In-terminal AI suggestions. No background notifications. | PR notifications. Email when background agent completes. | OS-native desktop notifications via tauri-plugin-notification. In-app notification center. Deep-links to project/phase that needs attention. |
| **Contextual buttons** | Command palette adapts to context. Git button shows branch status. | Command palette + AI suggestion bar context-aware. | "Review changes" appears after agent runs. | Single smart button: label = next action. "Plan Project" -> "Check Progress" -> "View AI" -> "Review". State machine driven by project + terminal + notification state. |
| **Human-in-the-loop** | Manual. User runs commands, reviews output. | Manual. User accepts/rejects AI suggestions. | Post-completion review. Diff viewer. Accept/reject at file and line level. | Checkpoint-based. Orchestrator pauses at defined points (phase completion, test failure, ambiguous decision). Notification with context summary + resume/cancel actions. |

## Smart AI Button State Machine

The contextual button is a key UX differentiator. Here is the complete state machine:

| State | Condition | Label | Icon | Variant | Action |
|-------|-----------|-------|------|---------|--------|
| `NO_DIRECTORY` | `!directoryPath` | "Link Directory" | FolderLink | outline | Open directory picker |
| `NO_PLAN` | `directoryPath && !hasPhases && !planningTier` | "Plan Project" | Bot | default (primary) | Open tier dialog |
| `READY` | `directoryPath && (hasPhases \|\| planningTier)` | "Check Progress" | Bot | outline | Generate context + launch AI in named terminal |
| `AI_RUNNING` | `activeAiTerminalSession` | "View AI" | Terminal | outline | Switch to AI terminal tab |
| `NEEDS_ATTENTION` | `pendingNotification` | "Review" | AlertCircle | destructive, pulsing | Open notification detail / navigate to blocked phase |
| `LAUNCHING` | `isLaunching` | "Launching..." | Loader (spinning) | outline, disabled | No action (debounce) |
| `ALL_COMPLETE` | `allPhasesComplete` | "Project Complete" | CheckCircle | ghost | Show completion summary |

Priority order (highest wins): LAUNCHING > NEEDS_ATTENTION > AI_RUNNING > NO_DIRECTORY > NO_PLAN > ALL_COMPLETE > READY

## Notification Categories

For the execution pipeline, notifications fall into three categories with distinct urgency:

| Category | Trigger | Urgency | OS Toast | In-App Badge | Example |
|----------|---------|---------|----------|--------------|---------|
| **Verification** | Phase/task completed, output ready for review | Medium | Yes | Yes | "Phase 3 complete. 12 files changed. Review output?" |
| **Decision** | AI hit a fork, needs human choice | High | Yes + sound | Yes (pulsing) | "Phase 4 has two approaches. Which do you prefer?" |
| **Blocker** | AI cannot proceed, missing info or failed prerequisite | High | Yes + sound | Yes (red) | "Tests failing in phase 2. 3 failures. Fix needed before phase 3." |
| **Progress** | Informational, AI started/finished a step | Low | No | No (log only) | "Started phase 3 execution" |

## Sources

- [VS Code Terminal Advanced Docs](https://code.visualstudio.com/docs/terminal/advanced)
- [VS Code Terminal UI and Layout (DeepWiki)](https://deepwiki.com/microsoft/vscode/6.6-terminal-ui-and-layout)
- [VS Code Terminal Basics](https://code.visualstudio.com/docs/terminal/basics)
- [Warp Session Management](https://docs.warp.dev/terminal/sessions)
- [Warp All Features](https://www.warp.dev/all-features)
- [Cursor Background Agents Guide](https://ameany.io/cursor-background-agents/)
- [Devin vs Cursor Comparison (Builder.io)](https://www.builder.io/blog/devin-vs-cursor)
- [Cursor Agentic Coding (TechCrunch)](https://techcrunch.com/2026/03/05/cursor-is-rolling-out-a-new-system-for-agentic-coding/)
- [Tauri Notification Plugin](https://v2.tauri.app/plugin/notification/)
- [Designing For Agentic AI UX Patterns (Smashing Magazine)](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)
- [Human-in-the-Loop for AI Agents (Permit.io)](https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo)
- [Button States (NN/g)](https://www.nngroup.com/articles/button-states-communicate-interaction/)
- [Button States (UXPin)](https://www.uxpin.com/studio/blog/button-states/)
- [Google Cloud Agentic AI Design Patterns](https://docs.google.com/architecture/choose-design-pattern-agentic-ai-system)
- [xterm.js](https://xtermjs.org/)
- [react-xtermjs](https://github.com/Qovery/react-xtermjs)

---
*Feature research for: Element v1.3 Foundation & Execution*
*Researched: 2026-03-29*
