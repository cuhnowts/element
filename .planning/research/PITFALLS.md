# Pitfalls Research

**Domain:** Adding AI-powered daily hub, conversational orchestrator chat, context manifest, and bot skills to an existing Tauri 2.x + React 19 desktop app
**Researched:** 2026-03-31
**Confidence:** HIGH (based on codebase analysis of existing MCP server, agent lifecycle, notification system, and CenterPanel routing)

## Critical Pitfalls

### Pitfall 1: Hub Chat vs Agent Panel — Two Chat UIs Talking to the Same Orchestrator

**What goes wrong:**
The hub chat (new conversational UI in center column) and the existing agent panel (right sidebar with activity log + terminal) both need to communicate with the same MCP-backed orchestrator. Without clear separation, messages sent from hub chat appear in the agent activity log, agent terminal output bleeds into hub chat, or worse -- two separate CLI processes compete for the same MCP server stdio transport.

**Why it happens:**
The existing agent lifecycle (`useAgentLifecycle.ts`) spawns a single CLI process with `--mcp-config` that talks to the MCP server via stdio. The hub chat needs conversational access to the same orchestrator. Developers instinctively try to reuse the same process or spawn a second one, both of which break. Stdio MCP transport is 1:1 -- you cannot multiplex two clients onto one stdio pipe.

**How to avoid:**
Keep the existing agent panel as the orchestrator's autonomous execution surface (it watches queues, runs phases, handles approvals). Make the hub chat a separate interaction channel that sends user messages to the orchestrator via a new queue subdirectory (e.g., `agent-queue/chat/`). The orchestrator reads chat messages as a new tool input alongside approvals/notifications/status. Do NOT spawn a second CLI process. Instead, extend the file-based queue pattern already proven in `useAgentQueue.ts` to handle bidirectional chat (user writes message files, agent writes response files, UI polls for responses).

**Warning signs:**
- Creating a second `useAgentLifecycle` instance for hub chat
- Attempting to pipe user input directly to the agent terminal's PTY
- Hub chat and agent panel showing duplicate entries
- MCP server receiving overlapping requests from two CLI processes

**Phase to address:**
Phase 1 (Hub UI layout) must define the boundary. Phase 3 (Hub chat) must implement the queue-based chat channel.

---

### Pitfall 2: TodayView Replacement Breaks CenterPanel Routing

**What goes wrong:**
`CenterPanel.tsx` uses TodayView as the fallback when no project/task/theme/workflow is selected (lines 112-116). Replacing TodayView with a 3-column DailyHub changes the component from a simple scrollable list to a complex layout with its own sub-routing (goals tree, briefing, chat). This breaks the existing conditional rendering chain because the hub needs to be visible even when a project IS selected (it's the home screen), but CenterPanel currently prioritizes project/task selection over TodayView.

**Why it happens:**
TodayView was designed as a passive fallback, not a primary destination. The hub is conceptually different -- it's a persistent home screen the user navigates TO, not what they see when nothing is selected. Developers try to just swap the component without changing the routing logic, resulting in the hub being unreachable once any sidebar item is clicked.

**How to avoid:**
Add an explicit "hub" navigation state to the workspace store (e.g., `activeView: "hub" | "project" | "task" | "theme" | "workflow"`). The sidebar gets a "Home" / "Hub" entry that sets `activeView: "hub"`. CenterPanel checks `activeView` first, before checking `selectedProjectId`. This means clicking a project switches away from hub, and clicking Home returns to it. The existing TodayView task data feeds into the hub's goals tree column rather than being thrown away.

**Warning signs:**
- Hub disappears when clicking any sidebar item
- No way to return to hub after navigating to a project
- Hub and project detail rendering simultaneously
- TodayView tests breaking because the component was deleted rather than refactored

**Phase to address:**
Phase 1 (Hub UI layout) -- this must be the very first thing solved before any hub content is built.

---

### Pitfall 3: Context Manifest Becomes a Token Bomb

**What goes wrong:**
The central context manifest is supposed to give the orchestrator a compact overview of all projects. But it aggregates themes, projects, phases, tasks, progress percentages, blockers, and recent activity into one file. With 10+ projects each having 5+ phases, the manifest easily exceeds the orchestrator's effective context window, making the LLM slow, expensive, and confused. The existing `generate_context_file` command already builds per-project context with token budgets -- the manifest needs to be even more aggressive about compression.

**Why it happens:**
Developers build the manifest bottom-up: query everything from SQLite, serialize it all. The manifest grows linearly with project count and has no natural ceiling. The existing adaptive context builder (v1.2) uses token budgets per-project, but a cross-project manifest has no such guard.

**How to avoid:**
Design the manifest as a two-tier system: (1) a compact index file (~500 tokens max) listing all projects with one-line status and priority score, and (2) per-project detail files that the orchestrator can request on demand via existing `get_project_detail` and `get_phase_status` MCP tools. The manifest is the index only. Set a hard token budget (e.g., 2000 tokens for the full manifest) and truncate/summarize to fit. Use the same SHA-256 change detection pattern from ROADMAP.md sync to avoid regenerating unchanged project summaries.

**Warning signs:**
- Manifest file exceeds 5KB
- LLM responses become slow or hallucinate project details
- Manifest regeneration takes noticeable time (>500ms)
- All project data duplicated between manifest and MCP tool responses

**Phase to address:**
Phase 2 (Context manifest) -- must be designed with the token budget constraint from day one.

---

### Pitfall 4: Daily Briefing LLM Call Blocks App Startup

**What goes wrong:**
The daily briefing calls an LLM to summarize priorities. If this runs synchronously on app open, the hub shows a blank/loading state for 5-15 seconds while waiting for the API response. Users see a broken-looking app every morning. If the LLM provider is down or rate-limited, the hub is permanently stuck.

**Why it happens:**
The briefing is the hero content of the hub -- developers make it the first thing that renders, which means the first thing that blocks. The existing AI layer (`aiSlice.ts`) streams responses, but streaming a briefing into a component that isn't visible yet just wastes the stream.

**How to avoid:**
Cache the last briefing in SQLite with a timestamp. On app open, immediately show the cached briefing (even if stale). Trigger a background refresh that updates the briefing when the LLM responds. Show a subtle "updating..." indicator, not a blocking spinner. If the LLM call fails, the stale briefing stays visible -- it's always better than nothing. Set a 10-second timeout on the briefing call with graceful fallback.

**Warning signs:**
- Hub shows a loading spinner on every app open
- No briefing visible when offline or LLM is unreachable
- Briefing regenerates on every hub navigation (not just daily)
- No cache invalidation -- briefing never updates after first generation

**Phase to address:**
Phase 2 (AI briefing) -- caching strategy must be part of the initial implementation, not a later optimization.

---

### Pitfall 5: Bot Skills With Shell Access Create Unsandboxed Execution

**What goes wrong:**
Extending bot skills to "run commands" and "create files" means the orchestrator (an LLM) can execute arbitrary shell commands on the user's machine. The existing MCP tools are read-only database queries plus file-based queue writes -- all safe. Adding `run_command` and `create_file` tools to the MCP server crosses a critical security boundary. A hallucinating LLM could `rm -rf`, overwrite critical files, or exfiltrate data.

**Why it happens:**
The existing approval workflow (`request_approval` / `check_approval_status`) was designed for phase execution, not individual command approval. Developers add the shell execution tool and assume the existing approve-only mode covers it. But the system prompt says "NEVER execute without approval" -- if the LLM ignores this (which LLMs do), there's no enforcement at the tool level.

**How to avoid:**
Implement tool-level guards in the MCP server, not prompt-level guards. Every `run_command` call must: (1) write to the approval queue and block until approved, (2) restrict commands to a configurable allowlist (e.g., `git`, `npm`, `cargo`, configured CLI tool), (3) scope file operations to project directories only (reject absolute paths outside project roots), (4) log every command execution to a persistent audit trail in SQLite. The `create_file` tool should only write within project directory trees, never to system paths.

**Warning signs:**
- `run_command` tool executes without approval queue check
- No path validation on `create_file` -- accepts absolute paths
- No command allowlist -- any string passed to shell
- Audit trail missing -- no record of what commands were run

**Phase to address:**
Phase 4 (Bot skills) -- security constraints must be designed before any execution capability is added.

---

### Pitfall 6: File-Based Queue Doesn't Scale for Chat Latency

**What goes wrong:**
The existing file-based agent queue (`agent-queue/`) polls every 2 seconds (line 306 of `useAgentQueue.ts`). This is fine for approval requests and status updates that happen every few minutes. But hub chat requires sub-second response times -- a 2-second poll interval means 1-2 seconds of dead time between user message and first response token. The chat feels laggy and unresponsive compared to any modern chat UI.

**Why it happens:**
The file-based queue was designed for low-frequency orchestration events, not conversational interaction. Developers extend it for chat without changing the polling interval, or they decrease the interval to 200ms which creates excessive filesystem I/O.

**How to avoid:**
For chat specifically, use Tauri's filesystem watcher (`notify` crate, already used for `.planning/` sync) to watch the `agent-queue/chat/` directory for new response files instead of polling. This gives near-instant notification when the agent writes a response. Keep the 2-second polling for approvals/notifications/status (they're not latency-sensitive). Alternatively, add a Tauri event bridge: the MCP server writes the file AND emits a Tauri event, the frontend listens for the event and reads the file immediately.

**Warning signs:**
- Chat responses take 2+ seconds to appear after agent writes them
- Polling interval decreased globally (affects all queue types)
- High CPU usage from aggressive polling
- Chat messages arriving out of order due to filesystem timing

**Phase to address:**
Phase 3 (Hub chat) -- the delivery mechanism must be faster than 2-second polling.

---

### Pitfall 7: Goals Tree Re-implements Sidebar Data Without Shared State

**What goes wrong:**
The goals tree (left column of hub) shows themes > projects > phases in a hierarchical view. The sidebar already maintains this exact hierarchy in Zustand (`themeSlice`, `projectSlice`, `phaseSlice`). Developers build the goals tree with its own data fetching and state, creating two sources of truth. When a task is completed in the goals tree, the sidebar doesn't update (and vice versa).

**Why it happens:**
The goals tree and sidebar have different visual presentations (sidebar is navigation, goals tree is progress overview), so developers assume they need different data structures. They write new `fetchGoalsTree()` queries instead of composing from existing store slices.

**How to avoid:**
The goals tree must read from the same Zustand slices as the sidebar: `useStore` for themes/projects, `useStore` (PhaseSlice) for phases, `useTaskStore` for tasks. The goals tree is a read-only view that computes progress percentages from existing data. No new Tauri commands needed for data fetching. If the goals tree needs data the sidebar doesn't have (e.g., completion percentages), add it to the existing slices, not a parallel store.

**Warning signs:**
- New `useGoalsTreeStore` or `goalsTreeSlice` being created
- New Tauri commands duplicating `list_themes`, `list_projects`, `list_phases`
- Goals tree and sidebar showing different completion counts
- Clicking a project in goals tree doesn't navigate (no integration with workspace store)

**Phase to address:**
Phase 1 (Hub UI layout) -- goals tree component must be wired to existing stores from the start.

---

### Pitfall 8: Agent Panel Auto-Start Conflicts with Hub Orchestrator Needs

**What goes wrong:**
`AgentPanel.tsx` auto-starts the agent on mount (line 12: `useEffect(() => { startAgent(); }, [startAgent])`). The hub also needs the agent running to generate briefings and handle chat. If the agent panel is hidden/unmounted (user closes it), the agent stops, and hub features break. Conversely, if both the hub and agent panel try to start the agent, there are race conditions.

**Why it happens:**
The agent lifecycle is coupled to the agent panel's React component lifecycle. This was fine when the panel was the only consumer. Adding the hub as a second consumer exposes the tight coupling.

**How to avoid:**
Lift agent lifecycle out of the AgentPanel component. Make agent start/stop a top-level concern managed in `AppLayout` or a dedicated `AgentProvider`. The agent starts on app launch (not on panel mount) and runs regardless of whether the panel is visible. Both the hub and agent panel are consumers of agent state, not owners of agent lifecycle. The `useAgentLifecycle` hook should be called once at the app level, and its return values should be provided via context or store.

**Warning signs:**
- Agent stops when agent panel is closed
- Agent restarts when toggling agent panel visibility
- Hub chat shows "agent not running" errors when panel is hidden
- Multiple `startAgent()` calls on app load

**Phase to address:**
Phase 1 (Hub UI layout) -- agent lifecycle must be decoupled from panel before hub features are built.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Inline LLM prompt strings for briefing | Fast to iterate | Prompts scattered across codebase, hard to tune | MVP only -- extract to prompt files before v1.5 |
| Polling for chat responses | Simple, matches existing queue pattern | Perceptible latency, wasted CPU | Never for chat -- use fs watcher from day one |
| Single manifest file for all projects | Simple to generate and read | Token budget exceeded at 15+ projects | Acceptable until 10 projects, then must tier |
| Hardcoded briefing schedule (once per day) | Simple caching logic | Users want refresh after completing big tasks | Acceptable for v1.4 -- add manual refresh button |
| Goals tree as static snapshot | Fast render, no subscriptions | Stale data after task completion | Never -- must subscribe to store changes |
| Chat history in memory only | Simple implementation | Lost on app restart, no context for next session | MVP only -- persist to SQLite before v1.5 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Hub chat to MCP orchestrator | Piping stdin to agent terminal PTY | Use file-based queue with fs watcher for chat channel |
| Goals tree to sidebar stores | Creating parallel data-fetching layer | Compose from existing `themeSlice`, `projectSlice`, `phaseSlice` |
| Daily briefing to AI layer | Using `aiSlice` streaming (designed for per-project context) | New briefing-specific flow with caching and cross-project aggregation |
| Bot skills to notification system | Bot sends notification via MCP `send_notification` but no SQLite persistence | Extend `send_notification` handler to also write to notifications table via db, not just queue file |
| Context manifest to `.planning/` sync | Manifest watches `.planning/` files for changes | Manifest reads from SQLite (already synced by existing watcher), not from disk |
| Hub layout to CenterPanel | Swapping TodayView component in the fallback branch | Adding explicit `activeView` state to workspace store for hub navigation |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Manifest regeneration on every store change | 200ms+ delay after each task toggle | Debounce manifest generation (1s), only regenerate on meaningful changes (phase completion, not task edits) | 20+ projects with frequent task updates |
| Goals tree re-rendering entire tree on any task change | Visible jank when checking off tasks | Memoize tree nodes, use granular selectors (`useStore(s => s.projects.find(p => p.id === id))`) | 50+ tasks visible in tree |
| Chat message polling creating new objects each cycle | React re-renders every 2s even with no new messages | Return stable references from poll (compare before updating state), use `useRef` for processed IDs (already done in queue) | Always -- even with 0 messages |
| LLM briefing call on every hub navigation | Unnecessary API calls, increased latency and cost | Cache briefing with date-based invalidation, only regenerate once per day or on manual refresh | Immediately -- users navigate to hub frequently |
| Agent queue file accumulation | Disk usage grows, directory listing slows | Prune processed queue files older than 24h on app startup | 1000+ files after weeks of use |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Bot `run_command` without approval enforcement at tool level | LLM executes arbitrary shell commands if it ignores system prompt | Require approval queue write + poll in MCP handler, not just prompt instruction |
| Bot `create_file` accepting absolute paths | LLM writes to `/etc/`, `~/.ssh/`, or other sensitive locations | Validate all paths are within project `directoryPath` from database |
| Chat messages passed directly to LLM without sanitization | Prompt injection via user input (user crafts message that overrides system prompt) | Separate user message from system context in LLM call -- user input always in `user` role, never concatenated into system prompt |
| Context manifest containing credentials or secrets | API keys from `.env` files synced into manifest | Manifest reads from SQLite entities only, never from filesystem files directly |
| MCP server new tools inherit `_db` read-only pattern but write tools need write access | Bot skills that modify data bypass WAL-mode read-only connection | Create a separate write-capable connection for mutation tools, keep read tools on read-only connection |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Briefing shows loading spinner every morning | User's first impression is "broken app" | Show cached briefing immediately, update in background |
| Hub chat has no typing indicator | User sends message, sees nothing for 3-10s, thinks it failed | Show "thinking..." immediately after send, stream response tokens as they arrive |
| Goals tree is read-only (can't interact) | User sees tasks but must navigate to sidebar to act on them | Allow checkbox toggling directly in goals tree, propagating to existing task store |
| No visual distinction between hub chat and agent panel | User confused about which AI they're talking to | Hub chat labeled "Ask about your day" (conversational), agent panel labeled "Orchestrator" (autonomous) |
| Chat history lost on app restart | User loses context from yesterday's conversation | Persist chat messages to SQLite, show last N messages on hub load |
| Briefing is stale all day | User completes 5 tasks, briefing still says "5 tasks remaining" | Add manual "Refresh briefing" button, auto-refresh after bulk task completions |

## "Looks Done But Isn't" Checklist

- [ ] **Hub navigation:** Can return to hub from any view (project, task, theme) -- verify Home button/shortcut exists
- [ ] **Agent lifecycle:** Agent runs when panel is closed -- verify by closing panel and checking hub chat works
- [ ] **Chat persistence:** Chat history survives app restart -- verify by quitting and relaunching
- [ ] **Briefing cache:** Hub loads instantly with cached briefing -- verify by disconnecting network and opening app
- [ ] **Bot skill safety:** `run_command` requires approval even if system prompt is ignored -- verify by calling tool directly via MCP client
- [ ] **Manifest token budget:** Manifest stays under budget with 15+ projects -- verify by creating test projects
- [ ] **Goals tree reactivity:** Completing a task in goals tree updates sidebar and vice versa -- verify bidirectional
- [ ] **Queue cleanup:** Old queue files are pruned -- verify after running for a week
- [ ] **Chat latency:** Response appears within 500ms of agent writing it -- verify with timestamp comparison
- [ ] **Notification bridge:** Bot `send_notification` creates both queue file AND SQLite notification -- verify in notification popover

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Two chat UIs competing for agent | MEDIUM | Refactor to single agent process with queue-based chat channel, redirect hub chat away from terminal |
| CenterPanel routing broken | LOW | Add `activeView` state to workspace store, update CenterPanel conditional chain |
| Token-bomb manifest | LOW | Add token budget, switch to two-tier index + on-demand detail |
| Blocking briefing call | LOW | Add SQLite cache table, load cached on mount, refresh async |
| Unsandboxed bot commands | HIGH | Retrofit approval enforcement in MCP handler, add path validation, audit existing executions |
| Slow chat polling | MEDIUM | Replace polling with fs watcher for chat directory, keep polling for other queues |
| Duplicate goals tree state | MEDIUM | Delete parallel store, rewire to existing slices, fix any missing data in existing slices |
| Agent lifecycle coupled to panel | MEDIUM | Lift `useAgentLifecycle` to AppLayout, provide via context, remove auto-start from AgentPanel |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hub chat vs agent panel boundary | Phase 1 (Hub UI) + Phase 3 (Chat) | Hub chat sends messages via queue, not terminal PTY |
| CenterPanel routing for hub | Phase 1 (Hub UI) | `activeView` state exists, Home button navigates to hub |
| Token-bomb manifest | Phase 2 (Context manifest) | Manifest under 2000 tokens with 10 test projects |
| Blocking briefing | Phase 2 (AI briefing) | Cached briefing renders within 100ms of hub mount |
| Unsandboxed bot commands | Phase 4 (Bot skills) | Tool-level approval enforcement, path validation, command allowlist |
| Slow chat polling | Phase 3 (Hub chat) | Response latency under 500ms from file write to UI update |
| Duplicate goals tree state | Phase 1 (Hub UI) | Goals tree reads from `useStore` slices, no new fetch commands |
| Agent lifecycle coupling | Phase 1 (Hub UI) | Agent stays running when panel is closed |

## Sources

- Codebase analysis: `src/hooks/useAgentLifecycle.ts`, `src/hooks/useAgentQueue.ts`, `src/hooks/useAgentMcp.ts`
- Codebase analysis: `src/stores/useAgentStore.ts`, `src/stores/notificationSlice.ts`, `src/stores/index.ts`
- Codebase analysis: `mcp-server/src/index.ts`, `mcp-server/src/tools/orchestration-tools.ts`
- Codebase analysis: `src/components/center/TodayView.tsx`, `src/components/layout/CenterPanel.tsx`
- Codebase analysis: `src/components/agent/AgentPanel.tsx` (auto-start on mount pattern)
- MCP SDK stdio transport documentation: 1:1 client-server constraint
- Tauri `notify` crate filesystem watcher: already used for `.planning/` sync
- Memory note: `feedback_zustand_selector_stability.md` -- never return new refs from selectors (relevant to goals tree)

---
*Pitfalls research for: v1.4 Daily Hub — AI-powered home screen with goals tree, briefing, chat, bot skills, and context manifest*
*Researched: 2026-03-31*
