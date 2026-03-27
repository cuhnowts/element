# Phase 13: Adaptive Context Builder - Research

**Researched:** 2026-03-27
**Domain:** Rust backend -- context file generation logic (no frontend changes)
**Confidence:** HIGH

## Summary

Phase 13 refactors the existing `generate_context_file_content()` function in `src-tauri/src/models/onboarding.rs` to produce state-aware, tier-aware, token-budget-respecting context files. The current implementation has two modes (empty project vs populated project) with a single template each. The new implementation needs four project states (NO_PLAN, PLANNED, IN_PROGRESS, COMPLETE) crossed with three planning tiers (quick, medium, full), producing a 4x3 instruction matrix plus token budget rollup logic.

All work is in two Rust files: the model file (`onboarding.rs`) for content generation logic and the command file (`onboarding_commands.rs`) for wiring the new tier data into the context builder. No React components change. The existing `OpenAiButton` trigger path is untouched.

**Primary recommendation:** Refactor `generate_context_file_content()` into a pipeline: detect state -> resolve tier -> build header -> select instructions -> format task data with budget rollup -> conditionally append output contract.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** State derived from task data, no new DB fields: NO_PLAN (no tasks/phases), PLANNED (has tasks, none started), IN_PROGRESS (has in-progress tasks), COMPLETE (all tasks complete)
- **D-02:** Four states only -- no intermediate states
- **D-03:** COMPLETE state shows completion summary with nudge
- **D-04:** Phase-level rollup: completed phases collapse to one-line summaries, only current/next active phase shows tasks
- **D-05:** Soft ~2000 token target. Progressive collapse if exceeded (show only in-progress phase). No hard character cutoff
- **D-06:** Active phase tasks show titles only (no descriptions)
- **D-07:** Same file structure across tiers, Instructions section swapped per tier (Quick/Medium/GSD instruction text defined)
- **D-08:** NO_PLAN state is tier-aware (Quick/Medium/GSD have different prompts)
- **D-09:** Default tier when none set: Quick
- **D-10:** GSD tier does NOT include plan-output.json contract. Output contract is Quick/Medium only
- **D-11:** Three-section structure: Header (name/description/progress/tier/state), Instructions (state+tier), Task/phase data (token budget rules)
- **D-12:** "What Needs Attention" section kept (up to 5 items)
- **D-13:** Output contract section only rendered for Quick/Medium tiers

### Claude's Discretion
- Project description handling: pass through verbatim or summarize if long

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CTX-01 | Context file adapts content based on project state (no plan, planned, in-progress, complete) | State detection enum (D-01/D-02), instruction matrix (D-07/D-08), three-section structure (D-11) |
| CTX-02 | Context file respects token budget -- large projects summarize instead of listing every task | Phase rollup strategy (D-04), soft ~2000 token target (D-05), titles only (D-06) |
| CTX-04 | Planning mode context includes tier-appropriate instructions | Tier-aware instruction text (D-07/D-08), default Quick tier (D-09), conditional output contract (D-10/D-13) |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Rust (edition 2021) | stable | Implementation language | Project standard |
| rusqlite | 0.32 | SQLite database access | Already in project |

### Supporting
No new dependencies needed. This is pure Rust string generation logic using existing data access patterns.

## Architecture Patterns

### Recommended Project Structure

No new files needed. All changes are within existing files:

```
src-tauri/src/
├── models/
│   └── onboarding.rs        # Add ProjectState enum, tier-aware generation, token budget logic
└── commands/
    └── onboarding_commands.rs # Read planning_tier from project, pass to content generator
```

### Pattern 1: State Machine for Project State

**What:** An enum `ProjectState` with four variants derived from task data.
**When to use:** Every time `generate_context_file_content` is called.
**Example:**
```rust
// Derived from existing task data -- no new DB fields
#[derive(Debug, Clone, PartialEq)]
pub enum ProjectState {
    NoPlan,      // No tasks AND no phases
    Planned,     // Has tasks, none in-progress or complete
    InProgress,  // At least one task in-progress
    Complete,    // All tasks complete (and total > 0)
}

fn detect_project_state(data: &ProjectContextData) -> ProjectState {
    if data.is_empty {
        return ProjectState::NoPlan;
    }
    if data.total_tasks > 0 && data.completed_tasks == data.total_tasks {
        return ProjectState::Complete;
    }
    if data.in_progress_tasks > 0 {
        return ProjectState::InProgress;
    }
    // Has tasks but none in-progress or complete
    if data.total_tasks > 0 {
        return ProjectState::Planned;
    }
    // Edge case: phases exist but no tasks (treated as NO_PLAN per D-01)
    ProjectState::NoPlan
}
```

### Pattern 2: Tier Resolution with Default

**What:** Read `planning_tier` from project, default to "quick" when NULL.
**When to use:** In the command handler before calling content generation.
**Example:**
```rust
// Phase 12 adds planning_tier to Project struct as Option<String>
// Values: "quick", "medium", "full" (D-10 from Phase 12)
// Default: "quick" (D-09 from Phase 13)
let tier = project.planning_tier
    .as_deref()
    .unwrap_or("quick");
```

### Pattern 3: Token Budget Rollup

**What:** Progressive phase collapsing to stay within ~2000 token soft target.
**When to use:** When rendering the "Current Work" section.
**Strategy:**
1. Classify each phase: completed, active (has in-progress tasks), or future (all tasks pending)
2. First pass: completed phases -> one-line summary, active phase -> task titles with icons, future phases -> name + count
3. Estimate token count (rough: word count * 1.3, or character count / 4)
4. If over budget: collapse to only the in-progress phase
5. Never hard-truncate

**Example:**
```rust
fn format_phase_rollup(phase: &PhaseContextData, classification: PhaseClass) -> String {
    match classification {
        PhaseClass::Completed => {
            // "Phase 1: Setup [5/5 complete]"
            format!("- {} [{}/{} complete]\n", phase.name, phase.completed, phase.total)
        }
        PhaseClass::Active => {
            // Full task listing with status icons
            let mut out = format!("### {} [{}/{}]\n\n", phase.name, phase.completed, phase.total);
            for task in &phase.tasks {
                out.push_str(&format!("- {} {}\n", status_icon(&task.status), task.title));
            }
            out
        }
        PhaseClass::Future => {
            // "Phase 3: Deployment [4 tasks]"
            format!("- {} [{} tasks]\n", phase.name, phase.total)
        }
    }
}
```

### Pattern 4: Instruction Matrix Lookup

**What:** A function that returns the correct instruction text given (state, tier).
**When to use:** Building the Instructions section.
**Example:**
```rust
fn get_instructions(state: &ProjectState, tier: &str) -> &'static str {
    match (state, tier) {
        (ProjectState::NoPlan, "quick") => "Describe what you need done. I'll create a simple task list.",
        (ProjectState::NoPlan, "medium") => "Let's break this into phases. What are the major deliverables?",
        (ProjectState::NoPlan, "full") => "This project uses GSD workflow. Run /gsd:new-project to begin.",
        (ProjectState::Planned, "quick") => "You have a task list below. Pick one and start working on it.",
        // ... etc per UI-SPEC instruction matrix
        (ProjectState::Complete, _) => "All tasks are complete. Consider marking this project as done, or add follow-up work if needed.",
        _ => "Review the tasks below and continue working.",
    }
}
```

### Anti-Patterns to Avoid
- **Nested if/else chains for state+tier:** Use match expressions instead. The 4x3 matrix is cleanly expressible as pattern matching.
- **Hard character truncation:** D-05 explicitly says no hard cutoff. Use progressive rollup, not substring slicing.
- **Reading description from DB just to truncate:** The description is already in `ProjectContextData`. Handle long descriptions in the content generator, not in the command handler.
- **Adding new database fields for state:** D-01 explicitly says state is derived from existing task data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token estimation | Custom tokenizer | Simple heuristic: chars/4 or words*1.3 | Exact token count is unnecessary for a soft budget; the progressive collapse handles overages |
| State detection | Complex query logic | Derive from already-fetched counts (total_tasks, completed_tasks, in_progress_tasks, is_empty) | Data is already available in ProjectContextData |
| Instruction text | Template engine | Static string lookup via match | Only 13 fixed strings; a template engine adds complexity for no benefit |

## Common Pitfalls

### Pitfall 1: PLANNED vs NO_PLAN with Phases but No Tasks
**What goes wrong:** A project could have phases created (from sync or import) but zero tasks. D-01 says NO_PLAN = "no tasks AND no phases", so phases without tasks = NO_PLAN is wrong -- it should detect phases exist.
**Why it happens:** Edge case not fully covered by the simple `is_empty` flag.
**How to avoid:** State detection should check: if `phases.is_empty() && total_tasks == 0` -> NO_PLAN. If phases exist but tasks are all pending -> PLANNED. The `is_empty` field currently checks `phases.is_empty() && tasks.is_empty()` in the command handler, which is correct.
**Warning signs:** Test with a project that has phases but no tasks.

### Pitfall 2: Blocked Tasks and State Detection
**What goes wrong:** The `TaskStatus::Blocked` status exists but isn't mentioned in state detection rules. A project with only blocked tasks (none in-progress, none complete) would classify as PLANNED, which is correct behavior but should be verified.
**Why it happens:** The four states are clean: only `in-progress` triggers IN_PROGRESS, only all-complete triggers COMPLETE.
**How to avoid:** Explicitly test a project with blocked-only tasks and verify it maps to PLANNED.
**Warning signs:** Blocked tasks not appearing in attention section.

### Pitfall 3: Token Budget Estimation Drift
**What goes wrong:** The rough heuristic (chars/4) could be significantly off for projects with lots of short phase names or unicode characters.
**Why it happens:** Token estimation is inherently approximate.
**How to avoid:** The progressive collapse is the safety net. If first-pass output exceeds budget, collapse further. The soft target means being 20% over is acceptable.
**Warning signs:** Context files for 50+ task projects that are still very long.

### Pitfall 4: Phase 12 Dependency -- planning_tier Field
**What goes wrong:** Phase 13 depends on Phase 12 adding `planning_tier` to the Project struct. If Phase 12 isn't complete, the field won't exist.
**Why it happens:** Phase dependency.
**How to avoid:** Phase 13 implementation should handle the case where `planning_tier` is `None` (default to "quick" per D-09). This is the same as "Phase 12 done but user hasn't selected a tier yet."
**Warning signs:** Compilation errors if Project struct doesn't have planning_tier field.

### Pitfall 5: Existing Tests Break on Refactored Output
**What goes wrong:** Three existing tests assert on current output format (e.g., `assert!(output.contains("# Project Context:"))`). The new format changes headers and structure.
**Why it happens:** Format changes are the whole point of Phase 13.
**How to avoid:** Update existing tests to match new format, add new tests for each state+tier combination.
**Warning signs:** `cargo test` failures after refactoring.

## Code Examples

### Current Flow (to be refactored)
```rust
// Source: src-tauri/src/models/onboarding.rs
pub fn generate_context_file_content(data: &ProjectContextData) -> String {
    if data.is_empty {
        generate_empty_project_context(data)    // NO_PLAN
    } else {
        generate_populated_project_context(data) // Everything else
    }
}
```

### New Flow (target architecture)
```rust
// New signature -- adds tier parameter
pub fn generate_context_file_content(data: &ProjectContextData, tier: &str) -> String {
    let state = detect_project_state(data);
    let mut out = String::new();

    // Section 1: Header
    out.push_str(&build_header(data, tier, &state));

    // Section 2: Instructions (tier+state matrix)
    out.push_str(&build_instructions(&state, tier));

    // Section 3: What Needs Attention (preserved from Phase 11)
    out.push_str(&build_attention_section(data));

    // Section 4: Current Work (with token budget rollup)
    if state != ProjectState::NoPlan {
        out.push_str(&build_work_section(data, &state));
    }

    // Section 5: Output contract (Quick/Medium only)
    if tier != "full" && state == ProjectState::NoPlan {
        out.push_str(&output_contract_section());
    }

    out
}
```

### Command Handler Changes
```rust
// Source: src-tauri/src/commands/onboarding_commands.rs (lines 181-291)
// Current: builds ProjectContextData and calls generate_context_file_content(data)
// New: also reads planning_tier from project and passes to generator

let tier = project.planning_tier
    .as_deref()
    .unwrap_or("quick");  // D-09: default Quick

let content = crate::models::onboarding::generate_context_file_content(&context_data, tier);
```

### Phase Classification for Token Budget
```rust
#[derive(Debug, PartialEq)]
enum PhaseClass {
    Completed,  // All tasks complete
    Active,     // Has in-progress tasks (or first incomplete phase)
    Future,     // All tasks pending, comes after active phase
}

fn classify_phase(phase: &PhaseContextData) -> PhaseClass {
    if phase.total > 0 && phase.completed == phase.total {
        PhaseClass::Completed
    } else if phase.tasks.iter().any(|t| t.status == "in-progress") {
        PhaseClass::Active
    } else {
        // Could be future or the first incomplete phase
        PhaseClass::Future
    }
}

// Heuristic: if no phase has in-progress tasks, the first non-complete phase is "active"
fn classify_phases(phases: &[PhaseContextData]) -> Vec<PhaseClass> {
    let mut classes: Vec<PhaseClass> = phases.iter().map(classify_phase).collect();
    // If none are Active, promote first Future to Active
    if !classes.contains(&PhaseClass::Active) {
        if let Some(pos) = classes.iter().position(|c| *c == PhaseClass::Future) {
            classes[pos] = PhaseClass::Active;
        }
    }
    classes
}
```

### Token Budget Estimation
```rust
fn estimate_tokens(text: &str) -> usize {
    // Rough heuristic: ~4 chars per token for English text
    // Slightly generous to avoid over-collapsing
    text.len() / 4
}

const SOFT_TOKEN_BUDGET: usize = 2000;

fn build_work_section(data: &ProjectContextData, state: &ProjectState) -> String {
    let classes = classify_phases(&data.phases);
    let mut out = String::from("## Current Work\n\n");

    // First pass: normal rollup
    for (phase, class) in data.phases.iter().zip(classes.iter()) {
        out.push_str(&format_phase_rollup(phase, class));
    }

    // Check budget
    if estimate_tokens(&out) > SOFT_TOKEN_BUDGET {
        // Progressive collapse: show only active phase
        out = String::from("## Current Work\n\n");
        for (phase, class) in data.phases.iter().zip(classes.iter()) {
            if *class == PhaseClass::Active {
                out.push_str(&format_phase_rollup(phase, class));
            } else {
                // One-line summary for everything else
                out.push_str(&format!("- {} [{}/{} complete]\n",
                    phase.name, phase.completed, phase.total));
            }
        }
    }

    out
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust built-in `#[cfg(test)]` with `cargo test` |
| Config file | `src-tauri/Cargo.toml` |
| Quick run command | `cargo test -p element --lib models::onboarding` |
| Full suite command | `cargo test -p element` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CTX-01-a | NO_PLAN state detected correctly | unit | `cargo test -p element --lib models::onboarding::tests::test_state_no_plan` | Wave 0 |
| CTX-01-b | PLANNED state detected correctly | unit | `cargo test -p element --lib models::onboarding::tests::test_state_planned` | Wave 0 |
| CTX-01-c | IN_PROGRESS state detected correctly | unit | `cargo test -p element --lib models::onboarding::tests::test_state_in_progress` | Wave 0 |
| CTX-01-d | COMPLETE state detected correctly | unit | `cargo test -p element --lib models::onboarding::tests::test_state_complete` | Wave 0 |
| CTX-01-e | Content differs between states | unit | `cargo test -p element --lib models::onboarding::tests::test_content_varies_by_state` | Wave 0 |
| CTX-02-a | Large project (50+ tasks) summarizes completed phases | unit | `cargo test -p element --lib models::onboarding::tests::test_token_budget_large_project` | Wave 0 |
| CTX-02-b | Progressive collapse triggers when over budget | unit | `cargo test -p element --lib models::onboarding::tests::test_progressive_collapse` | Wave 0 |
| CTX-04-a | Quick tier NO_PLAN has correct instructions | unit | `cargo test -p element --lib models::onboarding::tests::test_instructions_quick_no_plan` | Wave 0 |
| CTX-04-b | GSD tier has GSD commands in instructions | unit | `cargo test -p element --lib models::onboarding::tests::test_instructions_gsd` | Wave 0 |
| CTX-04-c | Output contract absent for GSD tier | unit | `cargo test -p element --lib models::onboarding::tests::test_output_contract_gsd_excluded` | Wave 0 |
| CTX-04-d | Output contract present for Quick/Medium tiers | unit | `cargo test -p element --lib models::onboarding::tests::test_output_contract_quick_included` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cargo test -p element --lib models::onboarding`
- **Per wave merge:** `cargo test -p element`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- All 11 test cases listed above are new (existing 3 tests will be updated to match new format)
- No new test infrastructure needed -- existing `#[cfg(test)]` module in `onboarding.rs` is the right location
- Helper function for building test `ProjectContextData` with various configurations would reduce boilerplate

## Open Questions

1. **Output contract in non-NO_PLAN states for Quick/Medium**
   - What we know: D-10/D-13 say output contract is Quick/Medium only, GSD excluded
   - What's unclear: Should the output contract appear in PLANNED/IN_PROGRESS states? It makes sense for NO_PLAN (prompting planning), but less sense when a plan already exists.
   - Recommendation: Include output contract only in NO_PLAN state for Quick/Medium. In PLANNED/IN_PROGRESS, the plan already exists so the contract is irrelevant. The current code always appends it, but that was before state awareness existed.

2. **Description summarization threshold**
   - What we know: Claude's discretion per CONTEXT.md -- summarize if long
   - What's unclear: What constitutes "long"? 500 chars? 1000?
   - Recommendation: Pass through verbatim up to 500 characters. Beyond that, truncate at the last sentence boundary before 500 chars and append "..." This is simple, deterministic, and keeps the header compact.

3. **"Active" phase when no tasks are in-progress (PLANNED state)**
   - What we know: In PLANNED state, no tasks are in-progress, so no phase is "active" by the in-progress criterion
   - What's unclear: Which phase gets expanded task listings?
   - Recommendation: In PLANNED state, the first incomplete phase (by sort_order) is treated as active. This gives the AI a concrete starting point.

## Sources

### Primary (HIGH confidence)
- `src-tauri/src/models/onboarding.rs` -- Full current implementation read, 389 lines
- `src-tauri/src/commands/onboarding_commands.rs` lines 181-291 -- Command handler read
- `src-tauri/src/models/project.rs` -- Project struct (no planning_tier yet, Phase 12 adds it)
- `src-tauri/src/models/task.rs` -- TaskStatus enum (Pending, InProgress, Complete, Blocked)
- `src-tauri/src/models/phase.rs` -- Phase struct (id, project_id, name, sort_order)
- `13-CONTEXT.md` -- All 13 locked decisions
- `13-UI-SPEC.md` -- Content contract, instruction matrix, token budget rules
- `12-CONTEXT.md` -- Phase 12 schema additions (planning_tier, source)

### Secondary (MEDIUM confidence)
- Token estimation heuristic (chars/4) -- standard approximation, sufficient for soft budget

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- pure Rust refactor of existing code, no new dependencies
- Architecture: HIGH -- state enum + instruction matrix + token budget rollup is straightforward
- Pitfalls: HIGH -- identified from reading actual code and data model

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- no external dependencies changing)
