# Phase 14: Planning Tier Decision Tree and Execution Mode - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Users get the right level of AI planning for their project — from a quick todo list to full GSD breakdown — and planned projects get "what's next?" execution guidance. This phase adds a tier selection dialog to the "Open AI" flow, implements Quick/Medium/GSD planning paths, and enhances the context file with execution-mode guidance.

</domain>

<decisions>
## Implementation Decisions

### Tier Selection Dialog
- **D-01:** Simple radio list inside a Dialog (not cards, not wizard). Three options: Quick, Medium, GSD — each with a one-line description.
- **D-02:** Dialog appears only on first "Open AI" click when project has no plan and no stored tier. After choosing, tier is saved per-project and subsequent clicks skip the dialog.
- **D-03:** Dialog collects both tier selection AND a brief project description (text area: "What are you building?"). Quick tier needs this to generate tasks; Medium uses it to start the conversation.
- **D-04:** Users can change tier later via a "Change plan" button in the project detail header. Re-opens the tier dialog. Warn before overwriting existing tasks/phases.

### Quick Tier Flow
- **D-05:** Quick tier launches the terminal with a context file instructing the AI to generate a flat task list as plan-output.json. Reuses existing plan watcher + AiPlanReview infrastructure.
- **D-06:** Quick tier always produces flat tasks — no phases. This is the key differentiator from Medium tier.
- **D-07:** After tasks are confirmed in AiPlanReview, terminal stays open. Context file updates to "What's next?" execution mode so user can start working immediately.

### Medium Tier Flow
- **D-08:** Medium tier reuses the existing plan watcher + AiPlanReview flow entirely. Context file instructs AI to ask 3-5 focused questions, then output phases + tasks as plan-output.json. No new infrastructure needed.

### GSD Tier Flow
- **D-09:** GSD tier launches the terminal with context file containing GSD instructions (e.g., "Run /gsd:new-project to start"). Element gets out of the way — no file watching or sync in this phase.
- **D-10:** No .planning/ detection or sync in Phase 14. That's Phase 15's responsibility. Clean separation of concerns.

### "What's Next?" Execution Mode
- **D-11:** Context file is a one-time seed — project brief + status snapshot — generated on "Open AI" click. No mid-session regeneration. Fresh snapshot happens naturally on next "Open AI" click.
- **D-12:** "What's next?" lives in the context file only. No new UI widget needed. The context file shows progress, attention items, and suggested next task.
- **D-13:** Next-action logic uses task ordering + status. First incomplete task in earliest phase = suggested next. "Blocker" = phase with mixed complete/incomplete progress. No explicit dependency graph.
- **D-14:** Context file includes state + light guidance. Progress summary, suggested next task, and a brief "Workflow" section ("Work on the suggested task. When complete, the user will mark it done in Element."). Not prescriptive, just orientation.

### Claude's Discretion
- Implementation details of the radio list styling and layout within the Dialog
- Exact wording of tier descriptions and context file templates
- How the "Change plan" warning dialog is worded
- Error handling for edge cases (e.g., plan watcher fails, AI doesn't output expected format)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Infrastructure
- `src/components/center/OpenAiButton.tsx` — Current "Open AI" button implementation (entry point to modify)
- `src/components/center/AiPlanReview.tsx` — Existing plan review UI with DnD reorder (reuse for Quick + Medium tiers)
- `src/components/center/ProjectDetail.tsx` — Project detail view (add tier badge + "Change plan" button here)
- `src-tauri/src/models/onboarding.rs` — Context file generation logic (`generate_context_file_content`)
- `src-tauri/src/commands/onboarding_commands.rs` — `generate_context_file` command + plan watcher

### UI Components
- `src/components/ui/dialog.tsx` — Dialog component for tier selection
- `src/components/ui/progress.tsx` — Progress component (for execution mode display)

### Requirements
- `.planning/REQUIREMENTS.md` — PLAN-01 through PLAN-04, CTX-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **OpenAiButton** (`OpenAiButton.tsx`): Entry point — currently launches claude with context file. Needs tier dialog gate added before launch.
- **AiPlanReview** (`AiPlanReview.tsx`): Plan review with DnD, accordion phases, inline editing. Reuse for both Quick (flat tasks) and Medium (phases + tasks) tier output.
- **Plan watcher** (`startPlanWatcher`/`stopPlanWatcher`): Watches for plan-output.json in project directory. Already wired to emit events for AiPlanReview.
- **Dialog component** (`dialog.tsx`): shadcn/ui Dialog with Header, Title, Description, Footer. Use for tier selection dialog.
- **generate_context_file_content** (`onboarding.rs`): Already branches on empty vs non-empty project. Extend with tier-aware content and execution mode.

### Established Patterns
- **Context file flow**: OpenAiButton → generate_context_file (Rust) → writes .element/context.md → passed as arg to CLI tool
- **Plan output flow**: AI writes plan-output.json → plan watcher detects → emits Tauri event → AiPlanReview renders
- **State management**: Zustand stores (useStore, useWorkspaceStore) for all UI state
- **Tauri commands**: All backend operations exposed as `#[tauri::command]` functions, called via `api.*` wrapper in `src/lib/tauri.ts`

### Integration Points
- **OpenAiButton.tsx:handleOpenAi** — Insert tier dialog check before terminal launch
- **ProjectDetail.tsx header** — Add tier badge and "Change plan" button
- **onboarding.rs:generate_context_file_content** — Extend with tier-aware templates and execution mode
- **Database schema** — Add `planning_tier` column to projects table (Phase 12 adds this via PLAN-05)

</code_context>

<specifics>
## Specific Ideas

- Tier dialog mockup confirmed: radio list (Quick/Medium/GSD) + description textarea + "Start Planning" button
- Quick tier = flat todo list, no phases — this is THE differentiator from Medium
- Medium reuses existing AiPlanReview flow entirely — no new infrastructure
- GSD tier just launches terminal with instructions, no detection/sync (Phase 15 handles that)
- Context file is a one-time seed, not a live document — no regeneration mid-session

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-planning-tier-decision-tree-and-execution-mode*
*Context gathered: 2026-03-26*
