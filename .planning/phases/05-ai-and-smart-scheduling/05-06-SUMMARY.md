---
phase: 05-ai-and-smart-scheduling
plan: 06
subsystem: ui
tags: [cli, tauri, tokio, process-spawning, terminal, streaming]

requires:
  - phase: 05-04
    provides: "AI assist UI in TaskDetail (AiAssistButton, AiSuggestionPanel)"
provides:
  - "CLI/agent invocation panel in TaskDetail for external tool execution"
  - "Tauri IPC command for process spawning with stdout/stderr streaming"
  - "TypeScript types for CLI output events"
affects: [06-polish]

tech-stack:
  added: [tokio::process::Command]
  patterns: [tauri-event-streaming-for-process-output]

key-files:
  created:
    - src-tauri/src/commands/cli_commands.rs
    - src/components/detail/CliInvokePanel.tsx
    - src/types/cli.ts
  modified:
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/lib.rs
    - src/lib/tauri.ts
    - src/components/detail/TaskDetail.tsx

key-decisions:
  - "Used tokio::process::Command with BufReader line streaming for real-time output"
  - "CLI panel gated on hasDefaultProvider same as AI features"
  - "Collapsible panel with unicode arrows instead of adding icon dependency"

patterns-established:
  - "Tauri event streaming pattern: spawn tokio tasks to emit events per line from child process stdout/stderr"

requirements-completed: [AI-02]

duration: 2min
completed: 2026-03-19
---

# Phase 05 Plan 06: CLI/Agent Invocation Summary

**CLI tool invocation panel in TaskDetail using tokio process spawning with real-time stdout/stderr streaming via Tauri events**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T01:45:53Z
- **Completed:** 2026-03-19T01:47:29Z
- **Tasks:** 1
- **Files modified:** 7

## Accomplishments
- Rust backend command `run_cli_tool` spawns external processes with tokio, streams stdout/stderr via Tauri events
- CliInvokePanel component with command/args inputs, real-time output display, exit code badge
- Both AI assistance modes (built-in scaffold + CLI invocation) now accessible from the same task detail view

## Task Commits

Each task was committed atomically:

1. **Task 1: Rust CLI command and frontend CLI invoke panel** - `18d5c00` (feat)

**Plan metadata:** pending

## Files Created/Modified
- `src-tauri/src/commands/cli_commands.rs` - Tauri IPC command for spawning CLI processes and streaming output
- `src/components/detail/CliInvokePanel.tsx` - CLI invocation UI with command input, output display, exit code
- `src/types/cli.ts` - TypeScript types for CliOutput and CliComplete events
- `src-tauri/src/commands/mod.rs` - Added cli_commands module
- `src-tauri/src/lib.rs` - Registered run_cli_tool in generate_handler
- `src/lib/tauri.ts` - Added runCliTool API wrapper
- `src/components/detail/TaskDetail.tsx` - Integrated CliInvokePanel below AI suggestion panel

## Decisions Made
- Used tokio::process::Command with BufReader line streaming for real-time output (per RESEARCH.md recommendation)
- CLI panel gated on hasDefaultProvider() same as AI features for consistent feature gating
- Collapsible panel design with unicode arrows to keep TaskDetail clean when not in use

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CLI invocation mode complete alongside built-in AI assist
- Phase 05 (AI and Smart Scheduling) fully delivered
- Ready for Phase 06 polish and refinement

---
*Phase: 05-ai-and-smart-scheduling*
*Completed: 2026-03-19*
