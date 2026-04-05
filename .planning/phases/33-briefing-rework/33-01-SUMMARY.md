---
phase: 33-briefing-rework
plan: 01
subsystem: backend
tags: [rust, scoring, chrono, sqlite, typescript, briefing]

requires:
  - phase: 33-00
    provides: research, context, UI-SPEC, plan structure for briefing rework

provides:
  - Rust scoring engine (compute_scores) with project tags, priority ranking, busy score
  - TypeScript briefing types (BriefingJSON, BriefingProject, BriefingTag, BriefingStatus)

affects: [33-02, 33-03, 33-04]

tech-stack:
  added: []
  patterns: [scoring engine as pure computation module, compute_scores_for_date testability pattern]

key-files:
  created:
    - src-tauri/src/models/scoring.rs
    - src/types/briefing.ts
  modified:
    - src-tauri/src/models/mod.rs

key-decisions:
  - "Added compute_scores_for_date internal function for deterministic testing (compute_scores delegates with Local::now)"
  - "project_id uses i64 (SQLite rowid) rather than String UUID for ScoredProject"
  - "ProjectTag uses kebab-case serde for direct alignment with TypeScript BriefingTag union"

patterns-established:
  - "Scoring engine as pure computation: takes DB ref + date, returns structured data, no Tauri state or async"
  - "TDD with in-memory SQLite: setup_test_db pattern reused from manifest.rs tests"

requirements-completed: [BRIEF-02, BRIEF-03]

duration: 6min
completed: 2026-04-05
---

# Phase 33 Plan 01: Scoring Engine & Briefing Types Summary

**Rust scoring engine computing project tags and priority ranking from task data, plus TypeScript type definitions for the briefing JSON contract**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-05T11:59:10Z
- **Completed:** 2026-04-05T12:05:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Scoring engine computes 5 project tags (overdue, approaching-deadline, blocked, on-track, recently-completed) from task status and due dates
- Projects ranked by deadline proximity (soonest deadline = highest priority_score)
- Busy score computed from scheduled_blocks + calendar_events as percentage of 8-hour day
- TypeScript types define the BriefingJSON contract between backend and frontend card rendering
- All 10 Rust tests pass covering tag computation, priority sorting, blockers/deadlines/wins lists

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TypeScript briefing types** - `b6f11e3` (feat)
2. **Task 2: Create Rust scoring engine module (RED)** - `20f0d34` (test)
3. **Task 2: Create Rust scoring engine module (GREEN)** - `4ea6a64` (feat)

## Files Created/Modified
- `src/types/briefing.ts` - TypeScript types for BriefingJSON, BriefingProject, BriefingTag, BriefingStatus
- `src-tauri/src/models/scoring.rs` - Rust scoring engine with compute_scores, tag computation, priority ranking, busy score
- `src-tauri/src/models/mod.rs` - Added pub mod scoring registration

## Decisions Made
- Used `compute_scores_for_date(db, today)` internal function to enable deterministic testing with fixed dates, while `compute_scores(db)` uses `Local::now()` for production
- Used SQLite `p.rowid` as project_id (i64) in ScoredProject since the DB uses TEXT UUIDs for project IDs but rowid provides a stable integer identifier
- Applied kebab-case serde on ProjectTag enum to align directly with TypeScript BriefingTag string union values

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed source constraint violation in tests**
- **Found during:** Task 2 (Scoring engine tests)
- **Issue:** Direct SQL INSERT used `source = 'manual'` but DB CHECK constraint requires `source IN ('user', 'sync')`
- **Fix:** Changed test INSERT statements to use `source = 'user'`
- **Files modified:** src-tauri/src/models/scoring.rs (test section)
- **Verification:** All 10 tests pass
- **Committed in:** 4ea6a64

**2. [Rule 3 - Blocking] Created dummy dist directory for Tauri build**
- **Found during:** Task 2 (Running cargo test)
- **Issue:** Worktree lacked `../dist` directory required by `tauri::generate_context!()` macro, preventing compilation
- **Fix:** Created minimal `dist/index.html` (already in .gitignore, not committed)
- **Verification:** cargo check --lib and cargo test scoring --lib both succeed

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for test execution in worktree environment. No scope creep.

## Issues Encountered
- Pre-existing proc macro panic from `tauri::generate_context!()` in worktree due to missing frontend dist directory. Resolved by creating a dummy dist directory (gitignored). This only affects the binary target, not lib tests.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functions fully implemented with real database queries.

## Next Phase Readiness
- Scoring engine ready to be called from modified briefing command (Plan 02)
- TypeScript types ready for frontend card components (Plan 03)
- ScoredProject data structure matches the BriefingJSON contract for LLM output merging

## Self-Check: PASSED

---
*Phase: 33-briefing-rework*
*Completed: 2026-04-05*
