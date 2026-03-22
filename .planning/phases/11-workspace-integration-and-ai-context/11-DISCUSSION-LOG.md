# Phase 11: Workspace Integration and AI Context - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 11-workspace-integration-and-ai-context
**Areas discussed:** Workspace Assembly, Context Switching Summaries, AI Progress Suggestions, Data & State Tracking

---

## Workspace Assembly

### Layout arrangement on project select

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-switch to project view | Center shows project detail by default, Files tab available, terminal auto-opens, AI summary as top banner | ✓ |
| Side-by-side split | Center splits: left = project detail, right = file tree | |
| Tabbed workspace (keep current) | No layout change, keep existing tab system | |

**User's choice:** Auto-switch to project view
**Notes:** None

### Per-project tab memory

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, per-project tab memory | Switching back to a project restores last-active tab (Detail vs Files) | ✓ |
| No, always reset to Detail | Always land on Detail tab when switching projects | |

**User's choice:** Yes, per-project tab memory
**Notes:** None

### Per-project drawer state

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, per-project drawer state | Drawer tab and open/close state saved per project | ✓ |
| No, global drawer state only | Drawer stays however user last left it globally | |

**User's choice:** Yes, per-project drawer state
**Notes:** None

---

## Context Switching Summaries

### Summary trigger

| Option | Description | Selected |
|--------|-------------|----------|
| On project switch after idle | Summary appears after 30+ min idle from that project; first open always shows | ✓ |
| Every project switch | Always generate summary regardless of recency | |
| Manual only | User clicks "Where was I?" button explicitly | |

**User's choice:** On project switch after idle
**Notes:** None

### Summary content

| Option | Description | Selected |
|--------|-------------|----------|
| Progress + next steps | Recent completions, phase status, suggested next actions (3-5 bullets) | ✓ |
| Progress only | Just completions and phase status, no AI next-step suggestions | |
| Full context dump | Progress, next steps, file changes, terminal commands | |

**User's choice:** Progress + next steps
**Notes:** None

### Generation method

| Option | Description | Selected |
|--------|-------------|----------|
| AI-generated via provider | Send task/phase data to AI provider; fallback template if no provider | ✓ |
| Local template (no AI) | Compute from task data using templates, no provider needed | |
| Hybrid | Local template for facts, AI only for next-step suggestions | |

**User's choice:** AI-generated via provider
**Notes:** None

### Summary placement

| Option | Description | Selected |
|--------|-------------|----------|
| Top banner, above progress | Dismissible card at very top of project detail | ✓ |
| Inline between progress and phases | Card between progress bar and phase list | |
| Slide-in panel from right | Overlay from right edge, disappears after reading | |

**User's choice:** Top banner, above progress
**Notes:** None

---

## AI Progress Suggestions

### Suggestion types

| Option | Description | Selected |
|--------|-------------|----------|
| Task-focused suggestions | Next tasks, stalled phases, untouched task reminders, phase completion nudges | ✓ |
| Broader project intelligence | Above plus duplicate detection, phase reordering, task size flags | |
| Minimal — next task only | Just highlight the single most important next task | |

**User's choice:** Task-focused suggestions
**Notes:** None

### Suggestion presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Suggestion cards below summary | Dismissible cards in project detail with action + dismiss buttons | ✓ |
| Inline badges on phases/tasks | Small badges/annotations on relevant rows | |
| Notification-style toast | Dismissible toast notifications | |

**User's choice:** Suggestion cards below summary
**Notes:** None

### Refresh frequency

| Option | Description | Selected |
|--------|-------------|----------|
| On project switch only | Generated alongside "where was I?" summary, no background polling | ✓ |
| On task completion | Refresh when tasks completed | |
| Periodic background | Regenerate every N minutes | |

**User's choice:** On project switch only
**Notes:** None

### On-demand mode behavior

| Option | Description | Selected |
|--------|-------------|----------|
| No AI features — clean project view | No auto-summary, no suggestions. Just phases and progress. | ✓ |
| Summary only, no suggestions | Show "where was I?" but no proactive suggestion cards | |
| Everything still shows | AI features appear regardless of mode | |

**User's choice:** No AI features — clean project view
**Notes:** None

---

## Data & State Tracking

### Data inputs for AI context

| Option | Description | Selected |
|--------|-------------|----------|
| Task activity only | Task completions, status changes, creation dates, phase progress from existing DB | ✓ |
| Task + file activity | Task data plus file changes from watcher (Phase 8) | |
| Task + file + terminal | Everything plus terminal command history | |

**User's choice:** Task activity only
**Notes:** None

### Last-viewed timestamp tracking

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory timestamp | Zustand in-memory map, resets on restart, first open always gets summary | ✓ |
| Persisted timestamp in DB | Survives restarts, needs migration | |
| Persisted in localStorage | Middle ground via Zustand persist | |

**User's choice:** In-memory timestamp
**Notes:** None

---

## Claude's Discretion

- AI prompt design for context summary and suggestion generation
- Exact idle threshold (30min suggested)
- Per-project workspace state structure in Zustand
- Loading/skeleton state while AI generates
- Animation/transition for card appearance/dismissal
- Suggestion action button routing

## Deferred Ideas

None — discussion stayed within phase scope
