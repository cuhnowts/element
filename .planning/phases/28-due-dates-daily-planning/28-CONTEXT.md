# Phase 28: Due Dates & Daily Planning - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users get due date management on tasks with visual urgency indicators across the app, plus a conversational daily planning experience integrated into the hub briefing. Backlog items (999.x) are exempt from all due date enforcement.

Requirements covered: DUE-01, DUE-02, DUE-03, PLAN-01, PLAN-02, PLAN-03, PLAN-04

</domain>

<decisions>
## Implementation Decisions

### Date Picker & Due Date UX
- **D-01:** Due dates are set inline in the TaskDetail view via a calendar popover in the metadata area
- **D-02:** Tasks only get due dates -- Phase model stays unchanged. Phase urgency is derived from its tasks' due dates
- **D-03:** When no due date is set, show a subtle "+ Add due date" link in the task detail metadata area
- **D-04:** Date picker includes quick-select shortcuts (Today, Tomorrow, Next Week, +1 Month) above the calendar grid

### Overdue Visual Treatment
- **D-05:** Goals tree uses red ProgressDot + count badge for overdue tasks. Phase/project nodes bubble up overdue counts from child tasks
- **D-06:** Three-tier urgency system: overdue (red), due soon (amber), normal. "Due soon" threshold is 2 days
- **D-07:** SchedulingBadges gets an amber/warning variant for "due soon" state, extending the existing red destructive variant for overdue. Consistent three-tier treatment in both goals tree and task detail/list views

### Backlog Exemption
- **D-08:** Backlog phases identified by sortOrder >= 999. No schema changes needed -- uses existing Phase.sortOrder field
- **D-09:** Tasks in backlog phases can have due dates set (stored normally) but all visual warnings (overdue, due soon indicators) are suppressed. Useful when promoting tasks from backlog later

### Daily Planning Conversation
- **D-10:** Daily plan is delivered as part of the existing hub briefing (BriefingPanel). Extended with a "Today's Plan" section showing prioritized tasks ranked against available calendar time
- **D-11:** When more work than time, briefing proactively shows what won't fit and asks "What should we work on today?" -- user can engage or ignore
- **D-12:** Bot suggests due dates for undated tasks inline in the briefing with confirm/skip action buttons. Follows suggest-never-auto-apply pattern
- **D-13:** Rescheduling happens via natural language in hub chat. User says things like "I lost 2 hours" or "prioritize auth instead" and bot suggests an updated plan (not auto-applied)

### Claude's Discretion
- Calendar popover component implementation details (radix popover, date-fns formatting)
- Exact quick-select shortcut labels and date calculations
- Briefing prompt engineering for daily plan generation
- How the scheduling algorithm ranks tasks against available time

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- DUE-01 through DUE-03, PLAN-01 through PLAN-04 acceptance criteria

### Prior Research Decisions
- `.planning/STATE.md` -- Accumulated context section has v1.5 research decisions (LLM narrates algorithm, suggest-never-auto-apply, scheduling_commands.rs:97 fix)

### Out of Scope
- `.planning/REQUIREMENTS.md` "Out of Scope" table -- no autonomous rescheduling, no LLM-generated schedules

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/shared/SchedulingBadges.tsx` -- Already renders due date badge with overdue detection (red destructive variant). Needs amber "due soon" variant added
- `src/components/hub/GoalsTreeNode.tsx` -- Goals tree with ProgressDot status indicators. Needs overdue dot color and count badge
- `src/components/hub/ProgressDot.tsx` -- Status dot component. Needs "overdue" status variant
- `src/stores/useBriefingStore.ts` -- Zustand store for briefing streaming state
- `src/hooks/useBriefingStream.ts` -- Hook for streaming briefing content from AI
- `src/components/hub/BriefingPanel.tsx` -- Briefing display component to extend with daily plan section
- `src/components/hub/HubChat.tsx` -- Hub chat for natural language rescheduling

### Established Patterns
- Task model (`src/lib/types.ts`) already has `dueDate: string | null` field
- Rust Task model (`src-tauri/src/models/task.rs`) already has `due_date: Option<String>` with full CRUD support
- Phase model has `sortOrder` field usable for backlog detection (>= 999)
- Briefing streams via Zustand store with chunk-based updates

### Integration Points
- `src/components/center/TaskDetail.tsx` -- Where date picker popover will be added
- `src-tauri/src/commands/scheduling_commands.rs` -- Scheduling engine that needs calendar time data for daily plan ranking
- `mcp-server/src/tools/task-tools.ts` -- MCP task tools already support due_date field

</code_context>

<specifics>
## Specific Ideas

- The briefing's "Today's Plan" should show a clear visual divider ("out of time") between tasks that fit and tasks that don't
- Confirm/skip action buttons on due date suggestions in briefing (not just text)
- Overdue count badge on goals tree phase/project nodes to surface problems without expanding the tree

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 28-due-dates-daily-planning*
*Context gathered: 2026-04-03*
