---
phase: 38-error-logger
plan: 01
status: complete
started: "2026-04-06T03:03:00Z"
completed: "2026-04-06T03:04:00Z"
---

## Summary

Created the TypeScript error logger module (`src/lib/errorLogger.ts`) that monkey-patches `console.error`, buffers entries with a re-entrancy guard, and flushes batches via Tauri IPC. The module is standalone (not a React hook) and runs before React mounts.

## Key Files

### Created
- `src/lib/errorLogger.ts` — Error interceptor module with `initErrorLogger`, `setProjectDirectory`, `_testing` exports
- `src/lib/errorLogger.test.ts` — 8 unit tests covering capture, formatting, re-entrancy guard, buffer batching, flush threshold, and project directory gating

## What Was Built

- **Console.error interception**: `initErrorLogger()` saves the original `console.error` and replaces it with an interceptor that passes through to the original then buffers a structured entry
- **Entry formatting**: Arguments are stringified safely — Error.stack for Errors, String(x) for non-strings, joined with space
- **Re-entrancy guard**: Boolean `isLogging` flag with try/finally prevents infinite recursion when invoke itself triggers console.error
- **Buffered flush**: 500ms debounce timer batches entries; immediate flush when buffer exceeds 20 entries
- **Fire-and-forget IPC**: `invoke("log_errors", { projectDir, entries })` with silent `.catch()` — never logs errors about logging
- **Project directory gating**: Flush is a no-op when `currentProjectDir` is null

## Verification

- All 8 vitest tests pass
- TDD approach: tests written first (RED), then implementation (GREEN)

## Deviations

None — implemented exactly as planned.

## Self-Check: PASSED
