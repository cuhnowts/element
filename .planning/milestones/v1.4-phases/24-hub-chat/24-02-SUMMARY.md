---
phase: 24-hub-chat
plan: 02
subsystem: hub-chat-frontend-plumbing
tags: [zustand, streaming, tauri-events, react-markdown, types]
dependency_graph:
  requires: [24-01]
  provides: [useHubChatStore, useHubChatStream, hubChatSend, hubChatStop, ChatMessage-types]
  affects: [24-03]
tech_stack:
  added: [react-markdown@10.1.0, remark-gfm@4.0.1, rehype-highlight@7.0.2]
  patterns: [standalone-zustand-store, tauri-event-listener, typed-command-wrappers]
key_files:
  created:
    - src/types/chat.ts
    - src/stores/useHubChatStore.ts
    - src/hooks/useHubChatStream.ts
    - src/stores/__tests__/useHubChatStore.test.ts
    - src/components/hub/__tests__/ChatMessage.test.tsx
    - src/components/hub/__tests__/ChatInput.test.tsx
  modified:
    - package.json
    - package-lock.json
    - src/lib/tauri-commands.ts
decisions:
  - "useHubChatStore is fully standalone from useAgentStore (D-12 independence)"
  - "MAX_TURNS * 2 = 40 messages cap with oldest-first trimming (D-09)"
  - "streamingContent accumulates chunks then finalizes into ChatMessage"
  - "stopGenerating preserves partial content as finalized message (D-07)"
metrics:
  duration: 111s
  completed: "2026-04-02T00:21:13Z"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 24 Plan 02: Frontend Chat Plumbing Summary

Standalone Zustand store with 20-turn message cap, streaming chunk accumulation, Tauri event listeners for hub-chat-stream-*, and typed command wrappers for hub_chat_send/hub_chat_stop.

## Commits

| Task | Commit  | Description                                          |
| ---- | ------- | ---------------------------------------------------- |
| 0    | ac8a311 | Wave 0 test stubs (25 todos across 3 files)          |
| 1    | edcf6b2 | react-markdown deps + ChatMessage/HubChatState types |
| 2    | 17710c3 | useHubChatStore, useHubChatStream, Tauri wrappers    |

## Task Details

### Task 0: Wave 0 Test Stubs
Created three test files with 25 `it.todo()` tests covering CHAT-01 through CHAT-04 requirements: store operations, message cap, streaming, stop generation, retry, independence, and UI component behavior.

### Task 1: Dependencies and Types
Installed react-markdown 10.1.0, remark-gfm 4.0.1, rehype-highlight 7.0.2. Created `src/types/chat.ts` with ChatRole, ChatMessage (frontend-rich with id/timestamp/isStreaming), ChatMessagePayload (wire format matching Rust struct), and HubChatState (full store interface including lastUserMessage for retry).

### Task 2: Store, Hook, and Command Wrappers
- **useHubChatStore**: Standalone Zustand store with addUserMessage, startStreaming, appendChunk, finalizeAssistantMessage, stopGenerating, setError, clearChat. Message cap at MAX_TURNS * 2 = 40 messages with oldest trimmed. No reference to useAgentStore (D-12).
- **useHubChatStream**: React hook listening to hub-chat-stream-chunk, hub-chat-stream-done, hub-chat-stream-error Tauri events. Follows existing useAiStream pattern with individual selector subscriptions.
- **tauri-commands.ts**: Added hubChatSend and hubChatStop wrappers with proper camelCase-to-snake_case mapping.

## Verification Results
- TypeScript compiles with no new errors (2 pre-existing in useTerminalSessionStore.test.ts)
- All 25 test stubs pass (todos skipped, no failures)
- useHubChatStore has zero references to useAgentStore (D-12 independence confirmed)
- All 3 hub-chat-stream-* events present in useHubChatStream
- Both hub_chat_send and hub_chat_stop wrappers present in tauri-commands.ts
- react-markdown, remark-gfm, rehype-highlight all installed at specified versions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused imports from test stub**
- **Found during:** Task 2 (tsc --noEmit verification)
- **Issue:** Test stub imported `expect` and `beforeEach` from vitest but used neither (TS6133)
- **Fix:** Removed unused imports, kept only `describe` and `it`
- **Files modified:** src/stores/__tests__/useHubChatStore.test.ts
- **Commit:** 17710c3

## Known Stubs

None -- all files contain production-ready code or intentional test todos (Wave 0 baseline).

## Self-Check: PASSED
