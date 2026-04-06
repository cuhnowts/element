---
phase: 36-linting-foundation
plan: 02
subsystem: tooling
tags: [clippy, rustfmt, rust, linting, concurrency, tokio]

# Dependency graph
requires: []
provides:
  - "Zero clippy warnings with -D warnings across all Rust source"
  - "Consistent rustfmt formatting across all Rust source"
  - "Fixed await_holding_lock concurrency bug in calendar.rs"
affects: [37-backend-testing, 39-enforcement-hooks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tokio::sync::Mutex (AsyncMutex) for locks held across .await points"
    - "LazyLock for async-safe static initialization"
    - "#[allow(dead_code)] with explanatory comments for Tauri macro-registered items"
    - "#[allow(clippy::too_many_arguments)] for Tauri command handlers"

key-files:
  created: []
  modified:
    - "src-tauri/src/plugins/core/calendar.rs"
    - "src-tauri/src/ai/gateway.rs"
    - "src-tauri/src/ (29 files total)"

key-decisions:
  - "Used #[allow(dead_code)] with comments rather than removing items registered via Tauri macros"
  - "Fixed gateway.rs credential API argument mismatches caused by parallel agent changes (Rule 3)"
  - "Removed unused std::sync::Mutex import from calendar.rs since full paths used elsewhere"

patterns-established:
  - "Dead code suppression: always include a comment explaining why (e.g., 'registered via Tauri command macro')"
  - "Async mutex pattern: use LazyLock<AsyncMutex<()>> for statics held across await points"

requirements-completed: [LINT-03, LINT-04]

# Metrics
duration: 12min
completed: 2026-04-05
---

# Phase 36 Plan 02: Rust Clippy + Rustfmt Summary

**Zero clippy warnings with -D warnings and consistent rustfmt formatting across 62 Rust files, plus async mutex fix for calendar.rs concurrency bug**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-05T19:07:46Z
- **Completed:** 2026-04-05T19:20:08Z
- **Tasks:** 2
- **Files modified:** 30

## Accomplishments
- All Rust source files formatted with rustfmt (62 files reformatted)
- All clippy warnings resolved: redundant closures, unused imports/variables, dead code, too_many_arguments
- Fixed real concurrency bug: TOKEN_REFRESH_LOCK in calendar.rs replaced with async-aware tokio::sync::Mutex
- `cargo clippy -- -D warnings` and `cargo fmt --check` both exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1a: Format Rust codebase** - `83d095a` (style)
2. **Task 1b: Resolve clippy warnings** - `0457b94` (fix)
3. **Task 2: Fix await_holding_lock concurrency bug** - `28a2027` (fix)

## Files Created/Modified
- `src-tauri/src/plugins/core/calendar.rs` - TOKEN_REFRESH_LOCK converted to LazyLock<AsyncMutex<()>>
- `src-tauri/src/ai/gateway.rs` - Removed db param from credential calls, fixed build_provider signature
- `src-tauri/src/ai/provider.rs` - #[allow(dead_code)] on AiProvider trait
- `src-tauri/src/ai/types.rs` - #[allow(dead_code)] on NoProvider variant
- `src-tauri/src/commands/task_commands.rs` - #[allow(clippy::too_many_arguments)]
- `src-tauri/src/commands/notification_commands.rs` - #[allow(clippy::too_many_arguments)]
- `src-tauri/src/commands/calendar_commands.rs` - Removed unused Manager import, prefixed unused vars
- `src-tauri/src/commands/onboarding_commands.rs` - Removed unused Manager and notify::Watcher imports
- `src-tauri/src/commands/planning_sync_commands.rs` - Removed unused notify::Watcher import
- `src-tauri/src/plugins/mod.rs` - Removed unused notify::Watcher import
- Plus 20 more files with formatting changes and dead code annotations

## Decisions Made
- Used `#[allow(dead_code)]` with explanatory comments for items that are registered via Tauri macros, used in tests, or reserved for future plugin API -- removing them would break runtime behavior
- Fixed gateway.rs credential API argument mismatches (Rule 3 blocking issue) caused by parallel agent changes to credentials.rs
- Removed `std::sync::Mutex` import from calendar.rs since all other uses in the file use the full path `std::sync::Mutex<Database>`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed credential API argument mismatches in gateway.rs**
- **Found during:** Task 1 (clippy auto-fix)
- **Issue:** credentials.rs was modified by a parallel agent to remove the `db` parameter from `store_api_key`, `get_api_key`, and `delete_api_key`, but gateway.rs still passed `db` -- causing 8 E0061 compilation errors
- **Fix:** Removed `db` parameter from all credential function calls in gateway.rs and updated `build_provider`/`get_api_key_for_config` signatures to match
- **Files modified:** src-tauri/src/ai/gateway.rs
- **Verification:** `cargo check` passes, `cargo clippy -- -D warnings` passes
- **Committed in:** 0457b94 (Task 1 commit)

**2. [Rule 3 - Blocking] Built frontend dist/ for Tauri generate_context! macro**
- **Found during:** Task 1 (clippy auto-fix)
- **Issue:** `tauri::generate_context!()` proc macro panicked because `../dist` directory didn't exist in worktree
- **Fix:** Ran `npm install && npx vite build` to create dist/ directory
- **Files modified:** None (build artifacts not committed)
- **Verification:** `cargo check` no longer panics on generate_context macro
- **Committed in:** N/A (environment setup only)

**3. [Rule 3 - Blocking] Built mcp-server dist/index.js for Tauri resource path**
- **Found during:** Task 1 (clippy auto-fix)
- **Issue:** Tauri build.rs requires `../mcp-server/dist/index.js` as a bundled resource but it wasn't built
- **Fix:** Ran `cd mcp-server && npm install && npx tsx build.ts`
- **Files modified:** None (build artifacts not committed)
- **Verification:** `cargo check` succeeds
- **Committed in:** N/A (environment setup only)

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** All auto-fixes necessary to unblock compilation. No scope creep.

## Issues Encountered
- Plan estimated 287 files needing formatting; actual was 62 files (rest were already formatted)
- Plan estimated 69 clippy warnings; actual count differed due to parallel agent changes and pre-existing state

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- LINT-03 (zero clippy warnings) and LINT-04 (rustfmt formatting) requirements satisfied
- Ready for enforcement hooks (Phase 39) and backend testing (Phase 37)
- `cargo clippy -- -D warnings` and `cargo fmt --check` can be used as CI gate commands

---
*Phase: 36-linting-foundation*
*Completed: 2026-04-05*
