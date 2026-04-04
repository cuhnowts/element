# Phase 21: Central AI Agent - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

A persistent background AI orchestrator that reads all project state, auto-executes safe actions (planning + verified execution), and queues approval requests when human input is needed. Lives in a dedicated sidebar panel with Activity + Terminal views.

</domain>

<decisions>
## Implementation Decisions

### Agent Lifecycle
- **D-01:** Agent starts automatically on app launch (always on). Uses one xterm.js slot permanently.
- **D-02:** Agent lives in a dedicated sidebar panel (not the output drawer). Separate from per-project terminal tabs.
- **D-03:** Sidebar panel has two sub-tabs: "Activity" (structured log of actions, pending approvals, status) and "Terminal" (raw xterm.js output).
- **D-04:** On crash/exit, agent auto-restarts with exponential backoff (2s, 4s, 8s). Max 3 retries before showing error notification.

### Cross-Project Awareness
- **D-05:** Element exposes an MCP server for the agent to connect to. Agent calls tools like `list_projects`, `get_phase_status`, `read_tasks`, etc.
- **D-06:** MCP server scope: read + orchestrate. Agent can read all project state AND orchestrate actions (spawn terminal sessions, trigger notifications, update task status). Full autonomy within approve-only bounds.
- **D-07:** MCP server runs as a separate sidecar process (not embedded in Tauri). Shares SQLite access.

### Action Classification
- **D-08:** Agent auto-executes planning AND execution for phases with zero human-needed flags (no decisions, no UAT). Stops for phases with blockers. User-configurable risk tiers deferred to future iteration.
- **D-09:** Approval requests queue in the Activity tab with a badge count on the sidebar panel. No modal interruption -- user checks when ready. OS-native notification also fires (via Phase 20 notification system).
- **D-10:** Agent detects human-needed state via MCP callback -- the agent calls a `report_status` tool to signal completion/failure/blocked. Self-reporting, not output parsing.

### Agent Identity
- **D-11:** Agent uses the same CLI tool configured in Settings > AI (e.g., `claude`). Same tool as per-project sessions, different system prompt and MCP config.
- **D-12:** When user clicks "Open AI" on a project, the central agent uses MCP tools to spawn a new named terminal session for that project, pre-loaded with context. Agent manages project session lifecycle.
- **D-13:** Agent receives its system prompt and MCP configuration via generated config files (e.g., CLAUDE.md + MCP config). Element generates these at launch. Easy to inspect and debug.

### Claude's Discretion
- Activity tab structure and information density
- MCP server communication protocol (stdio vs local socket)
- Specific MCP tool signatures and response formats
- Agent system prompt content and orchestration loop design

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Architecture
- `.planning/PROJECT.md` -- Core value, constraints, key decisions, tech stack
- `.planning/REQUIREMENTS.md` -- AGENT-01 through AGENT-06 acceptance criteria
- `.planning/ROADMAP.md` -- Phase 21 success criteria and dependencies (Phase 19, Phase 20)

### Dependencies
- Phase 19 (Multi-Terminal Sessions) -- Agent spawns named terminal sessions via this infrastructure
- Phase 20 (Notification System) -- Agent fires notifications through this system's event-driven API

### Existing Code
- `src/hooks/useTerminal.ts` -- Current PTY terminal implementation (single session, xterm.js)
- `src/components/center/OpenAiButton.tsx` -- Current "Open AI" button (generates context file, launches CLI)
- `src/stores/useWorkspaceStore.ts` -- Terminal session state (launchTerminalCommand, terminalSessionKey)
- `src-tauri/src/models/project.rs` -- Project data model (state the MCP server needs to expose)
- `src-tauri/src/commands/onboarding_commands.rs` -- Context file generation (generate_context_file)
- `src/components/settings/AiSettings.tsx` -- CLI tool configuration UI

### State Context
- `.planning/STATE.md` -- "Agent ships in approve-only mode -- cost controls are a launch blocker"
- `.planning/STATE.md` -- "xterm.js instance cap at 5 total to manage memory (~34MB per instance)"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTerminal.ts`: PTY spawn + xterm.js setup pattern. Agent sidebar terminal can reuse this hook with different lifecycle management.
- `OpenAiButton.tsx`: Context file generation + CLI validation flow. Agent needs similar but persistent version.
- `useWorkspaceStore.ts`: Terminal state management pattern. Agent state will need its own store slice.
- `AgentChip.tsx` (`src/components/shared/`): Existing agent-related UI component.

### Established Patterns
- **State management**: Zustand stores with slices (useWorkspaceStore pattern)
- **Tauri IPC**: Commands exposed via `src/lib/tauri-commands.ts`, invoked through `api` object
- **UI framework**: shadcn/ui + Tailwind CSS + Lucide icons
- **Terminal**: xterm.js + tauri-plugin-pty + WebGL addon

### Integration Points
- Sidebar: Agent panel adds alongside existing ThemeSidebar
- Output drawer: Agent-spawned project terminals appear as named tabs (Phase 19 infrastructure)
- Notification system: Agent triggers notifications via Phase 20's event-driven API
- Settings: Agent may need its own settings section (auto-execute tier, restart behavior)

</code_context>

<specifics>
## Specific Ideas

- User noted that auto-execute risk tiers should eventually be user-configurable ("a decision the user makes when they open the app") -- deferred for now but the architecture should support it.
- The sidebar panel approach keeps the agent visible without competing for output drawer terminal slots (important given the 5-instance xterm cap).

</specifics>

<deferred>
## Deferred Ideas

- **User-configurable risk tiers**: Let users choose their auto-execute comfort level (planning-only, planning+execution, everything) at app launch or in settings. Noted during action classification discussion.
- **Agent memory system**: Already in REQUIREMENTS.md as AGENT-10 (future). Agent learns user patterns over time.
- **Proactive work suggestions**: Already in REQUIREMENTS.md as AGENT-11 (future). Agent suggests work based on deadlines and priorities.

</deferred>

---

*Phase: 21-central-ai-agent*
*Context gathered: 2026-03-29*
