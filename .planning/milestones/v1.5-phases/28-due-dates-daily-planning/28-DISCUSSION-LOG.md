# Phase 28: Due Dates & Daily Planning - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 28-due-dates-daily-planning
**Areas discussed:** Date picker & due date UX, Overdue visual treatment, Backlog exemption rules, Daily planning conversation

---

## Date Picker & Due Date UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in task detail | Click due date area in TaskDetail/TaskMetadata to open calendar popover | ✓ |
| Popover from badge | Click existing SchedulingBadges due date badge to open calendar | |
| Both places | Calendar popover from both task detail and badge | |

**User's choice:** Inline in task detail
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Tasks only | Phase model unchanged, due dates on tasks only | ✓ |
| Tasks and phases | Add due_date to Phase model too | |
| You decide | Claude picks | |

**User's choice:** Tasks only
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| "+ Add due date" link | Subtle clickable text in metadata area | ✓ |
| Always show date field | Empty date field with placeholder | |
| You decide | Claude picks | |

**User's choice:** "+ Add due date" link
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Calendar with shortcuts | Calendar popover with preset buttons (Today, Tomorrow, etc.) | ✓ |
| Plain calendar only | Standard date picker calendar grid | |
| You decide | Claude picks | |

**User's choice:** Calendar with shortcuts
**Notes:** None

---

## Overdue Visual Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Red dot + count badge | ProgressDot turns red, count badge on parent nodes | ✓ |
| Subtle text color only | Overdue task names turn red/orange | |
| Red dot + inline date | Red ProgressDot plus overdue date inline | |

**User's choice:** Red dot + count badge
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Three tiers: overdue / soon / normal | Red for overdue, amber for due-soon, normal otherwise | ✓ |
| Two tiers: overdue / normal | Only flag once past due | |
| You decide | Claude picks | |

**User's choice:** Three tiers
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| 2 days | Tight warning window | ✓ |
| 3 days | Balanced heads-up | |
| You decide | Claude picks | |

**User's choice:** 2 days
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Extend badges with amber | Add amber/warning variant to SchedulingBadges | ✓ |
| Goals tree only | Only goals tree gets three tiers | |
| You decide | Claude picks | |

**User's choice:** Extend badges with amber
**Notes:** None

---

## Backlog Exemption Rules

| Option | Description | Selected |
|--------|-------------|----------|
| Sort order >= 999 | Use existing Phase.sortOrder field | ✓ |
| Explicit "is_backlog" flag | Add boolean column to phases table | |
| Phase name prefix | Check for "BACKLOG" in name | |

**User's choice:** Sort order >= 999
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Allow it, suppress warnings | Due dates stored but no visual indicators | ✓ |
| Block it entirely | Prevent setting due dates on backlog tasks | |
| You decide | Claude picks | |

**User's choice:** Allow it, suppress warnings
**Notes:** None

---

## Daily Planning Conversation

| Option | Description | Selected |
|--------|-------------|----------|
| Extend the briefing | Add "Today's Plan" section to existing BriefingPanel | ✓ |
| Separate bot skill | New "/plan-day" skill in hub chat | |
| Both | Briefing summary + chat skill | |

**User's choice:** Extend the briefing
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Natural language in hub chat | User types intent, bot understands and suggests updated plan | ✓ |
| Structured command | Specific "/replan" command with flags | |
| You decide | Claude picks | |

**User's choice:** Natural language in hub chat
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in briefing with confirm buttons | Suggest dates with accept/dismiss actions | ✓ |
| Conversational in chat only | Pure text interaction in chat | |
| You decide | Claude picks | |

**User's choice:** Inline in briefing with confirm buttons
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Proactive in briefing | Shows what won't fit, asks "What should we work on today?" | ✓ |
| Only when user asks | Shows plan but doesn't prompt | |
| You decide | Claude picks | |

**User's choice:** Proactive in briefing
**Notes:** None

---

## Claude's Discretion

- Calendar popover component implementation details
- Quick-select shortcut labels and date calculations
- Briefing prompt engineering for daily plan generation
- How scheduling algorithm ranks tasks against available time

## Deferred Ideas

None -- discussion stayed within phase scope
