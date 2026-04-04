---
phase: 28-due-dates-daily-planning
plan: 03
subsystem: ui
tags: [daily-plan, schedule, briefing, rescheduling, due-date-suggestions, hub-chat]

requires:
  - "28-01: date-utils, DatePickerPopover, SchedulingBadges"
  - "28-02: generate_schedule Tauri command, SUGGEST_DUE_DATE markers in briefing"
provides:
  - "DailyPlanSection component rendering schedule blocks with overflow divider"
  - "DailyPlanTaskRow component for individual task rows"
  - "OutOfTimeDivider component for visual separation"
  - "DueDateSuggestion component with Confirm/Skip buttons"
  - "BriefingContent wiring: schedule blocks, SUGGEST_DUE_DATE parsing, DailyPlanSection"
  - "BriefingPanel schedule block fetching via generate_schedule"
  - "reschedule_day tool in actionRegistry"
  - "HubChat rescheduling system prompt instructions"
affects:
  - "src/components/hub/BriefingPanel.tsx"
  - "src/components/hub/BriefingContent.tsx"
  - "src/components/hub/HubChat.tsx"
  - "src/lib/actionRegistry.ts"
  - "src/hooks/useActionDispatch.ts"

tech_stack:
  added: []
  patterns: ["SUGGEST_DUE_DATE marker parsing", "schedule block overflow detection", "input transform in dispatch"]

key_files:
  created:
    - src/components/hub/DailyPlanSection.tsx
    - src/components/hub/DailyPlanTaskRow.tsx
    - src/components/hub/OutOfTimeDivider.tsx
    - src/components/hub/DueDateSuggestion.tsx
  modified:
    - src/components/hub/BriefingPanel.tsx
    - src/components/hub/BriefingContent.tsx
    - src/components/hub/HubChat.tsx
    - src/lib/actionRegistry.ts
    - src/lib/actionRegistry.test.ts
    - src/hooks/useActionDispatch.ts

key_decisions:
  - "Used isContinuation field on schedule blocks to determine overflow index rather than time-based calculation"
  - "Added input transform in useActionDispatch for reschedule_day to map reason input to date param"
  - "DueDateSuggestion auto-hides after 1.5s on confirm to show brief Set confirmation"

metrics:
  duration: "3m 31s"
  completed: "2026-04-04"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 28 Plan 03: Daily Planning UI Components Summary

Frontend daily planning experience with DailyPlanSection rendering schedule blocks from Rust engine, out-of-time divider for overflow tasks, SUGGEST_DUE_DATE marker parsing into interactive cards, and reschedule_day tool for HubChat renegotiation.

## What Was Built

### Task 1: Core UI Components (b48017e)

Created four new components for the daily planning UI:

- **DailyPlanTaskRow** -- Renders a single task row with title, duration badge, time range, priority, and optional project name. Supports `faded` prop (opacity-60) for tasks beyond the overflow point.
- **OutOfTimeDivider** -- Horizontal separator with "Won't fit today" label, role="separator" and aria-label for accessibility.
- **DailyPlanSection** -- Container component that filters schedule blocks to work blocks, renders loading skeletons, empty state ("No tasks scheduled"), and inserts OutOfTimeDivider at the overflow index. Uses role="list" / role="listitem" pattern.
- **DueDateSuggestion** -- Card with task title, formatted suggested date, Confirm/Skip buttons. Confirm calls onConfirm and shows brief "Set" text before hiding. Skip hides immediately. Full aria-labels on both buttons.

### Task 2: Wiring and Integration (6334d01)

Connected the new components into the existing briefing and chat architecture:

- **BriefingPanel** -- Added scheduleBlocks state, fetches via `invoke("generate_schedule", { date })` alongside existing briefing on mount and refresh. Passes blocks and loading state to BriefingContent.
- **BriefingContent** -- Extended to accept schedule props. Parses SUGGEST_DUE_DATE markers from LLM content using regex, strips them from displayed markdown, renders DueDateSuggestion cards. Computes overflowIndex from isContinuation field. Renders DailyPlanSection below markdown.
- **HubChat** -- System prompt extended with Rescheduling section: instructions for acknowledging changes, using reschedule_day tool, presenting updated schedule, and NEVER auto-applying changes.
- **actionRegistry** -- Added reschedule_day action definition mapping to generate_schedule Tauri command.
- **useActionDispatch** -- Added input transform for reschedule_day to pass today's date instead of the reason string.
- **actionRegistry.test.ts** -- Updated action count assertion from 9 to 11.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed reschedule_day input mismatch**
- **Found during:** Task 2
- **Issue:** The reschedule_day tool accepts `reason` input from LLM but generate_schedule Tauri command expects `date` parameter
- **Fix:** Added input transform in useActionDispatch to map reschedule_day calls to pass today's date
- **Files modified:** src/hooks/useActionDispatch.ts
- **Commit:** 6334d01

**2. [Rule 1 - Bug] Updated actionRegistry test count**
- **Found during:** Task 2 verification
- **Issue:** Test expected 9 actions but registry now has 11 (search_tasks was already present + reschedule_day added)
- **Fix:** Updated expected count from 9 to 11 and added reschedule_day to contains check
- **Files modified:** src/lib/actionRegistry.test.ts
- **Commit:** 6334d01

## Known Stubs

None. All components are wired to real data sources (generate_schedule Tauri command, briefing content from LLM, updateTask from store).

## Verification

- TypeScript compilation: PASS (only pre-existing errors in calendar and MCP test files)
- npm test: PASS (all non-MCP tests pass; 2 pre-existing MCP test failures unrelated)
- All acceptance criteria met for both tasks
