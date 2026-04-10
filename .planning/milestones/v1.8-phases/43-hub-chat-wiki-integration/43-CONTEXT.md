# Phase 43: Hub Chat Wiki Integration - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can ingest, query, lint, and manage the wiki entirely through hub chat commands, with plugin-contributed skills loaded dynamically alongside built-in actions. This phase bridges Phase 41's plugin skill infrastructure and Phase 42's wiki engine into the existing hub chat UI.

</domain>

<decisions>
## Implementation Decisions

### Dynamic Tool Loading
- **D-01:** Plugin skills use a **separate plugin tool registry** — keep `ACTION_REGISTRY` for built-in actions, add a new `getPluginToolDefinitions()` function. HubChat merges both when sending to the AI gateway.
- **D-02:** Plugin tools refresh **on chat mount only**. Fetch plugin skills once when HubChat mounts. Plugin changes take effect on next chat open.

### System Prompt Filtering
- **D-03:** Include **all core tools + all enabled plugin tools** in every AI call. No intent classification or token budgeting at MVP scale. Grows linearly with enabled plugins.
- **D-04:** `buildSystemPrompt()` is **dynamically assembled** from both registries. No more hardcoded tool list in the prompt string — the "Available Tools" section is generated from ACTION_REGISTRY and the plugin tool registry.

### Wiki Command UX
- **D-05:** Wiki operations triggered via **natural language only** — no slash commands. User says "add this to the wiki" or "what do I know about X?" and the LLM picks the right wiki tool. Consistent with existing chat UX.
- **D-06:** Wiki ingest via **paste content inline** — user pastes text into chat and says "add this to the wiki". LLM extracts content and calls the ingest tool. No file picker or path reference needed.
- **D-07:** Wiki query results appear as **synthesized answers inline** — LLM reads wiki articles and provides a natural language answer with citations to specific wiki pages. Consistent with WIKI-02 requirement.

### Skill Dispatch Flow
- **D-08:** Confirmation policy: **ingest = confirm, query/lint = auto-execute**. Ingest writes to filesystem so shows ActionConfirmCard (consistent with existing destructive action pattern). Query and lint are read-only.
- **D-09:** Progress shown as **inline status messages** — brief "Ingesting document..." or "Searching wiki..." that resolves to the result. Similar to existing ActionResultCard pattern.
- **D-10:** Errors shown as **inline bot messages** — natural language explanation: "I couldn't ingest that — the wiki plugin isn't enabled." Consistent with existing chat error handling.

### Claude's Discretion
- Claude may decide implementation details for how the plugin tool registry is structured internally
- Claude may decide the exact format of wiki operation status messages
- Claude may decide error message wording and formatting

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Hub Chat System
- `src/components/hub/HubChat.tsx` — Current hub chat component with streaming, tool_use parsing, buildSystemPrompt()
- `src/lib/actionRegistry.ts` — ACTION_REGISTRY array, ActionDefinition interface, getToolDefinitions()
- `src/hooks/useHubChatStream.ts` — Chat streaming hook
- `src/hooks/useActionDispatch.ts` — Action dispatch with confirmation flow
- `src/stores/useHubChatStore.ts` — Chat state management
- `src-tauri/src/commands/hub_chat_commands.rs` — Rust backend for hub chat (hub_chat_send, hub_chat_stop)

### Plugin System
- `src-tauri/src/plugins/manifest.rs` — PluginManifest struct (Phase 41 will add skills/mcp_tools fields)
- `src-tauri/src/plugins/registry.rs` — PluginRegistry with register/get/list/set_status
- `src-tauri/src/plugins/api.rs` — Plugin API surface

### AI Gateway
- `src-tauri/src/ai/types.rs` — ChatMessage, ChatRequest, ToolDefinition types
- `src-tauri/src/ai/gateway.rs` — AiGateway with provider selection

### Requirements
- `.planning/REQUIREMENTS.md` — CHAT-01, CHAT-02, CHAT-03 requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ActionConfirmCard` component — used for destructive action confirmation, reuse for ingest confirmation (D-08)
- `ActionResultCard` component — used for action results, reuse for wiki operation results (D-09)
- `getToolDefinitions()` — converts ActionDefinition[] to LLM tool format, pattern to follow for plugin tools
- `useActionDispatch` hook — handles tool dispatch with confirmation flow, extend for plugin skill dispatch
- `ScheduleChangeCard` — example of custom result rendering in chat, pattern for potential wiki-specific cards

### Established Patterns
- Tools defined as typed objects with name, description, inputSchema, destructive flag, tauriCommand
- System prompt assembled in `buildSystemPrompt()` with manifest string injection
- Streaming via Tauri events (`hub-chat-stream-chunk`, `hub-chat-stream-done`, `hub-chat-stream-error`)
- Tool invocation parsed from both JSON tool_use and CLI ACTION: format

### Integration Points
- `HubChat.tsx` mount — where plugin tools will be fetched and merged
- `buildSystemPrompt()` — must be refactored from static to dynamic assembly
- `getToolDefinitions()` call sites — must merge with plugin tool definitions
- `useActionDispatch` — must route plugin skill invocations to `dispatch_plugin_skill` Tauri command
- `hub_chat_send` Rust command — already accepts `tools: Option<Vec<ToolDefinition>>`, no backend changes needed for tool list

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 43-hub-chat-wiki-integration*
*Context gathered: 2026-04-06*
