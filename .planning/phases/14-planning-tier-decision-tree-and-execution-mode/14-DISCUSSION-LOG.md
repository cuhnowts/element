# Phase 14: Planning Tier Decision Tree and Execution Mode - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 14-planning-tier-decision-tree-and-execution-mode
**Areas discussed:** Tier selection dialog, Quick tier task flow, "What's next?" display, GSD tier launch behavior

---

## Tier Selection Dialog

### Dialog presentation style

| Option | Description | Selected |
|--------|-------------|----------|
| Cards with icons | Three cards side-by-side with icon, name, description, example use case | |
| Simple radio list | Compact radio-button list with one-line descriptions | ✓ |
| Stepped wizard | 2-3 questions to auto-recommend a tier | |

**User's choice:** Simple radio list
**Notes:** None

### When the dialog appears

| Option | Description | Selected |
|--------|-------------|----------|
| First "Open AI" only | Show only when no plan and no stored tier. Subsequent clicks skip. | ✓ |
| Every "Open AI" click | Always show, pre-selecting last-used tier | |
| Project settings only | Tier set in settings, "Open AI" goes straight to terminal | |

**User's choice:** First "Open AI" only
**Notes:** None

### Dialog scope (what it collects)

| Option | Description | Selected |
|--------|-------------|----------|
| Tier + description | Radio list + text area for brief description | ✓ |
| Tier only | Just pick tier, description entered in terminal | |
| You decide | Claude chooses | |

**User's choice:** Tier + description
**Notes:** None

### Changing tier later

| Option | Description | Selected |
|--------|-------------|----------|
| Re-plan button in project detail | "Change plan" action in header, re-opens dialog with warning | ✓ |
| No tier change | Locked once set, delete tasks to restart | |
| You decide | Claude chooses | |

**User's choice:** Re-plan button in project detail
**Notes:** None

---

## Quick Tier Task Flow

### How Quick tier generates and saves tasks

| Option | Description | Selected |
|--------|-------------|----------|
| AI generates in terminal, save via plan watcher | Reuses existing plan watcher + AiPlanReview infrastructure | ✓ |
| AI generates inline, skip terminal | Direct AI API call from Rust backend | |
| User types tasks manually | Multi-line input, no AI involvement | |

**User's choice:** AI generates in terminal, save via plan watcher
**Notes:** None

### Task structure for Quick tier

| Option | Description | Selected |
|--------|-------------|----------|
| Flat only, no phases | Always flat task list, differentiator from Medium | ✓ |
| AI decides based on count | >10 tasks = suggest grouping | |
| You decide | Claude chooses | |

**User's choice:** Flat only, no phases
**Notes:** None

### Post-confirmation behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Stay open for execution | Terminal stays, context updates to "What's next?" mode | ✓ |
| Close terminal | Terminal closes, user re-opens when ready | |
| You decide | Claude chooses | |

**User's choice:** Stay open for execution
**Notes:** None

---

## "What's Next?" Display

### Where "What's next?" lives

| Option | Description | Selected |
|--------|-------------|----------|
| Context file only | Smarter context file with progress, blockers, next action. No new UI. | ✓ |
| Both context file + UI widget | Context file for AI + "Next up" widget in project detail | |
| UI widget only | Dedicated panel in project detail view | |

**User's choice:** Context file only
**Notes:** None

### Context file regeneration timing

**User clarification:** The context file is a one-time seed — project brief + status snapshot. No mid-session regeneration needed. The AI already has the context in its conversation window. Fresh snapshot happens naturally on next "Open AI" click.

### Next-action logic

| Option | Description | Selected |
|--------|-------------|----------|
| Task ordering + status | Sort order = priority. First incomplete in earliest phase = next. | ✓ |
| Explicit task dependencies | Add depends_on field, build dependency graph | |
| AI figures it out | Dump all tasks, let AI infer | |
| You decide | Claude chooses | |

**User's choice:** Task ordering + status
**Notes:** None

### AI guidance level in context file

| Option | Description | Selected |
|--------|-------------|----------|
| State only, AI figures it out | Progress + attention + next task, no instructions | |
| State + light guidance | Progress + suggested next + brief workflow orientation | ✓ |
| State + detailed instructions | Explicit step-by-step with completion reporting | |

**User's choice:** State + light guidance
**Notes:** None

---

## GSD Tier Launch Behavior

### What happens after selecting GSD

| Option | Description | Selected |
|--------|-------------|----------|
| Launch terminal with GSD instructions | Context file tells AI to run GSD commands. Element gets out of the way. | ✓ |
| Launch terminal + auto-run GSD command | Terminal auto-executes /gsd:new-project | |
| Show GSD guidance in UI first | Explainer before launching terminal | |

**User's choice:** Launch terminal with GSD instructions
**Notes:** None

### .planning/ detection in Phase 14

| Option | Description | Selected |
|--------|-------------|----------|
| Leave it to Phase 15 | No file watching or sync. Phase 15 handles .planning/ sync. | ✓ |
| Basic detection now | Watch for ROADMAP.md creation, show toast | |
| You decide | Claude chooses | |

**User's choice:** Leave it to Phase 15
**Notes:** None

### Medium tier flow

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing flow | Same plan watcher + AiPlanReview. Context instructs AI to ask questions, output plan-output.json. | ✓ |
| New questioning UI | Custom Q&A interface in UI | |

**User's choice:** Reuse existing flow
**Notes:** None

---

## Claude's Discretion

- Radio list styling and layout within Dialog
- Exact wording of tier descriptions and context file templates
- "Change plan" warning dialog wording
- Error handling for edge cases

## Deferred Ideas

None — discussion stayed within phase scope
