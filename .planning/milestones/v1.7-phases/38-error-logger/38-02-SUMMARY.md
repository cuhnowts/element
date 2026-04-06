---
phase: 38-error-logger
plan: 02
status: complete
started: "2026-04-06T03:05:00Z"
completed: "2026-04-06T03:08:00Z"
---

## Summary

Created the Rust `log_errors` Tauri command that writes JSON lines to `.element/errors.log`, registered it in the Tauri handler, initialized the error logger in `main.tsx` before React renders, and wired `setProjectDirectory` to the Zustand project store in `App.tsx`.

Also fixed pre-existing compilation errors in `gateway.rs` where credential functions were missing the `db: &Database` parameter (from Phase 36 parallel agent changes).

## Key Files

### Created
- `src-tauri/src/commands/error_log_commands.rs` — Rust `log_errors` command with `ErrorLogEntry` struct, 1MB truncation, 4 tests

### Modified
- `src-tauri/src/commands/mod.rs` — Added `pub mod error_log_commands`
- `src-tauri/src/lib.rs` — Added `use commands::error_log_commands::*` import and `log_errors` to `generate_handler!`
- `src/main.tsx` — Added `initErrorLogger()` call before React renders
- `src/App.tsx` — Added `useEffect` that calls `setProjectDirectory` when active project changes
- `src-tauri/src/ai/gateway.rs` — Fixed pre-existing `db` parameter mismatches in credential functions

## What Was Built

- **Rust log_errors command**: Receives batched `ErrorLogEntry` from frontend, writes JSON lines to `{projectDir}/.element/errors.log`
- **Auto-create .element/**: `create_dir_all` ensures directory exists before writing
- **1MB truncation**: File is truncated before appending if it exceeds 1MB, preventing unbounded growth
- **Empty batch no-op**: Returns Ok(()) immediately for empty entries without creating directory
- **main.tsx initialization**: `initErrorLogger()` called before `renderApp()`, intercepting console.error from app start
- **App.tsx project wiring**: `useEffect` watches `selectedProjectId` and `projects`, calls `setProjectDirectory` with the project's `directoryPath` or `null`

## Full Pipeline

```
console.error() → TS interceptor → buffer (500ms / 20+ immediate) → invoke("log_errors") → Rust command → .element/errors.log
```

## Verification

- 4 Rust tests pass: file creation, JSON lines append, 1MB truncation, empty batch no-op
- 8 TS tests pass (from Plan 01)
- `cargo check` succeeds (no compile errors)
- `npx tsc --noEmit` shows no errors in modified files

## Deviations

- Fixed pre-existing `gateway.rs` compilation errors (credential function `db` parameter mismatches from Phase 36 parallel agents) to unblock `cargo test`

## Self-Check: PASSED
