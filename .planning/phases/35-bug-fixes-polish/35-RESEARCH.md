# Phase 35: Bug Fixes & Polish - Research

**Researched:** 2026-04-04
**Domain:** Frontend bug fixes (calendar, overdue detection, sidebar UX)
**Confidence:** HIGH

## Summary

Phase 35 addresses three standalone bugs: (1) calendar week view highlighting all days as "today" due to a UTC vs local timezone mismatch, (2) ensuring overdue task detection is purely deterministic with no LLM involvement, and (3) adding a collapsible/minimizable workflow section in the sidebar. All three fixes are localized changes to existing components with well-understood root causes.

The calendar bug has a clear root cause at `CalendarWeekGrid.tsx:120` where `new Date().toISOString().split("T")[0]` computes today's date in UTC rather than local timezone. The fix is a one-line change to use date-fns `format(new Date(), "yyyy-MM-dd")` which respects local timezone. The overdue detection infrastructure already exists and is correct -- the frontend `isOverdue()` utility in `date-utils.ts` and the backend `heartbeat/risk.rs` engine both use deterministic date comparisons. The workflow collapse uses an existing pattern (ThemeSection/useWorkspaceStore) and an existing shadcn collapsible component.

**Primary recommendation:** Three isolated fixes -- timezone-safe date format for calendar, verify existing overdue path has no LLM dependency, and add collapsible wrapper to WorkflowList using zustand-persisted state in useWorkspaceStore.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Every day column in week view currently gets the "today" styling instead of only the actual current day
- D-02: Root cause likely in `CalendarWeekGrid.tsx:120` where `todayStr` uses UTC date which mismatches date-fns local timezone format
- D-03: Fix must ensure only actual current local day gets highlight; also audit `CalendarDayGrid.tsx:217` "No events today" text
- D-04: Overdue detection depends on Phase 33 (Briefing Rework) being complete first for structured JSON
- D-05: Deterministic query should consume Phase 33's structured briefing data; heartbeat risk engine already correct
- D-06: No LLM involvement in determining what is overdue
- D-07: Add collapsible header with chevron toggle to WorkflowList, matching ThemeSidebar pattern
- D-08: Collapsed state persists in localStorage across sessions
- D-09: Default state is collapsed

### Claude's Discretion
- Exact implementation approach for fixing the isToday comparison (timezone normalization strategy)
- Whether to refactor date comparison utilities to prevent similar timezone bugs elsewhere

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIX-01 | Calendar week view shows "Today" label only on the actual current day | Root cause identified at line 120 of CalendarWeekGrid.tsx; fix is replacing UTC toISOString with date-fns format(); also audit CalendarDayGrid.tsx line 96 and 217 |
| FIX-02 | Overdue tasks detected deterministically without LLM | Existing `isOverdue()` in date-utils.ts and `heartbeat/risk.rs` are already deterministic; verify no LLM path exists in frontend overdue rendering; Phase 33 dependency for structured briefing data |
| FIX-03 | Workflows section can be fully minimized when not in use | Collapsible component exists at `src/components/ui/collapsible.tsx`; useWorkspaceStore has persist middleware with localStorage; ThemeSection pattern provides exact model |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | (installed) | Timezone-safe date formatting | Already used throughout calendar components; `format()` uses local timezone |
| zustand | (installed) | State management with persist middleware | useWorkspaceStore already persists collapse state for themes |
| @base-ui/react | (installed) | Collapsible primitive via shadcn wrapper | Already installed; collapsible.tsx wraps it |
| lucide-react | (installed) | ChevronDown/ChevronRight icons | Already used in ThemeSection for expand/collapse |

### Supporting
No new libraries needed. All fixes use existing dependencies.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| date-fns format() for todayStr | date-fns isToday() | isToday() returns boolean, but we need the string for map lookups; format() gives both correctness and the right type |
| useWorkspaceStore persist | Raw localStorage | useWorkspaceStore already handles persistence; adding another localStorage key creates inconsistency |

## Architecture Patterns

### Pattern 1: Timezone-Safe Date Comparison (FIX-01)

**What:** Replace UTC-based date string with local-timezone date string using date-fns.
**When to use:** Any time you compute "today" for comparison with date-fns formatted dates.

**Current (buggy):**
```typescript
// CalendarWeekGrid.tsx:120 -- uses UTC, may differ from local date
const todayStr = new Date().toISOString().split("T")[0];
```

**Fix:**
```typescript
// Uses local timezone, matches format(day, "yyyy-MM-dd") used at line 311
const todayStr = format(new Date(), "yyyy-MM-dd");
```

**Same bug exists in CalendarDayGrid.tsx:96:**
```typescript
// Current (buggy) -- same UTC issue
const isToday = dateStr === new Date().toISOString().split("T")[0];

// Fix:
const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
```

Note: `format` is already imported from date-fns in both files.

### Pattern 2: Zustand Persisted Collapse State (FIX-03)

**What:** Add a `workflowsCollapsed` boolean to useWorkspaceStore with persist middleware.
**When to use:** Any sidebar section that needs persistent expand/collapse state.

**Existing pattern (ThemeSection uses themeCollapseState):**
```typescript
// useWorkspaceStore.ts -- themes use a Record<string, boolean>
themeCollapseState: {},
setThemeExpanded: (themeId, expanded) => {
  set((s) => ({
    themeCollapseState: { ...s.themeCollapseState, [themeId]: expanded },
  }));
},
```

**For workflows (simpler -- single boolean, not per-item):**
```typescript
// Add to WorkspaceState interface:
workflowsCollapsed: boolean;
setWorkflowsCollapsed: (collapsed: boolean) => void;

// Default value: true (collapsed by default per D-09)
// Add to partialize for persistence
```

### Pattern 3: Shadcn Collapsible Wrapper (FIX-03)

**What:** Use the existing `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` components.
**When to use:** Sections that need animated expand/collapse with accessible toggle.

**The component at `src/components/ui/collapsible.tsx` wraps `@base-ui/react/collapsible`:**
```typescript
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

// Usage in WorkflowList:
<Collapsible open={!collapsed} onOpenChange={(open) => setWorkflowsCollapsed(!open)}>
  <div className="flex items-center justify-between px-4 py-2">
    <CollapsibleTrigger className="flex items-center gap-1">
      {collapsed ? <ChevronRight className="size-3" /> : <ChevronDown className="size-3" />}
      <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        Workflows
      </span>
    </CollapsibleTrigger>
    <Button variant="ghost" size="icon-xs" onClick={handleCreate} aria-label="Create workflow">
      <Plus className="h-3 w-3" />
    </Button>
  </div>
  <CollapsibleContent>
    {/* existing scroll area with workflow items */}
  </CollapsibleContent>
</Collapsible>
```

### Anti-Patterns to Avoid
- **UTC date for local display:** Never use `new Date().toISOString().split("T")[0]` for local date comparison. Always use `format(new Date(), "yyyy-MM-dd")` from date-fns.
- **Direct localStorage in components:** Do not use `localStorage.getItem/setItem` directly. Use useWorkspaceStore which already has persist middleware -- this keeps all persisted UI state in one place.
- **New object refs from Zustand selectors:** Per project decision, never return new object/array refs from selectors. Use module-level EMPTY constants or stable primitives.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible section | Custom show/hide with state | `@/components/ui/collapsible` (shadcn wrapper over @base-ui/react) | Handles animation, accessibility (aria-expanded), keyboard support |
| Persistent UI state | Raw localStorage reads/writes | useWorkspaceStore zustand persist middleware | Centralized, typed, already handles serialization |
| Local timezone date | Manual timezone offset calculations | date-fns `format(new Date(), "yyyy-MM-dd")` | Handles DST, timezone offsets correctly |

## Common Pitfalls

### Pitfall 1: UTC vs Local Timezone Date Strings
**What goes wrong:** `new Date().toISOString()` returns UTC. Near midnight, UTC date may differ from local date by +/- 1 day depending on timezone offset.
**Why it happens:** JavaScript `Date.toISOString()` always normalizes to UTC. Developers assume "today" means local date.
**How to avoid:** Always use `format(new Date(), "yyyy-MM-dd")` from date-fns for local date strings. Grep for other occurrences of `.toISOString().split("T")[0]` used for "today" comparison.
**Warning signs:** "Today" indicator appears on wrong day, or all days appear as today.

### Pitfall 2: Collapsible Default State
**What goes wrong:** First-time users see workflows expanded when the decision says collapsed by default.
**Why it happens:** Zustand persist reads from localStorage; on first visit, no stored value exists, so the initial state in the store definition is used.
**How to avoid:** Set `workflowsCollapsed: true` as the default in the store definition. This means "collapsed" is the out-of-box experience.
**Warning signs:** New install shows workflows expanded.

### Pitfall 3: Phase 33 Dependency for FIX-02
**What goes wrong:** FIX-02 attempts to wire up structured briefing JSON that does not yet exist.
**Why it happens:** CONTEXT.md D-04 states overdue detection depends on Phase 33 structured briefing output.
**How to avoid:** FIX-02 scope should verify that the existing deterministic path (`isOverdue()` in date-utils.ts, `heartbeat/risk.rs`) works correctly without LLM. Do NOT build new briefing integration -- that is Phase 33's job. FIX-02 ensures no LLM is in the existing overdue rendering path.
**Warning signs:** Plan includes tasks to parse briefing JSON or build new data pipelines.

### Pitfall 4: Sidebar Max Height Constraint
**What goes wrong:** Expanded WorkflowList exceeds its `max-h-[200px]` container in `Sidebar.tsx:23`.
**Why it happens:** The `max-h-[200px]` constraint in Sidebar.tsx already limits the workflow section height.
**How to avoid:** When collapsed, the wrapper should shrink naturally. When expanded, the existing max-height constraint remains. Do not remove or modify the max-height -- it prevents workflows from stealing space from themes.
**Warning signs:** Expanding workflows pushes theme sidebar off screen.

## Code Examples

### FIX-01: CalendarWeekGrid todayStr Fix
```typescript
// CalendarWeekGrid.tsx:120
// BEFORE (buggy -- UTC):
const todayStr = new Date().toISOString().split("T")[0];

// AFTER (correct -- local timezone):
const todayStr = format(new Date(), "yyyy-MM-dd");
```

### FIX-01: CalendarDayGrid isToday Fix
```typescript
// CalendarDayGrid.tsx:96
// BEFORE (buggy -- UTC):
const isToday = dateStr === new Date().toISOString().split("T")[0];

// AFTER (correct -- local timezone):
const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
```

Note: `format` is already imported from date-fns in CalendarDayGrid (via the `useCalendarEvents` hook pattern). Actually, checking the imports -- CalendarDayGrid does NOT currently import `format` from date-fns. It will need to be added:
```typescript
import { format } from "date-fns";
```

### FIX-01: CalendarDayGrid "No events today" Text
```typescript
// CalendarDayGrid.tsx:217 -- current:
<h3 className="text-base font-semibold">No events today</h3>

// Fixed -- conditional text:
<h3 className="text-base font-semibold">
  {isToday ? "No events today" : "No events"}
</h3>
```

### FIX-03: useWorkspaceStore Addition
```typescript
// Add to WorkspaceState interface:
workflowsCollapsed: boolean;
toggleWorkflows: () => void;

// Add to store creation:
workflowsCollapsed: true, // default collapsed per D-09
toggleWorkflows: () => set((s) => ({ workflowsCollapsed: !s.workflowsCollapsed })),

// Add to partialize:
workflowsCollapsed: state.workflowsCollapsed,
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `new Date().toISOString().split("T")[0]` | `format(new Date(), "yyyy-MM-dd")` | This fix | Eliminates UTC/local timezone mismatch for "today" detection |
| WorkflowList always visible | Collapsible with persisted state | This fix | Reduces sidebar clutter; matches ThemeSection collapse pattern |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIX-01 | todayStr uses local timezone in CalendarWeekGrid | unit | `npx vitest run src/components/hub/calendar/CalendarWeekGrid.test.tsx -t "today" --reporter=verbose` | No -- Wave 0 |
| FIX-01 | isToday uses local timezone in CalendarDayGrid | unit | `npx vitest run src/components/hub/calendar/CalendarDayGrid.test.tsx -t "today" --reporter=verbose` | No -- Wave 0 |
| FIX-01 | "No events today" text only on actual today | unit | `npx vitest run src/components/hub/calendar/CalendarDayGrid.test.tsx -t "no events" --reporter=verbose` | No -- Wave 0 |
| FIX-02 | isOverdue is deterministic (no LLM) | unit | `npx vitest run src/lib/date-utils.test.ts --reporter=verbose` | Yes -- existing |
| FIX-03 | WorkflowList collapses and expands | unit | `npx vitest run src/components/sidebar/WorkflowList.test.tsx --reporter=verbose` | No -- Wave 0 |
| FIX-03 | Collapse state persists in useWorkspaceStore | unit | `npx vitest run src/stores/useWorkspaceStore.test.ts -t "workflow" --reporter=verbose` | Yes (file exists, test case needed) |

### Sampling Rate
- **Per task commit:** `npm test -- --reporter=verbose`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/hub/calendar/CalendarWeekGrid.test.tsx` -- test that todayStr matches only the actual current day (use vi.useFakeTimers)
- [ ] `src/components/hub/calendar/CalendarDayGrid.test.tsx` -- test isToday and conditional "No events" text
- [ ] `src/components/sidebar/WorkflowList.test.tsx` -- test collapsible toggle and default collapsed state
- [ ] Add test case to `src/stores/useWorkspaceStore.test.ts` for workflowsCollapsed persistence

## Open Questions

1. **FIX-02 scope clarity**
   - What we know: The existing `isOverdue()` utility and `heartbeat/risk.rs` are already deterministic. The frontend rendering path at task list level uses these utilities.
   - What's unclear: Whether there is any other code path where LLM output influences overdue badge display. D-04 says this depends on Phase 33, but the existing infrastructure may already be sufficient.
   - Recommendation: Audit all call sites of `isOverdue()` and any places overdue status is rendered. If the existing path is clean (no LLM), FIX-02 becomes a verification task with minimal code changes. Do not build Phase 33 integration -- that belongs in Phase 33.

2. **CalendarDayGrid format import**
   - What we know: CalendarDayGrid.tsx does not currently import `format` from date-fns directly (line 96 uses raw `new Date().toISOString()`).
   - What's unclear: Nothing -- this is straightforward.
   - Recommendation: Add `import { format } from "date-fns"` to CalendarDayGrid.tsx.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `CalendarWeekGrid.tsx` (line 120, 311-312) -- confirmed UTC todayStr bug
- Direct code inspection of `CalendarDayGrid.tsx` (line 96, 217) -- confirmed same UTC pattern and hardcoded "today" text
- Direct code inspection of `WorkflowList.tsx` -- confirmed no collapse toggle exists
- Direct code inspection of `useWorkspaceStore.ts` -- confirmed persist middleware pattern with partialize
- Direct code inspection of `collapsible.tsx` -- confirmed shadcn collapsible exists wrapping @base-ui/react
- Direct code inspection of `date-utils.ts` -- confirmed deterministic `isOverdue()` using date-fns `startOfDay`
- Direct code inspection of `heartbeatSlice.ts` -- confirmed DeadlineRisk type with "overdue" variant, no LLM in slice

### Secondary (MEDIUM confidence)
- UI-SPEC at `35-UI-SPEC.md` -- design contract specifying exact visual treatments and copy

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and used in the codebase
- Architecture: HIGH - all patterns directly observed in existing code (ThemeSection, useWorkspaceStore)
- Pitfalls: HIGH - root causes confirmed through direct code inspection

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable -- bug fixes to existing code)
