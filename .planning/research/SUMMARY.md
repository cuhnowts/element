# Project Research Summary

**Project:** Element v1.4 Daily Hub
**Domain:** AI-powered home screen with goals tree, daily briefing, conversational chat, context manifest, and bot skills — integrated into an existing Tauri 2.x + React 19 desktop app
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

Element v1.4 adds a Daily Hub that replaces TodayView as the app's default home screen. The hub is a 3-column layout: a hierarchical goals tree on the left (themes > projects > phases), an AI-generated daily briefing plus conversational chat in the center, and a calendar placeholder on the right. The existing codebase is well-positioned for this work — the AI gateway, MCP sidecar, agent queue, Zustand slice pattern, and shadcn/ui design system are all proven infrastructure. The genuine new work is a thin layer on top: 5 new npm packages (react-markdown + ecosystem), approximately 10 new React components, 3 new Rust modules, and a new standalone Zustand store. No new Rust crates and no new MCP server dependencies are required.

The recommended approach is to build in 5 sequential phases: (1) hub shell + goals tree + CenterPanel routing as a pure UI/data layer with zero AI dependency, (2) context manifest and AI briefing using the existing AI gateway with streaming and SQLite-cached results, (3) hub chat as a direct AI gateway channel (not routed through the file-based MCP queue), (4) bot skill action dispatch via LLM function-calling parsed client-side and dispatched to existing Tauri commands, and (5) MCP sidecar write tools for background agent autonomy. Each phase is independently shippable and directly depends on the previous one's infrastructure being stable.

The three highest-risk decisions are: (a) CenterPanel routing — the hub needs an explicit `activeView` state in the workspace store rather than being a TodayView fallback, or it will disappear the moment any sidebar item is clicked; (b) hub chat must bypass the file-based agent queue (which has 2-second polling latency) and use the AI gateway directly; and (c) the context manifest must be token-budgeted from day one (target: under 2000 tokens) or LLM quality will degrade at scale. The agent lifecycle must also be lifted out of AgentPanel's component lifecycle before hub features are added, since both the hub and the panel need the agent running regardless of panel visibility.

## Key Findings

### Recommended Stack

The existing stack covers approximately 90% of Daily Hub needs. The only genuine gaps are markdown rendering for LLM output and an auto-resizing textarea for chat input. All required Rust crates are already present (`serde_json`, `chrono`, `rusqlite`, `reqwest`, `tokio`). The MCP sidecar requires no new npm dependencies (`better-sqlite3`, `zod`, `@modelcontextprotocol/sdk` all present).

**Core new technologies (5 npm packages only):**
- `react-markdown@^10.1.0`: Renders LLM markdown responses — native React elements, no `dangerouslySetInnerHTML`, React 19 compatible
- `remark-gfm@^4.0.0`: GitHub-flavored markdown (tables, task lists, strikethrough) — required for LLM output; must be v4 to match unified ecosystem v11
- `rehype-highlight@^7.0.2`: Syntax highlighting for code blocks via highlight.js — ~30kB bundle, lighter than react-syntax-highlighter
- `react-textarea-autosize@^8.5.7`: Auto-growing chat textarea — 2.8kB, React 19 compatible, eliminates manual height calculation
- `highlight.js@^11.11.0`: Peer dependency of rehype-highlight — import only specific language grammars (typescript, rust, json, bash, sql) to minimize bundle

**Do not add:** Vercel AI SDK (assumes HTTP/SSR, fights Tauri IPC), chatscope/chat-ui-kit (conflicting CSS, wrong interaction model for single-user LLM chat), LangChain.js (massive dep tree, server-oriented), react-virtualized for chat (premature, complicates streaming auto-scroll with dynamic heights).

### Expected Features

**Must have for v1.4 (P1):**
- Hub 3-column layout replacing TodayView as default — every AI dashboard uses spatial hierarchy
- Goals tree (left column): themes > projects > phases with progress indicators and click-to-navigate
- Context manifest: Rust-side aggregation of all project state, generated in-memory per LLM call (never written to disk)
- AI daily briefing (center column): cross-project priority synthesis, markdown rendered, streaming, SQLite-cached
- Hub chat input with message history: conversational interface routed to orchestrator
- Bot write tools at minimum: `create_task`, `update_task_status` — chat that can only answer questions is decorative
- Quick-action suggestion chips after briefing — reduces blank-input anxiety
- Calendar placeholder (right column) — column must exist even if content is minimal
- Briefing refresh button — users need control after completing tasks

**Should have for v1.4.x (P2):**
- Action confirmation cards inline in chat before destructive operations
- Token-streaming polish (token-by-token rendering in chat)
- Briefing auto-refresh on app focus
- Chat history persistence to SQLite (in-memory only for v1.4 launch)

**Defer to v2+ (P3):**
- Google/Outlook calendar integration (OAuth complexity, explicitly deferred in PROJECT.md)
- Email signal ingestion (provider integration, privacy concerns, explicitly Future in PROJECT.md)
- AI urgency/priority scoring (subjective, creates distrust when it disagrees with user)
- Cross-session chat memory (AGENT-10 explicitly deferred, requires memory system design)
- Customizable hub layout with drag-and-drop (engineering cost far exceeds value for a single-user app)

### Architecture Approach

The hub integrates into the existing architecture with minimal surface area modifications. The entire UI lives in a new `src/components/hub/` directory. A new standalone `useHubStore` follows the `useAgentStore` pattern — not a slice in AppStore, because hub state (briefing markdown, chat messages, streaming flags) has zero cross-dependencies with other slices. Three new Rust modules (`hub_commands.rs`, `manifest.rs`, `hub_prompts.rs`) are registered via 5 one-line additions to existing mod files. The context manifest is generated in-memory and passed directly to the AI gateway — no staleness, no file watchers, no disk I/O. Hub chat uses the AI gateway directly with Tauri event streaming, bypassing the file-based agent queue entirely.

**Major components:**
1. `HubView` — 3-column layout container; replaces TodayView in CenterPanel routing; requires explicit `activeView` state in workspace store
2. `GoalsTreePanel` / `GoalsTreeNode` — reads from existing `themeSlice`/`projectSlice`/`phaseSlice`; computes progress client-side; one new bulk query (`list_project_progress`) to avoid N+1
3. `BriefingCard` — streaming markdown display; SQLite cache for instant load, background refresh on mount
4. `HubChat` / `HubChatMessage` / `HubChatInput` — conversational interface; streams via `hub-chat-stream` Tauri events; parses action JSON from LLM responses for client-side dispatch to existing `api.*` functions
5. `hub_commands.rs` — thin Tauri command orchestrator: generates manifest in-memory, builds prompt, streams via existing AI gateway
6. `manifest.rs` — pure data aggregation: queries all projects/phases/tasks, formats as token-budgeted markdown (hard cap: 2000 tokens)
7. MCP sidecar write tools (Phase 5) — separate from hub chat skills; these are for background autonomous execution, not interactive conversation

### Critical Pitfalls

1. **Hub chat competing with agent panel for the orchestrator** — Do not route hub chat through the file-based agent queue (2s polling latency) or spawn a second CLI process (MCP stdio is 1:1 — cannot multiplex). Use the AI gateway directly from `hub_commands.rs` with Tauri event streaming. The agent panel remains the autonomous orchestration surface; hub chat is an interactive AI gateway conversation.

2. **CenterPanel routing: hub unreachable after sidebar navigation** — TodayView was a passive fallback. The hub is a primary destination. Add `activeView: "hub" | "project" | "task" | "theme" | "workflow"` to workspace store. CenterPanel checks `activeView` first. Sidebar needs a "Home" entry. Without this change, the hub disappears the moment any sidebar item is clicked.

3. **Context manifest as a token bomb** — Aggregating all entities without a budget breaks LLM quality at 10+ projects. Hard cap: 2000 tokens. Use compact one-line-per-project format in the manifest index; MCP tools handle on-demand detail. Generate in-memory, never write to disk.

4. **Daily briefing blocking app startup** — LLM calls take 5-15 seconds. Cache the last briefing in SQLite with a timestamp. On hub mount, show cached immediately and refresh in background. A stale briefing is always better than a loading spinner as the user's first impression every morning.

5. **Agent lifecycle coupled to AgentPanel component** — `AgentPanel.tsx` currently auto-starts the agent on mount (line 12). Hub features also need the agent running. Lift `useAgentLifecycle` to AppLayout (called once at app level). Both hub and agent panel become consumers of agent state, not owners of agent lifecycle.

6. **Bot skills without tool-level security** — `run_command` must enforce approval at the MCP handler level, not just via system prompt instructions (LLMs can and do ignore prompts). Require approval queue write + poll in every execution tool handler. Scope all file operations to project `directoryPath` from database — reject absolute paths outside project roots. Implement a shell command allowlist (`git`, `npm`, `cargo`, configured CLI tool).

7. **Goals tree duplicating sidebar data** — The tree must read from the same Zustand slices as the sidebar (`themeSlice`, `projectSlice`, `phaseSlice`). No new `useGoalsTreeStore`. No duplicate `list_themes` or `list_projects` commands. The only new backend query needed is `list_project_progress` returning aggregate task counts per project in one SQL query.

## Implications for Roadmap

Based on the dependency graph in FEATURES.md and the pitfall-to-phase mapping in PITFALLS.md, the research supports a 5-phase build order.

### Phase 1: Hub Shell, Goals Tree, and CenterPanel Routing

**Rationale:** Zero AI dependencies. Pure UI and data queries. All critical architectural decisions — activeView routing, agent lifecycle decoupling, goals tree wired to existing stores, 3-column layout — must be locked here before any AI features are built on top. Getting CenterPanel routing wrong is a high-recovery-cost mistake that will affect every subsequent phase.

**Delivers:** Working 3-column hub as default home screen with placeholder panels. Goals tree with progress indicators, click-to-navigate, and visual status encoding. CenterPanel routing with explicit `activeView` state and Home button in sidebar. Agent lifecycle lifted to AppLayout. Calendar placeholder. `list_project_progress` bulk query to avoid N+1.

**Features addressed:** Hub 3-column layout, goals tree hierarchy, progress indicators, click-to-navigate, visual status encoding, hub as default home view, greeting with time-of-day awareness, calendar placeholder.

**Pitfalls avoided:** CenterPanel routing (activeView state established first), duplicate goals tree state (wired to existing slices from the start), agent lifecycle coupling (lifted before hub features depend on it).

### Phase 2: Context Manifest and AI Daily Briefing

**Rationale:** The manifest is the data foundation for both briefing and chat. Building it here — with token budget constraints baked in from day one — validates the full AI gateway streaming pipeline before chat adds conversation history complexity. Briefing is the simpler AI integration (no user input, no history management, no action parsing) and is the hub's headline feature.

**Delivers:** In-memory context manifest generation in Rust (all projects/phases/tasks, under 2000 tokens hard cap). `generate_briefing` Tauri command with streaming. `useHubStore` (briefing state, streaming listener). `BriefingCard` with markdown rendering. SQLite briefing cache (instant load, background refresh). Refresh button. Loading skeleton.

**Features addressed:** AI daily briefing, cross-project priority synthesis, briefing markdown rendering, briefing loading skeleton, briefing refresh, context manifest auto-generation, token-budget-aware manifest format, briefing prompt design.

**Stack used:** All 5 new npm packages go here (`react-markdown`, `remark-gfm`, `rehype-highlight`, `rehype-highlight`, `highlight.js`). Existing AI gateway + Tauri event streaming.

**Pitfalls avoided:** Token-bomb manifest (budget enforced at design time), blocking briefing on startup (SQLite cache), manifest written to disk (generated in-memory).

### Phase 3: Hub Chat

**Rationale:** Depends on Phase 2 because it extends the same store, prompt infrastructure, and streaming pipeline. Chat adds multi-turn `CompletionRequest` extension (backward compatible via `Option<Vec<ChatMessage>>`), conversation history management, and a dedicated `hub-chat-stream` event channel distinct from existing `ai-stream-*` events.

**Delivers:** `hub_chat` Tauri command (manifest + history + streaming). `ChatMessage` type added to `CompletionRequest` as an optional field (zero changes to existing `ai_assist_task`). `HubChat`, `HubChatMessage`, `HubChatInput` components. `useHubStore` extended with chat state. Quick-action suggestion chips. Typing indicator.

**Features addressed:** Hub chat input with message history, streaming AI responses, markdown rendering in chat messages, quick-action suggestion chips, context-aware suggestions, message type system (user, assistant, loading, error).

**Pitfalls avoided:** Hub chat vs agent panel conflict (uses AI gateway directly, not file-based queue), slow chat polling (Tauri event streaming gives sub-second delivery, not 2s polling).

### Phase 4: Bot Skills — Action Dispatch from Chat

**Rationale:** Depends on Phase 3 because action dispatch requires a working chat to generate and parse actions from. This phase is what distinguishes Element's hub from a generic AI dashboard — chat that can act, not just answer.

**Delivers:** Action schema definition in `hub_prompts.rs`. Frontend action parser (extracts JSON code blocks from AI response text). Dispatcher maps action types to existing `api.*` Tauri calls. Confirmation UX before destructive operations (reuses `useAgentStore` approval pattern). Inline action result messages in chat. Bot write tools in MCP server: `create_task`, `update_task_status`, `create_phase`.

**Features addressed:** Chat commands trigger orchestrator actions, action confirmations in chat, expanded MCP tool set, write tools for entity CRUD, skill discovery via "What can you do?" help command.

**Pitfalls avoided:** Unsandboxed bot commands (tool-level approval enforcement, path validation, allowlist designed here before Phase 5 adds shell execution), prompt injection (user input always in `user` role, never concatenated into system prompt).

### Phase 5: MCP Sidecar Write Tools (Background Agent Skills)

**Rationale:** Semi-independent of Phases 3-4 (MCP sidecar is a separate process from the hub UI). Can be parallelized with Phases 3-4 if bandwidth allows. Addresses background autonomous agent capabilities — distinct from hub chat's interactive dispatch which is user-present. These tools run when the user is away.

**Delivers:** `run_shell_command` tool (project-scoped CWD, allowlisted commands, approval-gated at handler level). `write_file` tool (project-directory-scoped only, rejects absolute paths outside project roots). Extended `create_task`/`update_task_status` for autonomous use. Full approval enforcement at MCP handler level (not just system prompt). Audit trail written to SQLite on every execution. Notification bridge extended to persist to SQLite (not just queue file).

**Features addressed:** Bot skills extension (run_command, write_file, entity CRUD for background agent), bot skill discovery, background agent autonomy improvements.

**Pitfalls avoided:** Unsandboxed shell execution (enforcement at handler level, not prompt level), absolute path traversal, missing audit trail, notification without SQLite persistence.

### Phase Ordering Rationale

- **Phase 1 has zero AI dependencies.** All routing, layout, and store architecture decisions are locked before AI features are built on top. This is non-negotiable — CenterPanel routing and agent lifecycle are foundational to every subsequent phase.
- **Manifest before briefing, briefing before chat.** Each phase extends the previous one's infrastructure. Building chat before briefing means constructing two streaming pipelines simultaneously with no proven foundation.
- **Action dispatch (Phase 4) after chat (Phase 3).** You cannot build an action parser before you have a working chat generating text from.
- **MCP sidecar tools (Phase 5) are architecturally separate.** They extend a separate Node.js process, not the hub UI. They can be built in parallel with Phases 3-4 if desired. Placing them last ensures security constraints from Phase 4 are already designed before shell execution capability is added.
- **This ordering matches the architecture's confirmed dependency graph** — see ARCHITECTURE.md "Suggested Build Order" section for the codebase-derived rationale.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:

- **Phase 4 (Bot Skills — Action Dispatch):** Prompt engineering for reliable function-calling / action JSON extraction is non-trivial. LLM must produce structured JSON blocks alongside conversational prose. Provider-specific behavior varies — Anthropic supports native tool use, Ollama may not. Research the exact schema format and parsing approach (JSON.parse with error recovery vs regex extraction vs structured output mode) before implementation.
- **Phase 5 (MCP Write Tools):** `better-sqlite3` write connection patterns need validation when a WAL-mode read-only connection from the main app process is already open. Need to confirm whether a second write-capable connection is safe or if writes must go through the Tauri command layer.

Phases with standard patterns (skip research):

- **Phase 1 (Hub Shell):** Pure React layout + Zustand store wiring. All patterns are established across 13+ existing slices and CenterPanel routing. No research needed.
- **Phase 2 (Briefing):** Streaming from AI gateway is proven in `ai_assist_task`. react-markdown integration is well-documented. SQLite caching follows existing patterns. No research needed.
- **Phase 3 (Chat):** Extends Phase 2's infrastructure. Multi-turn `CompletionRequest` extension is a minimal backward-compatible Rust change. Tauri event streaming is proven. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against actual `package.json` and `Cargo.toml`. Only 5 new packages, all with confirmed React 19 and unified v11 compatibility. Explicit version pinning rationale documented. |
| Features | MEDIUM-HIGH | Hub UI and briefing patterns are well-established (shadcn AI, prompt-kit, Vercel AI SDK cookbook). Chat-to-orchestrator routing and action dispatch are emerging patterns but have clear precedents. Feature list grounded in competitor analysis (Notion AI, Linear, Todoist AI, Motion). |
| Architecture | HIGH | Based on direct codebase analysis of all affected files. Data flows are concrete and specific (e.g., 2s polling interval cited at line 306 of `useAgentQueue.ts`, TodayView fallback at line 112 of `CenterPanel.tsx`). Anti-patterns identified from actual code paths, not generic advice. |
| Pitfalls | HIGH | All 8 pitfalls derived from codebase analysis, not generic web patterns. Each maps to a specific file and line. Recovery costs are realistic. Phase-to-pitfall mapping is explicit. |

**Overall confidence:** HIGH

### Gaps to Address

- **Action JSON parsing robustness (Phase 4):** The exact schema and parsing strategy for extracting LLM action blocks needs validation against actual provider behavior before implementation. Anthropic supports native tool use via structured output; Ollama may return freeform JSON. The parsing approach (regex vs `JSON.parse` with error recovery vs native tool-use API) should be decided during Phase 4 planning.
- **Bulk phase progress query (Phase 1):** `list_project_progress` returning aggregate task counts per project in one SQL query is described architecturally but not yet designed at the SQL level. Validate that the existing SQLite schema (tasks table `updated_at`, phases table foreign keys) supports efficient `GROUP BY` before Phase 1 implementation begins.
- **Briefing cache invalidation threshold (Phase 2):** Research recommends once-per-day with manual refresh. The exact staleness threshold (1 hour? 24 hours? triggered by `updated_at` change detection?) should be decided during Phase 2 planning. Too aggressive = unnecessary LLM API costs; too conservative = stale briefings frustrate users after completing significant work.
- **Chat message persistence schema (Phase 3):** Research recommends in-memory for v1.4 with SQLite persistence as a v1.4.x follow-up. The schema for persistent chat messages should be designed in Phase 3 even if not implemented, to avoid a migration later when cross-session memory is added.

## Sources

### Primary (HIGH confidence)

- Codebase: `src-tauri/src/ai/` — `provider.rs` trait with `complete_stream`, `gateway.rs` with provider routing, `types.rs` `CompletionRequest` struct (direct analysis)
- Codebase: `src/stores/` — 13-slice AppStore composition, standalone stores (`useAgentStore`, `useTerminalSessionStore`)
- Codebase: `src/hooks/useAgentQueue.ts` — 2s polling at line 306, queue directory structure
- Codebase: `src/components/layout/CenterPanel.tsx` — TodayView fallback routing at line 112
- Codebase: `src/components/agent/AgentPanel.tsx` — auto-start on mount at line 12
- Codebase: `mcp-server/src/tools/` — established tool handler pattern with `better-sqlite3`
- Codebase: `src-tauri/src/models/onboarding.rs` — token-budgeted context generation precedent (`SOFT_TOKEN_BUDGET`, `classify_phase`, `format_phase_rollup`)
- [react-markdown npm](https://www.npmjs.com/package/react-markdown) — v10.1.0, React 19 compat confirmed
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) — plugin ecosystem, unified v11 requirement
- [rehype-highlight GitHub](https://github.com/rehypejs/rehype-highlight) — highlight.js integration
- [Tauri v2 Calling Rust](https://v2.tauri.app/develop/calling-rust/) — event streaming pattern

### Secondary (MEDIUM confidence)

- [shadcn/ui AI Components](https://www.shadcn.io/ai) — chat bubble and markdown rendering patterns
- [Vercel AI SDK Markdown Chatbot Cookbook](https://ai-sdk.dev/cookbook/next/markdown-chatbot-with-memoization) — memoization for streaming markdown (pattern applicable even without the SDK)
- [AI Agent Orchestration Patterns (Azure)](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) — orchestrator/worker separation rationale
- [Deep Dive into Context Engineering for Agents](https://galileo.ai/blog/context-engineering-for-agents) — context manifest token budget best practices
- [Shadcn Tree View](https://www.shadcn.io/template/mrlightful-shadcn-tree-view) — tree component pattern with Tailwind
- [Microsoft Bot Framework Skills](https://microsoft.github.io/botframework-solutions/overview/skills/) — skill abstraction and discovery pattern

### Tertiary (LOW confidence)

- [Context Management for Agentic AI](https://medium.com/@hungry.soul/context-management-a-practical-guide-for-agentic-ai-74562a33b2a5) — context aggregation strategies (blog post, validate during implementation)
- [Claude Workflow Patterns](https://claude.com/blog/common-workflow-patterns-for-ai-agents-and-when-to-use-them) — agent workflow patterns (high-level, not Tauri-specific)

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*
