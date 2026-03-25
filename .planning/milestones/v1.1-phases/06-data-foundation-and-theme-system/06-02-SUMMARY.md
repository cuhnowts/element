---
phase: 06-data-foundation-and-theme-system
plan: 02
subsystem: ui
tags: [react, zustand, dnd-kit, themes, sidebar, typescript]

requires:
  - phase: 06-01
    provides: Backend theme CRUD commands and SQLite schema
provides:
  - Theme TypeScript types and THEME_COLORS constant
  - Theme API layer (tauri.ts) with CRUD, reorder, assign, standalone tasks
  - ThemeSlice Zustand store for theme state management
  - ThemeSidebar component with DnD reorder via @dnd-kit
  - CreateThemeDialog with name input and color palette
  - MoveToThemeMenu dropdown submenu for reassignment
  - ThemeSection and UncategorizedSection sidebar grouping
  - StandaloneTaskItem component for unattached tasks
  - Sidebar restructured: themes replace ProjectList + TaskList
  - Wave 0 test stubs for themeSlice (THEME-02) and ThemeSidebar (THEME-04)
affects: [07-project-phases-and-directory-linking, 10-ai-project-onboarding]

tech-stack:
  added: ["@dnd-kit/core", "@dnd-kit/sortable"]
  patterns: [theme-color-palette, sortable-sidebar-sections, standalone-task-rendering]

key-files:
  created:
    - src/stores/themeSlice.ts
    - src/stores/themeSlice.test.ts
    - src/components/sidebar/ThemeSidebar.tsx
    - src/components/sidebar/ThemeSidebar.test.tsx
    - src/components/sidebar/ThemeSection.tsx
    - src/components/sidebar/ThemeHeader.tsx
    - src/components/sidebar/UncategorizedSection.tsx
    - src/components/sidebar/StandaloneTaskItem.tsx
    - src/components/sidebar/CreateThemeDialog.tsx
    - src/components/sidebar/MoveToThemeMenu.tsx
  modified:
    - src/lib/types.ts
    - src/lib/tauri.ts
    - src/stores/index.ts
    - src/stores/taskSlice.ts
    - src/components/layout/Sidebar.tsx
    - src/hooks/useKeyboardShortcuts.ts
    - src/components/sidebar/NewTaskList.tsx
    - src/components/center/WelcomeDashboard.tsx
    - src/components/center/TodayView.tsx
    - src/components/center/__tests__/TodayView.test.tsx
    - package.json

key-decisions:
  - "createTask signature changed to (title, projectId?, themeId?) -- title-first for standalone task support"
  - "Standalone tasks loaded via separate api.listStandaloneTasks() call in ThemeSidebar rather than filtering store tasks"

patterns-established:
  - "Theme color palette: 10-color array with THEME_COLORS constant for consistent color picker UI"
  - "SortableThemeItem wrapper: useSortable hook from @dnd-kit for drag-and-drop reorder"
  - "ThemeSection accordion: collapsible sections with inline project expansion and standalone tasks"

requirements-completed: [THEME-01, THEME-02, THEME-03, THEME-04]

duration: 5min
completed: 2026-03-22
---

# Phase 06 Plan 02: Theme Frontend Summary

**Theme sidebar with Zustand store, DnD reorder via @dnd-kit, create/edit dialog with color palette, and restructured sidebar replacing ProjectList + TaskList**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-22T20:11:18Z
- **Completed:** 2026-03-22T20:16:14Z
- **Tasks:** 2
- **Files modified:** 21

## Accomplishments
- Complete theme frontend data layer: types, API bindings, Zustand store with optimistic reorder
- 7 new sidebar components implementing full theme UX (create, edit, delete with confirmation, drag reorder, move-to-theme)
- Sidebar restructured from flat ProjectList + TaskList to themed accordion sections with uncategorized bucket
- Wave 0 test stubs created for themeSlice (8 stubs) and ThemeSidebar (9 stubs)
- @dnd-kit installed for accessible drag-and-drop

## Task Commits

Each task was committed atomically:

1. **Task 1: Frontend Data Layer (Types, API, Store, Dependencies) + Wave 0 Test Stubs** - `da20bd7` (feat)
2. **Task 2: Sidebar Components, Restructure, and Wave 0 Component Test Stubs** - `c625f76` (feat)

## Files Created/Modified
- `src/lib/types.ts` - Added Theme interface, THEME_COLORS, themeId on Project/Task, nullable projectId
- `src/lib/tauri.ts` - Added 10 theme API methods (CRUD, reorder, assign, standalone)
- `src/stores/themeSlice.ts` - Zustand slice with theme state, optimistic reorder, cascade delete cleanup
- `src/stores/themeSlice.test.ts` - Wave 0 test stubs (8 todos) for THEME-02
- `src/stores/index.ts` - Integrated ThemeSlice into AppStore
- `src/stores/taskSlice.ts` - Changed createTask to (title, projectId?, themeId?)
- `src/components/sidebar/ThemeSidebar.tsx` - Main container with DnD, scroll, empty state
- `src/components/sidebar/ThemeSidebar.test.tsx` - Wave 0 test stubs (9 todos) for THEME-04
- `src/components/sidebar/ThemeSection.tsx` - Collapsible theme with projects and tasks
- `src/components/sidebar/ThemeHeader.tsx` - Theme row with edit/delete/confirmation
- `src/components/sidebar/UncategorizedSection.tsx` - Bottom bucket for null-themed items
- `src/components/sidebar/StandaloneTaskItem.tsx` - Task item with circle icon and context menu
- `src/components/sidebar/CreateThemeDialog.tsx` - Create/edit dialog with name + color palette
- `src/components/sidebar/MoveToThemeMenu.tsx` - Dropdown submenu for theme reassignment
- `src/components/layout/Sidebar.tsx` - Restructured: ThemeSidebar replaces ProjectList + TaskList

## Decisions Made
- Changed createTask signature from (projectId, title) to (title, projectId?, themeId?) to support standalone tasks. Updated 3 call sites.
- Standalone tasks loaded via dedicated api.listStandaloneTasks() in ThemeSidebar rather than filtering from main task store, keeping concerns separate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed nullable projectId in TodayView**
- **Found during:** Task 1 (Type updates)
- **Issue:** TodayView.tsx used task.projectId as object index key, but projectId is now nullable causing TS error
- **Fix:** Added null check: `task.projectId ? projectMap[task.projectId] : null`
- **Files modified:** src/components/center/TodayView.tsx
- **Verification:** `npx tsc --noEmit` passes (only pre-existing errors remain)
- **Committed in:** da20bd7 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed TodayView test helper missing themeId field**
- **Found during:** Task 1 (Type updates)
- **Issue:** Test makeTask() helper didn't include new required themeId field
- **Fix:** Added `themeId: null` to test helper
- **Files modified:** src/components/center/__tests__/TodayView.test.tsx
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** da20bd7 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs from type changes)
**Impact on plan:** Both fixes necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None

## Known Stubs
None - all components are fully wired to store and API layer. Test stubs are intentional Wave 0 placeholders per VALIDATION.md.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Theme frontend complete, ready for integration with project phases (Phase 07)
- Backend theme commands (06-01) must be complete for end-to-end functionality
- @dnd-kit available for future drag-and-drop features (task reorder, etc.)

---
*Phase: 06-data-foundation-and-theme-system*
*Completed: 2026-03-22*

## Self-Check: PASSED

All 10 created files verified present. Both task commits (da20bd7, c625f76) verified in git log.
