---
phase: 43-hub-chat-wiki-integration
plan: 01
subsystem: ui
tags: [react, zustand, tauri, hub-chat, plugin-system, vitest]

requires:
  - phase: 42-knowledge-engine-core
    provides: PluginSkillInfo struct with serde camelCase, dispatch_plugin_skill Tauri command
provides:
  - PluginToolDefinition interface aligned with Rust PluginSkillInfo camelCase serialization
  - Plugin dispatch sends raw object input (not stringified) matching serde_json::Value
  - buildSystemPrompt extracted to testable module
  - 24 new tests across 4 test files covering CHAT-01, CHAT-02, CHAT-03
affects: [44-mcp-server-wiki-tools, hub-chat, plugin-system]

tech-stack:
  added: []
  patterns:
    - "Plugin tool registry separate from ACTION_REGISTRY (D-01)"
    - "Dynamic system prompt assembly with plugin tool grouping"
    - "HubChat component test pattern: mock stores/hooks, simulate tool_use via appendChunk interception"

key-files:
  created:
    - src/components/hub/buildSystemPrompt.ts
    - src/lib/__tests__/pluginToolRegistry.test.ts
    - src/hooks/__tests__/usePluginTools.test.ts
    - src/components/hub/__tests__/HubChat.test.tsx
    - src/components/hub/__tests__/buildSystemPrompt.test.ts
  modified:
    - src/lib/pluginToolRegistry.ts
    - src/hooks/usePluginTools.ts
    - src/components/hub/HubChat.tsx
    - src/lib/pluginToolRegistry.test.ts
    - src/hooks/usePluginTools.test.ts

key-decisions:
  - "Keep buildSystemPrompt as separate exported module rather than inline in HubChat.tsx for testability"
  - "Test HubChat dispatch routing via appendChunk interception rather than extracting pure function"

patterns-established:
  - "HubChat test pattern: mock usePluginTools/useActionDispatch/useHubChatStore, render component, inject tool_use JSON via installed appendChunk handler"

requirements-completed: [CHAT-01, CHAT-02, CHAT-03]

duration: 8min
completed: 2026-04-10
---

# Phase 43 Plan 01: Hub Chat Wiki Integration Summary

**Fixed PluginToolDefinition camelCase serialization mismatch, dispatch stringify bug, extracted buildSystemPrompt, and added 24 tests across 4 files covering plugin tool loading, dispatch routing, and dynamic prompt assembly**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-10T18:42:40Z
- **Completed:** 2026-04-10T18:50:25Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Aligned PluginToolDefinition interface fields (prefixedName, pluginName, inputSchema, outputSchema) with Rust PluginSkillInfo serde camelCase serialization
- Fixed dispatchPluginSkill to pass raw input object instead of JSON.stringify (Tauri IPC handles serialization)
- Extracted buildSystemPrompt and formatToolsSection to testable module from HubChat.tsx
- 24 tests covering CHAT-01 (dynamic tool loading), CHAT-02 (dispatch routing), CHAT-03 (prompt assembly)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix PluginToolDefinition interface, dispatch bug, and verify HubChat routing** - `f3fde46` (fix)
2. **Task 2: Write tests for pluginToolRegistry, usePluginTools, and HubChat dispatch routing** - `bca7f88` (test)
3. **Task 3: Write tests for dynamic system prompt assembly** - `263faa4` (refactor)
4. **Fix legacy test** - `f596fc8` (fix)

## Files Created/Modified
- `src/lib/pluginToolRegistry.ts` - Fixed interface fields and removed JSON.stringify bug
- `src/hooks/usePluginTools.ts` - Updated to use prefixedName/inputSchema fields
- `src/components/hub/HubChat.tsx` - Updated field references, imports buildSystemPrompt from extracted module
- `src/components/hub/buildSystemPrompt.ts` - Extracted SYSTEM_PREAMBLE, BEHAVIOR_RULES, formatToolsSection, buildSystemPrompt
- `src/lib/__tests__/pluginToolRegistry.test.ts` - 5 tests: invoke calls, input not stringified, success/error
- `src/hooks/__tests__/usePluginTools.test.ts` - 8 tests: mount fetch, isPluginTool, getToolDefs, dispatch
- `src/components/hub/__tests__/HubChat.test.tsx` - 4 tests: dispatch routing for plugin/builtin, destructive/non-destructive
- `src/components/hub/__tests__/buildSystemPrompt.test.ts` - 7 tests: tool sections, plugin grouping, prompt structure

## Decisions Made
- Extracted buildSystemPrompt to separate module for testability rather than testing via HubChat render
- Tested HubChat dispatch routing by rendering component and injecting tool_use via appendChunk mock interception

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated legacy test files from prior execution**
- **Found during:** Task 1 and full suite verification
- **Issue:** Old test files at src/hooks/usePluginTools.test.ts and src/lib/pluginToolRegistry.test.ts used old field names and expected JSON.stringify behavior
- **Fix:** Updated field names to camelCase and dispatch expectation to raw object
- **Files modified:** src/hooks/usePluginTools.test.ts, src/lib/pluginToolRegistry.test.ts
- **Verification:** Full test suite passes (335 tests, 0 failures in app code)
- **Committed in:** f3fde46, f596fc8

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary to keep existing tests passing after field name changes. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all code is fully wired with no placeholder data.

## Next Phase Readiness
- Plugin tool registry fully aligned with Rust backend serialization
- HubChat dispatch routing tested for both destructive and non-destructive paths
- buildSystemPrompt testable independently for future prompt engineering

---
*Phase: 43-hub-chat-wiki-integration*
*Completed: 2026-04-10*
