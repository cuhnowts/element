# Phase 21: Central AI Agent - Research

**Researched:** 2026-03-29
**Domain:** AI agent orchestration, MCP server, Tauri sidecar, xterm.js lifecycle management
**Confidence:** MEDIUM

## Summary

Phase 21 implements a persistent background AI orchestrator that reads all project state via an MCP server, auto-executes safe phases in approve-only mode, and surfaces notifications when human input is needed. The architecture has three major pillars: (1) an MCP server sidecar process exposing project state as tools, (2) a dedicated agent terminal running the user's configured CLI tool (e.g., `claude`) with the MCP server connected, and (3) a React sidebar panel with Activity and Terminal sub-tabs.

The MCP server is the critical integration piece. It runs as a separate Node.js sidecar process (D-07), compiled via `pkg` or `esbuild` into a standalone binary. The agent CLI session connects to it via stdio transport. The frontend communicates with the MCP server through Tauri shell plugin's sidecar spawning, and the MCP server reads SQLite directly for project state. The agent's system prompt and MCP configuration are generated as files at launch (D-13), making the setup inspectable and debuggable.

**Primary recommendation:** Build the MCP server as a Node.js sidecar using `@modelcontextprotocol/sdk` with stdio transport. The server exposes tools for project/phase/task reads plus orchestration actions (spawn session, report status, send notification). The agent runs in its own xterm.js slot with auto-restart logic. The frontend agent panel is a standalone Zustand store following the existing pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Agent starts automatically on app launch (always on). Uses one xterm.js slot permanently.
- **D-02:** Agent lives in a dedicated sidebar panel (not the output drawer). Separate from per-project terminal tabs.
- **D-03:** Sidebar panel has two sub-tabs: "Activity" (structured log of actions, pending approvals, status) and "Terminal" (raw xterm.js output).
- **D-04:** On crash/exit, agent auto-restarts with exponential backoff (2s, 4s, 8s). Max 3 retries before showing error notification.
- **D-05:** Element exposes an MCP server for the agent to connect to. Agent calls tools like `list_projects`, `get_phase_status`, `read_tasks`, etc.
- **D-06:** MCP server scope: read + orchestrate. Agent can read all project state AND orchestrate actions (spawn terminal sessions, trigger notifications, update task status). Full autonomy within approve-only bounds.
- **D-07:** MCP server runs as a separate sidecar process (not embedded in Tauri). Shares SQLite access.
- **D-08:** Agent auto-executes planning AND execution for phases with zero human-needed flags (no decisions, no UAT). Stops for phases with blockers. User-configurable risk tiers deferred to future iteration.
- **D-09:** Approval requests queue in the Activity tab with a badge count on the sidebar panel. No modal interruption -- user checks when ready. OS-native notification also fires (via Phase 20 notification system).
- **D-10:** Agent detects human-needed state via MCP callback -- the agent calls a `report_status` tool to signal completion/failure/blocked. Self-reporting, not output parsing.
- **D-11:** Agent uses the same CLI tool configured in Settings > AI (e.g., `claude`). Same tool as per-project sessions, different system prompt and MCP config.
- **D-12:** When user clicks "Open AI" on a project, the central agent uses MCP tools to spawn a new named terminal session for that project, pre-loaded with context. Agent manages project session lifecycle.
- **D-13:** Agent receives its system prompt and MCP configuration via generated config files (e.g., CLAUDE.md + MCP config). Element generates these at launch. Easy to inspect and debug.

### Claude's Discretion
- Activity tab structure and information density
- MCP server communication protocol (stdio vs local socket)
- Specific MCP tool signatures and response formats
- Agent system prompt content and orchestration loop design

### Deferred Ideas (OUT OF SCOPE)
- **User-configurable risk tiers**: Let users choose their auto-execute comfort level (planning-only, planning+execution, everything) at app launch or in settings.
- **Agent memory system**: Already in REQUIREMENTS.md as AGENT-10 (future). Agent learns user patterns over time.
- **Proactive work suggestions**: Already in REQUIREMENTS.md as AGENT-11 (future). Agent suggests work based on deadlines and priorities.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AGENT-01 | A persistent central AI agent runs in its own terminal session, always available | Agent lifecycle management: auto-start on launch, dedicated xterm.js slot in sidebar, auto-restart with backoff. MCP server sidecar provides always-on data access. |
| AGENT-02 | The central agent has cross-project awareness -- can read state of all projects | MCP server tools: `list_projects`, `get_project_detail`, `list_phases`, `list_tasks`, `get_phase_status`. Direct SQLite read access from sidecar. |
| AGENT-03 | When user clicks "Open AI" on a project, the central agent feeds context to the project-specific AI session | Agent MCP tool `spawn_project_session` creates named terminal via Phase 19 infrastructure, generates context file, launches CLI. OpenAiButton delegates to agent instead of direct spawn. |
| AGENT-04 | The agent auto-executes low-risk actions with configurable risk tiers | Approve-only mode: agent determines phase readiness via MCP tools, creates approval request, waits for user confirmation via `check_approval_status` tool. Risk tiers deferred. |
| AGENT-05 | The agent notifies the user when human input is needed | Agent calls `send_notification` MCP tool which triggers Phase 20 notification system (OS-native + in-app). Approval requests appear in Activity tab with badge count. |
| AGENT-06 | The agent has its own skills/tools for reading project state, managing sessions, and orchestrating work | MCP server provides full tool suite: read tools (projects, phases, tasks), orchestration tools (spawn session, report status, send notification, request approval), and state mutation tools (update task status). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | 1.28.0 | MCP server implementation | Official TypeScript SDK for Model Context Protocol. Provides Server class, stdio transport, tool/resource registration with zod schema validation. |
| @tauri-apps/plugin-shell | 2.3.5 | Sidecar process management | Official Tauri 2 plugin for spawning child processes. Needed to launch and manage the MCP server sidecar and potentially the agent CLI process. |
| better-sqlite3 | 11.x | SQLite access from MCP sidecar | Synchronous SQLite driver for Node.js. The MCP server sidecar needs to read the same element.db that Tauri writes to. better-sqlite3 is the standard choice for read-heavy Node.js SQLite access. |
| zustand | 5.0.11 | Agent panel state (already in project) | Existing state management library. Agent store follows established pattern (useWorkspaceStore, useTaskStore). |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 3.x | Tool schema validation | Required by @modelcontextprotocol/sdk for defining tool input schemas. Already a transitive dependency of the SDK. |
| esbuild | 0.25.x | Bundle MCP server to single file | Bundle the TypeScript MCP server into a single JavaScript file for the sidecar. Lighter than pkg -- avoids bundling entire Node.js runtime. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| better-sqlite3 | Tauri IPC from sidecar | Adds coupling. Sidecar would need to call back into Tauri for reads, creating circular dependency. Direct SQLite is simpler and faster. |
| esbuild (bundle only) | pkg (compile to binary) | pkg bundles entire Node.js runtime (~50MB), ensuring no Node.js dependency. esbuild produces a .js file requiring Node.js on the system. Since the target user likely has Node.js installed (developer tool), esbuild is more practical. Fall back to pkg if Node.js cannot be assumed. |
| stdio MCP transport | Local HTTP/SSE transport | stdio is simpler, lower latency, no port conflicts. HTTP adds network stack overhead for local-only communication. stdio is the MCP standard for local integrations. |

**Installation:**
```bash
npm install @tauri-apps/plugin-shell
# MCP server is a separate sub-project with its own package.json:
# mcp-server/package.json
npm install @modelcontextprotocol/sdk better-sqlite3 zod
npm install -D esbuild @types/better-sqlite3 typescript
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    agent/
      AgentPanel.tsx           # Right sidebar panel container
      AgentPanelHeader.tsx     # Status dot, sub-tabs, collapse
      AgentActivityTab.tsx     # Activity log with approvals
      AgentActivityEntry.tsx   # Single activity item
      ApprovalRequest.tsx      # Approval item with actions
      AgentTerminalTab.tsx     # Agent xterm.js wrapper
      AgentToggleButton.tsx    # Header button with badge
  stores/
    useAgentStore.ts           # Agent panel + activity state
  hooks/
    useAgentLifecycle.ts       # Agent process management (start, restart, crash handling)
    useAgentMcp.ts             # MCP server sidecar lifecycle
mcp-server/
  src/
    index.ts                   # MCP server entry point
    tools/
      project-tools.ts         # list_projects, get_project_detail
      phase-tools.ts           # list_phases, get_phase_status
      task-tools.ts            # list_tasks, update_task_status
      orchestration-tools.ts   # spawn_project_session, request_approval, send_notification, report_status
    db.ts                      # SQLite connection (read-only to element.db)
  package.json
  tsconfig.json
  build.ts                     # esbuild bundle script
```

### Pattern 1: MCP Server as Sidecar Process
**What:** A standalone Node.js process that implements the MCP protocol over stdio, providing tools for reading project state and orchestrating actions.
**When to use:** When an external CLI tool (like `claude`) needs structured access to app data without embedding into the Tauri process.
**Example:**
```typescript
// mcp-server/src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import Database from "better-sqlite3";

const DB_PATH = process.argv[2]; // Passed by Tauri at launch
const db = new Database(DB_PATH, { readonly: true });

const server = new Server(
  { name: "element-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_projects",
      description: "List all projects with their current state",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_phase_status",
      description: "Get status of all phases for a project",
      inputSchema: {
        type: "object",
        properties: { projectId: { type: "string" } },
        required: ["projectId"],
      },
    },
    // ... more tools
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case "list_projects": {
      const rows = db.prepare(
        "SELECT id, name, description, directory_path, planning_tier FROM projects"
      ).all();
      return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
    }
    // ... handle other tools
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Pattern 2: Agent CLI Launch with MCP Config
**What:** Element generates a temporary MCP config JSON and CLAUDE.md system prompt, then launches the CLI tool with `--mcp-config` pointing to the MCP server sidecar.
**When to use:** At app startup (D-01) and on agent restart (D-04).
**Example:**
```typescript
// useAgentLifecycle.ts - conceptual
const mcpConfig = {
  mcpServers: {
    element: {
      type: "stdio",
      command: "node",
      args: [mcpServerBundlePath, dbPath],
    },
  },
};

const agentArgs = [
  ...userConfiguredArgs,
  "--mcp-config", JSON.stringify(mcpConfig),
  `@${agentSystemPromptPath}`, // CLAUDE.md with agent instructions
];

// Spawn via useTerminal hook in the agent sidebar panel
launchAgentTerminal(cliCommand, agentArgs);
```

### Pattern 3: Approval Flow via MCP Self-Reporting (D-10)
**What:** The agent uses MCP tools to request approval and poll for status, rather than Element parsing terminal output.
**When to use:** When the agent determines a phase is ready for execution.
**Flow:**
1. Agent calls `request_approval` tool with project/phase details
2. MCP server writes approval request to a shared state file or IPC channel
3. Frontend picks up the request (via Tauri event emit from MCP server) and shows it in Activity tab
4. User clicks Approve/Reject
5. Frontend writes decision back (file or IPC)
6. Agent calls `check_approval_status` tool, gets result, proceeds or stops

### Pattern 4: Agent Store as Standalone Zustand Store
**What:** Agent state lives in its own `useAgentStore` (like `useWorkspaceStore`) rather than in the main composite store.
**When to use:** Agent state is session-only, not persisted, and has different lifecycle from project/task state.
**Example:**
```typescript
// stores/useAgentStore.ts
import { create } from "zustand";

// Shape defined in 21-UI-SPEC.md AgentState interface
export const useAgentStore = create<AgentState>()((set, get) => ({
  panelOpen: false,
  activeTab: "activity",
  status: "starting",
  restartCount: 0,
  entries: [],
  pendingApprovalCount: () =>
    get().entries.filter(
      (e) => e.type === "approval_request" && e.approvalStatus === "pending"
    ).length,
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  // ... rest of actions
}));
```

### Anti-Patterns to Avoid
- **Output parsing for agent state:** Never parse xterm.js output to determine what the agent is doing. Use MCP self-reporting tools (D-10). Terminal output is for human debugging only.
- **Embedding MCP server in Tauri process:** The MCP server must be a sidecar (D-07). Embedding it would require Rust MCP implementation and couples the server lifecycle to the app process.
- **Shared mutable state between sidecar and Tauri:** The MCP sidecar reads SQLite in read-only mode. Write operations go through Tauri IPC commands. The sidecar signals the frontend via stdout messages or a simple file/IPC mechanism for approval flow.
- **Agent panel competing for xterm.js cap:** The agent uses 1 of the 5 xterm.js slots permanently (D-01). Plans must account for this in the terminal budget (4 remaining for project sessions).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol implementation | Custom JSON-RPC over stdio | `@modelcontextprotocol/sdk` Server + StdioServerTransport | MCP spec is complex (capabilities negotiation, request/response framing, tool schemas). SDK handles all protocol details. |
| SQLite access from Node.js sidecar | Custom file reading / Tauri IPC bridge | `better-sqlite3` | Synchronous, fast, well-tested. Handles WAL mode, concurrent readers correctly. |
| Sidecar process lifecycle | Manual child_process spawn | `@tauri-apps/plugin-shell` Command.sidecar() | Handles binary resolution, platform-specific paths, stdio piping, and cleanup. |
| Terminal instance management | Custom PTY wrapper | Existing `useTerminal` hook with modified lifecycle | The hook already handles xterm.js + PTY setup, resize, cleanup. Agent just needs different restart behavior. |
| Exponential backoff | Manual setTimeout chain | Simple utility function (3 retries, hardcoded delays) | Only 3 retries with fixed 2/4/8s delays (D-04). Too simple to warrant a library, but don't inline the logic in the component. |

**Key insight:** The MCP SDK is the critical "don't hand-roll" item. Building a custom JSON-RPC protocol over stdio would take days and be fragile. The SDK provides type-safe tool registration, schema validation, and transport abstraction in a well-tested package.

## Common Pitfalls

### Pitfall 1: SQLite WAL Locking Between Tauri and Sidecar
**What goes wrong:** Two processes (Tauri Rust and Node.js sidecar) accessing the same SQLite file can cause SQLITE_BUSY errors or data corruption if WAL mode isn't properly configured.
**Why it happens:** SQLite allows multiple concurrent readers in WAL mode, but the default journal mode is DELETE which locks the entire file during writes.
**How to avoid:** Ensure the Tauri side enables WAL mode (`PRAGMA journal_mode=WAL;`). Open the sidecar connection as read-only (`{ readonly: true }` in better-sqlite3). Add busy timeout on both sides (`PRAGMA busy_timeout = 5000;`).
**Warning signs:** Intermittent "database is locked" errors, especially during rapid project state updates.

### Pitfall 2: xterm.js Memory Budget Exceeded
**What goes wrong:** Agent's permanent xterm.js slot plus project terminals exceed the 5-instance cap, causing ~170MB+ memory usage from terminals alone.
**Why it happens:** Agent takes 1 slot permanently. If Phase 19 multi-terminal allows 4+ sessions, the cap is silently exceeded.
**How to avoid:** Agent terminal counts toward the 5-instance global cap. Phase 19 must reserve 1 slot for the agent and limit project terminals to 4 total across all projects.
**Warning signs:** Memory usage climbing, sluggish UI, xterm.js WebGL context failures.

### Pitfall 3: Agent Process Zombie After App Close
**What goes wrong:** The CLI process (e.g., `claude`) spawned via PTY continues running after the Tauri app closes, consuming API credits.
**Why it happens:** PTY processes may not receive SIGTERM when the parent Tauri process exits, especially on macOS.
**How to avoid:** Register a cleanup handler in Tauri's `on_exit` or window close event that sends SIGTERM to the agent PTY, with SIGKILL fallback after 5 seconds. Also clean up the MCP server sidecar process.
**Warning signs:** `ps aux | grep claude` showing orphan processes after app close.

### Pitfall 4: MCP Config JSON Escaping
**What goes wrong:** The `--mcp-config` flag receives malformed JSON because of shell escaping issues when passing complex JSON strings through PTY spawn.
**Why it happens:** JSON strings with quotes, backslashes, or special characters get mangled by shell interpretation.
**How to avoid:** Write the MCP config to a temporary file and pass the file path instead, or use the `.mcp.json` project-level config approach. Element generates these files at launch (D-13), which avoids shell escaping entirely.
**Warning signs:** Agent fails to start with "invalid JSON" errors in terminal output.

### Pitfall 5: Approval Flow Race Conditions
**What goes wrong:** User approves/rejects while the agent is polling, leading to stale reads or double-execution.
**Why it happens:** The approval state lives in the frontend (Zustand) but the agent reads it via MCP tools. There's an inherent delay between UI action and agent's next poll.
**How to avoid:** Use a file-based or IPC-based approval queue that both sides can atomically read/write. The MCP server mediates access. Approval IDs must be unique and idempotent -- approving the same ID twice is a no-op.
**Warning signs:** Agent executing a phase that was already rejected, or executing twice.

### Pitfall 6: Sidecar Binary Not Found at Runtime
**What goes wrong:** The MCP server sidecar binary isn't found when the app launches in production (works in dev).
**Why it happens:** Tauri's sidecar binary resolution uses target-triple naming conventions (`element-mcp-aarch64-apple-darwin`) and looks in specific directories. Dev and production paths differ.
**How to avoid:** If using esbuild (JS bundle, not compiled binary), the sidecar is a JS file that runs via `node`. Configure the sidecar path relative to the app's resource directory. For dev, use the source path directly. For production, include in Tauri's `bundle.externalBin` or `bundle.resources`.
**Warning signs:** "Command not found" or "ENOENT" errors at app startup.

## Code Examples

### MCP Server Tool Registration (Verified Pattern)
```typescript
// Source: @modelcontextprotocol/sdk documentation + npm README
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "element-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Register tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_projects",
      description: "List all projects with phases, tasks, and progress",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "request_approval",
      description: "Request user approval before executing a phase",
      inputSchema: {
        type: "object" as const,
        properties: {
          projectId: { type: "string", description: "Project ID" },
          projectName: { type: "string", description: "Project display name" },
          phaseName: { type: "string", description: "Phase to execute" },
          reason: { type: "string", description: "Why this phase is ready" },
        },
        required: ["projectId", "projectName", "phaseName", "reason"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  // ... dispatch to handler functions
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tauri Sidecar Spawn (Shell Plugin)
```typescript
// Source: https://v2.tauri.app/plugin/shell/
import { Command } from "@tauri-apps/plugin-shell";

// Option A: Bundled sidecar binary
const sidecar = Command.sidecar("binaries/element-mcp", [dbPath]);
sidecar.stdout.on("data", (line) => {
  // MCP server diagnostic output (not protocol -- protocol goes to agent)
});
sidecar.on("close", ({ code }) => {
  console.log(`MCP server exited with code ${code}`);
});
const child = await sidecar.spawn();

// Option B: Run via node (dev mode / no bundled binary)
const cmd = Command.create("node", [mcpServerPath, dbPath]);
const child = await cmd.spawn();
```

### Agent Auto-Restart with Exponential Backoff (D-04)
```typescript
// hooks/useAgentLifecycle.ts - conceptual
const BACKOFF_MS = [2000, 4000, 8000]; // D-04: 2s, 4s, 8s
const MAX_RETRIES = 3;

function useAgentLifecycle() {
  const { status, restartCount, setStatus, incrementRestart, resetRestartCount } =
    useAgentStore();

  const startAgent = useCallback(async () => {
    setStatus("starting");
    try {
      // 1. Generate agent config files (D-13)
      const { systemPromptPath, mcpConfigPath } = await generateAgentConfig();
      // 2. Read CLI settings
      const command = await api.getAppSetting("cli_command");
      const args = await api.getAppSetting("cli_args");
      // 3. Launch agent in dedicated terminal
      // ... spawn via useTerminal with agent-specific lifecycle
      setStatus("running");
      resetRestartCount();
    } catch (err) {
      handleAgentCrash();
    }
  }, []);

  const handleAgentCrash = useCallback(() => {
    if (restartCount >= MAX_RETRIES) {
      setStatus("stopped");
      // Fire error notification via Phase 20 system
      return;
    }
    setStatus("error");
    incrementRestart();
    const delay = BACKOFF_MS[restartCount] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
    setTimeout(startAgent, delay);
  }, [restartCount]);

  return { startAgent, handleAgentCrash };
}
```

### Agent System Prompt Generation (D-13)
```typescript
// Conceptual -- Element generates this at app launch
function generateAgentSystemPrompt(): string {
  return `You are Element's central AI agent. You manage work across all projects.

## Your Tools
You have MCP tools to read project state and orchestrate work:
- list_projects: See all projects and their current state
- get_phase_status: Check phases for a specific project
- list_tasks: Get tasks for a project/phase
- request_approval: Ask the user to approve phase execution
- check_approval_status: Poll for approval decision
- report_status: Signal completion, failure, or blocked state
- send_notification: Trigger a user notification
- spawn_project_session: Create a named terminal for a project

## Operating Mode
You run in APPROVE-ONLY mode:
1. Scan projects for phases ready to execute
2. A phase is "ready" when all prior phases are complete and no human blockers exist
3. Call request_approval before executing any phase
4. Wait for approval via check_approval_status
5. On approval, proceed with execution
6. On rejection, skip and move to next candidate
7. Report status after each action

## Rules
- NEVER execute without approval
- ALWAYS use report_status to signal outcomes
- If you encounter an error, report it and wait for instructions
- Be concise in activity log messages`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom JSON-RPC for tool access | MCP protocol (standardized) | Late 2024 | Standard protocol means any MCP-compatible CLI tool works, not just Claude |
| Output parsing for agent state | MCP self-reporting tools | MCP adoption 2025 | Reliable, structured state communication instead of fragile regex parsing |
| Embedded AI runtime | External CLI tool as agent | Current design | No need to embed LLM runtime -- leverage user's existing Claude/GPT CLI |

**Deprecated/outdated:**
- `@modelcontextprotocol/sdk` v0.x API: v1.x changed the Server constructor and request handler registration. Use the v1.x pattern shown in examples above.

## Open Questions

1. **MCP Server Write Path for Approvals**
   - What we know: The agent calls `request_approval` via MCP, and the frontend needs to receive and display this. The agent later calls `check_approval_status` to poll.
   - What's unclear: The exact IPC mechanism between the MCP server sidecar and the Tauri frontend for bidirectional approval flow. Options: (a) MCP server writes to a temp file, frontend watches via Tauri fs events; (b) MCP server sends a Tauri event via a lightweight HTTP call to localhost; (c) Both sides read/write a shared JSON file with file locking.
   - Recommendation: Use approach (a) -- file-based queue in the app data directory. The MCP sidecar writes approval requests as JSON files, Tauri watches the directory (reuse existing watcher pattern from planning sync), and writes approval decisions back. Simple, debuggable, no network stack.

2. **Node.js Requirement for MCP Sidecar**
   - What we know: Using esbuild to bundle the MCP server produces a .js file that requires Node.js at runtime.
   - What's unclear: Whether the target user always has Node.js installed.
   - Recommendation: For v1, require Node.js (target users are developers). Document this as a system requirement. If needed later, switch to `pkg` or `sea` (Node.js single executable applications) to bundle the runtime.

3. **Agent CLI Tool Compatibility Beyond Claude**
   - What we know: D-11 says the agent uses the same CLI tool from Settings. The MCP config and system prompt approach is designed for `claude` CLI.
   - What's unclear: Whether other CLI tools (e.g., `aider`, `cursor`) support `--mcp-config` and `@file` context loading the same way.
   - Recommendation: Design the agent launcher to be CLI-agnostic in interface but test primarily with `claude`. The system prompt file and MCP config file generation should be generic (CLAUDE.md is just a file path). Document supported CLI tools.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node | MCP server sidecar | TBD (check at runtime) | 18+ required | Error notification: "Node.js required for AI agent" |
| claude CLI | Agent process | TBD (user-configured) | Any | User configures in Settings > AI |
| @tauri-apps/plugin-shell | Sidecar management | Not yet installed | 2.3.5 | Must install -- no fallback |
| tauri-plugin-notification | Phase 20 notifications | Not yet installed | 2.x | Must be delivered by Phase 20 |

**Missing dependencies with no fallback:**
- `@tauri-apps/plugin-shell` must be installed (npm + Cargo)
- Phase 19 (multi-terminal) must be complete -- agent needs to spawn named project sessions
- Phase 20 (notifications) must be complete -- agent needs to fire notifications

**Missing dependencies with fallback:**
- Node.js: If not installed, agent feature is disabled with informative message. App works without agent.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | vite.config.ts (test section) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGENT-01 | Agent store initializes with correct defaults, status transitions work | unit | `npx vitest run src/stores/useAgentStore.test.ts -t "agent store"` | Wave 0 |
| AGENT-01 | Auto-restart logic with exponential backoff | unit | `npx vitest run src/hooks/useAgentLifecycle.test.ts` | Wave 0 |
| AGENT-02 | MCP server list_projects tool returns correct data | unit | `npx vitest run mcp-server/src/__tests__/project-tools.test.ts` | Wave 0 |
| AGENT-03 | OpenAiButton delegates to agent when agent is running | unit | `npx vitest run src/components/center/OpenAiButton.test.tsx -t "delegates to agent"` | Existing file, new test |
| AGENT-04 | Approval flow: request, approve, reject state transitions | unit | `npx vitest run src/stores/useAgentStore.test.ts -t "approval"` | Wave 0 |
| AGENT-05 | Agent activity entries added correctly, pending count computed | unit | `npx vitest run src/stores/useAgentStore.test.ts -t "entries"` | Wave 0 |
| AGENT-06 | MCP server registers all required tools | unit | `npx vitest run mcp-server/src/__tests__/tool-registry.test.ts` | Wave 0 |
| UI | AgentPanel renders, sub-tabs switch, toggle works | unit | `npx vitest run src/components/agent/__tests__/AgentPanel.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/stores/useAgentStore.test.ts` -- covers AGENT-01, AGENT-04, AGENT-05
- [ ] `src/hooks/useAgentLifecycle.test.ts` -- covers AGENT-01 restart logic
- [ ] `mcp-server/src/__tests__/project-tools.test.ts` -- covers AGENT-02
- [ ] `mcp-server/src/__tests__/tool-registry.test.ts` -- covers AGENT-06
- [ ] `src/components/agent/__tests__/AgentPanel.test.tsx` -- covers UI rendering
- [ ] MCP server test infrastructure: separate vitest config or jest config in mcp-server/

## Sources

### Primary (HIGH confidence)
- [@modelcontextprotocol/sdk npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - Version 1.28.0, API patterns, Server class usage
- [Tauri 2 Shell Plugin](https://v2.tauri.app/plugin/shell/) - Sidecar spawning, stdio communication, permissions
- [Tauri 2 Node.js Sidecar Guide](https://v2.tauri.app/learn/sidecar-nodejs/) - Binary bundling, configuration, communication patterns
- [Claude Code MCP Docs](https://code.claude.com/docs/en/mcp) - MCP config JSON format, .mcp.json file locations, --mcp-config flag

### Secondary (MEDIUM confidence)
- [MCP Architecture Specification](https://modelcontextprotocol.io/specification/2025-06-18/architecture) - Protocol design, transport mechanisms
- [MCP Build Server Tutorial](https://modelcontextprotocol.io/docs/develop/build-server) - Server implementation patterns
- [Claude Code CLI Reference](https://smartscope.blog/en/generative-ai/claude/claude-code-reference-guide/) - CLI flags: --mcp-config, --system-prompt, --agent

### Tertiary (LOW confidence)
- [MCP Sidecar Pattern](https://hatasaki.medium.com/mcp-sidecar-pattern-89c7ca254db6) - Architectural pattern validation (community source)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - MCP SDK API verified via npm, but integration with Tauri sidecar pattern is novel and untested in this specific combination
- Architecture: MEDIUM - Pattern is well-established (MCP server + CLI tool), but the approval flow IPC mechanism is an open question
- Pitfalls: HIGH - SQLite concurrent access, xterm.js memory, and process cleanup are well-documented issues with known mitigations

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (MCP SDK is actively evolving, check for major version changes)
