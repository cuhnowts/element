# Phase 35: Bug Fixes & Polish - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Three standalone bug fixes: calendar "Today" label in week view, deterministic overdue detection, and minimizable workflows section. No new features — pure correctness and UX polish.

</domain>

<decisions>
## Implementation Decisions

### Calendar "Today" Label (FIX-01)
- **D-01:** Every day column in week view currently gets the "today" styling (blue circle, bg-card background) instead of only the actual current day
- **D-02:** Root cause likely in `CalendarWeekGrid.tsx:120` where `todayStr` is computed via `new Date().toISOString().split("T")[0]` — this returns UTC date which may mismatch `format(day, "yyyy-MM-dd")` from date-fns (which uses local timezone). Alternatively, the `isToday` comparison at line 312 may be evaluating against stale or shared state
- **D-03:** Fix must ensure only the actual current local day gets the highlight in week view. Also audit `CalendarDayGrid.tsx:217` "No events today" text for non-today dates

### Overdue Detection (FIX-02)
- **D-04:** Overdue detection depends on Phase 33 (Briefing Rework) being complete first — Phase 33 introduces structured JSON briefing output with scored sections that feed overdue detection
- **D-05:** The deterministic query should consume Phase 33's structured briefing data (not LLM prose) to surface overdue items. The heartbeat risk engine (`heartbeat/risk.rs`) already does `due_date < today` comparisons — this phase ensures the frontend path is equally deterministic
- **D-06:** No LLM involvement in determining what is overdue — the structured JSON from briefing provides the data, and a simple date comparison query surfaces overdue items in the UI

### Workflows Minimize (FIX-03)
- **D-07:** Add a collapsible header with chevron toggle to WorkflowList, matching ThemeSidebar's existing collapsible pattern
- **D-08:** Collapsed state persists in localStorage across sessions
- **D-09:** Default state is collapsed — workflows are secondary to themes/projects

### Claude's Discretion
- Exact implementation approach for fixing the isToday comparison (timezone normalization strategy)
- Whether to refactor date comparison utilities to prevent similar timezone bugs elsewhere

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Calendar Today Bug
- `src/components/hub/calendar/CalendarWeekGrid.tsx` — Week view grid with isToday logic (lines 120, 312-344)
- `src/components/hub/calendar/CalendarDayGrid.tsx` — Day view grid, "No events today" text (line 217)
- `src/components/hub/calendar/CalendarHeader.tsx` — Header with Today navigation button (reference only, not buggy)

### Overdue Detection
- `src-tauri/src/heartbeat/risk.rs` — Deterministic due_date < today risk calculation
- `src-tauri/src/heartbeat/types.rs` — DeadlineRisk::Overdue variant definition
- `src/lib/date-utils.ts` — Frontend isOverdue() utility
- `src/stores/heartbeatSlice.ts` — Heartbeat store with overdue type

### Workflows Minimize
- `src/components/sidebar/WorkflowList.tsx` — Current workflow list component (no collapse toggle)
- `src/components/layout/Sidebar.tsx` — Sidebar layout rendering WorkflowList (line 24)
- `src/components/sidebar/ThemeSidebar.tsx` — Existing collapsible section pattern to reuse

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ThemeSidebar.tsx` collapsible sections with localStorage persistence — direct pattern for WorkflowList collapse
- `date-fns` format/isToday utilities available for timezone-safe date comparisons
- `heartbeat/risk.rs` deterministic overdue engine — already correct, frontend needs to match

### Established Patterns
- Sidebar sections use collapsible headers with chevron icons and localStorage state
- Date comparisons in calendar use `format(day, "yyyy-MM-dd")` (local timezone via date-fns)
- Zustand selectors with module-level EMPTY constants (from STATE.md decisions)

### Integration Points
- FIX-01: CalendarWeekGrid column rendering loop (lines 310-384)
- FIX-02: Depends on Phase 33 structured briefing JSON output — must integrate after Phase 33 completes
- FIX-03: Sidebar.tsx WorkflowList wrapper div (line 23-25)

</code_context>

<specifics>
## Specific Ideas

- User confirmed "every day highlighted" as the symptom in week view — not just wrong-day or label text
- User wants workflows collapsed by default — this is a deliberate choice to reduce sidebar clutter
- Overdue detection should consume Phase 33's structured JSON, not parse briefing markdown

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-bug-fixes-polish*
*Context gathered: 2026-04-04*
