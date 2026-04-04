---
phase: 18-ui-polish
plan: 02
subsystem: center-panel
tags: [ai-button, state-machine, layout, ux]
dependency_graph:
  requires: []
  provides: [getAiButtonState, AiButtonState, dynamic-ai-labels, single-row-layout]
  affects: [OpenAiButton.tsx, ProjectDetail.tsx]
tech_stack:
  added: []
  patterns: [pure-function-state-machine, base-ui-tooltip-render-prop, aria-disabled-pattern]
key_files:
  created: []
  modified:
    - src/components/center/OpenAiButton.tsx
    - src/components/center/OpenAiButton.test.tsx
    - src/components/center/ProjectDetail.tsx
decisions:
  - Used base-ui render prop on TooltipTrigger to avoid nested button elements
  - Used aria-disabled with visual classes instead of native disabled for tooltip accessibility
  - Conditionally render tooltip wrapper only when tooltip text exists (non-disabled states render plain button)
metrics:
  duration: 266s
  completed: "2026-03-30T01:15:15Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 18 Plan 02: AI Button State Machine and Single-Row Layout Summary

AI button state machine with 5-state priority-ordered labels plus DirectoryLink co-located on same row via flex spacer layout.

## What Was Done

### Task 1: getAiButtonState pure function and OpenAiButton component update
- Created exported `AiButtonState` interface and `getAiButtonState` pure function with 5 priority-ordered states
- State priority: Link Directory (disabled+tooltip) > Plan Project > Open AI+spinner > Check Progress > Open AI (fallback)
- Updated OpenAiButton component to derive label, disabled, and spinner from state machine
- Used `aria-disabled` with `opacity-50 cursor-not-allowed` classes instead of native `disabled` for tooltip accessibility
- Added `Loader2` spinner icon with `animate-spin` for executing state
- Wrapped disabled state in base-ui Tooltip using `render` prop to avoid nested button elements
- Added 5 unit tests for getAiButtonState covering all state transitions
- Updated existing tests for dynamic button labels (Open AI -> Check Progress for default props)
- **Commit:** 83850a3

### Task 2: Merge AI button and DirectoryLink into single row
- Removed OpenAiButton from project name row (Row 1 now: name + tier badge + change plan)
- Removed standalone "Directory" section with its label
- Added new combined row (D-08): OpenAiButton (left) + flex-1 spacer + DirectoryLink (right)
- Empty state OpenAiButton in "No phases yet" card remains unchanged
- **Commit:** d791144

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Nested button elements with TooltipTrigger**
- **Found during:** Task 1
- **Issue:** Plan specified `asChild` on TooltipTrigger, but base-ui's tooltip uses `render` prop API, not radix-style `asChild`. Using `asChild` created nested `<button>` elements.
- **Fix:** Used `render={<Button .../>}` prop on TooltipTrigger to merge into a single button element. Only wrap in Tooltip when tooltip text exists (disabled state); non-disabled states render a plain Button without tooltip wrapper.
- **Files modified:** src/components/center/OpenAiButton.tsx
- **Commit:** 83850a3

**2. [Rule 1 - Bug] Existing tests used stale button label**
- **Found during:** Task 1
- **Issue:** Existing tests found button by `name: /open ai/i` but default props (planningTier: "quick", hasContent: true) now produce "Check Progress" label.
- **Fix:** Updated existing test selectors to match "Check Progress". Updated directory-null test to verify aria-disabled + "Link Directory" label instead of error toast (disabled guard prevents toast).
- **Files modified:** src/components/center/OpenAiButton.test.tsx
- **Commit:** 83850a3

## Verification Results

- All 58 tests pass (5 new getAiButtonState + 6 existing OpenAiButton + 47 others)
- `getAiButtonState` exported from OpenAiButton.tsx (line 21)
- All 4 labels present in OpenAiButton.tsx: "Link Directory", "Plan Project", "Check Progress", "Open AI"
- ProjectDetail.tsx Directory references reduced from standalone section to inline DirectoryLink only

## Known Stubs

None - all data sources are wired and functional.

## Self-Check: PASSED
