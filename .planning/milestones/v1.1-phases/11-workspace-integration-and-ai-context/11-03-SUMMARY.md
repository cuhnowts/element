---
phase: 11-workspace-integration-and-ai-context
plan: 03
subsystem: ui
tags: [react, terminal, ai-button, context-generation, pty-respawn]

# Dependency graph
requires:
  - phase: 11-workspace-integration-and-ai-context
    plan: 01
    provides: generate_context_file command, startPlanWatcher binding
  - phase: 11-workspace-integration-and-ai-context
    plan: 02
    provides: launchTerminalCommand, per-project workspace state, terminal kill/respawn
provides:
  - OpenAiButton component with full context-generation and terminal launch flow
  - ProjectDetail integration with Open AI button in header and empty state
  - Removal of old onboarding UI (ScopeInputForm, OnboardingWaitingCard)
affects: [ai-plan-review, settings-cli-tool-config]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-button AI launch: generate context, start watcher, kill/respawn PTY in one click"
    - "Hardcoded CLI tool path (claude --dangerously-skip-permissions) with future settings support"

key-files:
  created:
    - src/components/center/OpenAiButton.tsx
    - src/components/center/OpenAiButton.test.tsx
  modified:
    - src/components/center/ProjectDetail.tsx

key-decisions:
  - "Hardcoded claude --dangerously-skip-permissions instead of configurable CLI tool path (user validated, settings support deferred)"
  - "Removed CLI tool settings check and getAppSetting guard entirely -- simplifies flow, avoids dead code for nonexistent settings UI"
  - "3 behavioral tests (no directory guard, happy path with claude launch, error handling) -- CLI tool guard test removed since no settings check"

patterns-established:
  - "OpenAiButton pattern: guard -> generate context -> start watcher -> launchTerminalCommand"

requirements-completed: [AIAS-02, AIAS-03]

# Metrics
duration: 12min
completed: 2026-03-24
---

# Phase 11 Plan 03: Open AI Button Summary

**"Open AI" button in ProjectDetail that generates context file, starts plan watcher, and launches claude --dangerously-skip-permissions in visible terminal via PTY kill/respawn**

## Performance

- **Duration:** ~12 min (continuation from checkpoint approval)
- **Started:** 2026-03-24T18:45:00Z
- **Completed:** 2026-03-25T00:54:00Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 3

## Accomplishments
- Created OpenAiButton component with full flow: directory guard, context file generation, plan watcher start, PTY kill/respawn via launchTerminalCommand
- Integrated OpenAiButton in ProjectDetail header (next to project name) and empty state card
- Removed ScopeInputForm and OnboardingWaitingCard from ProjectDetail render flow, keeping only AiPlanReview for plan-output.json detection
- Added 3 Vitest behavioral tests covering guard conditions and happy path

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OpenAiButton, wire into ProjectDetail, add behavioral tests** - `47e841e` (feat)
2. **Task 2: End-to-end verification** - checkpoint:human-verify (approved by user)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/components/center/OpenAiButton.tsx` - "Open AI" button component with full launch flow (guard, generate context, start watcher, launchTerminalCommand)
- `src/components/center/OpenAiButton.test.tsx` - 3 Vitest behavioral tests (no directory guard, happy path, error handling)
- `src/components/center/ProjectDetail.tsx` - Integrated OpenAiButton in header and empty state, removed ScopeInputForm/OnboardingWaitingCard/handleStartPlanning/handleCancelOnboarding

## Decisions Made
- **Hardcoded `claude --dangerously-skip-permissions`** instead of reading CLI tool path from settings. User validated this approach -- settings UI for configurable CLI tool path will be added in a future phase.
- **Removed CLI tool settings check entirely.** The plan originally had a `getAppSetting("cli_tool_path")` guard with toast "No AI tool configured". Since the CLI is now hardcoded, this guard and the settings navigation were removed to avoid dead code.
- **3 tests instead of 4.** The "no CLI tool configured" test was removed since there is no longer a settings-based guard condition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed getAppSetting guard and hardcoded claude CLI**
- **Found during:** Task 1 (after user feedback during checkpoint)
- **Issue:** Plan specified a configurable CLI tool via getAppSetting("cli_tool_path"), but user decided to hardcode `claude --dangerously-skip-permissions` instead
- **Fix:** Removed getAppSetting call and settings toast. Hardcoded `claude` with `--dangerously-skip-permissions` flag as first arg. Removed corresponding test.
- **Files modified:** src/components/center/OpenAiButton.tsx, src/components/center/OpenAiButton.test.tsx
- **Verification:** Tests pass, TypeScript compiles, user approved in checkpoint
- **Committed in:** 47e841e

---

**Total deviations:** 1 auto-fixed (user-directed simplification)
**Impact on plan:** Simplified the component by removing settings dependency. No scope creep -- reduced scope instead.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all data flows are wired (context generation via Tauri command, terminal launch via workspace store).

## Next Phase Readiness
- Phase 11 complete: all 3 plans delivered (context file generation, per-project workspace state, Open AI button)
- Future work: configurable CLI tool path via Settings UI, AI plan review integration testing
- AiPlanReview flow retained and ready for plan-output.json detection

---
*Phase: 11-workspace-integration-and-ai-context*
*Completed: 2026-03-24*

## Self-Check: PASSED
- All 3 files verified on disk
- Task commit 47e841e verified in git log
