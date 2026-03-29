# Phase 13: Adaptive Context Builder - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes the AI context file (`context.md`) intelligent -- it adapts its content based on what the project needs right now. The context builder detects project state (no plan, planned, in-progress, complete), respects the planning tier (Quick, Medium, GSD), and enforces a soft token budget so large projects stay concise.

**This phase does NOT:**
- Add the tier selection UI (Phase 14)
- Add .planning/ sync (Phase 15)
- Change the CLI tool setting (Phase 12)

</domain>

<decisions>
## Implementation Decisions

### State Detection
- **D-01:** State is derived from task data, no new database fields needed:
  - `NO_PLAN` = no tasks and no phases
  - `PLANNED` = has tasks, none started
  - `IN_PROGRESS` = has in-progress tasks
  - `COMPLETE` = all tasks complete
- **D-02:** Four states only -- no intermediate states like "wrapping up". IN_PROGRESS covers everything between first task started and all complete.
- **D-03:** COMPLETE state shows a completion summary with a nudge (suggest marking project complete or adding follow-up work).

### Token Budget
- **D-04:** Phase-level rollup strategy: completed phases collapse to one-line summaries ("Phase 1: Setup [5/5 complete]"). Only the current/next active phase shows individual tasks.
- **D-05:** Soft target of ~2000 tokens. If rollup still exceeds it, progressively collapse more (e.g., only show the in-progress phase). No hard character cutoff.
- **D-06:** Active phase tasks show titles only (no descriptions). Keeps context tight -- the AI can always ask for details.

### Tier-Specific Content
- **D-07:** Same file structure across all tiers, but the Instructions section is swapped per tier:
  - Quick: "You have a simple task list. Check off items as you complete them."
  - Medium: "Review the phases below. Focus on the current phase. Ask if you need clarification."
  - GSD: "This project uses GSD workflow. Run /gsd:progress to see status. Run /gsd:next to continue."
- **D-08:** NO_PLAN state is tier-aware:
  - Quick + NO_PLAN: "Describe what you need done. I'll create a simple task list."
  - Medium + NO_PLAN: "Let's break this into phases. What are the major deliverables?"
  - GSD + NO_PLAN: "This project uses GSD workflow. Run /gsd:new-project to begin."
- **D-09:** Default tier when none is set: **Quick**. Most lightweight, gets out of the way.
- **D-10:** GSD tier does NOT include the plan-output.json output contract. GSD handles its own planning via .planning/. The output contract is for Quick/Medium tiers only.

### Content Structure
- **D-11:** Three-section structure: (1) Header with name/description/progress/tier/state, (2) Instructions swapped by state+tier, (3) Task/phase data formatted per token budget rules.
- **D-12:** "What Needs Attention" section kept (up to 5 items, per Phase 11 decision). Will eventually become its own feature.
- **D-13:** Output contract section only rendered for Quick/Medium tiers.

### Claude's Discretion
- Project description handling: Claude decides whether to pass through verbatim or summarize if long.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Context Generation (current implementation)
- `src-tauri/src/models/onboarding.rs` -- Current `generate_context_file_content()` with `ProjectContextData` struct, empty/populated templates, status icons, attention section
- `src-tauri/src/commands/onboarding_commands.rs` lines 181-291 -- `generate_context_file` command that builds context data from DB and writes to `.element/context.md`

### Integration Point
- `src/components/center/OpenAiButton.tsx` -- Calls `api.generateContextFile(projectId)` then passes path to terminal. This is the trigger for context generation.

### Requirements
- `.planning/REQUIREMENTS.md` -- CTX-01, CTX-02, CTX-04 requirements for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProjectContextData` struct in `onboarding.rs` -- already has project name, description, phases with tasks, completion counts. Needs tier field added.
- `status_icon()` function -- maps task status to checkbox icons. Reuse as-is.
- `output_contract_section()` function -- generates the plan-output.json contract. Conditionally include for Quick/Medium only.

### Established Patterns
- Context is generated server-side in Rust, written to `.element/context.md` on disk
- Data comes from SQLite via `Database` struct (projects, phases, tasks)
- String building via `push_str` / `format!` in Rust

### Integration Points
- `generate_context_file` Tauri command is the entry point -- called by `OpenAiButton`
- Phase 12 will add `planning_tier` field to projects -- this phase reads it
- Phase 12 will add `source` tag to phases/tasks -- this phase can ignore it (not relevant to context generation)

</code_context>

<specifics>
## Specific Ideas

- The Attention section should be preserved and will eventually become its own standalone feature
- Quick tier default ensures the app works gracefully before Phase 14 adds tier selection UI

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 13-adaptive-context-builder*
*Context gathered: 2026-03-26*
