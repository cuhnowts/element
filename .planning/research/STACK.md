# Stack Research

**Domain:** Daily Hub features for Tauri 2.x desktop app (chat UI, LLM streaming, context manifest, bot skills)
**Researched:** 2026-03-31
**Confidence:** HIGH

## Scope

This research covers ONLY new stack additions for v1.4 Daily Hub. The existing stack (Tauri 2.x, React 19, SQLite, Zustand 5, shadcn/ui, Tailwind CSS, xterm.js, tauri-plugin-pty, MCP server sidecar, agent lifecycle, notification system, model-agnostic AI layer) is validated and not re-evaluated.

## Recommended Stack Additions

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| react-markdown | ^10.1.0 | Render LLM markdown responses in chat and briefing UI | Standard React markdown renderer. Returns native React elements (no dangerouslySetInnerHTML). Plugin ecosystem for GFM and syntax highlighting. Latest stable, React 19 compatible. |
| remark-gfm | ^4.0.0 | GitHub-flavored markdown in chat (tables, task lists, strikethrough) | LLM responses frequently contain GFM constructs. Without this plugin, tables render as plain text. Must use v4 (unified ecosystem v11, matching react-markdown@10). |
| rehype-highlight | ^7.0.2 | Syntax highlighting in LLM code blocks | highlight.js-based -- lightweight, theme-able to match existing dark UI. Better than react-syntax-highlighter for this use case (smaller bundle, no wrapper components needed). |
| react-textarea-autosize | ^8.5.7 | Auto-growing textarea for hub chat input | Chat input must grow with content (like Discord/ChatGPT). Native textarea requires manual height calculation. 8.5.7 is stable, React 19 compatible, 2.8kB gzipped. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| highlight.js | ^11.11.0 | Syntax highlighting engine (peer dep of rehype-highlight) | Auto-installed as peer. Import only specific language grammars needed (typescript, rust, json, bash, sql) to keep bundle small. Import a dark theme CSS file in app.css. |

### What Already Exists (DO NOT Add)

These are capabilities the codebase already has that cover Daily Hub needs:

| Existing Capability | Location | Covers |
|---------------------|----------|--------|
| LLM streaming via Tauri events | `ai_commands.rs`, `AiProvider::complete_stream` | Streaming tokens to frontend for briefing and chat |
| Multi-provider AI gateway | `ai/gateway.rs` (Anthropic, OpenAI, Ollama, OpenAI-compat) | Model-agnostic chat completions |
| Tauri event bus (`app.emit`) | Throughout Rust commands | Real-time streaming chunks to React |
| `reqwest` with `json` + `rustls-tls` | `Cargo.toml` | HTTP calls to LLM APIs |
| `tokio` full + `tokio-stream` + `futures` | `Cargo.toml` | Async streaming, mpsc channels |
| `react-resizable-panels` | `package.json` | 3-column hub layout (already used in workspace) |
| Zustand 5 with slice pattern | `src/stores/` (12+ slices) | Chat state management |
| shadcn/ui + Radix primitives | `package.json` | All UI primitives (ScrollArea, Card, Button, Avatar) |
| lucide-react icons | `package.json` | Chat icons (Send, Bot, User, Sparkles) |
| sonner toasts | `package.json` | Error/success feedback |
| MCP server sidecar (Node.js) | `mcp-server/` with `better-sqlite3`, `zod`, `@modelcontextprotocol/sdk` | Bot skill execution (10 tools already) |
| Agent queue (file-based JSON) | `useAgentQueue.ts`, `mcp-server/src/tools/orchestration-tools.ts` | Agent-to-frontend communication |
| `chrono` + `serde_json` + `rusqlite` | `Cargo.toml` | Context manifest generation (timestamps, serialization, queries) |
| `async-trait` + `thiserror` | `Cargo.toml` | Provider trait pattern, error handling |

## Architecture Decisions for New Features

### 1. Chat UI: Build Custom with shadcn/ui

**Decision:** Build chat components using existing shadcn/ui primitives. Do NOT add a chat UI library.

**Why NOT chatscope/chat-ui-kit or LlamaIndex chat-ui:**
- Element has an established design system (shadcn/ui + Tailwind). Third-party chat kits bring conflicting CSS.
- LLM chat is ~4 components: MessageList, MessageBubble, ChatInput, TypingIndicator. Not complex enough to justify a dependency.
- LLM chat UX differs from messaging (no read receipts, no multi-user avatars, no typing indicators from "other users"). Chat kits model human-to-human interaction.
- react-markdown handles the hard part (rendering markdown). The container is straightforward layout.

**Components to build:**
- `HubChatMessage` -- renders user or assistant message with react-markdown
- `HubChatInput` -- react-textarea-autosize with send button, Enter to send / Shift+Enter for newline
- `HubChatPanel` -- shadcn/ui ScrollArea wrapping message list with auto-scroll-to-bottom on new content
- `HubBriefingCard` -- streaming markdown card for the daily briefing

### 2. Multi-Turn Conversation: Extend CompletionRequest

**Decision:** Add `messages: Option<Vec<ChatMessage>>` to the existing `CompletionRequest` struct. Backward-compatible -- existing single-turn callers are unaffected.

**Current state:** `CompletionRequest` has `system_prompt` + `user_message` (single turn only). Chat requires `messages: [{role, content}, ...]` for conversation history.

**Rust changes needed:**
```rust
// New type in ai/types.rs
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,      // "user" | "assistant"
    pub content: String,
}

// Extend CompletionRequest -- add optional messages field
pub struct CompletionRequest {
    pub system_prompt: String,
    pub user_message: String,              // kept for single-turn backward compat
    pub messages: Option<Vec<ChatMessage>>, // new: multi-turn conversations
    pub max_tokens: u32,
    pub temperature: f32,
}
```

**Provider impact:** Each provider's `complete`/`complete_stream` checks `request.messages`. If `Some`, builds the full messages array. If `None`, falls back to existing single-turn behavior. Zero changes to `ai_assist_task`.

**New Tauri command:** `hub_chat_send` -- accepts system prompt + messages array, streams response via dedicated event channels (`hub-chat-chunk`, `hub-chat-complete`, `hub-chat-error`) to avoid colliding with existing `ai-stream-*` events.

**New Tauri command:** `generate_briefing` -- takes no user input, builds system prompt with context manifest data, streams daily briefing markdown via `hub-briefing-chunk` / `hub-briefing-complete`.

### 3. Chat State: New Zustand Slice in AppStore

**Decision:** Add `hubChatSlice.ts` following the existing `StateCreator<AppStore>` pattern.

**Why slice, not standalone store:** Hub chat needs access to project state (context injection) and AI provider state (which model to use). Combined store avoids cross-store subscription boilerplate. The pattern is proven across 12+ existing slices.

**State shape:**
```typescript
interface HubChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface HubChatSlice {
  chatMessages: HubChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  briefing: string | null;
  briefingLoading: boolean;
  briefingError: string | null;
  sendMessage: (content: string) => Promise<void>;
  generateBriefing: () => Promise<void>;
  clearChat: () => void;
}
```

### 4. Context Manifest: Rust-Side Generation to AppData

**Decision:** New Tauri command `generate_context_manifest` queries all projects/phases/tasks from SQLite, serializes to JSON, writes to `$APP_DATA/context-manifest.json`.

**Why Rust-side:** Aggregating data across multiple SQLite tables. Doing this in Rust avoids N IPC round-trips. The MCP server sidecar can read the file directly (it already accesses the app data directory for `element.db` and `agent-queue/`).

**Trigger points:** App launch, project CRUD, phase status change, task completion. Debounce to avoid excessive writes (500ms).

**No new dependencies.** `serde_json` serializes, `chrono` timestamps, `rusqlite` queries. All in `Cargo.toml`.

### 5. Bot Skills: Extend MCP Server Tools

**Decision:** Add new tool handler files to `mcp-server/src/tools/`. Register in `index.ts`. No new framework or dependencies.

**Existing pattern (proven):** Tool handlers are functions `(db, dbPath, args) => { content: [...] }`. Tools read `element.db` via `better-sqlite3`. The agent queue uses file-based JSON for async communication.

**New tool files to add:**
- `command-tools.ts` -- Execute shell commands with timeout and risk-tier allowlist
- `file-tools.ts` -- Create/read/update files in project directories
- `entity-tools.ts` -- Full CRUD on all app entities (themes, projects, phases, tasks)
- `context-tools.ts` -- Read context manifest, get cross-project summaries

**No new npm dependencies.** `better-sqlite3`, `zod`, `@modelcontextprotocol/sdk`, and `node:fs`/`node:child_process` cover everything.

### 6. Vercel AI SDK: DO NOT Use

**Why not:** AI SDK assumes HTTP endpoints and server-rendered frameworks (Next.js, SvelteKit). Element streams via Tauri IPC events from Rust. Using AI SDK would require either running a local HTTP server to satisfy the SDK or fighting its abstractions to plug into Tauri events. The existing `reqwest` streaming + `app.emit` pattern is simpler and already works for `ai_assist_task`.

## Installation

```bash
# Frontend -- 4 new packages + 1 peer
npm install react-markdown@^10.1.0 remark-gfm@^4.0.0 rehype-highlight@^7.0.2 react-textarea-autosize@^8.5.7 highlight.js@^11.11.0
```

```toml
# Cargo.toml -- NO changes needed
# All required Rust crates already present
```

```json
// mcp-server/package.json -- NO changes needed
// better-sqlite3, zod, @modelcontextprotocol/sdk already present
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| react-markdown + rehype-highlight | marked + DOMPurify | Never in React. react-markdown returns native elements without dangerouslySetInnerHTML. |
| rehype-highlight (highlight.js) | react-syntax-highlighter (Prism) | If you need line numbers, line highlighting, or per-block copy buttons. Heavier bundle (~150kB vs ~30kB) but more features. Upgrade later if users request it. |
| Custom chat components (shadcn/ui) | chatscope/chat-ui-kit | Only if building multi-user messaging. Not appropriate for single-user LLM chat with an existing design system. |
| Zustand slice in AppStore | Separate Zustand store for chat | Only if chat state needed isolation from app state (e.g., web worker). Not the case here -- chat needs project + provider context. |
| Tauri event streaming | WebSocket or HTTP SSE server | Only if the app needed browser-accessible streaming. Tauri events are lower-latency (no HTTP overhead) and already proven in the codebase. |
| Extend CompletionRequest (Option field) | New ChatCompletionRequest type | If backward compat wasn't needed. But existing `ai_assist_task` uses CompletionRequest. Optional `messages` avoids a parallel type hierarchy. |
| File-based context manifest (JSON) | SQLite view or virtual table | If real-time queries were needed. File is better because MCP sidecar reads it without a second DB connection, and regeneration is explicit/controllable. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Vercel AI SDK (`ai` npm package) | Assumes HTTP endpoints and SSR. Would fight the Tauri IPC architecture. | Existing `AiProvider::complete_stream` + Tauri `app.emit` |
| chatscope/chat-ui-kit | Conflicting CSS, human-to-human messaging model, unnecessary dependency. | Custom components with shadcn/ui ScrollArea, Card, Button |
| LangChain.js / LangGraph.js | Massive dependency tree (~50+ transitive deps), server-oriented, adds complexity for "send messages to API". | Direct `reqwest` calls in Rust (already working) |
| MDX / @mdx-js/react | Compiles markdown to JSX at build time. LLM output is runtime content. Wrong tool. | react-markdown (runtime rendering) |
| react-virtualized / react-window for chat | Premature optimization. Hub chat is <100 messages per session. Virtual scrolling complicates auto-scroll-to-bottom and streaming content with dynamic heights. | Native ScrollArea with ref-based auto-scroll |
| Separate HTTP server for AI (Axum, Actix) | Adding a server alongside Tauri is unnecessary complexity. Tauri commands + events handle this natively. | Tauri commands with `tokio::sync::mpsc` channels |
| redux / jotai / recoil | Different state management when Zustand 5 is established across 12+ slices. | Zustand 5 (existing) |
| Marked / markdown-it | Lower-level markdown parsers requiring manual React integration and HTML sanitization. | react-markdown (purpose-built for React) |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| react-markdown@10 | React 19 | v10 requires React 18+. Verified React 19 compat. |
| react-markdown@10 | remark-gfm@4 | Both use unified ecosystem v11. Must use remark-gfm v4, NOT v3. |
| react-markdown@10 | rehype-highlight@7 | Both use unified ecosystem v11. Compatible. |
| rehype-highlight@7 | highlight.js@11 | rehype-highlight@7 peers on highlight.js 11.x. |
| react-textarea-autosize@8 | React 19 | v8 supports React 16-19. |
| Zustand@5 | React 19 | Already working in codebase. No changes. |
| @modelcontextprotocol/sdk@^1.28 | Node.js 18+ | Already working in MCP sidecar. No changes. |

## Dependency Budget

| Category | New Packages | Count |
|----------|-------------|-------|
| Frontend npm | react-markdown, remark-gfm, rehype-highlight, react-textarea-autosize, highlight.js | 5 |
| Rust crates | (none) | 0 |
| MCP server npm | (none) | 0 |

This is deliberately minimal. The existing stack covers ~90% of Daily Hub needs. The only genuine gap is markdown rendering for LLM output and a better textarea for chat input.

## Sources

- [react-markdown on npm](https://www.npmjs.com/package/react-markdown) -- version 10.1.0 confirmed, last publish March 2025 (HIGH confidence)
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) -- plugin ecosystem docs, React 19 compat (HIGH confidence)
- [rehype-highlight GitHub](https://github.com/rehypejs/rehype-highlight) -- highlight.js integration (HIGH confidence)
- [remark-gfm GitHub](https://github.com/remarkjs/remark-gfm) -- GFM support, v4 for unified v11 (HIGH confidence)
- [Tauri v2 Calling Rust](https://v2.tauri.app/develop/calling-rust/) -- event streaming pattern (HIGH confidence)
- Codebase: `src-tauri/src/ai/` -- `provider.rs` trait, `types.rs` CompletionRequest, `anthropic.rs` streaming implementation (HIGH confidence)
- Codebase: `src-tauri/src/commands/ai_commands.rs` -- existing streaming pattern with `tokio::sync::mpsc` + `app.emit` (HIGH confidence)
- Codebase: `mcp-server/src/tools/` -- existing tool handler pattern (HIGH confidence)
- Codebase: `src/stores/` -- Zustand slice pattern across 12+ files (HIGH confidence)
- Codebase: `package.json` + `Cargo.toml` -- verified all existing dependencies (HIGH confidence)

---
*Stack research for: Element v1.4 Daily Hub*
*Researched: 2026-03-31*
