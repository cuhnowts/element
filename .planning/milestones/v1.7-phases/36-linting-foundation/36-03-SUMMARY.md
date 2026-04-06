---
phase: 36-linting-foundation
plan: 03
subsystem: tooling
tags: [biome, clippy, rustfmt, bash, parallel, linting, ci]

# Dependency graph
requires:
  - phase: 36-01
    provides: "Biome v2 migration and clean TypeScript linting"
  - phase: 36-02
    provides: "Zero clippy warnings and consistent rustfmt formatting"
provides:
  - "Unified npm run check:all command for full-stack lint verification"
  - "Parallel TS + Rust check execution with unified pass/fail reporting"
affects: [39-enforcement-hooks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parallel shell background processes with & and wait for independent checks"
    - "Unified pass/fail reporting collecting all results before exit"

key-files:
  created:
    - "scripts/check-all.sh"
  modified:
    - "package.json"

key-decisions:
  - "Used bash background processes (& + wait) for parallel execution rather than sequential"
  - "Collected all results before reporting to ensure both TS and Rust failures are visible"

patterns-established:
  - "check:all is the single command for full-stack lint verification"
  - "scripts/ directory for shell-based build tooling"

requirements-completed: [LINT-01, LINT-02, LINT-03, LINT-04]

# Metrics
duration: 2min
completed: 2026-04-05
---

# Phase 36 Plan 03: Unified Check Script Summary

**Single npm run check:all command running Biome and clippy+rustfmt in parallel with unified pass/fail reporting**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-05T23:08:16Z
- **Completed:** 2026-04-05T23:10:35Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Created scripts/check-all.sh with parallel TypeScript (Biome) and Rust (clippy + rustfmt) checks
- Wired check:all npm script in package.json
- Verified npm run check:all exits 0 with "All checks passed" output

## Task Commits

Each task was committed atomically:

1. **Task 1: Create check:all script and wire into package.json** - `d34be3d` (feat)

## Files Created/Modified
- `scripts/check-all.sh` - Parallel lint/format check orchestrator for TS and Rust
- `package.json` - Added check:all script entry
- `src-tauri/build.rs` - Fixed pre-existing rustfmt formatting (deviation)

## Decisions Made
- Used bash background processes with `&` and `wait` for true parallel execution
- Report all results before exiting so both TS and Rust failures are always visible

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing rustfmt formatting in build.rs**
- **Found during:** Task 1 (check:all verification)
- **Issue:** cargo fmt --check showed formatting diffs in build.rs (pre-existing, normally fixed by 36-02 but unavailable in parallel worktree)
- **Fix:** Ran cargo fmt to apply formatting
- **Files modified:** src-tauri/build.rs
- **Verification:** npm run check:all exits 0
- **Committed in:** d34be3d (part of task commit)

**2. [Rule 3 - Blocking] Built mcp-server and created dist directory for Tauri context macro**
- **Found during:** Task 1 (check:all verification)
- **Issue:** Worktree missing build artifacts (mcp-server/dist/index.js, dist/) required by Tauri's generate_context!() macro during cargo clippy
- **Fix:** Ran npm install + build in mcp-server, created dist/index.html placeholder
- **Files modified:** None committed (build artifacts only)
- **Verification:** cargo clippy succeeds in worktree

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for worktree environment. No scope creep.

## Issues Encountered
- Parallel worktree lacks build artifacts (mcp-server/dist, dist/) that exist in main working tree. Resolved by building mcp-server and creating dist placeholder. This is expected for worktree-based parallel execution.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- check:all command ready for Phase 39 (Claude Code hooks) to use as pre-commit gate
- All LINT-01 through LINT-04 requirements satisfied across plans 01-03

## Self-Check: PASSED

---
*Phase: 36-linting-foundation*
*Completed: 2026-04-05*
