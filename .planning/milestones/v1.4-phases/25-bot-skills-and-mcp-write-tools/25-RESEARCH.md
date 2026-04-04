# Phase 25: Bot Skills and MCP Write Tools - Research

**Researched:** 2026-04-01
**Domain:** Action dispatch from LLM tool_use, MCP write tools, shell execution with allowlist, confirmation UX
**Confidence:** HIGH

## Summary

Phase 25 wires write capabilities through two surfaces: (1) hub chat tool_use dispatch to Tauri commands and (2) MCP sidecar write tools for the background agent. Both paths are unified by a shared action registry that defines available skills, input schemas, destructive flags, and handlers.

The codebase is well-positioned for this phase. All entity CRUD Tauri commands already exist (create_task, update_task, update_task_status, delete_task, create_project, create_theme, create_phase, etc.) and emit events. The MCP server has a clean modular tool pattern. Shell execution infrastructure exists in two places (plugins/core/shell.rs and engine/shell.rs). The main gap is that the AI gateway has **zero tool_use support** -- the `AiProvider` trait only supports text completions. Phase 24 (hub chat) must add tool_use support to the gateway, or Phase 25 must handle it. This is the most critical dependency to track.

**Primary recommendation:** Build the shared action registry as a TypeScript module that defines all skills with schemas and destructive flags. Hub chat consumes it to generate tool definitions for the LLM and dispatch tool_use results. MCP server consumes it (or a parallel definition) to expose write tools. Shell allowlist is a separate concern gated at the handler level.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Hub chat LLM produces actions via tool_use native blocks (not JSON extraction). AI gateway already supports tool definitions -- chat frontend parses tool_use from streaming responses and dispatches to Tauri commands.
- **D-02:** A shared action registry is the single source of truth for all available skills. Each entry defines: name, input schema, destructive flag, and handler. Hub chat maps tool_use calls to the registry; MCP server exposes the same registry as MCP tools. Both paths validate against the same schema.
- **D-03:** When the LLM sends tool definitions to the AI provider, they are generated from the shared action registry (not hardcoded).
- **D-04:** Interactive hub chat uses inline chat confirmation for destructive actions -- bot renders a warning message with Approve/Reject buttons inline in the conversation. Action blocks until user clicks.
- **D-05:** Background agent continues using the existing approval queue (Activity tab with badge count, check_approval_status polling). No change to background agent confirmation flow.
- **D-06:** Destructive flag is registry-flagged -- each action in the shared registry has a `destructive: boolean`. Initially: deletes and shell commands are destructive. Easy to extend later.
- **D-07:** Tight allowlist for shell commands. Default allows: git (status, log, diff, branch), npm/yarn/pnpm (test, build, run), ls, cat, head, tail, wc, echo, date, pwd. Everything else rejected.
- **D-08:** User can extend the allowlist via Settings > AI > Shell Allowlist.
- **D-09:** Shell commands default to project CWD when chat context has an active project with a linked directory. Falls back to home directory for non-project context.
- **D-10:** Shell output renders as a collapsible code block in chat. Expanded for short output (<20 lines), collapsed for long output. Truncated at ~200 lines.
- **D-11:** Full entity CRUD exposed via MCP: Task (create_task, update_task, update_task_status, delete_task), Phase (update_phase_status), Project/Theme (create_project, create_theme), File (create_file to project linked directory).
- **D-12:** Delete operations are available to both interactive chat and background agent, but always require human approval regardless of path.

### Claude's Discretion
- Action result feedback UX in hub chat (inline card vs text confirmation vs other approach)
- Shell command timeout values
- MCP write tool input schema details (required vs optional fields)
- Specific Tauri command wiring for new operations (create_project, create_theme, create_file)
- Whether to reuse the existing plugin shell.rs or create a new shell execution path for bot skills

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SKILL-01 | Bot can dispatch app actions from chat (create task, update status, navigate) via Tauri commands | Shared action registry maps tool_use calls to existing Tauri commands. All CRUD commands exist. |
| SKILL-02 | MCP sidecar gains write tools (create_task, update_task_status, create_file) for background agent | MCP server module pattern supports adding write-tools.ts. DB must switch from readonly to read-write. |
| SKILL-03 | Bot can execute shell commands with tool-level allowlist enforcement and user approval | ShellPlugin exists in plugins/core/shell.rs. Allowlist validation at handler level before execution. |
| SKILL-04 | Destructive actions require explicit confirmation in the chat UI before execution | Inline confirmation pattern with pending state in hub chat store. Agent queue already handles background approvals. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | 1.28.0 (installed) | MCP server framework | Already in use, provides tool definition and dispatch infrastructure |
| better-sqlite3 | 11.x (installed) | SQLite for MCP write tools | Already in use for read tools, must switch from readonly mode |
| zod | 3.23.x (installed) | Schema validation for action inputs | Already in mcp-server deps, use for shared schema validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new dependencies required | - | - | All needed infrastructure exists in the codebase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shared TS registry module | Rust-side registry | TS registry is accessible to both MCP server (Node) and frontend (React). Rust would require IPC to share definitions. TS is correct. |
| Reuse plugins/core/shell.rs | New shell execution path | ShellPlugin has timeout, CWD, stdout/stderr capture. Reuse via a new Tauri command wrapper. |

**Installation:** No new packages needed. All dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    actionRegistry.ts          # Shared action registry (skills definitions)
    actionRegistry.test.ts     # Unit tests for registry
  hooks/
    useActionDispatch.ts       # Hub chat: tool_use -> Tauri command dispatch
  components/
    hub/
      ToolConfirmation.tsx     # Inline approve/reject for destructive actions
      ToolResultCard.tsx       # Action result display in chat
      ShellOutputBlock.tsx     # Collapsible shell output renderer
  components/
    settings/
      ShellAllowlistSetting.tsx  # Settings > AI > Shell Allowlist editor
mcp-server/
  src/
    tools/
      write-tools.ts           # New: create_task, update_task, delete_task, etc.
    db.ts                       # Must change: readonly -> read-write mode
src-tauri/
  src/
    commands/
      shell_commands.rs         # New Tauri command: execute_bot_shell (allowlisted)
```

### Pattern 1: Shared Action Registry
**What:** A single TypeScript module defining all bot skills with their metadata. Each entry contains: name, description, inputSchema (JSON Schema), destructive flag, and handler function name (Tauri command name for chat, direct DB call for MCP).
**When to use:** Always -- this is the central coordination point per D-02.
**Example:**
```typescript
// src/lib/actionRegistry.ts
import type { JSONSchema7 } from "json-schema";

export interface ActionDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  destructive: boolean;
  tauriCommand: string; // For hub chat dispatch
}

export const ACTION_REGISTRY: ActionDefinition[] = [
  {
    name: "create_task",
    description: "Create a new task in a project",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        phaseId: { type: "string", description: "Optional phase ID" },
      },
      required: ["title"],
    },
    destructive: false,
    tauriCommand: "create_task",
  },
  {
    name: "delete_task",
    description: "Delete a task (requires confirmation)",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task ID to delete" },
      },
      required: ["taskId"],
    },
    destructive: true,
    tauriCommand: "delete_task",
  },
  {
    name: "execute_shell",
    description: "Run a shell command in the project directory",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
      },
      required: ["command"],
    },
    destructive: true, // Always requires confirmation
    tauriCommand: "execute_bot_shell",
  },
  // ... more actions
];

// Generate tool definitions for LLM API calls
export function getToolDefinitions() {
  return ACTION_REGISTRY.map((action) => ({
    name: action.name,
    description: action.description,
    input_schema: action.inputSchema,
  }));
}
```

### Pattern 2: Tool Use in Streaming Response
**What:** Parse tool_use blocks from the LLM streaming response, pause rendering, dispatch the action, then feed the result back to the LLM.
**When to use:** Hub chat interaction when the LLM decides to use a tool.
**Example:**
```typescript
// Simplified tool_use flow in hub chat
// 1. LLM response includes content_block with type "tool_use"
// 2. Frontend detects tool_use block in streaming
// 3. If destructive: show inline confirmation, wait for user
// 4. If approved (or non-destructive): invoke Tauri command
// 5. Send tool_result back to LLM for next turn

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultMessage {
  role: "user";
  content: [{
    type: "tool_result";
    tool_use_id: string;
    content: string;
  }];
}
```

### Pattern 3: MCP Write Tool Handler
**What:** Same pattern as existing read tools but with DB writes. Uses the same better-sqlite3 database but opened in read-write mode.
**When to use:** Background agent needs to modify app state.
**Example:**
```typescript
// mcp-server/src/tools/write-tools.ts
import type Database from "better-sqlite3";

export function handleCreateTask(
  db: Database.Database,
  args: { title: string; projectId?: string; description?: string; priority?: string; phaseId?: string }
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO tasks (id, title, description, status, priority, project_id, phase_id, created_at, updated_at)
    VALUES (?, ?, ?, 'todo', ?, ?, ?, ?, ?)
  `).run(id, args.title, args.description ?? null, args.priority ?? "medium",
         args.projectId ?? null, args.phaseId ?? null, now, now);
  
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ id, title: args.title, status: "todo" }) }],
  };
}
```

### Pattern 4: Shell Allowlist Enforcement
**What:** Validate shell commands against an allowlist before execution. Parse the command to extract the base executable and subcommand, then check against allowed patterns.
**When to use:** Every shell command execution from both chat and MCP.
**Example:**
```typescript
// Allowlist validation (frontend or Tauri command)
const DEFAULT_ALLOWLIST: string[] = [
  "git status", "git log", "git diff", "git branch",
  "npm test", "npm run", "npm build",
  "yarn test", "yarn run", "yarn build",
  "pnpm test", "pnpm run", "pnpm build",
  "ls", "cat", "head", "tail", "wc", "echo", "date", "pwd",
];

function isCommandAllowed(command: string, allowlist: string[]): boolean {
  const trimmed = command.trim();
  return allowlist.some((allowed) => {
    // Exact match or prefix match (e.g., "git status" matches "git status --short")
    return trimmed === allowed || trimmed.startsWith(allowed + " ");
  });
}
```

### Anti-Patterns to Avoid
- **JSON extraction from text:** D-01 explicitly locks tool_use native blocks. Never regex-parse action JSON from LLM text output.
- **Hardcoded tool definitions:** D-03 requires generating tool definitions from the registry. Never maintain separate tool definition lists.
- **Separate confirmation systems:** Chat confirmation and agent approval are different UX but should share the destructive flag source (the registry).
- **Raw SQL in MCP write handlers without WAL:** The DB is already in WAL mode, but write tools must handle busy/locked states since the Tauri app also writes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Task/Project CRUD | New DB queries from scratch | Existing Tauri commands (create_task, update_task, etc.) for chat; mirror their SQL for MCP | Commands already handle events, validation, edge cases |
| Shell execution | Custom process spawning | Existing ShellPlugin (plugins/core/shell.rs) via a new Tauri command | Has timeout, CWD, stdout/stderr, tested |
| Schema validation | Manual input checking | Zod schemas derived from registry inputSchema | Already in mcp-server deps, consistent validation |
| UUID generation | Custom ID generation | crypto.randomUUID() (Node) / uuid crate (Rust) | Standard, already used in codebase |
| File-based queue for approvals | New queue system | Existing useAgentQueue.ts infrastructure | Proven pattern for background agent communication |

**Key insight:** Nearly all the "backend" work for bot skills already exists as Tauri commands. The phase is primarily about wiring -- connecting LLM tool_use output to existing commands, and exposing those same operations through the MCP server.

## Common Pitfalls

### Pitfall 1: MCP Database Read-Only Mode
**What goes wrong:** The MCP server opens the database with `{ readonly: true }` in `db.ts`. Any write tool will throw an error immediately.
**Why it happens:** The MCP server was originally read-only by design (Phase 21).
**How to avoid:** Change `db.ts` to open without `readonly: true`. Add WAL mode and busy_timeout (already configured). Consider whether concurrent writes from Tauri and MCP need coordination.
**Warning signs:** "SQLITE_READONLY" errors when testing write tools.

### Pitfall 2: Tauri Event Emission Gap for MCP Writes
**What goes wrong:** When the MCP server writes directly to SQLite, the Tauri app doesn't know about the change. No "task-created" event fires. UI stays stale.
**Why it happens:** Tauri commands emit events via `app.emit()`. MCP server bypasses Tauri entirely -- it writes to the same SQLite file but has no way to emit Tauri events.
**How to avoid:** Two options: (a) MCP write tools write a notification to the agent queue that triggers a UI refresh, or (b) implement a file-watcher/polling mechanism that detects DB changes. Option (a) is simpler and follows existing patterns. The frontend already polls the agent queue every 2 seconds.
**Warning signs:** Tasks created by background agent don't appear in UI until manual refresh.

### Pitfall 3: Tool Use Support Missing in AI Gateway
**What goes wrong:** Phase 24 (hub chat) focuses on text streaming. If it doesn't add tool_use support to the `AiProvider` trait and `CompletionRequest`, Phase 25 cannot send tool definitions or parse tool_use responses.
**Why it happens:** The current `CompletionRequest` has only `system_prompt`, `user_message`, `max_tokens`, `temperature` -- no `tools` field. The streaming parser only handles `content_block_delta` with text, not tool_use blocks.
**How to avoid:** Phase 25 must extend the AI gateway with tool support. This means: (1) add `tools` field to `CompletionRequest`, (2) update Anthropic/OpenAI providers to include tools in API calls, (3) parse `tool_use` content blocks in streaming, (4) support multi-turn tool_result messages. This is significant work that should be the first wave.
**Warning signs:** If Phase 24 doesn't mention tool_use at all, Phase 25 must account for this as its own work.

### Pitfall 4: Shell Command Injection via Allowlist Bypass
**What goes wrong:** User or LLM crafts a command like `git status; rm -rf /` that passes the "git status" prefix check but executes arbitrary commands.
**Why it happens:** Naive prefix matching doesn't account for shell metacharacters (`;`, `&&`, `||`, `|`, backticks, `$()`).
**How to avoid:** Parse the command to extract the base command only. Reject any command containing shell metacharacters (`; && || | \` $( ) > < &`). Alternatively, split on whitespace and only check argv[0] + argv[1].
**Warning signs:** Commands with semicolons or pipes passing validation.

### Pitfall 5: Streaming Tool Use Block Assembly
**What goes wrong:** Tool_use blocks arrive in multiple streaming chunks. The `input` field is JSON that arrives as partial fragments across content_block_delta events. Trying to parse mid-stream fails.
**Why it happens:** Anthropic's streaming API sends tool_use input as incremental JSON deltas in `input_json_delta` events, not complete objects.
**How to avoid:** Accumulate the `input_json_delta` text until `content_block_stop` event fires, then parse the complete JSON. Do not attempt to parse partial JSON.
**Warning signs:** JSON parse errors during streaming when the LLM uses tools.

### Pitfall 6: Confirmation State Management in Chat
**What goes wrong:** User sends a new message while a destructive action is pending confirmation. The conversation state becomes confused -- the pending tool_use is orphaned.
**Why it happens:** Chat input isn't disabled during pending confirmation. Multiple conversation branches diverge.
**How to avoid:** Disable chat input while a tool_use confirmation is pending. Show a clear visual indicator that the bot is waiting for the user's decision.
**Warning signs:** Chat history containing unanswered tool_use blocks.

## Code Examples

### Existing Tauri Commands Available for Registry (verified from source)
```
// Already registered in lib.rs invoke_handler:
create_task(project_id?, theme_id?, title, description?, context?, priority?, 
            external_path?, due_date?, scheduled_date?, scheduled_time?,
            duration_minutes?, recurrence_rule?, estimated_minutes?, phase_id?)
update_task(task_id, title?, description?, context?, priority?, ...)
update_task_status(task_id, status)  // status: "todo"|"in_progress"|"done"|"cancelled"
delete_task(task_id)
create_project(name, description?)
update_project(project_id, name, description)
delete_project(project_id)
create_theme(name, color)
create_phase(project_id, name)
update_phase(phase_id, name)
delete_phase(phase_id)
```

### Existing Shell Execution (ShellPlugin - plugins/core/shell.rs)
```rust
// ShellStepInput { command, working_directory?, timeout_seconds? }
// ShellStepOutput { stdout, stderr, exit_code, timed_out }
// Default timeout: 30s, supports CWD override
```

### MCP Server Tool Pattern (from index.ts)
```typescript
// ListToolsRequestSchema handler returns tool definitions array
// CallToolRequestSchema handler dispatches via switch(name)
// Each handler returns { content: [{ type: "text", text: "..." }] }
// Error returns include isError: true
```

### Anthropic Streaming Events for Tool Use (from API docs)
```
event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_xxx","name":"create_task","input":{}}}

event: content_block_delta  
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"..."}}

event: content_block_stop
data: {"type":"content_block_stop","index":1}
```

### OpenAI Tool Call Streaming (from API docs)
```
// OpenAI uses "tool_calls" in the assistant message delta
// delta.tool_calls[0].function.arguments arrives incrementally
// finish_reason: "tool_calls" signals completion
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON extraction from text | Native tool_use/function_calling | 2023-2024 | Reliable structured output, no regex parsing |
| Separate tool lists per surface | Shared action registry | Best practice | Single source of truth, consistent behavior |
| Global shell access for bots | Allowlisted commands only | Security standard | Prevents arbitrary code execution |

**Deprecated/outdated:**
- Anthropic `functions` field: Use `tools` field instead (current API)
- OpenAI `function_call` parameter: Use `tool_choice` instead (deprecated June 2023)

## Open Questions

1. **AI Gateway Tool Use Support Scope**
   - What we know: Phase 24 must add streaming chat. The `AiProvider` trait has no tool fields. `CompletionRequest` has no tools.
   - What's unclear: Whether Phase 24 will add tool_use support or leave it entirely to Phase 25.
   - Recommendation: Phase 25 should plan to add tool_use support to the gateway as Wave 1 work. If Phase 24 already did it, that wave becomes a no-op.

2. **MCP Write Concurrency with Tauri**
   - What we know: Both Tauri (Rust, via rusqlite) and MCP server (Node, via better-sqlite3) will write to the same SQLite file. WAL mode is enabled on both sides. busy_timeout is set.
   - What's unclear: Whether there are edge cases with concurrent writes from two processes.
   - Recommendation: WAL mode + busy_timeout should handle this. SQLite supports multiple writer processes with WAL. Test with concurrent writes during development.

3. **UI Refresh After MCP Writes**
   - What we know: Tauri commands emit events that trigger UI updates. MCP writes bypass this.
   - What's unclear: Best mechanism to notify the frontend of MCP-originated changes.
   - Recommendation: Have MCP write tools also write a status message to the agent queue. The 2-second poll in useAgentQueue picks it up and can trigger a data refresh. Alternatively, use a simpler approach: after any MCP write, write a "data-changed" flag file that the frontend polls.

4. **Shell Allowlist Storage**
   - What we know: D-08 says Settings > AI > Shell Allowlist. AiSettings.tsx already exists with CLI tool configuration.
   - What's unclear: Where to persist the allowlist (SQLite settings table? localStorage? Tauri store?).
   - Recommendation: Use the same persistence mechanism as other AI settings. Check if there's a settings table in SQLite or use Tauri's plugin:store.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 (frontend), Vitest 3.0.0 (mcp-server), cargo test (Rust) |
| Config file | vitest.config.ts (root), mcp-server/vitest.config.ts |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test -- --run && cd mcp-server && npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-01 | Action registry maps tool_use to Tauri commands | unit | `npx vitest run src/lib/actionRegistry.test.ts` | Wave 0 |
| SKILL-01 | Dispatch hook invokes correct Tauri command | unit | `npx vitest run src/hooks/useActionDispatch.test.ts` | Wave 0 |
| SKILL-02 | MCP create_task writes to DB | unit | `cd mcp-server && npx vitest run src/tools/write-tools.test.ts` | Wave 0 |
| SKILL-02 | MCP update_task_status writes to DB | unit | `cd mcp-server && npx vitest run src/tools/write-tools.test.ts` | Wave 0 |
| SKILL-03 | Allowlist rejects disallowed commands | unit | `npx vitest run src/lib/actionRegistry.test.ts` | Wave 0 |
| SKILL-03 | Allowlist permits allowed commands | unit | `npx vitest run src/lib/actionRegistry.test.ts` | Wave 0 |
| SKILL-03 | Shell metacharacter injection blocked | unit | `npx vitest run src/lib/actionRegistry.test.ts` | Wave 0 |
| SKILL-04 | Destructive actions flagged in registry | unit | `npx vitest run src/lib/actionRegistry.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npm run test -- --run && cd mcp-server && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/actionRegistry.test.ts` -- covers SKILL-01, SKILL-03, SKILL-04 (registry definition, allowlist, destructive flags)
- [ ] `src/hooks/useActionDispatch.test.ts` -- covers SKILL-01 (dispatch to Tauri)
- [ ] `mcp-server/src/tools/write-tools.test.ts` -- covers SKILL-02 (MCP write operations)

## Sources

### Primary (HIGH confidence)
- Source code inspection of: `mcp-server/src/index.ts`, `mcp-server/src/db.ts`, `mcp-server/src/tools/*.ts`
- Source code inspection of: `src-tauri/src/commands/task_commands.rs`, `phase_commands.rs`, `project_commands.rs`, `theme_commands.rs`
- Source code inspection of: `src-tauri/src/ai/provider.rs`, `types.rs`, `anthropic.rs` (confirmed no tool_use support)
- Source code inspection of: `src-tauri/src/plugins/core/shell.rs` (ShellPlugin with timeout, CWD, output capture)
- Source code inspection of: `src/hooks/useAgentMcp.ts`, `useAgentQueue.ts` (agent queue patterns)

### Secondary (MEDIUM confidence)
- Anthropic Messages API streaming documentation -- tool_use content block format, input_json_delta events
- OpenAI Chat Completions API -- tool_calls in streaming delta format
- MCP SDK 1.28.0 -- tool definition and dispatch patterns (verified from installed code)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and verified in codebase
- Architecture: HIGH - patterns derived directly from existing code, clear extension points
- Pitfalls: HIGH - identified from direct source code inspection (readonly DB, missing tool_use, event emission gap)

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable codebase, no external dependency churn expected)
