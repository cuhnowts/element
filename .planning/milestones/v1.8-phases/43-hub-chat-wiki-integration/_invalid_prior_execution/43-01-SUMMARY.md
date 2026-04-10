---
phase: 43-hub-chat-wiki-integration
plan: 01
subsystem: ui
tags: [react, tauri, plugin, wiki, hooks]

requires:
  - phase: 41-plugin-host-runtime
    provides: list_plugin_skills and dispatch_plugin_skill Tauri commands
provides:
  - PluginToolDefinition interface and getPluginToolDefinitions() function
  - usePluginTools React hook with dispatch, isPluginTool, isPluginToolDestructive, getToolDefs
  - Wiki ingest entries in ActionConfirmCard (BookPlus icon, title, reject label, body text)
affects: [43-02-hub-chat-wiki-integration]

tech-stack:
  added: []
  patterns: [separate plugin registry from ACTION_REGISTRY, mount-time fetch pattern]

key-files:
  created:
    - src/lib/pluginToolRegistry.ts
    - src/hooks/usePluginTools.ts
  modified:
    - src/components/hub/ActionConfirmCard.tsx

key-decisions:
  - "Used colon-namespaced keys (knowledge:ingest) in ActionConfirmCard maps to match plugin skill names directly"
  - "Kept plugin registry separate from ACTION_REGISTRY per D-01 design decision"

patterns-established:
  - "Plugin tool registry pattern: separate module for plugin-contributed tools"
  - "Mount-time fetch: usePluginTools fetches once on mount, no polling"

requirements-completed: [CHAT-01, CHAT-02]

duration: 5min
completed: 2026-04-06
---

# Plan 43-01: Plugin Tool Registry & Wiki Confirm Entries Summary

**Plugin tool registry with PluginToolDefinition type, usePluginTools hook, and wiki ingest confirmation entries in ActionConfirmCard**

## Performance

- **Duration:** 5 min
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created pluginToolRegistry.ts with PluginToolDefinition interface, getPluginToolDefinitions(), and dispatchPluginSkill()
- Created usePluginTools hook with mount-time fetch, dispatch, isPluginTool, isPluginToolDestructive, and getToolDefs
- Added wiki ingest entries to ActionConfirmCard: BookPlus icon, "Add to Wiki" title, "Don't Add" reject label, and body text

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Plugin tool registry, hook, and wiki confirm entries** - `3eb18c6` (feat)

## Files Created/Modified
- `src/lib/pluginToolRegistry.ts` - Plugin tool definitions and dispatch to Tauri backend
- `src/hooks/usePluginTools.ts` - React hook for loading and dispatching plugin skills
- `src/components/hub/ActionConfirmCard.tsx` - Added wiki ingest confirmation entries

## Decisions Made
- Used colon-namespaced keys (knowledge:ingest) in ActionConfirmCard to match plugin skill naming convention
- Plugin registry kept completely separate from ACTION_REGISTRY per D-01

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plugin tool registry and hook ready for Plan 02 to wire into HubChat.tsx
- ActionConfirmCard ready to render wiki ingest confirmations

## Self-Check: PASSED

---
*Phase: 43-hub-chat-wiki-integration*
*Completed: 2026-04-06*
