---
phase: 13-adaptive-context-builder
plan: 01
subsystem: backend
tags: [rust, context-generation, state-machine, token-budget, tier-aware]

# Dependency graph
requires:
  - phase: 12-cli-settings-and-schema-foundation
    provides: planning_tier field on Project struct
provides:
  - ProjectState enum with 4-state detection from task data
  - 4x3 instruction matrix (state x tier) for context file
  - Token budget rollup with progressive phase collapse
  - Tier-aware generate_context_file_content(data, tier) function
affects: [14-planning-decision-tree, 15-planning-folder-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: [pipeline-based content generation, state-machine enum, progressive collapse for token budget]

key-files:
  created: []
  modified:
    - src-tauri/src/models/onboarding.rs
    - src-tauri/src/commands/onboarding_commands.rs

key-decisions:
  - "Output contract rendered only for Quick/Medium tiers in NoPlan state (D-10/D-13 + research recommendation)"
  - "Description truncation at 500 chars on sentence boundary with ellipsis"
  - "Phase 12 planning_tier field available; used project.planning_tier.unwrap_or('quick')"

patterns-established:
  - "Pipeline content generation: detect_state -> build_header -> build_instructions -> build_attention -> build_work -> conditional output_contract"
  - "Progressive collapse: first-pass rollup, if over budget collapse to active-phase-only"

requirements-completed: [CTX-01, CTX-02, CTX-04]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 13 Plan 01: Adaptive Context Builder Summary

**4-state x 3-tier context file generator with progressive token budget rollup replacing static empty/populated templates**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T00:46:38Z
- **Completed:** 2026-03-28T00:51:09Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- ProjectState enum (NoPlan, Planned, InProgress, Complete) with detect_project_state() deriving state from existing task data
- 4x3 instruction matrix returning tier+state-specific guidance text for all 12 combinations
- Token budget rollup: completed phases collapse to one-liners, active phase shows task titles, progressive collapse when over ~2000 tokens
- Pipeline-based content generation replacing old binary empty/populated split
- 35 unit tests covering state detection, instruction matrix, phase classification, token budget, and full content generation

## Task Commits

Each task was committed atomically:

1. **Task 1: State detection, instruction matrix, and tier-aware content generation with TDD** - `f3ff6e8` (feat)
2. **Task 2: Wire tier into command handler and verify full compilation** - `58708bf` (feat)

## Files Created/Modified
- `src-tauri/src/models/onboarding.rs` - Added ProjectState enum, detect_project_state(), get_instructions(), PhaseClass enum, classify_phases(), estimate_tokens(), build_header/instructions/attention/work pipeline, refactored generate_context_file_content to accept tier; 35 tests
- `src-tauri/src/commands/onboarding_commands.rs` - Read planning_tier from project with fallback to "quick", pass tier to generate_context_file_content

## Decisions Made
- Output contract only rendered in NoPlan state for Quick/Medium tiers (not in Planned/InProgress/Complete) per research recommendation -- once a plan exists, the contract is irrelevant
- Description truncation at 500 chars on last sentence boundary (". ") with "..." appended
- Phase 12 already shipped planning_tier on Project struct, so used real field access instead of hardcoded default

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functionality is fully wired.

## Next Phase Readiness
- Context file generation is fully adaptive and tier-aware
- Phase 14 (planning decision tree) can use tier to drive different planning flows
- Phase 15 (planning folder sync) will benefit from the state-aware context that adapts as sync data arrives

---
*Phase: 13-adaptive-context-builder*
*Completed: 2026-03-28*
