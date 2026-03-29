# Phase 13: Adaptive Context Builder - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 13-adaptive-context-builder
**Areas discussed:** State detection logic, Token budget strategy, Tier-specific content, Content structure

---

## State Detection Logic

| Option | Description | Selected |
|--------|-------------|----------|
| Task-status driven | Derive state from task data: no tasks = NO_PLAN, has tasks but none started = PLANNED, has in-progress = IN_PROGRESS, all complete = COMPLETE | ✓ |
| Explicit status field | Add a project_status column to the database | |
| Hybrid | Derive from tasks with manual override | |

**User's choice:** Task-status driven
**Notes:** Simple, no new fields needed

---

| Option | Description | Selected |
|--------|-------------|----------|
| No -- keep it simple | Four states is enough. IN_PROGRESS covers everything. | ✓ |
| Yes -- add WRAPPING_UP | When >80% tasks complete, switch to focused finish context | |

**User's choice:** No -- keep it simple
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Celebration + nudge | Show completion summary and suggest next steps | ✓ |
| Minimal acknowledgment | Just state 'all tasks complete' | |
| You decide | Claude's discretion | |

**User's choice:** Celebration + nudge
**Notes:** None

---

## Token Budget Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Phase-level rollup | Completed phases become one-line summaries, only active phase shows tasks | ✓ |
| Active-tasks-only window | Show only in-progress and next-up tasks, everything else gets counts | |
| Smart truncation | Keep full structure but truncate descriptions and cap at limit | |

**User's choice:** Phase-level rollup
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Soft target | Aim for ~2000 tokens, progressively collapse if exceeded | ✓ |
| Hard character cap | Strict character limit with truncation | |
| You decide | Claude's discretion | |

**User's choice:** Soft target
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Titles + short descriptions | Include task descriptions truncated to ~100 chars | |
| Titles only | Just task titles with status icons | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Titles only
**Notes:** None

---

## Tier-Specific Content

| Option | Description | Selected |
|--------|-------------|----------|
| Different instruction blocks | Same structure, swap instruction section per tier | ✓ |
| Fully separate templates | Each tier gets its own complete template | |
| Parameterized single template | One template with conditional sections | |

**User's choice:** Different instruction blocks
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes -- tier-aware onboarding | Each tier gets different onboarding prompts in NO_PLAN state | ✓ |
| No -- generic until planned | One onboarding prompt for all tiers | |
| You decide | Claude's discretion | |

**User's choice:** Yes -- tier-aware onboarding
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Default to Medium | Medium is most general, safe default | |
| Default to Quick | Most lightweight, gets out of the way | ✓ |
| Use current behavior | Keep existing templates when no tier set | |

**User's choice:** Default to Quick
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| GSD commands only | GSD handles its own planning via .planning/ | ✓ |
| Include both | Keep output contract alongside GSD commands | |
| You decide | Claude's discretion | |

**User's choice:** GSD commands only
**Notes:** None

---

## Content Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Header + Instructions + Data | Three sections: header, mode-specific instructions, task data | ✓ |
| Flat adaptive markdown | Content flows based on relevance, no rigid sections | |
| Sectioned with optional blocks | All possible sections, render only what applies | |

**User's choice:** Header + Instructions + Data
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| As-is | Pass through project description verbatim | |
| Summarize if long | Truncate descriptions >200 chars | |
| You decide | Claude's discretion | ✓ |

**User's choice:** You decide
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it | Useful for all tiers, stays at 5-item cap | ✓ |
| Merge into Instructions | Attention is redundant with in-progress instructions | |
| You decide | Claude's discretion | |

**User's choice:** Keep it
**Notes:** "This will eventually be its own feature"

---

| Option | Description | Selected |
|--------|-------------|----------|
| New context.rs module | Create src-tauri/src/models/context.rs, clean separation from onboarding | ✓ |
| Keep in onboarding.rs | Refactor in-place | |
| You decide | Claude's discretion | |

**User's choice:** New context.rs module
**Notes:** None

---

## Claude's Discretion

- Project description handling: verbatim or summarize if long

## Deferred Ideas

None -- discussion stayed within phase scope
