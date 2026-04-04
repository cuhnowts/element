---
phase: 25-bot-skills-and-mcp-write-tools
plan: 03
subsystem: ai, ui
tags: [tool_use, streaming, anthropic, openai, tauri, react, action-dispatch, confirmation-ux]

requires:
  - phase: 25-01
    provides: "Shared action registry (getAction, isDestructive, getToolDefinitions)"
provides:
  - "ToolDefinition, ToolUseBlock, ToolResultBlock types in AI gateway"
  - "Tool_use support in CompletionRequest/Response and ChatRequest for all providers"
  - "Streaming tool_use parsing for Anthropic (content_block_start/input_json_delta/content_block_stop)"
  - "Streaming tool_use parsing for OpenAI (delta.tool_calls)"
  - "useActionDispatch hook (dispatch, checkDestructive, createPendingAction)"
  - "ActionConfirmCard component with inline confirmation UX"
  - "ActionResultCard component with success/error feedback"
  - "HubChat component wiring tool_use dispatch end-to-end"
affects: [25-04, 25-05, hub-chat, ai-gateway]

tech-stack:
  added: []
  patterns:
    - "Tool_use streaming: content_block_start captures id/name, input_json_delta accumulates JSON, content_block_stop parses and emits"
    - "Inline confirmation: destructive actions block chat input until user approves/rejects"
    - "Tool result feedback: dispatch result sent back to LLM for multi-turn tool use"

key-files:
  created:
    - src/hooks/useActionDispatch.ts
    - src/hooks/useActionDispatch.test.ts
    - src/components/hub/ActionConfirmCard.tsx
    - src/components/hub/ActionResultCard.tsx
    - src/components/hub/HubChat.tsx
  modified:
    - src-tauri/src/ai/types.rs
    - src-tauri/src/ai/anthropic.rs
    - src-tauri/src/ai/openai.rs
    - src-tauri/src/ai/openai_compat.rs
    - src-tauri/src/ai/ollama.rs
    - src-tauri/src/ai/prompts.rs
    - src-tauri/src/commands/manifest_commands.rs
    - src-tauri/src/commands/hub_chat_commands.rs
    - src/components/hub/HubCenterPanel.tsx
    - src/lib/tauri-commands.ts

key-decisions:
  - "Extended ChatRequest with tools field (not just CompletionRequest) to enable tool_use in hub chat path"
  - "Tool_use events sent through same event_sender channel as text chunks, parsed by frontend as JSON"
  - "HubChat intercepts appendChunk to detect tool_use JSON before it reaches streaming content"

patterns-established:
  - "Tool_use streaming pattern: Rust parses provider-specific stream format, emits unified JSON events"
  - "Action dispatch pattern: registry lookup -> invoke Tauri command -> return DispatchResult"
  - "Confirmation flow pattern: destructive check -> setPendingAction -> ActionConfirmCard -> approve/reject -> dispatch"

requirements-completed: [SKILL-01, SKILL-04]

duration: 11min
completed: 2026-04-02
---

# Phase 25 Plan 03: AI Gateway Tool Use and Action Dispatch Summary

**AI gateway tool_use support for both providers, tested action dispatch hook, and hub chat wired end-to-end with inline confirmation for destructive actions**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-02T10:44:08Z
- **Completed:** 2026-04-02T10:55:16Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- AI gateway (Anthropic + OpenAI) accepts tool definitions and parses tool_use blocks from both streaming and non-streaming responses
- useActionDispatch hook with 8 passing unit tests covering dispatch, unknown actions, error handling, destructive checks, and pending action creation
- ActionConfirmCard with full accessibility (ARIA alertdialog, keyboard nav, destructive styling) and ActionResultCard with success/error states
- HubChat component wires everything together: sends tool definitions from registry, intercepts tool_use events from stream, dispatches via action registry, shows confirmation for destructive actions, feeds results back to LLM

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend AI gateway with tool_use support** - `b307ce6` (feat)
2. **Task 2: RED - failing tests for useActionDispatch** - `2dd4994` (test)
3. **Task 2: GREEN - implement hook and UI components** - `4b61ad1` (feat)
4. **Task 3: Wire hub chat with tool_use dispatch** - `2865349` (feat)

## Files Created/Modified

- `src-tauri/src/ai/types.rs` - Added ToolDefinition, ToolUseBlock, ToolResultBlock types; extended CompletionRequest, CompletionResponse, ChatRequest
- `src-tauri/src/ai/anthropic.rs` - Tool definitions in request body, streaming tool_use parsing (content_block_start/delta/stop), tool_use in chat_stream
- `src-tauri/src/ai/openai.rs` - Tools as function format, streaming tool_calls parsing (delta.tool_calls), tool_use in chat_stream
- `src-tauri/src/ai/openai_compat.rs` - Tools support in chat_stream, tool_use: None for responses
- `src-tauri/src/ai/ollama.rs` - Added tool_use: None to all CompletionResponse constructions
- `src-tauri/src/ai/prompts.rs` - Added tools: None, tool_results: None to scaffold request
- `src-tauri/src/commands/manifest_commands.rs` - Added tools: None, tool_results: None to briefing request
- `src-tauri/src/commands/hub_chat_commands.rs` - Accept optional tools parameter, forward to ChatRequest
- `src/hooks/useActionDispatch.ts` - Hook for dispatch, checkDestructive, createPendingAction
- `src/hooks/useActionDispatch.test.ts` - 8 unit tests covering all hook functionality
- `src/components/hub/ActionConfirmCard.tsx` - Inline confirmation with icon map, copy contract, ARIA, keyboard nav
- `src/components/hub/ActionResultCard.tsx` - Success/error feedback card with CheckCircle2/XCircle
- `src/components/hub/HubChat.tsx` - Full chat component with tool_use interception and dispatch flow
- `src/components/hub/HubCenterPanel.tsx` - Updated to include HubChat below BriefingPanel
- `src/lib/tauri-commands.ts` - Extended hubChatSend to accept optional tools parameter

## Decisions Made

- **Extended ChatRequest (not just CompletionRequest) with tools field:** The hub chat uses chat_stream (ChatRequest) not complete_stream (CompletionRequest). Without tools in ChatRequest, the LLM would never produce tool_use blocks in the chat path. This was a Rule 3 blocking fix.
- **Tool_use events sent through same stream channel:** Rather than a separate event channel, tool_use JSON events are sent through the existing event_sender alongside text chunks. The frontend parses each chunk to check if it's JSON tool_use or plain text. This keeps the architecture simple.
- **HubChat intercepts appendChunk:** Rather than modifying the existing useHubChatStream hook, HubChat overrides appendChunk in the store to detect tool_use events before they get appended as text content.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended ChatRequest with tools field and updated chat_stream providers**
- **Found during:** Task 3 (wiring hub chat)
- **Issue:** Hub chat uses ChatRequest/chat_stream path which had no tools support. Without it, the LLM cannot produce tool_use blocks in hub chat.
- **Fix:** Added `tools: Option<Vec<ToolDefinition>>` to ChatRequest, updated hub_chat_commands.rs to accept tools, updated Anthropic/OpenAI/OpenAI-compat chat_stream to include tools in request body and parse tool_use from stream.
- **Files modified:** src-tauri/src/ai/types.rs, src-tauri/src/commands/hub_chat_commands.rs, src-tauri/src/ai/anthropic.rs, src-tauri/src/ai/openai.rs, src-tauri/src/ai/openai_compat.rs, src/lib/tauri-commands.ts
- **Verification:** cargo check passes (only pre-existing Tauri proc macro error in worktree), all 150 frontend tests pass
- **Committed in:** `2865349` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix to enable tool_use in the hub chat path. No scope creep.

## Issues Encountered

- **Tauri proc macro panic in worktree:** `tauri::generate_context!()` fails in the git worktree environment (likely missing tauri.conf.json resolution). This is pre-existing and does not affect our code changes. `cargo check` confirms no compilation errors in our code beyond this macro.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all components are fully wired with data sources from the action registry and hub chat store.

## Next Phase Readiness
- AI gateway fully supports tool_use for both Anthropic and OpenAI providers
- Hub chat is wired end-to-end: tool definitions -> LLM -> tool_use parsing -> dispatch -> confirmation -> result feedback
- Plans 04 (shell execution) and 05 (settings UI) can build on this foundation
- The execute_shell action is registered but needs the Tauri command implementation (Plan 04)

---
*Phase: 25-bot-skills-and-mcp-write-tools*
*Completed: 2026-04-02*
