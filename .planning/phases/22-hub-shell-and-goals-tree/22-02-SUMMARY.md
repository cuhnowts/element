---
phase: 22-hub-shell-and-goals-tree
plan: 02
subsystem: ui
tags: [react, resizable-panels, zustand, shadcn, hub-layout]

requires:
  - phase: 22-01
    provides: activeView routing and CenterPanel switch statement with hub placeholder

provides:
  - 3-column resizable hub layout (HubView with ResizablePanelGroup)
  - Collapsible side columns with MinimizedColumn overlay strips
  - CalendarPlaceholder with Coming Soon content
  - HubCenterPanel with Welcome back placeholder
  - Hub layout persistence (column sizes and collapse states) via useWorkspaceStore

affects: [22-03-goals-tree, 23-ai-briefing, 24-hub-chat]

tech-stack:
  added: []
  patterns:
    - "usePanelRef + panelRef prop for react-resizable-panels v4 imperative API"
    - "onResize callback with PanelSize.asPercentage for collapse detection"
    - "MinimizedColumn overlay pattern for collapsed panel strips"

key-files:
  created:
    - src/components/center/HubView.tsx
    - src/components/hub/MinimizedColumn.tsx
    - src/components/hub/CalendarPlaceholder.tsx
    - src/components/hub/HubCenterPanel.tsx
  modified:
    - src/stores/useWorkspaceStore.ts
    - src/components/layout/CenterPanel.tsx

key-decisions:
  - "Used panelRef prop and onResize callback (react-resizable-panels v4 API) instead of ref/onCollapse/onExpand (v2 API) per actual library version"
  - "Each panel tracks its own collapse state via onResize checking asPercentage === 0 rather than separate onCollapse/onExpand callbacks"

patterns-established:
  - "Hub column pattern: ResizablePanel with collapsible + collapsedSize={0} + MinimizedColumn overlay"
  - "Hub layout persistence: HubLayout interface in useWorkspaceStore with partial update via setHubLayout"

requirements-completed: [HUB-01, HUB-02, HUB-04]

duration: 3min
completed: 2026-04-01
---

# Phase 22 Plan 02: Hub Layout Shell Summary

**3-column resizable hub layout with collapsible side columns, minimized strip overlays, and persisted layout state via Zustand**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T23:48:55Z
- **Completed:** 2026-04-01T23:52:02Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Hub layout state (panel sizes and collapse booleans) persisted in useWorkspaceStore via existing Zustand persist middleware
- 3-column HubView with react-resizable-panels: goals (25%), center (50%), calendar (25%) with min sizes 15/30/15
- Side columns collapse to 0% and show 40px MinimizedColumn strips with vertical label and Plus expand button
- CenterPanel hub case wired to render HubView instead of placeholder div

## Task Commits

Each task was committed atomically:

1. **Task 1: Add hub layout persistence to useWorkspaceStore** - `0dd4ae9` (feat)
2. **Task 2: Create HubView with 3-column layout, MinimizedColumn, CalendarPlaceholder, and HubCenterPanel** - `8f07061` (feat)

## Files Created/Modified
- `src/stores/useWorkspaceStore.ts` - Added HubLayout interface, DEFAULT_HUB_LAYOUT, setHubLayout action, and hubLayout in partialize
- `src/components/center/HubView.tsx` - 3-column ResizablePanelGroup with collapsible goals/calendar panels
- `src/components/hub/MinimizedColumn.tsx` - 40px collapsed column strip with vertical label and Plus expand button
- `src/components/hub/CalendarPlaceholder.tsx` - Right column Coming Soon placeholder with Calendar icon
- `src/components/hub/HubCenterPanel.tsx` - Center column Welcome back placeholder
- `src/components/layout/CenterPanel.tsx` - Hub case now renders HubView

## Decisions Made
- Used `panelRef` prop and `onResize` callback (react-resizable-panels v4 API) instead of `ref`/`onCollapse`/`onExpand` (v2 API) -- the plan referenced v2 API but the project uses v4.7.3
- Each panel detects its own collapse via `onResize` checking `panelSize.asPercentage === 0` -- simpler than separate collapse/expand callbacks

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted to react-resizable-panels v4 API**
- **Found during:** Task 2 (HubView creation)
- **Issue:** Plan referenced v2 API (`ref`, `onLayout`, `onCollapse`, `onExpand`) but project uses v4.7.3 which uses `panelRef`, `onResize`, `onLayoutChanged`
- **Fix:** Used `panelRef` prop instead of `ref`, `onResize` with `PanelSize.asPercentage` for collapse detection, added panel `id` props, removed `onLayout`/`onCollapse`/`onExpand`
- **Files modified:** src/components/center/HubView.tsx
- **Verification:** `npx tsc --noEmit` passes with zero new errors
- **Committed in:** 8f07061

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** API adaptation was necessary for TypeScript compilation. No scope creep -- same behavior achieved with correct API.

## Issues Encountered
None beyond the API version mismatch handled as a deviation.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `src/components/center/HubView.tsx` line 78-82: Goals panel placeholder ("Loading goals tree...") -- intentional, Plan 03 will replace with GoalsTreePanel
- `src/components/hub/HubCenterPanel.tsx`: Welcome back placeholder -- intentional, Phase 23 will replace with AI briefing
- `src/components/hub/CalendarPlaceholder.tsx`: Coming Soon placeholder -- intentional, future phase will add calendar

## Next Phase Readiness
- Goals panel slot is ready for GoalsTreePanel (Plan 03)
- HubLayout persistence is established and working
- MinimizedColumn pattern is reusable for both columns

---
*Phase: 22-hub-shell-and-goals-tree*
*Completed: 2026-04-01*

## Self-Check: PASSED
