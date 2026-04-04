---
phase: 18-ui-polish
plan: 01
subsystem: ui/sidebar, ui/drawer, stores/workspace
tags: [sidebar-navigation, theme-persistence, drawer-tabs, accessibility]
dependency_graph:
  requires: []
  provides: [theme-collapse-persistence, terminal-default-tab, sidebar-click-fix]
  affects: [ThemeSection, ThemeHeader, DrawerHeader, useWorkspaceStore]
tech_stack:
  added: []
  patterns: [zustand-persist-partialize, aria-labels]
key_files:
  created: []
  modified:
    - src/stores/useWorkspaceStore.ts
    - src/stores/useWorkspaceStore.test.ts
    - src/components/sidebar/ThemeSection.tsx
    - src/components/sidebar/ThemeHeader.tsx
    - src/components/output/DrawerHeader.tsx
decisions:
  - "Theme collapse state stored as Record<string,boolean> in Zustand with persist middleware, defaulting to expanded (true) for unknown themes"
  - "DropdownMenuTrigger render prop with e.preventDefault() on click confirmed sufficient to prevent menu flash on left-click"
metrics:
  duration: 130s
  completed: "2026-03-30T01:12:53Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 18 Plan 01: Sidebar Click Fix, Theme Persistence, Terminal Default Summary

Theme collapse persistence via Zustand partialize, terminal as default drawer tab, and drawer tab reorder (Terminal/Logs/History).

## Tasks Completed

| # | Name | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Add theme collapse persistence and terminal default | efc8333 | Added themeCollapseState/setThemeExpanded/isThemeExpanded to WorkspaceState, persisted via partialize, changed drawerTab default to terminal |
| 2 | Fix sidebar click behavior and wire theme persistence | 65d2536 | Replaced useState with useWorkspaceStore in ThemeSection, added aria-labels to chevrons, reordered DrawerHeader tabs |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test expectations for terminal default**
- **Found during:** Task 1
- **Issue:** Existing test expected `drawerTab: "logs"` in DEFAULT_PROJECT_STATE
- **Fix:** Updated test to expect `drawerTab: "terminal"`
- **Files modified:** src/stores/useWorkspaceStore.test.ts
- **Commit:** efc8333

## Verification

- All 53 tests pass across 10 test files
- `themeCollapseState` present in useWorkspaceStore partialize
- `terminal` is default drawerTab in DEFAULT_PROJECT_STATE and activeDrawerTab
- Terminal tab is first in DrawerHeader

## Known Stubs

None - all functionality is fully wired.

## Self-Check: PASSED

All 6 files verified on disk. Both commit hashes (efc8333, 65d2536) confirmed in git log.
