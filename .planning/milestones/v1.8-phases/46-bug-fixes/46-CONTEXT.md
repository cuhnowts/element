# Phase 46: Bug Fixes - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix two UAT-discovered bugs from Phase 41 testing:
1. Black screen crash when clicking a chore/task (TaskDetail.tsx null access)
2. Modal overlays in CalendarAccounts and PhaseRow cannot be dismissed via backdrop click or Escape

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

All implementation decisions deferred to Claude — bugs are clear-cut with well-defined success criteria.

**Black screen fix:**
- Identify and fix the null access path in TaskDetail.tsx (existing skeleton guard at line 84-92 doesn't prevent the crash — likely a deeper null access in the render body)
- Guard approach (render-level, data-layer, or both) at Claude's discretion

**Modal dismiss behavior:**
- CalendarAccounts and PhaseRow modals should be dismissable via backdrop click and Escape key
- Animation and transition details at Claude's discretion — match existing patterns in the codebase

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bug 1: Black screen (TaskDetail null access)
- `src/components/center/TaskDetail.tsx` — Primary file with null access bug
- `src/components/center/TaskHeader.tsx` — TaskDetail sub-component, may have null access
- `src/components/center/TaskMetadata.tsx` — TaskDetail sub-component, may have null access
- `src/components/layout/CenterPanel.tsx` — Routes to TaskDetail, may affect selection state

### Bug 2: Modal overlay traps
- `src/components/settings/CalendarAccounts.tsx` — Modal overlay cannot be dismissed
- `src/components/center/PhaseRow.tsx` — Modal overlay cannot be dismissed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- TaskDetail.tsx already has a `!selectedTask` skeleton guard (lines 84-92) — but crash still occurs, suggesting null access deeper in render
- CalendarAccounts.tsx has Escape key handler (`onKeyDown` at line 252) — may need backdrop click handler
- PhaseRow.tsx has Escape handlers (lines 125, 192, 225) — may need backdrop click handler

### Established Patterns
- Modal overlays use inline `div` elements with `onKeyDown` for Escape — not a shared modal component
- Task selection flows through `useWorkspaceStore.selectTask` and `useStore.loadTaskDetail`

### Integration Points
- TaskDetail is rendered by CenterPanel when a task is selected
- CalendarAccounts is rendered in SettingsPage
- PhaseRow is rendered in ProjectDetail

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

*Phase: 46-bug-fixes*
*Context gathered: 2026-04-10*
