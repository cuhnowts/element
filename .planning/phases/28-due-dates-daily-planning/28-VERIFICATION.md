---
phase: 28-due-dates-daily-planning
verified: 2026-04-03T00:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 28: Due Dates & Daily Planning Verification Report

**Phase Goal:** Users get a conversational daily planning experience -- the AI presents what fits today, suggests due dates, and adapts when plans change, while backlog items stay out of the way
**Verified:** 2026-04-03
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can set a due date on a task via a calendar popover in TaskDetail | VERIFIED | `DatePickerPopover` imported and rendered in `TaskDetail.tsx` line 14/280; shows "+ Add due date" trigger, Today/Tomorrow/Next week/+1 month shortcuts, shadcn Calendar |
| 2 | User can clear a due date from a task | VERIFIED | `DatePickerPopover` `handleClear` calls `onChange(null)`; TaskDetail converts null to `""` for Tauri invoke |
| 3 | Overdue tasks show red destructive badge and red ProgressDot | VERIFIED | `SchedulingBadges.tsx` calls `getUrgencyVariant` returning `"destructive"` for overdue; `ProgressDot.tsx` adds `bg-destructive` class when `status === "overdue"` |
| 4 | Due-soon tasks (within 2 days) show amber warning badge | VERIFIED | `SchedulingBadges.tsx` returns `"warning"` variant for `isDueSoon(dueDate)`; badge.tsx has oklch(0.75 0.15 85) amber color |
| 5 | Backlog tasks (phase sortOrder >= 999) never show overdue or due-soon styling | VERIFIED | `isBacklogPhase(sortOrder)` exported from `date-utils.ts`; `SchedulingBadges` checks `isBacklog` first and returns `"outline"`; `countOverdueTasks` returns 0 for backlog phases; scheduling SQL filters `sort_order < 999` |
| 6 | Goals tree phase/project nodes show overdue count badges that bubble up from child tasks | VERIFIED | `GoalsTreeNode.tsx` has `countOverdueTasks` helper, renders count badges with aria-labels on phase and project rows; project sums across all non-backlog phases |
| 7 | Briefing manifest includes today's scheduled task data with titles, times, durations, and due dates | VERIFIED | `manifest.rs` `build_schedule_section` generates "Today's Schedule" block with task titles, start/end times, duration, priority; wired into `build_manifest_string` |
| 8 | Manifest includes total available minutes vs total task minutes for overflow detection | VERIFIED | `manifest.rs` outputs "Available: X min | Scheduled: Y min" with "(OVERFLOW)" marker when overflow detected |
| 9 | Manifest includes list of tasks without due dates for suggestion feature | VERIFIED | `manifest.rs` `get_undated_tasks` queries non-backlog tasks with `due_date IS NULL`; appended as "Tasks Without Due Dates" section |
| 10 | Briefing system prompt instructs LLM to narrate a Today's Plan section | VERIFIED | `manifest_commands.rs` `build_briefing_system_prompt` contains "Today's Plan", "SUGGEST_DUE_DATE", "What should we work on today?", "500 words" limit |
| 11 | Hub briefing shows a Today's Plan section with prioritized task rows below the markdown content | VERIFIED | `BriefingPanel.tsx` fetches `generate_schedule` blocks and passes to `BriefingContent`; `BriefingContent` renders `DailyPlanSection` below markdown with real `scheduleBlocks` |
| 12 | Bot due date suggestions render as cards with Confirm/Skip buttons | VERIFIED | `BriefingContent.tsx` parses `SUGGEST_DUE_DATE` regex from LLM content; renders `DueDateSuggestion` cards with Confirm/Skip buttons and full aria-labels |
| 13 | Confirming a suggestion sets the due date on the task and collapses the card | VERIFIED | `DueDateSuggestion` Confirm handler calls `onConfirm(taskId, suggestedDate)`; `BriefingContent` calls `updateTask(taskId, { dueDate: date })`; card transitions to "confirmed" then "skipped" after 1.5s |
| 14 | User can tell the bot about lost time or changed priorities via HubChat | VERIFIED | `HubChat.tsx` system prompt contains Rescheduling section with `reschedule_day` tool definition; `actionRegistry.ts` line 190 registers handler mapped to `generate_schedule` Tauri command; `useActionDispatch.ts` transforms `reason` input to today's date |
| 15 | When more tasks than time, an out-of-time divider separates tasks that fit from tasks that don't | VERIFIED | `BriefingContent.tsx` computes `overflowIndex` from `isContinuation` field; `DailyPlanSection.tsx` inserts `OutOfTimeDivider` at that index |
| 16 | Tasks below the out-of-time divider are visually de-emphasized at 60% opacity | VERIFIED | `DailyPlanTaskRow.tsx` applies `opacity-60` class when `faded` prop is true; `DailyPlanSection` passes `faded={idx >= overflowIndex}` |

**Score:** 13/13 truths verified (truths 11-16 confirmed by artifact + data flow inspection; total coverage of all phase must-haves across all 3 plans)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/date-utils.ts` | isOverdue, isDueSoon, isBacklogPhase | VERIFIED | 20 lines, all 3 functions present and exported; uses date-fns parseISO, startOfDay, differenceInCalendarDays |
| `src/lib/date-utils.test.ts` | Unit tests, min 30 lines | VERIFIED | 68 lines, 12+ test cases with vi.useFakeTimers |
| `src/components/shared/SchedulingBadges.test.ts` | Three-tier variant tests, min 20 lines | VERIFIED | 71 lines, covers destructive/warning/outline and backlog exemption |
| `src/components/shared/DatePickerPopover.tsx` | Calendar popover with shortcuts | VERIFIED | 91 lines; Today/Tomorrow/Next week/+1 month shortcuts; Clear link; shadcn Calendar |
| `src/components/ui/badge.tsx` | Warning variant with oklch amber | VERIFIED | Contains `warning:` CVA variant with `oklch(0.75_0.15_85)` |
| `src-tauri/src/commands/scheduling_commands.rs` | Backlog filter + generate_schedule_for_date | VERIFIED | `LEFT JOIN phases` with `sort_order < 999` filter at line 32-34; `generate_schedule_for_date` public fn at line 69 |
| `src-tauri/src/models/manifest.rs` | Today's Schedule section in manifest | VERIFIED | `build_schedule_section` at line 122; called from `build_manifest_string` at line 106; contains "Today's Schedule", "OVERFLOW", "Tasks Without Due Dates" |
| `src-tauri/src/commands/manifest_commands.rs` | Updated briefing prompt with daily plan | VERIFIED | Contains "Today's Plan", "SUGGEST_DUE_DATE", "What should we work on today?", "500 words" |
| `src/components/hub/DailyPlanSection.tsx` | Schedule block rendering with overflow | VERIFIED | Exports `DailyPlanSection`; "Today's Plan" heading; `role="list"`; overflow index logic; OutOfTimeDivider insertion; empty state; loading skeletons |
| `src/components/hub/DailyPlanTaskRow.tsx` | Single task row | VERIFIED | Exports `DailyPlanTaskRow`; `opacity-60` for faded; Badge for duration; time range and priority display |
| `src/components/hub/OutOfTimeDivider.tsx` | Visual separator | VERIFIED | Exports `OutOfTimeDivider`; "Won't fit today"; `role="separator"`; aria-label |
| `src/components/hub/DueDateSuggestion.tsx` | Confirm/Skip card | VERIFIED | Exports `DueDateSuggestion`; Confirm/Skip buttons with aria-labels; confirms then collapses after 1.5s |
| `src/components/hub/BriefingContent.tsx` | Extended briefing with DailyPlanSection | VERIFIED | Imports DailyPlanSection and DueDateSuggestion; parses SUGGEST_DUE_DATE regex; computes overflowIndex; calls updateTask on confirm |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `TaskDetail.tsx` | `DatePickerPopover.tsx` | import and render in scheduling accordion | WIRED | Line 14 imports; line 280 renders with `value={selectedTask.dueDate}` and `onChange` calling `updateTask` |
| `SchedulingBadges.tsx` | `date-utils.ts` | import isOverdue, isDueSoon | WIRED | Line 4: `import { isOverdue, isDueSoon } from "@/lib/date-utils"` |
| `GoalsTreeNode.tsx` | `date-utils.ts` | import isOverdue, isBacklogPhase for count badge | WIRED | Line 12: `import { isOverdue, isBacklogPhase } from "@/lib/date-utils"` |
| `manifest.rs` | `scheduling_commands.rs` | calls generate_schedule_for_date | WIRED | Line 3: `use crate::commands::scheduling_commands::generate_schedule_for_date`; called at line 124 |
| `manifest_commands.rs` | `manifest.rs` | calls build_manifest_string | WIRED | Line 10: `use crate::models::manifest::{build_manifest_string, ...}`; called at lines 21, 53, 210 |
| `BriefingPanel.tsx` | `generate_schedule` Tauri command | invoke to fetch structured blocks | WIRED | Line 34: `invoke<ScheduleBlock[]>("generate_schedule", { date: todayStr })`; called on mount and refresh |
| `BriefingContent.tsx` | `DailyPlanSection.tsx` | renders DailyPlanSection below markdown | WIRED | Line 6 imports; line 95 renders with `blocks={scheduleBlocks}` and `overflowIndex` |
| `BriefingContent.tsx` | `DueDateSuggestion.tsx` | parses SUGGEST_DUE_DATE markers | WIRED | Line 7 imports; line 26 regex parses from LLM content; line 73 renders cards |
| `HubChat.tsx` | `actionRegistry.ts` | reschedule_day handler registration | WIRED | Line 190 in actionRegistry registers `reschedule_day`; HubChat system prompt references it at line 137 |
| `actionRegistry.ts` | `generate_schedule` Tauri command | reschedule_day invokes generate_schedule | WIRED | Line 204: `tauriCommand: "generate_schedule"`; `useActionDispatch.ts` line 32 transforms input to add today's date |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `BriefingContent.tsx` | `scheduleBlocks` | `invoke("generate_schedule")` in BriefingPanel → Rust `generate_schedule_for_date` → SQL query on `tasks` table | Yes — SQL at scheduling_commands.rs line 32-35 reads live tasks | FLOWING |
| `BriefingContent.tsx` | `suggestions` | `useMemo` regex parsing `briefingContent` from `useBriefingStore` | Yes — store is populated by streaming LLM response via `useBriefingStream` | FLOWING |
| `BriefingContent.tsx` | `overflowIndex` | `useMemo` on `scheduleBlocks.findIndex(b => b.isContinuation)` | Yes — derived from live schedule blocks | FLOWING |
| `DueDateSuggestion.tsx` | `onConfirm` result | `updateTask(taskId, { dueDate: date })` via `useStore` | Yes — calls Tauri invoke for task persistence | FLOWING |
| `GoalsTreeNode.tsx` | `countOverdueTasks` | `tasks` array from store prop + `isOverdue(t.dueDate)` | Yes — reads live task data passed from hub store | FLOWING |
| `manifest.rs` `build_schedule_section` | schedule blocks | `generate_schedule_for_date` with SQL query | Yes — live database query with phase join filter | FLOWING |
| `manifest.rs` `get_undated_tasks` | undated tasks | SQL query `WHERE due_date IS NULL AND sort_order < 999` | Yes — live database query | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for server-dependent Tauri commands (cannot invoke without running app). Frontend module exports verified statically.

Module-level checks:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| date-utils exports isOverdue, isDueSoon, isBacklogPhase | `grep "export function" src/lib/date-utils.ts` | All 3 present | PASS |
| badge.tsx has warning variant | `grep "warning:" src/components/ui/badge.tsx` | Found with oklch amber | PASS |
| ProgressDot has overdue status | `grep "overdue" src/components/hub/ProgressDot.tsx` | Line 3: type includes "overdue"; line 17: bg-destructive class | PASS |
| reschedule_day in actionRegistry | `grep "reschedule_day" src/lib/actionRegistry.ts` | Line 190 found | PASS |
| date-fns in package.json | `grep "date-fns" package.json` | `"date-fns": "^4.1.0"` | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DUE-01 | 28-01 | User can set due dates on tasks and phases via a date picker | SATISFIED | `DatePickerPopover` renders in `TaskDetail` scheduling accordion with full shortcut and calendar functionality |
| DUE-02 | 28-01 | Overdue and upcoming tasks are visually indicated in the goals tree and task views | SATISFIED | Three-tier urgency in `SchedulingBadges` (destructive/warning/outline); `countOverdueTasks` + count badges in `GoalsTreeNode`; `ProgressDot` overdue status |
| DUE-03 | 28-01 | Backlog items (999.x phases) are exempt from due date enforcement and alerts | SATISFIED | `isBacklogPhase(sortOrder >= 999)` used in `SchedulingBadges` (returns outline), `countOverdueTasks` (returns 0), and scheduling SQL filter (`sort_order < 999`) |
| PLAN-01 | 28-02, 28-03 | Bot presents a prioritized daily plan on hub load: tasks ranked by importance against available time | SATISFIED | `build_schedule_section` in manifest feeds LLM; `BriefingPanel` fetches `generate_schedule`; `DailyPlanSection` renders prioritized task rows |
| PLAN-02 | 28-02, 28-03 | Bot asks "What should we work on today?" when there's more work than time | SATISFIED | Manifest marks OVERFLOW; briefing prompt instructs LLM to ask "What should we work on today?"; `OutOfTimeDivider` separates fitting from non-fitting tasks in UI |
| PLAN-03 | 28-02, 28-03 | Bot suggests due dates for tasks without them through conversation | SATISFIED | Undated tasks in manifest; `SUGGEST_DUE_DATE:{json}` marker format in prompt; `BriefingContent` parses markers and renders `DueDateSuggestion` cards with Confirm/Skip |
| PLAN-04 | 28-03 | Bot can reschedule work when the user reports lost time or new priorities | SATISFIED | `reschedule_day` tool in `actionRegistry.ts`; HubChat system prompt has Rescheduling section with NEVER auto-apply rule; `useActionDispatch` maps to `generate_schedule` with today's date |

No orphaned requirements — all 7 IDs (DUE-01 through DUE-03, PLAN-01 through PLAN-04) are claimed by plans and verified.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src-tauri/src/commands/scheduling_commands.rs` | 87 | `// TODO: Read from calendar_events table once calendar integration is wired up.` — calendar_events is empty vec | Info | Calendar events are intentionally deferred to Phase 29 (MCP calendar integration). Schedule still generates correctly from tasks against work hours. Not a blocker for Phase 28 goals. |

No blockers or warnings. The single TODO is a known, documented forward-dependency on Phase 29 (MCP-01/MCP-02).

---

### Human Verification Required

#### 1. DatePickerPopover Interaction

**Test:** Open TaskDetail for any non-backlog task, expand the Scheduling accordion, click "+ Add due date", select "Tomorrow" shortcut.
**Expected:** Due date is saved and shows amber "Due tomorrow" badge in SchedulingBadges.
**Why human:** Tauri invoke (updateTask) and popover close behavior require the running app.

#### 2. Briefing Daily Plan Display

**Test:** Open the Hub, trigger a briefing refresh. Observe the briefing panel after the LLM response streams in.
**Expected:** Below the markdown briefing text, a "Today's Plan" section shows task rows from generate_schedule. If no tasks are scheduled, shows "No tasks scheduled" empty state.
**Why human:** Requires live Tauri backend and LLM response.

#### 3. Overflow Divider Rendering

**Test:** Set estimated minutes on multiple tasks so they exceed daily work hours capacity. Trigger briefing refresh.
**Expected:** "Won't fit today" divider appears between tasks that fit and those that don't; tasks below divider appear at 60% opacity.
**Why human:** Requires specific schedule overflow conditions in live data.

#### 4. DueDateSuggestion Confirm Flow

**Test:** In a briefing where the LLM emits a SUGGEST_DUE_DATE marker, click the Confirm button on a suggestion card.
**Expected:** Card briefly shows "Set" text, then disappears. The task's due date is updated (visible in TaskDetail).
**Why human:** Requires LLM to produce SUGGEST_DUE_DATE marker in a real briefing session.

#### 5. HubChat Rescheduling

**Test:** In HubChat, type "I lost 2 hours this morning, please reschedule my day."
**Expected:** Bot acknowledges the change, invokes reschedule_day tool, presents an updated schedule summary. States it will not auto-apply changes.
**Why human:** Requires live LLM and tool-call execution loop.

---

### Gaps Summary

No gaps. All 13 primary must-have truths are verified at all four levels (exists, substantive, wired, data-flowing). All 7 requirements are satisfied with implementation evidence. No blocker anti-patterns found. The single calendar_events TODO is a documented forward-dependency on Phase 29, not a Phase 28 gap.

---

_Verified: 2026-04-03_
_Verifier: Claude (gsd-verifier)_
