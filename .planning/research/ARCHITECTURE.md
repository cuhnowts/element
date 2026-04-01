# Architecture Research

**Domain:** Daily Hub integration into existing Tauri 2.x + React 19 desktop app
**Researched:** 2026-03-31
**Confidence:** HIGH

## System Overview

### Current Architecture (post-v1.3)

```
+------------------------------------------------------------------+
|                        React 19 Frontend                          |
+------------------------------------------------------------------+
|  Sidebar        CenterPanel            OutputDrawer   AgentPanel  |
|  (themes,       (TodayView |           (terminal      (activity,  |
|   projects,      ProjectDetail |        sessions,      approvals, |
|   tasks)         TaskDetail |           logs,           terminal)  |
|                  FileExplorer |         workflows)                 |
|                  ThemeDetail)                                      |
+------------------------------------------------------------------+
|  Zustand Stores (AppStore + standalone stores)                    |
|  - useStore (13 slices)    - useAgentStore                        |
|  - useWorkspaceStore       - useTerminalSessionStore              |
|  - useWorkflowStore        - useTaskStore                         |
+------------------------------------------------------------------+
|                    Tauri IPC Layer (~50+ commands)                 |
+------------------------------------------------------------------+
|                        Rust Backend                               |
|  commands/  models/  ai/  engine/  scheduling/  plugins/  db/     |
|  (CRUD,     (SQLite  (gateway,    (workflow    (scheduler) (plugin |
|   context,   models)  providers,   executor)               host)  |
|   planning)           prompts)                                    |
+------------------------------------------------------------------+
|  SQLite (WAL)    OS Keychain    File Watchers    Cron Scheduler   |
+------------------------------------------------------------------+

         +-- File-based Queue (agent-queue/) --+
         |  approvals/ notifications/ status/   |
         +--------------------------------------+
                        |
         +-- MCP Server Sidecar (separate binary) --+
         |  stdio transport, reads element.db (RO)   |
         |  10 tools: 5 read + 5 orchestration       |
         +-------------------------------------------+
```

### Target Architecture (with Daily Hub)

```
+------------------------------------------------------------------+
|                        React 19 Frontend                          |
+------------------------------------------------------------------+
|  Sidebar        CenterPanel            OutputDrawer   AgentPanel  |
|  (themes,       (HubView |             (terminal      (activity,  |
|   projects,      ProjectDetail |        sessions,      approvals, |
|   tasks)         TaskDetail | ...)      logs)          terminal)  |
+------------------------------------------------------------------+
|  HubView (NEW - replaces TodayView as default home screen)       |
|  +-------------------+---------------------------+----------+     |
|  | GoalsTreePanel    | HubMainPanel              | Calendar |     |
|  | (themes/projects  | +-- BriefingCard ------+  | (place-  |     |
|  |  as tree with     | | AI-generated summary |  |  holder) |     |
|  |  progress bars)   | +----------------------+  |          |     |
|  |                   | +-- HubChat -----------+  |          |     |
|  |                   | | Conversational input  |  |          |     |
|  |                   | | to orchestrator       |  |          |     |
|  |                   | +----------------------+  |          |     |
|  +-------------------+---------------------------+----------+     |
+------------------------------------------------------------------+
|  Zustand Stores                                                   |
|  + useHubStore (NEW)  - briefing, chat messages, loading states   |
+------------------------------------------------------------------+
|  Tauri IPC Layer (+ new hub commands)                             |
|  + generate_briefing, hub_chat, generate_manifest                 |
+------------------------------------------------------------------+
|  Rust Backend                                                     |
|  + commands/hub_commands.rs (NEW)                                 |
|  + models/manifest.rs (NEW - central context manifest)            |
|  + ai/hub_prompts.rs (NEW - briefing + chat system prompts)      |
+------------------------------------------------------------------+
|  MCP Sidecar (MODIFIED - add write tools for bot skills)          |
|  + create_task, update_status, run_command, write_file tools      |
+------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|----------------|-----------------|
| HubView | 3-column layout container, replaces TodayView as default | NEW |
| GoalsTreePanel | Renders themes/projects/tasks as collapsible tree with progress | NEW |
| GoalsTreeNode | Recursive tree node with progress bar and status icon | NEW |
| HubMainPanel | Contains BriefingCard and HubChat vertically stacked | NEW |
| BriefingCard | Displays AI-generated daily summary with refresh button | NEW |
| HubChat | Message list + input bar, sends to orchestrator via AI gateway | NEW |
| HubChatMessage | Individual message bubble (user/assistant) with markdown | NEW |
| HubChatInput | Text input with send button and loading indicator | NEW |
| CalendarPlaceholder | Static placeholder for future calendar integration | NEW |
| useHubStore | Briefing content, chat history, streaming state, loading/error | NEW |
| hub_commands.rs | Tauri commands: generate_briefing, hub_chat, generate_manifest | NEW |
| manifest.rs | Cross-project context manifest generation from SQLite | NEW |
| hub_prompts.rs | System prompts for briefing generation and chat conversation | NEW |
| CenterPanel.tsx | Route to HubView instead of TodayView when nothing selected | MODIFIED (1 line) |
| lib.rs | Register 3 new hub commands in invoke_handler | MODIFIED (3 lines) |
| commands/mod.rs | Add `pub mod hub_commands;` | MODIFIED (1 line) |
| models/mod.rs | Add `pub mod manifest;` | MODIFIED (1 line) |
| ai/mod.rs | Add `pub mod hub_prompts;` | MODIFIED (1 line) |
| MCP sidecar | Add write/command/file tools for bot skills | MODIFIED (separate phase) |

## Recommended Project Structure

### New Files

```
src/
  components/
    hub/                        # NEW directory
      HubView.tsx               # 3-column layout container
      GoalsTreePanel.tsx        # Left column: theme/project tree
      GoalsTreeNode.tsx         # Recursive tree node component
      HubMainPanel.tsx          # Center column: briefing + chat
      BriefingCard.tsx          # AI briefing display with streaming
      HubChat.tsx               # Chat interface container
      HubChatMessage.tsx        # Individual message bubble
      HubChatInput.tsx          # Input bar with send button
      CalendarPlaceholder.tsx   # Right column placeholder
  stores/
    useHubStore.ts              # NEW standalone Zustand store
  types/
    hub.ts                      # NEW type definitions

src-tauri/
  src/
    commands/
      hub_commands.rs           # NEW command module
    models/
      manifest.rs               # NEW manifest generation model
    ai/
      hub_prompts.rs            # NEW prompt templates
```

### Modified Files

```
src/
  components/
    layout/
      CenterPanel.tsx           # MODIFY: import HubView, replace TodayView in default case

src-tauri/
  src/
    lib.rs                      # MODIFY: register hub commands
    commands/
      mod.rs                    # MODIFY: pub mod hub_commands;
    models/
      mod.rs                    # MODIFY: pub mod manifest;
    ai/
      mod.rs                    # MODIFY: pub mod hub_prompts;
```

### Structure Rationale

- **`src/components/hub/`:** Isolated from `center/` because the Hub is a distinct feature with its own 3-column layout paradigm. Existing center components (ProjectDetail, TaskDetail, FileExplorer) remain untouched. The Hub only appears when no entity is selected.
- **`useHubStore` as standalone:** Follows the established pattern of `useAgentStore` and `useTerminalSessionStore` -- feature-specific stores that have no cross-slice dependencies with the main AppStore. Hub state (briefing markdown, chat messages, streaming flags) is self-contained.
- **`hub_commands.rs` as single module:** All hub Tauri commands in one file. Commands are thin orchestrators: they gather data from `models/manifest.rs`, build prompts via `ai/hub_prompts.rs`, call the AI gateway, and stream results via Tauri events.

## Architectural Patterns

### Pattern 1: Direct AI Gateway for Hub Chat (not MCP sidecar)

**What:** Hub chat sends messages through the existing Rust AI gateway (`ai/gateway.rs` + AiProvider trait with `complete_stream`), not through the MCP sidecar's file-based queue.

**When to use:** For the Hub briefing and chat -- any interactive, user-initiated AI conversation.

**Why not MCP sidecar:** The MCP sidecar communicates via file-based queue with 2-second polling intervals (`useAgentQueue.ts` line 307: `setInterval(pollQueue, 2000)`). Chat needs sub-second responsiveness. The sidecar is designed for autonomous background operations (auto-execute phases, approval workflows), not interactive conversation.

Using the AI gateway means:
- Streaming tokens via Tauri events (same pattern as `ai_assist_task` in `ai_commands.rs`)
- User's configured default provider is used directly
- No approval flow needed -- the user is already present and driving the conversation
- No file I/O overhead from the queue system

**Trade-offs:** Bot skills that modify app state (create tasks, update phases) execute via existing Tauri commands dispatched from the frontend, not via MCP tool calls. This is simpler and reuses tested code paths, but means skill dispatch logic lives in the frontend action parser rather than in the sidecar.

**Example:**
```rust
// hub_commands.rs
#[tauri::command]
pub async fn hub_chat(
    message: String,
    history: Vec<ChatMessage>,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
    app: AppHandle,
) -> Result<String, String> {
    // 1. Build context manifest from all projects
    let manifest = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        manifest::generate_manifest(&db)?
    };

    // 2. Build prompt with manifest + conversation history
    let request = hub_prompts::build_chat_request(&manifest, &message, &history);

    // 3. Get default provider, stream response
    let config = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway.get_default_config(&db)?
    };
    let provider = gateway.build_provider(&config)?;

    let (tx, mut rx) = tokio::sync::mpsc::channel(32);
    tokio::spawn(async move {
        let _ = provider.complete_stream(request, tx).await;
    });

    let mut full_response = String::new();
    while let Some(chunk) = rx.recv().await {
        full_response.push_str(&chunk);
        let _ = app.emit("hub-chat-stream", &chunk);
    }

    Ok(full_response)
}
```

### Pattern 2: Central Context Manifest (in-memory, not file-based)

**What:** A function that queries all projects, phases, and tasks from SQLite and produces a markdown string summarizing workspace state. Generated on-demand for each AI call, not written to disk.

**When to use:** For briefing generation and hub chat where the AI needs cross-project awareness.

**Why in-memory, not a file:** The existing per-project context (`generate_context_file` in `onboarding_commands.rs`) writes `.element/context.md` to disk because external CLI tools (claude) read it. The hub manifest is consumed entirely within the Rust process by the AI gateway -- no external reader needs it. Benefits:
- No staleness (generated fresh each call)
- No file watchers needed
- No disk I/O
- Token budget applied dynamically based on project count

**Reuses existing patterns:** The manifest builder follows the same token-budgeted rollup approach from `onboarding.rs` (`SOFT_TOKEN_BUDGET`, `classify_phase`, `format_phase_rollup`), but operates across all projects instead of one.

**Example manifest output:**
```markdown
# Workspace Status
Generated: 2026-03-31T08:00:00Z

## Active Projects (3)

### Element (In Progress, 87%)
- Phase 22: Hub UI [0/3] <-- CURRENT
- Phase 23: AI Briefing [0/2]
- 14 phases complete, 2 remaining

### Side Hustle (Planned, 0%)
- Phase 1: Research [0/5] <-- CURRENT

### Home Reno (Blocked)
- Phase 3: Electrical [1/4, 1 BLOCKED]
- Blocker: "Waiting for permit approval"

## Today's Tasks (5)
- [~] Fix hub layout -- Element
- [ ] Research vendors -- Side Hustle
- [ ] Call electrician -- Home Reno
- [ ] Review PR -- Element
- [ ] Update budget -- Home Reno

## Attention Items
- Home Reno: 1 blocked task requiring human action
- Side Hustle: 0% progress, created 3 days ago
```

### Pattern 3: Bot Skills via LLM Function Calling + Frontend Dispatch

**What:** The hub chat system prompt defines available actions as a structured schema. When the LLM determines the user wants to take an action, it returns JSON action blocks alongside conversational text. The frontend parses these and dispatches them to existing Tauri commands.

**When to use:** For hub chat actions that modify app state (create task, update status, mark complete).

**Why this approach:**
1. All entity CRUD already exists as ~50+ Tauri commands
2. The AI gateway can request structured output (JSON blocks in response)
3. No new backend execution layer needed
4. Frontend already has `api.*` wrappers in `src/lib/tauri.ts` for every command
5. Zustand stores handle optimistic updates on the existing action calls

**Trade-offs:** Requires careful prompt engineering for reliable action JSON. The LLM must output both conversational text and structured actions. This is a well-understood pattern (function calling / tool use) supported by all major providers.

**Example flow:**
```
User: "Create a task to review the API docs in Element"
    |
    v
hub_chat system prompt includes:
  "Available actions: create_task({ title, projectId?, description? }), ..."
    |
    v
LLM Response:
  "I'll create that task for you.\n\n```json\n{\"action\": \"create_task\", ...}\n```"
    |
    v
Frontend parses response, extracts action JSON
    |
    v
api.createTask({ title: "Review API docs", projectId: "element-id" })
    |
    v
Zustand store refreshes, HubChat shows confirmation
```

## Data Flow

### Briefing Generation Flow

```
App Launch / User clicks "Refresh Briefing"
    |
    v
useHubStore.generateBriefing()
    |-- Set briefingLoading = true
    |-- Clear previous briefing content
    |
    v
Tauri invoke("generate_briefing")
    |
    v
Rust hub_commands::generate_briefing
    |-- db.lock() -> query all projects, phases, tasks
    |-- manifest::generate_manifest(&db) -> markdown string
    |-- hub_prompts::build_briefing_request(&manifest) -> CompletionRequest
    |-- gateway.get_default_config(&db) -> provider config
    |-- provider.complete_stream(request, tx) -> spawn streaming task
    |-- while rx.recv(): app.emit("hub-briefing-stream", chunk)
    |
    v
Frontend: listen("hub-briefing-stream")
    |-- Append chunk to useHubStore.briefingContent
    |-- BriefingCard re-renders with accumulated markdown
    |
    v
On stream complete: set briefingLoading = false
```

### Hub Chat Flow

```
User types message in HubChatInput, presses Enter
    |
    v
useHubStore.sendMessage(text)
    |-- Push { role: "user", content: text } to messages array
    |-- Set chatLoading = true
    |
    v
Tauri invoke("hub_chat", { message: text, history: messages })
    |
    v
Rust hub_commands::hub_chat
    |-- Generate fresh manifest (same as briefing)
    |-- Build chat prompt: system(manifest + skills schema) + history + user message
    |-- Stream via AI gateway
    |-- app.emit("hub-chat-stream", chunk) for each token
    |-- Return full response text on completion
    |
    v
Frontend: listen("hub-chat-stream")
    |-- Accumulate into current assistant message in useHubStore
    |
    v
On invoke resolution:
    |-- Parse response for action JSON blocks
    |-- If actions found: dispatch to Tauri commands (api.createTask, etc.)
    |-- Push final { role: "assistant", content } to messages array
    |-- Set chatLoading = false
```

### Goals Tree Data Flow

```
HubView mounts
    |
    v
GoalsTreePanel reads from existing Zustand stores:
    |-- useStore: themes (already loaded on app init)
    |-- useStore: projects (already loaded on app init)
    |-- useStore: phases (loaded per-project, may need bulk fetch)
    |
    v
Compute progress client-side:
    |-- Per project: completedTasks / totalTasks
    |-- Per theme: aggregate across projects
    |
    v
Render as collapsible tree:
    Theme > Project > Phase (with progress bars)
    |
    v
Click on node -> navigation:
    |-- Project click: setSelectedProjectId -> CenterPanel shows ProjectDetail
    |-- Theme click: setSelectedThemeId -> CenterPanel shows ThemeDetail
```

**Note on phases data:** The current `phaseSlice` loads phases per-project on demand (`loadPhases(projectId)`). For the goals tree to show progress across all projects, a new bulk endpoint may be needed: `list_all_phases_with_counts` that returns `{ projectId, phaseCount, completedCount }` per project in one query. This avoids N+1 queries when rendering the tree.

### Key Data Flows Summary

1. **Manifest generation:** Server-side in Rust. Queries SQLite for all projects/phases/tasks. Formats as markdown with token budget. Passed in-memory to LLM prompt builder. Never persisted to disk.

2. **Chat history:** Stored in `useHubStore.messages` as `{ role, content, timestamp }[]`. Sent to Rust on each `hub_chat` call for conversation continuity. Not persisted to SQLite (ephemeral per session). Future enhancement: persist for cross-session memory.

3. **Streaming:** Both briefing and chat use Tauri `app.emit()` for token streaming. Frontend listens with `listen()` from `@tauri-apps/api/event`. Matches the existing pattern used by `cli-output` in `cli_commands.rs`.

4. **Bot skill dispatch:** Actions extracted from AI response text (JSON code blocks) are dispatched client-side using existing `api.*` functions. No new backend execution paths needed.

## Integration Points

### Existing Components Modified

| Component | Change | Scope |
|-----------|--------|-------|
| `CenterPanel.tsx` | Default view: `HubView` instead of `TodayView` | 1 import change + 1 JSX swap |
| `lib.rs` invoke_handler | Register `generate_briefing`, `hub_chat`, `generate_manifest` | 3 lines added |
| `commands/mod.rs` | `pub mod hub_commands;` | 1 line |
| `models/mod.rs` | `pub mod manifest;` | 1 line |
| `ai/mod.rs` | `pub mod hub_prompts;` | 1 line |

### New Backend Queries

| Query | Purpose | Notes |
|-------|---------|-------|
| All projects with task counts | Manifest: project-level progress | One query with GROUP BY |
| All phases with task counts | Manifest: phase-level progress | One query with GROUP BY |
| Today's tasks across projects | Manifest: today section | Reuse `get_todays_tasks` query |
| Blocked tasks across projects | Manifest: attention items | New WHERE clause on status |
| Default AI provider config | Hub chat/briefing provider | Reuse `list_ai_providers` with default filter |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| HubView <-> GoalsTreePanel | Props from Zustand stores | Read-only, no new backend calls |
| HubChat <-> hub_commands | Tauri invoke + event stream | Same invoke/listen pattern as AI assist |
| BriefingCard <-> hub_commands | Tauri invoke + event stream | One-shot generation with streaming |
| Hub skill dispatch <-> existing CRUD | Tauri invoke via api.* | Reuses 100% of existing commands |
| manifest.rs <-> SQLite | `db.conn()` queries | Same Arc<Mutex<Database>> pattern |
| hub_prompts <-> AI gateway | CompletionRequest struct | Same struct used by existing prompts.rs |

### MCP Sidecar Bot Skills (Separate Phase)

The MCP sidecar currently has 10 tools (5 read, 5 orchestration). For the background agent to gain write capabilities:

| New Tool | Purpose | Implementation |
|----------|---------|----------------|
| `create_task` | Agent creates tasks autonomously | Write to tasks table + emit notification |
| `update_task_status` | Agent marks tasks complete | Update status + emit event |
| `create_phase` | Agent creates project phases | Write to phases table |
| `run_shell_command` | Agent runs commands in project dirs | tokio::process::Command, project-scoped CWD |
| `write_file` | Agent creates/updates files | fs::write, project directory scoped |

These are separate from hub chat skills. Hub chat dispatches actions through the frontend (user is present). MCP sidecar skills are for autonomous background execution (user may not be present, approval-gated).

## Anti-Patterns

### Anti-Pattern 1: Routing Hub Chat Through MCP Sidecar

**What people do:** Send hub chat messages through the file-based agent queue to the MCP sidecar, then poll for a response file.
**Why it's wrong:** The file-based queue has 2-second polling intervals. Chat needs sub-second streaming. The MCP sidecar is for autonomous background operations, not interactive conversation. Mixing these concerns creates latency and architectural confusion.
**Do this instead:** Use the AI gateway directly from Rust (`hub_commands.rs`). Stream tokens via Tauri events. Reserve the MCP sidecar for background agent orchestration only.

### Anti-Pattern 2: Writing Manifest to Disk

**What people do:** Generate `context-manifest.md` as a file on disk and read it back for each AI call.
**Why it's wrong:** The manifest is stale the moment any project/task changes. File I/O adds unnecessary latency. File watchers would add complexity. The manifest has no external consumer -- only the Rust AI gateway needs it.
**Do this instead:** Generate manifest in-memory as a String when needed. Pass directly to the prompt builder function. No persistence, no staleness, no watchers.

### Anti-Pattern 3: Putting Hub State in the Main AppStore

**What people do:** Add `hubSlice` to the combined `useStore` alongside the existing 13 slices.
**Why it's wrong:** Hub state (chat messages, briefing content, streaming flags) has zero cross-dependencies with other slices. Adding it to AppStore increases store complexity and risks re-renders in unrelated components when chat messages update.
**Do this instead:** Create `useHubStore` as a standalone Zustand `create()` store, following the pattern of `useAgentStore` (standalone, `create()`, no slice composition).

### Anti-Pattern 4: Building Hub Chat as a Second Agent

**What people do:** Create a separate agent process/lifecycle for the hub, duplicating the agent queue, polling, and MCP patterns from Phase 21.
**Why it's wrong:** The hub chat is user-driven conversation, not autonomous orchestration. Two agents creates confusion about ownership of actions and context. The existing agent (MCP sidecar) is the single autonomous orchestrator.
**Do this instead:** Hub chat is a direct AI gateway call. The existing background agent remains the only autonomous orchestrator. They share the same manifest/context but serve fundamentally different interaction modes (interactive vs. autonomous).

### Anti-Pattern 5: N+1 Queries in Goals Tree

**What people do:** Call `loadPhases(projectId)` for each project when rendering the goals tree, causing N API calls for N projects.
**Why it's wrong:** Visible latency when the tree loads. Each call acquires the database mutex independently.
**Do this instead:** Add a single `list_project_progress` Tauri command that returns `{ projectId, totalTasks, completedTasks, blockedTasks }[]` for all projects in one query. The goals tree consumes this aggregate data without per-project phase loading.

## Suggested Build Order

Dependencies flow left to right. Each phase is independently shippable and testable.

```
Phase 1: Context Manifest + Hub UI Shell
    |-- models/manifest.rs (pure data, no AI dependency)
    |-- HubView 3-column layout with placeholder panels
    |-- GoalsTreePanel (reads existing stores + new progress query)
    |-- GoalsTreeNode recursive component
    |-- CalendarPlaceholder
    |-- CenterPanel routing: HubView replaces TodayView
    |-- list_project_progress command for tree data
    |
    v
Phase 2: AI Briefing
    |-- ai/hub_prompts.rs (briefing system prompt)
    |-- hub_commands::generate_briefing (manifest + AI gateway streaming)
    |-- useHubStore (briefing state + streaming listener)
    |-- BriefingCard component with markdown rendering
    |-- HubMainPanel layout (briefing fills center column)
    |
    v
Phase 3: Hub Chat
    |-- hub_prompts.rs extended with chat system prompt + action schema
    |-- hub_commands::hub_chat (manifest + history + AI gateway streaming)
    |-- useHubStore extended with chat state
    |-- HubChat, HubChatMessage, HubChatInput components
    |-- HubMainPanel updated: briefing top, chat bottom
    |
    v
Phase 4: Bot Skills (Action Dispatch from Chat)
    |-- Action schema definition in hub_prompts.rs
    |-- Frontend action parser (extract JSON from AI response)
    |-- Dispatcher maps action types to existing api.* calls
    |-- Confirmation UX before executing destructive actions
    |-- Chat shows action results inline
    |
    v
Phase 5: MCP Sidecar Write Tools (Background Agent Skills)
    |-- Add write tools to MCP server: create_task, update_status
    |-- Add run_command tool (project-scoped)
    |-- Add write_file tool (project-directory-scoped)
    |-- Approval flow for write operations (reuse existing queue)
```

**Phase ordering rationale:**
- **Phase 1 first** because it has zero AI dependencies. Pure UI + data queries. Gets the Hub visible and navigable immediately. The goals tree provides standalone value even without AI features.
- **Phase 2 before Phase 3** because briefing is a simpler AI integration (no conversation history, no streaming user input, no action parsing). It validates the manifest + AI gateway + streaming pipeline.
- **Phase 3 depends on Phase 2** because it extends the same store, prompt infrastructure, and streaming pattern. Chat adds conversation history management on top.
- **Phase 4 depends on Phase 3** because action dispatch requires a working chat to generate actions from. The action parser operates on chat responses.
- **Phase 5 is semi-independent** -- it extends the MCP sidecar (not the hub UI). Could be built in parallel with Phases 3-4 if desired. It addresses background agent capabilities, not interactive chat.

## Sources

- Codebase: `src-tauri/src/ai/provider.rs` -- AiProvider trait with `complete_stream` (streaming support confirmed)
- Codebase: `src-tauri/src/ai/gateway.rs` -- AiGateway with provider routing and `build_provider`
- Codebase: `src/hooks/useAgentQueue.ts` -- file-based queue with 2-second polling (lines 296-327)
- Codebase: `src/stores/useAgentStore.ts` -- standalone Zustand store pattern (not a slice)
- Codebase: `src-tauri/src/models/onboarding.rs` -- context generation with token budgets, phase classification
- Codebase: `src/components/layout/CenterPanel.tsx` -- routing logic, TodayView as default (line 112)
- Codebase: `src-tauri/src/lib.rs` -- command registration pattern, 50+ handlers (lines 187-296)
- Codebase: `src/stores/index.ts` -- 13-slice AppStore composition pattern

---
*Architecture research for: Daily Hub integration into Element v1.4*
*Researched: 2026-03-31*
