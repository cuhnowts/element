# Phase 24: Hub Chat - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

A conversational chat interface in the hub center column where users can type messages to the orchestrator and receive streaming AI responses with full markdown rendering. Multi-turn conversation within the session, context-aware via the project manifest. Independent from the agent sidebar panel.

</domain>

<decisions>
## Implementation Decisions

### Chat UI Layout
- **D-01:** Bubble-style message display -- user messages right-aligned, bot messages left-aligned with distinct background colors. Familiar chat UX (iMessage/Discord pattern).
- **D-02:** Chat lives below the AI briefing (Phase 23) in the hub center column. Briefing at top, chat messages below, input pinned to bottom. Single scrollable area.
- **D-03:** Auto-expanding textarea input -- grows as user types (up to ~4 lines). Enter sends, Shift+Enter for newline. Like ChatGPT/Claude.
- **D-04:** Suggestion chips on empty state -- 3-4 clickable prompt suggestions below the briefing before user sends first message (e.g., "What should I focus on?", "Summarize Phase 22", "Any blockers?"). Chips disappear after first message.

### Streaming & Markdown
- **D-05:** Token-by-token progressive rendering -- markdown renders as tokens arrive with a blinking cursor indicator. Uses the existing `complete_stream()` Rust infrastructure (`AiProvider` trait with `tokio::sync::mpsc::Sender<String>`).
- **D-06:** Full markdown rendering -- headers, bold/italic, bullet lists, code blocks with syntax highlighting, tables, links. Requires react-markdown + rehype/remark plugins (new dependency).
- **D-07:** Stop button -- "Stop generating" button visible while streaming. Cancels the request and keeps partial output in the chat.

### Conversation Model
- **D-08:** System prompt injection -- context manifest (Phase 23, CTX-01/02, under 2000 tokens) injected into the system prompt on every LLM call. Bot always knows current project state.
- **D-09:** Full history with cap -- all messages sent to the LLM, capped at ~20 turns. Older messages trimmed from the front. Simple and effective for session-scoped chat.
- **D-10:** Session-only history -- chat clears on app restart. No persistence to SQLite. Chat persistence (HUB-14) is explicitly deferred to future requirements.
- **D-11:** Auto-fetch deep context on project mention -- when user mentions a specific project, system detects the reference and injects that project's .planning/ files (ROADMAP.md, STATE.md, CONTEXT.md, etc.) into the next LLM call. No explicit user command needed. The manifest gives the bot enough to "slide by" on general questions; .planning/ files provide depth when pressed.

### Agent Panel Boundary
- **D-12:** Fully separate state -- hub chat uses its own Zustand store (useHubChatStore). No shared messages or state with useAgentStore. Chat is conversational Q&A; agent panel is activity monitoring.
- **D-13:** Agent panel available but closed on hub -- agent toggle button stays visible in the sidebar. User can open the agent panel if they want, but hub chat does not trigger it.
- **D-14:** Notifications stay in agent panel -- agent notifications go to agent panel badge + Sonner toast (Phase 20). Chat stays focused on the user's conversation. No injection of agent notifications into the chat stream.

### Claude's Discretion
- Suggestion chip content and exact wording
- Markdown plugin selection (specific remark/rehype plugins)
- Project mention detection strategy (keyword matching, entity extraction, etc.)
- Token budget allocation between system prompt, manifest, deep context, and message history
- Streaming event protocol (Tauri event names, payload format)
- Error states (provider unavailable, rate limit, network failure)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` -- CHAT-01 through CHAT-04 acceptance criteria
- `.planning/ROADMAP.md` -- Phase 24 success criteria, depends on Phase 23

### Dependencies (must exist before Phase 24)
- Phase 22 -- Hub shell, 3-column layout, CenterPanel routing
- Phase 23 -- Context manifest (CTX-01/02/03), AI briefing (BRIEF-01/02/03), streaming pipeline

### Prior Phase Context
- `.planning/phases/21-central-ai-agent/21-CONTEXT.md` -- Agent lifecycle, MCP sidecar, agent panel architecture (D-01 through D-13). Hub chat is explicitly separate.

### Existing AI Infrastructure
- `src-tauri/src/ai/provider.rs` -- `AiProvider` trait with `complete_stream()` method (streaming via mpsc channel)
- `src-tauri/src/ai/gateway.rs` -- `AiGateway` struct for provider management
- `src-tauri/src/commands/ai_commands.rs` -- Tauri commands for provider CRUD, test connection, generate response
- `src-tauri/src/ai/anthropic.rs` -- Anthropic provider implementation
- `src-tauri/src/ai/openai.rs` -- OpenAI provider implementation
- `src-tauri/src/ai/ollama.rs` -- Ollama provider implementation

### Existing Frontend Patterns
- `src/hooks/useAiStream.ts` -- Tauri event listener pattern for AI streaming (ai-stream-complete, ai-stream-error)
- `src/stores/useAgentStore.ts` -- Zustand store pattern (hub chat store should follow same conventions)
- `src/types/agent.ts` -- Agent type definitions (reference for chat type definitions)
- `src/components/agent/AgentPanel.tsx` -- Agent panel component (boundary reference -- chat must NOT trigger this)

### Future Requirements (do not implement, but be aware)
- `HUB-14` in `.planning/REQUIREMENTS.md` -- Chat history persistence across app restart (SQLite). Deferred.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AiProvider.complete_stream()`: Streaming infrastructure exists in Rust. Hub chat can use this directly with a new Tauri command.
- `useAiStream` hook: Event listener pattern for AI streaming. Hub chat will need a similar but chat-specific hook.
- `useAgentStore`: Zustand store pattern to follow for `useHubChatStore`.
- shadcn/ui components: Button, Input, ScrollArea, etc. for chat UI building blocks.

### Established Patterns
- **State management**: Zustand stores with slices
- **Tauri IPC**: Commands in `src-tauri/src/commands/`, invoked via `src/lib/tauri-commands.ts`
- **UI framework**: shadcn/ui + Tailwind CSS + Lucide icons
- **Event streaming**: Tauri event emitter from Rust to frontend listeners

### Integration Points
- Hub center column (Phase 22): Chat component mounts below briefing
- Context manifest (Phase 23): Injected into system prompt for every chat request
- AI gateway (existing): Direct API calls for chat, not CLI/MCP
- Settings > AI: Same configured provider used for chat

### New Dependencies Needed
- `react-markdown` + `remark-gfm` + `rehype-highlight` (or similar) for full markdown rendering with syntax highlighting
- No markdown library currently installed

</code_context>

<specifics>
## Specific Ideas

- User described the context model as "have enough knowledge to slide by until pressed about it" -- the manifest provides broad awareness, .planning/ files provide depth on demand.
- Auto-fetch pattern: when user mentions a specific project, system reads that project's .planning/ directory and injects relevant files into the LLM context. Like a skill that loads context lazily.
- Suggestion chips should be context-aware -- generated from the manifest, not hardcoded (e.g., "Summarize Phase 22" adapts to whatever phase is current).

</specifics>

<deferred>
## Deferred Ideas

- **Chat history persistence (HUB-14)**: Save messages to SQLite, restore on app launch. Already in future requirements.
- **Chat-to-agent handoff**: User could ask chat to "run Phase 22" and it delegates to the agent. Belongs in Phase 25 (Bot Skills).

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 24-hub-chat*
*Context gathered: 2026-04-01*
