---
phase: 07-project-phases-and-directory-linking
plan: 03
subsystem: ui
tags: [react, dnd-kit, shadcn, tauri-plugin-dialog, zustand]

requires:
  - phase: 07-01
    provides: "Backend phase CRUD, directory linking, task phase assignment commands"
  - phase: 07-02
    provides: "Frontend types, API layer, Zustand phase/project/task slices"
provides:
  - "ProjectDetail redesigned with stacked layout: directory link, progress bar, phases, unassigned bucket"
  - "PhaseRow with DnD reorder, context menu (rename/delete), inline task creation, progress bars"
  - "Task DnD between phases and unassigned bucket"
  - "TaskRow with drag handle, status toggle, hover move-to-phase dropdown"
  - "DirectoryLink with native OS picker via @tauri-apps/plugin-dialog"
  - "TaskDetail phase dropdown and back-to-project navigation"
  - "Sidebar progress fraction for selected project"
  - "Frontend tests for progress computation and phase filtering"
affects: [10-ai-project-onboarding, 11-workspace-integration]

tech-stack:
  added: [@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, @tauri-apps/plugin-dialog]
  patterns: [task DnD between droppable zones, useDraggable + useSortable coexistence, loadTaskDetail without clearing project context]

key-files:
  created:
    - src/components/center/ProjectDetail.tsx
    - src/components/center/PhaseRow.tsx
    - src/components/center/DirectoryLink.tsx
    - src/components/center/UnassignedBucket.tsx
    - src/components/center/TaskRow.tsx
    - src/components/center/__tests__/ProjectDetail.test.tsx
  modified:
    - src/components/sidebar/ProjectList.tsx
    - src/components/center/TaskDetail.tsx
    - src/stores/taskSlice.ts

key-decisions:
  - "Replaced base-ui ContextMenu on task rows with plain hover dropdown — base-ui context menu crashes when combined with @dnd-kit useDraggable refs"
  - "Added loadTaskDetail store action — selectTask clears selectedProjectId which unmounts ProjectDetail when clicking tasks from within it"
  - "Phase ContextMenu wraps only header, not CollapsibleContent — prevents nested context menu crash with task row menus"
  - "Replaced SelectValue with explicit text computation for phase dropdown — base-ui Select can't auto-resolve UUID to label before popup is opened"

patterns-established:
  - "TaskRow shared component: draggable task with grip handle, status toggle, hover move dropdown"
  - "loadTaskDetail for loading task data without clearing navigation context"
  - "Phase/Unassigned as DnD drop targets using useSortable + useDroppable in same DndContext"

requirements-completed: [PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05]

duration: ~25min (agent) + human verification iterations
completed: 2026-03-22
---

# Plan 07-03: UI Layer Summary

**Redesigned ProjectDetail with DnD phase management, task drag between phases, directory linking via native OS picker, progress tracking, and inline task/phase creation**

## Performance

- **Tasks:** 2 automated + 1 human verification (with multiple fix iterations)
- **Files created:** 6
- **Files modified:** 3

## Accomplishments
- Full ProjectDetail redesign with stacked layout matching UI spec (D-01 through D-12)
- Task drag-and-drop between phases and unassigned bucket with visual drop indicators
- Clickable status circles for quick task completion toggle
- Phase dropdown in TaskDetail with correct label display
- Back-to-project navigation from TaskDetail
- 14 passing frontend tests for progress computation and rendering

## Task Commits

1. **Task 1: Frontend tests, components, and ProjectDetail** - `f2dbe3d`
2. **Task 2: Sidebar progress and TaskDetail phase dropdown** - `825ac75`
3. **Task 3: Human verification** - `8aafb2f` (fix iterations from UAT feedback)

## Decisions Made
- base-ui ContextMenu incompatible with @dnd-kit draggable refs — replaced with hover dropdown on task rows
- selectTask clears project context — added dedicated loadTaskDetail action
- Phase delete needs task reload from backend (ON DELETE SET NULL changes not reflected in frontend state)

## Deviations from Plan

### Auto-fixed Issues

**1. Task click crashes ProjectDetail**
- **Found during:** Human verification
- **Issue:** TaskDetail's useEffect called selectTask which set selectedProjectId=null, unmounting ProjectDetail
- **Fix:** Added loadTaskDetail store action that fetches task without clearing project context
- **Files modified:** src/stores/taskSlice.ts, src/components/center/TaskDetail.tsx

**2. Phase delete didn't move tasks to Unassigned**
- **Found during:** Human verification
- **Issue:** deletePhase removed phase from store but didn't reload tasks — frontend still had stale phaseId values
- **Fix:** Added loadTasks call after deletePhase in ProjectDetail

**3. Right-click on tasks crashed the app**
- **Found during:** Human verification
- **Issue:** Nested ContextMenus (phase + task) and base-ui ContextMenu conflicting with useDraggable refs
- **Fix:** Restructured PhaseRow to keep task list outside phase ContextMenu; replaced task ContextMenu with hover dropdown

**4. Phase dropdown showed UUID instead of name**
- **Found during:** Human verification
- **Issue:** base-ui SelectValue can't auto-resolve label from value before popup opened
- **Fix:** Replaced SelectValue with explicit text computation

---

**Total deviations:** 4 auto-fixed from human verification feedback
**Impact on plan:** All fixes necessary for correct UX. No scope creep.

## Issues Encountered
- base-ui ContextMenu + @dnd-kit useDraggable conflict remains unresolved for right-click on task rows. Hover dropdown used as workaround.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete phase/directory/progress UI ready for Phase 8 (File Explorer) and Phase 10 (AI Onboarding)
- Phase 10 should reuse ProjectDetail's phase accordion layout for AI review screen (D-12 in phase 10 context)

---
*Phase: 07-project-phases-and-directory-linking*
*Completed: 2026-03-22*
