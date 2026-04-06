---
phase: 33-briefing-rework
plan: 02
subsystem: api
tags: [rust, zustand, tauri-events, json, scoring, llm]

requires:
  - phase: 33-01
    provides: "scoring.rs module with compute_scores() and ScoringResult/ScoredProject types"
  - phase: 33-00
    provides: "briefing.ts types (BriefingJSON, BriefingProject, BriefingTag, BriefingStatus) and test stubs"
provides:
  - "Modified generate_briefing command with scoring integration and JSON output"
  - "generate_context_summary command for template-based greeting text"
  - "Zustand store with BriefingJSON data field replacing raw markdown"
  - "Stream hook listening for briefing-data event with parsed JSON"
  - "strip_json_fences utility for cleaning LLM output"
  - "merge_project_ids utility for injecting scoring IDs into LLM JSON"
affects: [33-03, 33-briefing-rework]

tech-stack:
  added: []
  patterns:
    - "Backend JSON accumulation: LLM streams text, backend accumulates full response, parses JSON, emits structured event"
    - "Scoring-driven briefing: compute_scores() feeds data to LLM, LLM narrates as JSON"
    - "Module-level EMPTY_BRIEFING constant for Zustand selector stability"

key-files:
  created: []
  modified:
    - src-tauri/src/commands/manifest_commands.rs
    - src-tauri/src/lib.rs
    - src/stores/useBriefingStore.ts
    - src/hooks/useBriefingStream.ts

key-decisions:
  - "Used CompletionResponse.content for full response instead of channel accumulation"
  - "Template-based context summary (no LLM call) for greeting area"
  - "Race condition guard in store rejects requests while loading/streaming"

patterns-established:
  - "Backend JSON pipeline: score -> serialize -> LLM -> accumulate -> strip fences -> parse -> merge IDs -> emit"
  - "Structured event pattern: briefing-data carries complete JSON, briefing-chunk kept for progress indication only"

requirements-completed: [BRIEF-01, BRIEF-02, BRIEF-04]

duration: 6min
completed: 2026-04-05
---

# Phase 33 Plan 02: Briefing Data Pipeline Summary

**Scoring engine wired into briefing command with JSON system prompt, backend JSON accumulation and parsing, and frontend store/hook updated for structured BriefingJSON data**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-05T12:11:01Z
- **Completed:** 2026-04-05T12:17:06Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Briefing command now calls compute_scores() and feeds scored project data to LLM with JSON-specific system prompt
- Backend accumulates full LLM response, strips JSON fences, parses JSON, merges project IDs from scoring data, and emits a single briefing-data event
- New generate_context_summary command provides template-based greeting text from scoring data without LLM call
- Zustand store holds structured BriefingJSON instead of raw markdown string, with race condition guard and module-level empty constant
- Stream hook listens for briefing-data event and parses JSON on the frontend side
- All 6 briefing_json tests pass with real assertions

## Task Commits

Each task was committed atomically:

1. **Task 1: Update briefing command with scoring engine and JSON system prompt** - `922478b` (feat)
2. **Task 2: Update briefing store and stream hook for structured JSON** - `d7e9f27` (feat)

## Files Created/Modified
- `src-tauri/src/commands/manifest_commands.rs` - Modified generate_briefing to use scoring engine + JSON output, added generate_context_summary, strip_json_fences, merge_project_ids, filled test stubs
- `src-tauri/src/lib.rs` - Registered generate_context_summary in Tauri command handler
- `src/stores/useBriefingStore.ts` - Replaced briefingContent with briefingData BriefingJSON, added contextSummary, race condition guard
- `src/hooks/useBriefingStream.ts` - Replaced briefing-chunk listener with briefing-data JSON parsing

## Decisions Made
- Used CompletionResponse.content (returned from complete_stream) for the full accumulated response rather than manually accumulating from the channel -- simpler and already available
- Template-based context summary generates greeting text purely from scoring data without an LLM call, following Research recommendation for fast hub load
- Race condition guard in requestBriefing() rejects calls when status is "streaming" or "loading"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created dist/ directory for Tauri build**
- **Found during:** Task 1 (cargo build verification)
- **Issue:** Pre-existing issue -- Tauri generate_context!() macro panics when frontendDist "../dist" path doesn't exist in worktree
- **Fix:** Created empty dist/ directory to satisfy Tauri config resolution
- **Files modified:** dist/ (directory created, not committed -- gitignored build artifact)
- **Verification:** cargo build succeeds after creating directory

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Environment fix only, no code changes. No scope creep.

## Issues Encountered
- BriefingContent.tsx now has a TypeScript error referencing the removed `briefingContent` field -- this is expected and documented in the plan as a known consequence that will be fixed in Plan 03 when BriefingContent is replaced by card components.

## Known Stubs
None -- all functions are fully implemented with real logic.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Briefing data pipeline complete: scoring engine -> LLM -> JSON -> frontend store
- Plan 03 can now build card UI components that consume BriefingJSON from the store
- BriefingContent.tsx TypeScript error must be resolved in Plan 03 when it replaces that component

---
*Phase: 33-briefing-rework*
*Completed: 2026-04-05*
