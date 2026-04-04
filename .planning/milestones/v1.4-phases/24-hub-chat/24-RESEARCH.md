# Phase 24: Hub Chat - Research

**Researched:** 2026-04-01
**Domain:** Chat UI, LLM streaming, markdown rendering, multi-turn conversation
**Confidence:** HIGH

## Summary

Phase 24 adds a conversational chat interface to the hub center column. The core challenge is threefold: (1) extending the existing single-message `CompletionRequest` to support multi-turn message arrays, (2) wiring real-time token streaming from Rust through Tauri events to a React chat UI with progressive markdown rendering, and (3) adding react-markdown with remark/rehype plugins as a new dependency for rich content display.

The existing AI infrastructure (`AiProvider` trait, `complete_stream()`, `AiGateway`, event emitter pattern) provides a solid foundation but requires significant extension. The current `CompletionRequest` struct only accepts a single `user_message: String` -- all four provider implementations (Anthropic, OpenAI, Ollama, OpenAI-compatible) hardcode a single-message array in their API calls. Multi-turn chat requires a new `ChatRequest` type with a `messages: Vec<ChatMessage>` field, and all four providers need a new `chat_stream()` method (or the existing `complete_stream()` must be generalized).

**Primary recommendation:** Introduce a new `ChatRequest` / `chat_stream()` path alongside the existing `CompletionRequest` / `complete_stream()` path. Do not modify the existing single-message interface -- it works and is used by `ai_assist_task`. The new chat-specific Tauri command, store, and hook can be built cleanly on top.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Bubble-style message display -- user messages right-aligned, bot messages left-aligned with distinct background colors. Familiar chat UX (iMessage/Discord pattern).
- **D-02:** Chat lives below the AI briefing (Phase 23) in the hub center column. Briefing at top, chat messages below, input pinned to bottom. Single scrollable area.
- **D-03:** Auto-expanding textarea input -- grows as user types (up to ~4 lines). Enter sends, Shift+Enter for newline. Like ChatGPT/Claude.
- **D-04:** Suggestion chips on empty state -- 3-4 clickable prompt suggestions below the briefing before user sends first message. Chips disappear after first message.
- **D-05:** Token-by-token progressive rendering -- markdown renders as tokens arrive with a blinking cursor indicator. Uses existing `complete_stream()` Rust infrastructure.
- **D-06:** Full markdown rendering -- headers, bold/italic, bullet lists, code blocks with syntax highlighting, tables, links. Requires react-markdown + rehype/remark plugins (new dependency).
- **D-07:** Stop button -- "Stop generating" button visible while streaming. Cancels the request and keeps partial output.
- **D-08:** System prompt injection -- context manifest injected into system prompt on every LLM call.
- **D-09:** Full history with cap -- all messages sent to LLM, capped at ~20 turns. Older messages trimmed from front.
- **D-10:** Session-only history -- chat clears on app restart. No persistence to SQLite.
- **D-11:** Auto-fetch deep context on project mention -- detect project reference, inject .planning/ files into next LLM call.
- **D-12:** Fully separate state -- hub chat uses its own Zustand store (useHubChatStore). No shared state with useAgentStore.
- **D-13:** Agent panel available but closed on hub -- toggle button stays visible but chat does not trigger it.
- **D-14:** Notifications stay in agent panel -- no injection of agent notifications into chat stream.

### Claude's Discretion
- Suggestion chip content and exact wording
- Markdown plugin selection (specific remark/rehype plugins)
- Project mention detection strategy (keyword matching, entity extraction, etc.)
- Token budget allocation between system prompt, manifest, deep context, and message history
- Streaming event protocol (Tauri event names, payload format)
- Error states (provider unavailable, rate limit, network failure)

### Deferred Ideas (OUT OF SCOPE)
- Chat history persistence (HUB-14) -- save to SQLite, restore on launch
- Chat-to-agent handoff -- user asks chat to run a phase, delegates to agent (Phase 25)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | User can type messages to the central orchestrator via a chat input on the hub | New `useHubChatStore`, `ChatInput` component, `hub_chat_send` Tauri command |
| CHAT-02 | Chat displays streaming LLM responses with markdown rendering | react-markdown + remark-gfm + rehype-highlight, Tauri event streaming, progressive render |
| CHAT-03 | Chat supports multi-turn conversation within the session | New `ChatRequest` with messages array, history cap at ~20 turns, frontend message accumulation |
| CHAT-04 | Hub chat is independent from the agent panel | Separate `useHubChatStore` (not `useAgentStore`), no agent panel triggers, separate Tauri event channels |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | 10.1.0 | Render markdown from LLM responses | De facto React markdown renderer; ESM-only, tree-shakeable, extensible via plugins |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown (tables, strikethrough, task lists) | Standard GFM extension for remark; LLMs frequently output GFM tables |
| rehype-highlight | 7.0.2 | Syntax highlighting for code blocks | Uses highlight.js under the hood; lightweight, broad language support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| rehype-raw | 7.0.0 | Allow raw HTML in markdown | Only if LLM outputs contain HTML tags that should render (optional, can skip initially) |
| highlight.js | (peer dep) | Syntax highlighting engine | Pulled in by rehype-highlight; import CSS theme (e.g., `github-dark`) for styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rehype-highlight | rehype-prism-plus | Prism has more themes but larger bundle; highlight.js is simpler |
| react-markdown | marked + dangerouslySetInnerHTML | Much faster rendering but XSS risk, no React component tree |
| Session-only store | SQLite persistence | D-10 explicitly defers persistence; session-only is simpler |

**Installation:**
```bash
npm install react-markdown@10.1.0 remark-gfm@4.0.1 rehype-highlight@7.0.2
```

**Version verification:** All versions verified via `npm view` on 2026-04-01.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/hub/
│   ├── HubChat.tsx              # Container: message list + input
│   ├── ChatMessage.tsx          # Single message bubble with markdown
│   ├── ChatInput.tsx            # Auto-expanding textarea + send/stop
│   ├── SuggestionChips.tsx      # Empty-state prompt suggestions
│   └── MarkdownRenderer.tsx     # react-markdown wrapper with plugins
├── stores/
│   └── useHubChatStore.ts       # Standalone Zustand store (like useAgentStore)
├── hooks/
│   └── useHubChatStream.ts      # Tauri event listener for chat streaming
├── types/
│   └── chat.ts                  # ChatMessage, ChatRole, HubChatState types
└── lib/
    └── tauri-commands.ts        # Add hub_chat_send command wrapper

src-tauri/src/
├── ai/
│   ├── types.rs                 # Add ChatRequest, ChatMessage structs
│   ├── provider.rs              # Add chat_stream() to AiProvider trait (or new trait)
│   ├── anthropic.rs             # Implement multi-message chat_stream
│   ├── openai.rs                # Implement multi-message chat_stream
│   ├── ollama.rs                # Implement multi-message chat_stream
│   └── openai_compat.rs         # Implement multi-message chat_stream
├── commands/
│   └── hub_chat_commands.rs     # New: hub_chat_send, hub_chat_stop Tauri commands
└── main.rs                      # Register new commands
```

### Pattern 1: Multi-Turn Message Array on Rust Side
**What:** Extend AI types to support a messages array instead of single user_message.
**When to use:** For all chat interactions (not task scaffolding which stays single-message).
**Key insight:** The current `CompletionRequest` has `system_prompt: String` + `user_message: String`. All four providers hardcode `[{"role": "user", "content": request.user_message}]`. Chat needs `Vec<ChatMessage>` where each message has `role` (user/assistant) and `content`.

**Recommended approach:** Add new types alongside existing ones:
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,      // "user" | "assistant" | "system"
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatRequest {
    pub system_prompt: String,
    pub messages: Vec<ChatMessage>,
    pub max_tokens: u32,
    pub temperature: f32,
}
```

Add a new method to the `AiProvider` trait:
```rust
async fn chat_stream(
    &self,
    request: ChatRequest,
    event_sender: tokio::sync::mpsc::Sender<String>,
) -> Result<CompletionResponse, AiError>;
```

Each provider implements `chat_stream()` by building the appropriate messages array for its API format. This avoids changing the existing `complete_stream()` signature.

### Pattern 2: Standalone Zustand Store (following useAgentStore)
**What:** `useHubChatStore` as a standalone `create()` store, NOT a slice in the main store.
**When to use:** Per D-12, chat state is fully separate from both the main app store and the agent store.
**Example:**
```typescript
interface HubChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string; // Accumulates during streaming
  error: string | null;

  sendMessage: (content: string) => void;
  appendStreamChunk: (chunk: string) => void;
  finalizeResponse: (content: string) => void;
  stopGenerating: () => void;
  clearChat: () => void;
}
```

### Pattern 3: Tauri Event Streaming with Chat-Specific Channel
**What:** Use distinct event names for chat streaming to avoid collision with existing ai-stream-* events.
**When to use:** Always for hub chat. The existing `ai-stream-chunk`/`ai-stream-complete`/`ai-stream-error` events are used by task scaffolding.
**Recommended event names:**
- `hub-chat-stream-chunk` -- token delta
- `hub-chat-stream-done` -- streaming complete (no parsed payload, just signal)
- `hub-chat-stream-error` -- error message

### Pattern 4: Progressive Markdown Rendering
**What:** Re-render react-markdown on every chunk append, not just on completion.
**When to use:** D-05 requires token-by-token progressive rendering.
**Key concern:** react-markdown re-renders the full markdown tree on each content change. For long responses, this can become expensive. Mitigations:
1. `React.memo` on `ChatMessage` for non-streaming messages
2. Only the currently-streaming message re-renders on chunk
3. Consider debouncing rendering to every ~50ms if performance issues arise

### Pattern 5: Stop Generation via AbortController
**What:** Frontend sends a cancel signal, Rust drops the streaming connection.
**When to use:** D-07 stop button.
**Approach:** The Tauri command can accept a `CancellationToken` pattern, or simpler: use a global `AtomicBool` flag that the streaming loop checks. When frontend calls `hub_chat_stop`, set the flag; the stream loop breaks and returns partial content.

### Anti-Patterns to Avoid
- **Sharing state with useAgentStore:** D-12 is explicit. No shared messages, no shared streaming state. The agent panel monitors background activity; chat is interactive Q&A.
- **Modifying CompletionRequest for multi-turn:** Adding an optional `messages` field to `CompletionRequest` creates ambiguity (is `user_message` used or `messages`?). Use a separate `ChatRequest` type.
- **Rendering markdown during streaming with dangerouslySetInnerHTML:** XSS risk, no React reconciliation, breaks on partial markdown.
- **Blocking the main thread during stream forwarding:** The existing pattern (spawn a forwarder task) is correct. Do not `await` each event send synchronously.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom parser | react-markdown 10.1.0 | Edge cases in markdown spec are vast; tables, nested lists, code fences |
| GFM tables/strikethrough | Regex-based table renderer | remark-gfm 4.0.1 | GFM spec has subtle edge cases |
| Syntax highlighting | Custom code block highlighter | rehype-highlight 7.0.2 | Language detection, 190+ languages, tested |
| Auto-expanding textarea | Manual height calculation | CSS `field-sizing: content` or a `rows` + `scrollHeight` pattern | Browser-native is most reliable |
| Streaming SSE parsing | Custom SSE parser | Existing provider implementations | Already handles Anthropic SSE, OpenAI SSE, Ollama NDJSON |

**Key insight:** The markdown rendering pipeline (react-markdown + remark + rehype) is a well-established composition pattern. Each plugin does one thing. Do not try to combine or simplify.

## Common Pitfalls

### Pitfall 1: react-markdown Re-render Cost During Streaming
**What goes wrong:** Each streaming chunk triggers a full markdown re-parse and re-render. With large code blocks or complex markdown, this causes visible frame drops.
**Why it happens:** react-markdown parses the entire string on every render. No incremental parsing.
**How to avoid:** (1) Only the currently-streaming message should have dynamic content; all finalized messages use `React.memo`. (2) Accumulate chunks in a ref and flush to state on a 50ms timer rather than on every chunk. (3) Use `useMemo` for the rehype/remark plugin arrays to prevent react-markdown from reinitializing plugins on each render.
**Warning signs:** Janky scrolling, high CPU during streaming, visible lag between chunks.

### Pitfall 2: CompletionRequest Single-Message Limitation
**What goes wrong:** Attempting to stuff conversation history into `user_message` as a formatted string. The LLM sees it as one user turn, not a conversation.
**Why it happens:** The current `CompletionRequest` only has `user_message: String`.
**How to avoid:** Create a proper `ChatRequest` with `messages: Vec<ChatMessage>`. Each provider constructs the correct API payload from the message array.
**Warning signs:** LLM responds as if reading a transcript rather than participating in a conversation.

### Pitfall 3: Event Name Collision
**What goes wrong:** Hub chat stream events collide with existing `ai-stream-chunk` / `ai-stream-complete` events used by task scaffolding.
**Why it happens:** Both use the same Tauri event emitter.
**How to avoid:** Use distinct event names prefixed with `hub-chat-`. Consider adding a `session_id` field to event payloads for future-proofing.
**Warning signs:** Task scaffolding results appearing in chat, or chat chunks going to the wrong listener.

### Pitfall 4: Zustand Selector Stability (from project memory)
**What goes wrong:** Returning new object/array references from Zustand selectors causes unnecessary re-renders.
**Why it happens:** `useHubChatStore(s => ({ messages: s.messages, isStreaming: s.isStreaming }))` creates a new object on every call.
**How to avoid:** Use individual selectors: `useHubChatStore(s => s.messages)` and `useHubChatStore(s => s.isStreaming)` separately. Use constants for empty arrays.
**Warning signs:** Chat re-renders on unrelated state changes; React DevTools shows excessive renders.

### Pitfall 5: Scroll-to-Bottom During Streaming
**What goes wrong:** Auto-scroll to bottom fights with user scrolling up to read earlier messages.
**Why it happens:** Naive `scrollToBottom()` on every chunk overrides user scroll position.
**How to avoid:** Track whether user has manually scrolled up (compare scrollTop + clientHeight vs scrollHeight). Only auto-scroll if user is "near bottom" (within ~50px). Show a "scroll to bottom" button when user has scrolled up.
**Warning signs:** Chat jumps to bottom while user is reading, or fails to follow new content.

### Pitfall 6: Anthropic System Prompt Format
**What goes wrong:** Anthropic API uses `system` as a top-level field, not a message with role "system". OpenAI/Ollama use a system message in the messages array.
**Why it happens:** API format differences between providers.
**How to avoid:** Each provider's `chat_stream()` implementation must correctly extract `system_prompt` from `ChatRequest` and format it per the API spec. Anthropic: top-level `system` field + messages array (user/assistant only). OpenAI/Ollama: prepend `{"role": "system", ...}` to messages array.
**Warning signs:** "Invalid role" API errors from Anthropic when sending system role in messages.

### Pitfall 7: ESM-Only Dependencies
**What goes wrong:** react-markdown 10.x is ESM-only. Build tools may fail if not configured for ESM.
**Why it happens:** react-markdown dropped CJS support in v9+.
**How to avoid:** The project already uses `"type": "module"` in package.json and Vite, which handles ESM natively. No special configuration needed.
**Warning signs:** "require() of ES Module" errors at build time.

## Code Examples

### Chat Message Types
```typescript
// src/types/chat.ts
export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}
```

### Standalone Zustand Store Pattern (following useAgentStore)
```typescript
// src/stores/useHubChatStore.ts
import { create } from "zustand";
import type { ChatMessage } from "@/types/chat";

interface HubChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;

  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendChunk: (chunk: string) => void;
  finalizeAssistantMessage: () => void;
  stopGenerating: () => void;
  setError: (error: string | null) => void;
  clearChat: () => void;
}
```

### react-markdown with Plugins
```typescript
// src/components/hub/MarkdownRenderer.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useMemo } from "react";

// IMPORTANT: Memoize plugin arrays to prevent re-initialization
const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
    >
      {content}
    </ReactMarkdown>
  );
}
```

### Tauri Chat Command Pattern
```rust
// src-tauri/src/commands/hub_chat_commands.rs
#[tauri::command]
pub async fn hub_chat_send(
    messages: Vec<ChatMessage>,   // Full conversation history from frontend
    system_prompt: String,        // Manifest + deep context
    app: AppHandle,
    db_state: State<'_, Arc<Mutex<Database>>>,
    gateway: State<'_, AiGateway>,
) -> Result<(), String> {
    let provider_config = {
        let db = db_state.lock().map_err(|e| e.to_string())?;
        gateway.get_default_config(&db).map_err(|e| e.to_string())?
    };

    let provider = gateway.build_provider(&provider_config).map_err(|e| e.to_string())?;

    let request = ChatRequest {
        system_prompt,
        messages,
        max_tokens: 4096,
        temperature: 0.7,
    };

    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(32);

    let app_clone = app.clone();
    let forwarder = tokio::spawn(async move {
        while let Some(chunk) = rx.recv().await {
            let _ = app_clone.emit("hub-chat-stream-chunk", &chunk);
        }
    });

    let result = provider.chat_stream(request, tx).await;
    let _ = forwarder.await;

    match result {
        Ok(_response) => {
            let _ = app.emit("hub-chat-stream-done", ());
            Ok(())
        }
        Err(e) => {
            let error_msg = e.to_string();
            let _ = app.emit("hub-chat-stream-error", &error_msg);
            Err(error_msg)
        }
    }
}
```

### Auto-Expanding Textarea Pattern
```typescript
// ChatInput.tsx key behavior
function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
  // Shift+Enter inserts newline naturally
}

// Auto-resize: set rows=1, then adjust height based on scrollHeight
function autoResize(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-markdown v8 (CJS) | react-markdown v10 (ESM-only) | 2024 | Must use ESM imports; no `require()` |
| Single system+user prompt | Multi-turn messages array | Standard in all LLM APIs | ChatRequest needs messages array |
| Full re-render on stream | Debounced progressive render | Ongoing best practice | Prevents frame drops on long responses |

**Deprecated/outdated:**
- `react-markdown` v8 and below: CJS, older API. v10 is current.
- `remark-gfm` v3: Older API. v4 is current.

## Open Questions

1. **Streaming cancellation mechanism**
   - What we know: Frontend needs to signal "stop generating" to Rust. Tauri doesn't have native request cancellation for commands.
   - What's unclear: Best pattern -- (a) global AtomicBool checked in stream loop, (b) separate cancel command that drops the provider's reqwest response, (c) Tauri app-level abort token.
   - Recommendation: Use an `Arc<AtomicBool>` stored in Tauri managed state. `hub_chat_stop` command sets it to true. The stream forwarder checks the flag and breaks. Simple, reliable.

2. **Deep context injection size**
   - What we know: D-11 says inject .planning/ files when user mentions a project. .planning/ directories can be large (ROADMAP.md, STATE.md, CONTEXT.md, multiple PLAN.md files).
   - What's unclear: How to cap the injected context to avoid exceeding model context windows, especially for Ollama models with smaller contexts.
   - Recommendation: Read only the most relevant files (STATE.md + current phase CONTEXT.md), cap at ~4000 tokens. The manifest already covers broad awareness.

3. **Project mention detection strategy**
   - What we know: D-11 says "system detects the reference" when user mentions a project.
   - What's unclear: Whether to use exact project name matching, fuzzy matching, or let the LLM identify the project.
   - Recommendation: Simple case-insensitive substring match against known project names from the manifest. Low complexity, deterministic, no LLM call overhead.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Chat input sends message, store updates | unit | `npx vitest run src/stores/useHubChatStore.test.ts -x` | No -- Wave 0 |
| CHAT-02 | Streaming chunks accumulate, markdown renders | unit | `npx vitest run src/components/hub/__tests__/ChatMessage.test.tsx -x` | No -- Wave 0 |
| CHAT-03 | Multi-turn messages accumulate in store, cap at 20 | unit | `npx vitest run src/stores/useHubChatStore.test.ts -x` | No -- Wave 0 |
| CHAT-04 | Hub chat store is independent, no agent panel trigger | unit | `npx vitest run src/stores/useHubChatStore.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/stores/useHubChatStore.test.ts` -- covers CHAT-01, CHAT-03, CHAT-04 (store behavior, message cap, independence)
- [ ] `src/components/hub/__tests__/ChatMessage.test.tsx` -- covers CHAT-02 (markdown rendering, streaming display)
- [ ] `src/components/hub/__tests__/ChatInput.test.tsx` -- covers CHAT-01 (input behavior, Enter/Shift+Enter, empty guard)
- [ ] No new framework install needed (vitest already configured)

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `src-tauri/src/ai/provider.rs`, `types.rs`, `anthropic.rs`, `openai.rs`, `ollama.rs`, `openai_compat.rs` -- confirmed single-message limitation
- Direct code inspection of `src/stores/useAgentStore.ts` -- confirmed standalone store pattern
- Direct code inspection of `src/hooks/useAiStream.ts` -- confirmed event listener pattern
- Direct code inspection of `src-tauri/src/commands/ai_commands.rs` -- confirmed streaming command pattern
- `npm view` registry queries for react-markdown (10.1.0), remark-gfm (4.0.1), rehype-highlight (7.0.2)
- `package.json` dependency audit -- confirmed no existing markdown library

### Secondary (MEDIUM confidence)
- react-markdown API patterns based on established v9+ API (ESM-only, remarkPlugins/rehypePlugins props)
- Progressive markdown rendering performance characteristics based on common React patterns

### Tertiary (LOW confidence)
- Streaming cancellation via AtomicBool -- reasonable pattern but untested in this codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions verified against npm registry, no existing markdown deps to conflict
- Architecture: HIGH - patterns directly derived from existing codebase (useAgentStore, ai_assist_task, event streaming)
- Pitfalls: HIGH - identified from direct code analysis (CompletionRequest limitation, event name collision, Anthropic format difference)
- Multi-turn extension: HIGH - all four provider implementations inspected; change scope is clear and bounded

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain, no fast-moving dependencies)
