# Phase 28: Due Dates & Daily Planning - Research

**Researched:** 2026-04-03
**Domain:** Date picker UX, urgency visual system, LLM-driven daily planning
**Confidence:** HIGH

## Summary

Phase 28 adds two distinct feature areas to the existing Element app: (1) a date picker for setting task due dates with three-tier urgency visuals across the goals tree and task views, and (2) a conversational daily planning experience integrated into the existing hub briefing. Both build on well-established existing infrastructure -- the Task model already has `dueDate`, the scheduling algorithm already scores by due date urgency, and the briefing system already streams LLM content.

The primary technical challenge is the daily planning integration: the existing `build_manifest_string` passes project/phase-level summaries to the briefing LLM but includes zero task-level detail (due dates, priorities, durations). The manifest must be extended to include today-relevant task data so the LLM can narrate a daily plan. The scheduling algorithm in `assignment.rs` already does the hard work of scoring and ranking tasks against open blocks -- the LLM narrates this output, it does not generate schedules.

**Primary recommendation:** Extend the Rust manifest builder to include schedule block data for today, then modify the briefing system prompt to narrate a "Today's Plan" section. On the frontend, the date picker and urgency visuals are straightforward extensions of existing components (shadcn Calendar + Popover already installed, Badge needs one new variant, ProgressDot needs one new status).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Due dates are set inline in the TaskDetail view via a calendar popover in the metadata area
- D-02: Tasks only get due dates -- Phase model stays unchanged. Phase urgency is derived from its tasks' due dates
- D-03: When no due date is set, show a subtle "+ Add due date" link in the task detail metadata area
- D-04: Date picker includes quick-select shortcuts (Today, Tomorrow, Next Week, +1 Month) above the calendar grid
- D-05: Goals tree uses red ProgressDot + count badge for overdue tasks. Phase/project nodes bubble up overdue counts from child tasks
- D-06: Three-tier urgency system: overdue (red), due soon (amber), normal. "Due soon" threshold is 2 days
- D-07: SchedulingBadges gets an amber/warning variant for "due soon" state, extending the existing red destructive variant for overdue. Consistent three-tier treatment in both goals tree and task detail/list views
- D-08: Backlog phases identified by sortOrder >= 999. No schema changes needed -- uses existing Phase.sortOrder field
- D-09: Tasks in backlog phases can have due dates set (stored normally) but all visual warnings (overdue, due soon indicators) are suppressed. Useful when promoting tasks from backlog later
- D-10: Daily plan is delivered as part of the existing hub briefing (BriefingPanel). Extended with a "Today's Plan" section showing prioritized tasks ranked against available calendar time
- D-11: When more work than time, briefing proactively shows what won't fit and asks "What should we work on today?" -- user can engage or ignore
- D-12: Bot suggests due dates for undated tasks inline in the briefing with confirm/skip action buttons. Follows suggest-never-auto-apply pattern
- D-13: Rescheduling happens via natural language in hub chat. User says things like "I lost 2 hours" or "prioritize auth instead" and bot suggests an updated plan (not auto-applied)

### Claude's Discretion
- Calendar popover component implementation details (radix popover, date-fns formatting)
- Exact quick-select shortcut labels and date calculations
- Briefing prompt engineering for daily plan generation
- How the scheduling algorithm ranks tasks against available time

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DUE-01 | User can set due dates on tasks and phases via a date picker | DatePickerPopover wrapping existing shadcn Calendar + Popover in TaskDetail scheduling section. Task model already has `dueDate` field with full CRUD |
| DUE-02 | Overdue and upcoming tasks are visually indicated in the goals tree and task views | Three-tier urgency in SchedulingBadges (warning variant) + ProgressDot (overdue status) + OverdueCountBadge on GoalsTreeNode |
| DUE-03 | Backlog items (999.x phases) are exempt from due date enforcement and alerts | Filter by `phase.sortOrder >= 999` in urgency helpers and GoalsTreeNode count logic |
| PLAN-01 | Bot presents a prioritized daily plan on hub load: tasks ranked by importance against available time | Extend manifest builder to include today's schedule blocks from `generate_schedule`, modify briefing system prompt to narrate "Today's Plan" |
| PLAN-02 | Bot asks "What should we work on today?" when there's more work than time | Briefing prompt engineering: include total task minutes vs available minutes in manifest, prompt instruction to ask when overflow detected |
| PLAN-03 | Bot suggests due dates for tasks without them through conversation | DueDateSuggestion component with confirm/skip buttons, rendered in BriefingContent when bot output contains structured suggestion markers |
| PLAN-04 | Bot can reschedule work when the user reports lost time or new priorities | HubChat system prompt extended with rescheduling instructions. Bot calls `generate_schedule` with adjusted parameters, narrates result. Never auto-applies |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-day-picker | 9.14.0 | Calendar grid inside date picker popover | Already installed via shadcn Calendar component. v9 API with DayPicker |
| date-fns | 4.1.0 | Date arithmetic for quick-select shortcuts and urgency calculations | v1.5 research decision: only new npm dep. Lightweight, tree-shakeable, no moment.js baggage |
| @radix-ui/react-popover | (already installed) | Popover primitive for date picker | Already used by shadcn Popover component |
| zustand | 5.0.11 | State management | Already in use. No new store needed -- due dates use existing task CRUD |
| class-variance-authority | (already installed) | Badge variant system | Badge component already uses CVA for variants |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chrono (Rust) | (already installed) | Date parsing and arithmetic in scheduling engine | Already used in assignment.rs for due date scoring |
| lucide-react | (already installed) | CalendarDays icon for date picker trigger | Already imported in SchedulingBadges |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| date-fns | Native Date/Intl APIs | Existing code already uses Intl.DateTimeFormat for formatting; date-fns adds addDays/startOfWeek/isBefore which are error-prone to hand-roll |
| react-day-picker | Custom calendar grid | Already installed and working via shadcn. Zero benefit from custom implementation |

**Installation:**
```bash
npm install date-fns@^4.1.0
```

**Version verification:** react-day-picker 9.14.0 confirmed in package.json. date-fns 4.1.0 confirmed via `npm view`. No Rust crates needed (chrono already present).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── shared/
│   │   ├── SchedulingBadges.tsx          # MODIFY: add warning variant + isDueSoon logic
│   │   └── DatePickerPopover.tsx         # NEW: Popover + Calendar + quick-select
│   ├── hub/
│   │   ├── ProgressDot.tsx              # MODIFY: add "overdue" status
│   │   ├── GoalsTreeNode.tsx            # MODIFY: add overdue count badge + overdue dot
│   │   ├── BriefingContent.tsx          # MODIFY: render DailyPlanSection after markdown
│   │   ├── BriefingPanel.tsx            # MODIFY: pass schedule data to briefing
│   │   ├── DailyPlanSection.tsx         # NEW: "Today's Plan" with task rows
│   │   ├── DailyPlanTaskRow.tsx         # NEW: single task row
│   │   ├── OutOfTimeDivider.tsx         # NEW: separator between fits/doesn't fit
│   │   └── DueDateSuggestion.tsx        # NEW: confirm/skip card for bot suggestions
│   ├── center/
│   │   └── TaskDetail.tsx               # MODIFY: add DatePickerPopover in scheduling section
│   └── ui/
│       └── badge.tsx                    # MODIFY: add warning variant to CVA config
├── lib/
│   └── date-utils.ts                   # NEW: isOverdue, isDueSoon, isBacklogPhase helpers
└── stores/
    └── (no new stores)
```

```
src-tauri/src/
├── commands/
│   └── manifest_commands.rs            # MODIFY: extend manifest with today's schedule data
├── models/
│   └── manifest.rs                     # MODIFY: build_manifest_string includes task-level due date info
└── scheduling/
    └── (no changes needed)
```

### Pattern 1: Urgency Helper Functions (Pure Utilities)

**What:** Extract date urgency logic into pure functions that both SchedulingBadges and GoalsTreeNode can share.
**When to use:** Any component that needs overdue/due-soon determination.
**Example:**
```typescript
// src/lib/date-utils.ts
import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";

const DUE_SOON_THRESHOLD = 2;

export function isOverdue(dueDate: string): boolean {
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(dueDate));
  return due < today;
}

export function isDueSoon(dueDate: string): boolean {
  const today = startOfDay(new Date());
  const due = startOfDay(parseISO(dueDate));
  const diff = differenceInCalendarDays(due, today);
  return diff >= 0 && diff <= DUE_SOON_THRESHOLD;
}

export function isBacklogPhase(sortOrder: number): boolean {
  return sortOrder >= 999;
}
```

### Pattern 2: Overdue Count Bubble-Up (Derived State)

**What:** Compute overdue task counts per phase/project by filtering tasks, not by storing counts.
**When to use:** GoalsTreeNode rendering.
**Example:**
```typescript
// Inside GoalsTreeNode -- compute, don't store
function countOverdueTasks(
  tasks: Task[],
  phaseId: string,
  phaseSortOrder: number
): number {
  if (isBacklogPhase(phaseSortOrder)) return 0;
  return tasks.filter(
    (t) =>
      t.phaseId === phaseId &&
      t.status !== "complete" &&
      t.dueDate != null &&
      isOverdue(t.dueDate)
  ).length;
}
```

### Pattern 3: Manifest Extension for Daily Plan (Rust-side)

**What:** The briefing LLM needs task-level data to narrate a daily plan. Extend `build_manifest_string` to include a "Today's Schedule" section with ranked tasks and time availability.
**When to use:** Every briefing generation.
**Example approach:**
```rust
// In manifest_commands.rs or manifest.rs
// After building project summaries, append today's schedule:
// 1. Call generate_schedule logic for today's date
// 2. Format as markdown section with task titles, times, durations
// 3. Include total available minutes vs total task minutes
// 4. Include list of tasks with no due date (for suggestion feature)
```

### Pattern 4: Suggest-Never-Auto-Apply (UI Pattern)

**What:** Bot suggestions (due dates, rescheduling) are presented with explicit confirm/skip actions. The bot never mutates data without user confirmation.
**When to use:** DueDateSuggestion cards, rescheduling responses.
**Example:**
```typescript
// DueDateSuggestion.tsx
// Bot output contains structured markers the frontend parses:
// e.g., "SUGGEST_DUE_DATE:{"taskId":"abc","date":"2026-04-10","taskTitle":"Fix auth"}"
// Frontend renders a card with Confirm/Skip buttons
// Confirm calls updateTask; Skip dismisses the card
```

### Anti-Patterns to Avoid
- **Storing overdue counts in state:** Derive from tasks + phases at render time. Storing creates sync bugs when tasks are updated
- **Using the LLM to calculate schedules:** The deterministic Rust scheduler ranks tasks. The LLM only narrates the result
- **Auto-applying schedule changes:** All schedule mutations require explicit user confirmation (out of scope per REQUIREMENTS.md)
- **Returning new object references from Zustand selectors:** Per project memory -- never return new object/array refs from selectors; use constants or useMemo

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar grid UI | Custom day grid | shadcn Calendar (react-day-picker) | Already installed, handles keyboard nav, a11y, locale formatting |
| Date arithmetic | Manual Date math | date-fns (addDays, startOfWeek, differenceInCalendarDays) | Timezone-safe, handles month boundaries, DST transitions |
| Popover positioning | CSS absolute positioning | Radix Popover (via shadcn) | Handles viewport edge detection, focus trapping, dismiss on outside click |
| Task priority scoring | Frontend scoring algorithm | Existing Rust `score_task` in assignment.rs | Already correct, handles overdue/due-soon/priority weighting |

**Key insight:** The scheduling engine already exists in Rust with tests. The daily plan feature is about narrating its output, not rebuilding the algorithm.

## Common Pitfalls

### Pitfall 1: Date String Parsing Timezone Shift
**What goes wrong:** `new Date("2026-04-05")` is parsed as UTC midnight, which in negative-offset timezones (Americas) becomes the previous day.
**Why it happens:** JavaScript Date constructor treats date-only strings as UTC, not local.
**How to avoid:** Always append `T00:00:00` for local parsing (existing pattern in SchedulingBadges) or use `parseISO` from date-fns which handles this correctly.
**Warning signs:** Due dates appearing one day off in the UI.

### Pitfall 2: Stale Zustand Selector References
**What goes wrong:** Components re-render every tick because selectors return new array/object references.
**Why it happens:** Selectors like `(s) => s.tasks.filter(...)` create new arrays on every state change.
**How to avoid:** Per project memory: use `useMemo` or extract stable references. For overdue counts, compute inside the component with useMemo, not in a selector that filters.
**Warning signs:** Unnecessary re-renders visible in React DevTools Profiler.

### Pitfall 3: Manifest Token Budget Overflow
**What goes wrong:** Adding task-level details to the manifest exceeds the 8000-char budget, causing truncation that loses the daily plan data.
**Why it happens:** The manifest currently only has project/phase summaries. Adding individual task details for daily planning could balloon size.
**How to avoid:** Only include today-relevant tasks in the manifest extension (not all tasks). Limit to tasks scheduled for today + overdue + due soon. Cap at 20-30 task entries.
**Warning signs:** Manifest contains `[...truncated for token budget]` marker.

### Pitfall 4: Briefing Stream vs Structured Data
**What goes wrong:** The daily plan section needs structured data (task rows with confirm/skip buttons) but the briefing is a raw markdown stream.
**Why it happens:** BriefingContent renders markdown. Structured interactive elements (DueDateSuggestion cards) cannot be embedded in markdown.
**How to avoid:** Two approaches: (a) Parse the streamed markdown for special markers and render React components inline, or (b) separate the daily plan data from the briefing stream -- fetch schedule blocks directly via `invoke("generate_schedule")` and render DailyPlanSection as a React component below the markdown briefing. Option (b) is cleaner and more reliable.
**Warning signs:** Trying to embed interactive buttons inside ReactMarkdown output.

### Pitfall 5: Backlog Exemption Leaking
**What goes wrong:** Overdue badges appear on backlog tasks despite the exemption rule.
**Why it happens:** Multiple components (SchedulingBadges, GoalsTreeNode, ProgressDot) each need the exemption check. Missing it in one place creates inconsistency.
**How to avoid:** Centralize the check: `isBacklogPhase(sortOrder)` utility called everywhere. The component receiving the task needs the phase's sortOrder to check -- ensure it's passed through props or derived from store.
**Warning signs:** Red badges appearing on 999.x phase tasks.

## Code Examples

### Badge Warning Variant
```typescript
// src/components/ui/badge.tsx -- add to CVA variants
warning:
  "border-transparent bg-[oklch(0.75_0.15_85/0.2)] text-[oklch(0.75_0.15_85)] shadow hover:bg-[oklch(0.75_0.15_85/0.3)]",
```

### DatePickerPopover Structure
```typescript
// src/components/shared/DatePickerPopover.tsx
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { addDays, startOfWeek, addMonths, addWeeks } from "date-fns";

interface DatePickerPopoverProps {
  value: string | null;
  onChange: (date: string | null) => void;
}

// Quick-select shortcuts above Calendar grid
// Calendar in single-select mode
// "Clear" link at bottom to remove due date
// Popover closes on selection
```

### ProgressDot Overdue Extension
```typescript
// Extend ProgressStatus type
export type ProgressStatus = "complete" | "in-progress" | "not-started" | "overdue";

// Add to className map:
"bg-destructive-foreground": status === "overdue",
```

### SchedulingBadges Three-Tier Logic
```typescript
// Replace single isOverdue check with three-tier:
function getUrgencyVariant(
  dueDate: string,
  isBacklog: boolean
): "destructive" | "warning" | "outline" {
  if (isBacklog) return "outline";
  if (isOverdue(dueDate)) return "destructive";
  if (isDueSoon(dueDate)) return "warning";
  return "outline";
}
```

### Daily Plan: Hybrid Approach (Recommended)
```typescript
// BriefingPanel.tsx -- fetch schedule blocks separately from briefing stream
// 1. invoke("generate_schedule", { date: todayStr }) for structured task data
// 2. Render DailyPlanSection with real ScheduleBlock data (not LLM-generated)
// 3. LLM briefing narrates the plan contextually but doesn't own the data
// 4. DueDateSuggestion cards rendered from LLM output markers
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SchedulingBadges: binary overdue/normal | Three-tier: overdue/due-soon/normal | This phase | Badge component needs warning variant |
| ProgressDot: 3 statuses | ProgressDot: 4 statuses (+ overdue) | This phase | GoalsTreeNode derives overdue from child tasks |
| Manifest: project/phase summaries only | Manifest: includes today's scheduled tasks | This phase | Enables LLM to narrate daily plan |
| Briefing: pure markdown stream | Briefing: markdown + structured daily plan section | This phase | DailyPlanSection rendered as React components below markdown |

## Open Questions

1. **LLM output parsing for due date suggestions**
   - What we know: Bot needs to suggest due dates with confirm/skip buttons (D-12)
   - What's unclear: How to reliably detect when the LLM is suggesting a due date vs. mentioning one conversationally. Structured markers in LLM output (like the existing ACTION: pattern in HubChat) or a separate structured response field?
   - Recommendation: Use the same ACTION: pattern already established in HubChat. Define a `suggest_due_date` tool that the LLM can call, which renders a DueDateSuggestion card. This is consistent with the existing architecture.

2. **Rescheduling via chat (PLAN-04) -- parameter passing**
   - What we know: User says "I lost 2 hours" and bot suggests updated plan
   - What's unclear: How the bot translates "lost 2 hours" into adjusted schedule parameters. The Rust `generate_schedule` takes a date, not a time range reduction.
   - Recommendation: Add an optional `available_override_minutes` parameter to `generate_schedule` (or reduce work hours end time). The HubChat system prompt instructs the bot to call a reschedule tool with the adjusted availability. The LLM handles NL parsing, the Rust algorithm handles math.

3. **Daily plan data source: manifest vs. direct invoke**
   - What we know: The briefing uses the manifest string for LLM context. The schedule blocks are structured data from `generate_schedule`.
   - What's unclear: Whether the daily plan task list should be rendered from the LLM's streamed markdown (fragile, requires parsing) or from a separate `invoke("generate_schedule")` call in the frontend (structured, reliable).
   - Recommendation: Hybrid approach. Call `generate_schedule` from the frontend to get structured ScheduleBlock data for the DailyPlanSection React component. Also include the schedule summary in the manifest so the LLM can narrate it contextually in the briefing text. This gives reliable structured UI with contextual AI narration.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (TS) | vitest 4.1.0 |
| Framework (Rust) | cargo test (built-in) |
| Config file (TS) | None detected -- vitest uses defaults via package.json |
| Quick run command (TS) | `npm test -- --run` |
| Quick run command (Rust) | `cd src-tauri && cargo test` |
| Full suite command | `npm test -- --run && cd src-tauri && cargo test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DUE-01 | Date picker sets due date on task | unit | `npm test -- src/lib/date-utils.test.ts` | Wave 0 |
| DUE-02 | Overdue/due-soon detection correct | unit | `npm test -- src/lib/date-utils.test.ts` | Wave 0 |
| DUE-02 | Badge variant selection | unit | `npm test -- src/components/shared/SchedulingBadges.test.ts` | Wave 0 |
| DUE-03 | Backlog exemption | unit | `npm test -- src/lib/date-utils.test.ts` | Wave 0 |
| PLAN-01 | Schedule blocks generated and ranked | unit | `cd src-tauri && cargo test scheduling` | Exists (assignment.rs tests) |
| PLAN-02 | Overflow detection (more work than time) | unit | `npm test -- src/lib/date-utils.test.ts` | Wave 0 |
| PLAN-03 | Due date suggestion rendering | manual-only | Visual verification | N/A (requires LLM) |
| PLAN-04 | Reschedule with adjusted time | manual-only | Visual verification | N/A (requires LLM) |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run && cd src-tauri && cargo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/date-utils.test.ts` -- covers DUE-01, DUE-02, DUE-03 (isOverdue, isDueSoon, isBacklogPhase)
- [ ] Vitest config file (may need `vitest.config.ts` if not using defaults)
- [ ] Framework install verification: `npm test -- --run` should work with existing setup

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/components/shared/SchedulingBadges.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/calendar.tsx`, `src/components/hub/GoalsTreeNode.tsx`, `src/components/hub/ProgressDot.tsx`
- Codebase inspection: `src-tauri/src/scheduling/assignment.rs` (scoring algorithm with tests)
- Codebase inspection: `src-tauri/src/commands/manifest_commands.rs` (briefing system prompt and manifest builder)
- Codebase inspection: `src/components/hub/HubChat.tsx` (ACTION: pattern for tool use)
- Codebase inspection: `src/lib/types.ts` (Task.dueDate already exists, Phase.sortOrder available)
- npm registry: date-fns 4.1.0, react-day-picker 9.14.0

### Secondary (MEDIUM confidence)
- UI-SPEC: `28-UI-SPEC.md` (design contract for colors, spacing, component inventory)
- CONTEXT.md decisions D-01 through D-13

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed or confirmed on npm. Only new dep is date-fns
- Architecture: HIGH -- extends existing patterns (Zustand stores, Tauri commands, shadcn components). No new architectural concepts
- Pitfalls: HIGH -- based on direct codebase inspection of existing date handling patterns and Zustand usage

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- no fast-moving dependencies)
