---
phase: 31-drawer-consolidation
plan: 02
subsystem: ui
tags: [react, zustand, drawer, agent-panel, tabs, xterm]

# Dependency graph
requires:
  - phase: 31-drawer-consolidation/01
    provides: "DrawerTab type with elementai, agent store cleanup (panelOpen/togglePanel removed), startAgent in AppLayout"
provides:
  - "Element AI as first drawer tab with agent activity/terminal sub-tabs"
  - "Right sidebar column removed from AppLayout"
  - "Pending approval badge on Element AI tab label"
  - "AgentPanelHeader adapted for drawer context (no close chevron)"
  - "Dead components deleted: AgentPanel, AgentToggleButton"
affects: [hub-overhaul, project-detail, briefing]

# Tech tracking
tech-stack:
  added: []
  patterns: ["mount-all/show-one display pattern for drawer tab panes", "sub-tab conditional rendering inside outer display:block/none pane"]

key-files:
  created: []
  modified:
    - src/components/layout/OutputDrawer.tsx
    - src/components/layout/AppLayout.tsx
    - src/components/agent/AgentPanelHeader.tsx

key-decisions:
  - "Keep conditional rendering for agent sub-tabs (activity/terminal) inside display:block/none outer pane -- matches existing AgentPanel pattern"
  - "Remove outer flex-row wrapper in AppLayout since AgentPanel was the only second flex child"

patterns-established:
  - "Element AI drawer pane: AgentPanelHeader + conditional sub-tab content inside display:block/none wrapper"

requirements-completed: [DRAW-01, DRAW-02, DRAW-03]

# Metrics
duration: 3min
completed: 2026-04-05
---

# Phase 31 Plan 02: Drawer UI Migration Summary

**Element AI tab added as first drawer tab with agent activity/terminal content, right sidebar column removed, dead components deleted**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-05T12:00:05Z
- **Completed:** 2026-04-05T12:02:59Z
- **Tasks:** 2 of 2 auto tasks completed (Task 3 is human-verify checkpoint)
- **Files modified:** 3 modified, 3 deleted

## Accomplishments
- Element AI is the first tab in the drawer tab bar with agent activity and terminal sub-tabs
- Right sidebar agent panel column completely removed from AppLayout
- Pending approval badge relocated from AgentToggleButton to Element AI tab label
- AgentPanelHeader adapted for drawer context (close chevron removed)
- Dead components deleted: AgentPanel.tsx, AgentToggleButton.tsx, AgentPanel.test.tsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Element AI pane to OutputDrawer, update AppLayout tab bar, remove right sidebar** - `345c3f5` (feat)
2. **Task 2: Delete dead components and update/remove affected tests** - `00ac091` (chore)
3. **Task 3: Verify drawer consolidation visually** - checkpoint:human-verify (pending)

## Files Created/Modified
- `src/components/layout/OutputDrawer.tsx` - Added elementai pane with AgentPanelHeader + AgentActivityTab/AgentTerminalTab
- `src/components/layout/AppLayout.tsx` - Updated tab bar (elementai first), added approval badge, removed right sidebar column
- `src/components/agent/AgentPanelHeader.tsx` - Removed close chevron button and related imports
- `src/components/agent/AgentPanel.tsx` - DELETED (content now in OutputDrawer)
- `src/components/agent/AgentToggleButton.tsx` - DELETED (replaced by Element AI tab)
- `src/components/agent/__tests__/AgentPanel.test.tsx` - DELETED (component no longer exists)

## Decisions Made
- Kept conditional rendering (`agentActiveTab === "activity" ?`) for sub-tabs inside the outer `display:block/none` elementai pane, matching the existing AgentPanel pattern
- Removed the outer `flex-row` wrapper div in AppLayout since AgentPanel was the only second flex child -- simpler DOM structure

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Drawer consolidation complete -- all agent UI is in the bottom drawer
- Center panel now has full horizontal width (minus left sidebar)
- Ready for Phase 32 (Hub Overhaul) and Phase 33 (Briefing) to build on this layout
- Task 3 (human-verify checkpoint) pending visual verification

---
*Phase: 31-drawer-consolidation*
*Completed: 2026-04-05*
