---
phase: 25-bot-skills-and-mcp-write-tools
plan: 04
subsystem: backend, ui, ai
tags: [tauri, rust, shell, allowlist, react, settings, agent-prompt]

requires:
  - phase: 25-01
    provides: shellAllowlist.ts with DEFAULT_ALLOWLIST and isCommandAllowed
provides:
  - execute_bot_shell Tauri command with allowlist enforcement and metacharacter rejection
  - ShellOutputBlock component for collapsible shell output in chat
  - ShellAllowlistSettings component for managing custom shell commands
  - Updated agent system prompt with 18 tools (10 read + 8 write)
affects: [25-05, hub-chat, agent-panel]

tech-stack:
  added: []
  patterns:
    - "Rust-side allowlist enforcement mirrors TS-side shellAllowlist.ts defaults"
    - "App settings key shell_allowlist stores comma-separated custom commands"

key-files:
  created:
    - src-tauri/src/commands/shell_commands.rs
    - src/components/hub/ShellOutputBlock.tsx
    - src/components/settings/ShellAllowlistSettings.tsx
  modified:
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/lib.rs
    - src/components/settings/AiSettings.tsx
    - src/hooks/useAgentMcp.ts

key-decisions:
  - "Added cargo, docker, kubectl to MULTI_WORD_PREFIXES for consistent base-command parsing"
  - "Shell metacharacter rejection at Rust level prevents injection regardless of frontend validation"

patterns-established:
  - "Tauri shell commands validate against both default and custom allowlists before delegating to ShellPlugin"
  - "Shell output truncation at 50K chars in backend, 200-line display limit in frontend"

requirements-completed: [SKILL-02, SKILL-03]

duration: 4min
completed: 2026-04-02
---

# Phase 25 Plan 04: Shell Execution, Output UI, and Agent Prompt Summary

**Bot shell execution with Rust-side allowlist enforcement, collapsible output renderer, settings UI for custom allowlist, and 18-tool agent system prompt**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T10:44:13Z
- **Completed:** 2026-04-02T10:48:52Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- execute_bot_shell Tauri command validates commands against default + custom allowlists, rejects shell metacharacters, delegates to ShellPlugin with 30s timeout
- ShellOutputBlock renders collapsible code blocks with auto-expand for short output, truncation at 200 lines, 400px max height, error/timeout states
- ShellAllowlistSettings provides read-only default badge list and editable custom commands persisted to app_settings
- Agent system prompt now lists all 18 MCP tools including 8 write tools

## Task Commits

Each task was committed atomically:

1. **Task 1: Create execute_bot_shell Tauri command with allowlist enforcement** - `6ac886e` (feat)
2. **Task 2: Create ShellOutputBlock, ShellAllowlistSettings components, and update agent prompt** - `8f24e28` (feat)

## Files Created/Modified
- `src-tauri/src/commands/shell_commands.rs` - Tauri command with allowlist validation, metacharacter rejection, ShellPlugin delegation, 8 unit tests
- `src-tauri/src/commands/mod.rs` - Added shell_commands module declaration
- `src-tauri/src/lib.rs` - Registered execute_bot_shell in invoke_handler
- `src/components/hub/ShellOutputBlock.tsx` - Collapsible shell output with auto-expand, truncation, error states
- `src/components/settings/ShellAllowlistSettings.tsx` - Settings panel for custom shell allowlist management
- `src/components/settings/AiSettings.tsx` - Integrated ShellAllowlistSettings between CLI Tool and Providers sections
- `src/hooks/useAgentMcp.ts` - Added 8 write tools to agent system prompt

## Decisions Made
- Extended MULTI_WORD_PREFIXES to include cargo, docker, kubectl beyond the plan's git/npm/yarn/pnpm to handle common custom allowlist entries correctly
- Metacharacter rejection happens at Rust level as defense-in-depth, independent of frontend validation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extended MULTI_WORD_PREFIXES for custom command matching**
- **Found during:** Task 1 (unit test for custom allowlist)
- **Issue:** Custom entry "cargo build" failed because cargo wasn't in multi_word prefixes, so parse_base_command returned "cargo" instead of "cargo build"
- **Fix:** Created MULTI_WORD_PREFIXES const including cargo, docker, kubectl alongside git, npm, yarn, pnpm
- **Files modified:** src-tauri/src/commands/shell_commands.rs
- **Verification:** All 8 unit tests pass including custom allowlist test
- **Committed in:** 6ac886e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for correct custom allowlist matching. No scope creep.

## Issues Encountered
- Pre-existing: `cargo build` fails due to missing ../dist directory (tauri::generate_context! macro). Worked around by creating empty dist dir for `cargo check` and `cargo test`. Not related to this plan's changes.
- Pre-existing: 2 test files from Wave 1 (mcp-server) fail due to better-sqlite3 import resolution. Not related to this plan.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all components are fully wired with data sources.

## Next Phase Readiness
- Shell execution infrastructure complete for hub chat integration
- ShellOutputBlock ready to be rendered inline in chat messages
- Agent prompt includes all tools for orchestrator conversations

## Self-Check: PASSED

All 3 created files verified on disk. Both commit hashes (6ac886e, 8f24e28) verified in git log.

---
*Phase: 25-bot-skills-and-mcp-write-tools*
*Completed: 2026-04-02*
