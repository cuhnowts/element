# Phase 25: Bot Skills and MCP Write Tools - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

The orchestrator can take action on the user's behalf -- creating tasks, updating statuses, running commands -- from both the interactive hub chat and the background MCP sidecar agent. This phase wires write capabilities through two surfaces: tool_use in hub chat and new MCP write tools for the background agent, unified by a shared action registry.

</domain>

<decisions>
## Implementation Decisions

### Action Dispatch Model
- **D-01:** Hub chat LLM produces actions via **tool_use native** blocks (not JSON extraction). The AI gateway already supports tool definitions -- chat frontend parses tool_use from streaming responses and dispatches to Tauri commands.
- **D-02:** A **shared action registry** is the single source of truth for all available skills. Each entry defines: name, input schema, destructive flag, and handler. Hub chat maps tool_use calls to the registry; MCP server exposes the same registry as MCP tools. Both paths validate against the same schema.
- **D-03:** When the LLM sends tool definitions to the AI provider, they are generated from the shared action registry (not hardcoded).

### Confirmation UX
- **D-04:** Interactive hub chat uses **inline chat confirmation** for destructive actions -- bot renders a warning message with Approve/Reject buttons inline in the conversation. Action blocks until user clicks.
- **D-05:** Background agent continues using the **existing approval queue** (Activity tab with badge count, check_approval_status polling). No change to background agent confirmation flow.
- **D-06:** Destructive flag is **registry-flagged** -- each action in the shared registry has a `destructive: boolean`. Initially: deletes and shell commands are destructive. Easy to extend later.

### Shell Execution
- **D-07:** **Tight allowlist** for shell commands. Default allows: git (status, log, diff, branch), npm/yarn/pnpm (test, build, run), ls, cat, head, tail, wc, echo, date, pwd. Everything else rejected.
- **D-08:** User can **extend the allowlist** via Settings > AI > Shell Allowlist.
- **D-09:** Shell commands default to **project CWD** when chat context has an active project with a linked directory. Falls back to home directory for non-project context.
- **D-10:** Shell output renders as a **collapsible code block** in chat. Expanded for short output (<20 lines), collapsed for long output. Truncated at ~200 lines.

### Write Tool Surface (MCP)
- **D-11:** Full entity CRUD exposed via MCP: **Task** (create_task, update_task, update_task_status, delete_task), **Phase** (update_phase_status), **Project/Theme** (create_project, create_theme), **File** (create_file to project linked directory).
- **D-12:** Delete operations are available to **both** interactive chat and background agent, but **always require human approval** regardless of path (inline confirmation for chat, approval queue for background agent).

### Claude's Discretion
- Action result feedback UX in hub chat (inline card vs text confirmation vs other approach)
- Shell command timeout values
- MCP write tool input schema details (required vs optional fields)
- Specific Tauri command wiring for new operations (create_project, create_theme, create_file)
- Whether to reuse the existing plugin shell.rs or create a new shell execution path for bot skills

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- SKILL-01 through SKILL-04 acceptance criteria

### Phase Dependencies
- `.planning/phases/21-central-ai-agent/21-CONTEXT.md` -- MCP sidecar architecture, approval queue design, agent lifecycle decisions (D-05 through D-13)
- `.planning/ROADMAP.md` -- Phase 25 success criteria and dependencies (Phase 24, Phase 21)

### Existing MCP Server
- `mcp-server/src/index.ts` -- Current MCP server with 10 read/orchestration tools (the write tools extend this)
- `mcp-server/src/tools/` -- Tool handler modules (project-tools, phase-tools, task-tools, orchestration-tools)
- `mcp-server/src/db.ts` -- SQLite database access for MCP server

### Agent Infrastructure
- `src/hooks/useAgentMcp.ts` -- MCP config generation and system prompt (tool list in prompt needs updating)
- `src/hooks/useAgentQueue.ts` -- File-based agent queue (approvals, notifications, status, sessions)
- `src/hooks/useAgentLifecycle.ts` -- Agent startup, restart, crash recovery
- `src/stores/useAgentStore.ts` -- Agent state (entries, approval handling)

### Existing Backend Commands
- `src-tauri/src/commands/task_commands.rs` -- create_task, update_task, update_task_status (reusable for registry handlers)
- `src-tauri/src/commands/phase_commands.rs` -- Phase status updates
- `src-tauri/src/plugins/core/shell.rs` -- Existing shell execution plugin (potential reuse for bot shell skill)
- `src-tauri/src/plugins/api.rs` -- Plugin API including execute_shell

### Hub Chat (Phase 24 dependency)
- Hub chat sends messages via AI gateway with tool definitions
- Chat component renders streaming responses with markdown

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `task_commands.rs`: Full task CRUD already exposed as Tauri commands (create_task, update_task, update_task_status). Registry handlers can invoke these directly.
- `plugins/core/shell.rs`: Shell command execution with output capture. May be reusable for the bot shell skill.
- `useAgentQueue.ts`: File-based queue with subdirectories for approvals/notifications/status/sessions. Background agent destructive actions route through this.
- `useAgentStore.ts`: Approval status management (pending/approved/rejected). Inline chat confirmation is a new pattern but can follow similar state logic.
- `mcp-server/src/tools/`: Modular tool handler pattern. New write tools follow the same structure (e.g., `write-tools.ts`).

### Established Patterns
- MCP tools are defined in `index.ts` ListToolsRequestSchema handler and dispatched via switch in CallToolRequestSchema handler
- Agent queue uses file-based JSON messages in appDataDir subdirectories
- Tauri commands are registered in `lib.rs` invoke_handler and called from frontend via `invoke()`
- AI gateway handles streaming responses with tool_use parsing (Phase 24 infrastructure)

### Integration Points
- **MCP server** (`mcp-server/src/index.ts`): Add new write tool definitions and handlers
- **Agent system prompt** (`useAgentMcp.ts`): Update tool list to include new write tools
- **Hub chat component**: Parse tool_use blocks from streaming response, dispatch via shared registry
- **Action registry**: New module -- bridges hub chat tool_use and MCP tool calls to Tauri commands
- **Settings UI**: Add shell allowlist configuration (extends existing AI settings)

</code_context>

<specifics>
## Specific Ideas

- Shell allowlist should be user-extensible via Settings > AI, not just a hardcoded list
- Collapsible output blocks for shell results (expanded <20 lines, collapsed otherwise)
- Registry-based destructive flagging makes it easy to add new destructive actions without code changes

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 25-bot-skills-and-mcp-write-tools*
*Context gathered: 2026-04-01*
