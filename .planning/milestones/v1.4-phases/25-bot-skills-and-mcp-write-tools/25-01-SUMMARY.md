---
phase: 25-bot-skills-and-mcp-write-tools
plan: 01
subsystem: bot-skills
tags: [action-registry, shell-allowlist, security, tdd]
dependency_graph:
  requires: []
  provides: [ACTION_REGISTRY, ActionDefinition, getToolDefinitions, getAction, isDestructive, DEFAULT_ALLOWLIST, isCommandAllowed, parseBaseCommand]
  affects: [hub-chat-dispatch, mcp-write-tools, settings-ui]
tech_stack:
  added: []
  patterns: [shared-registry, allowlist-validation, injection-prevention]
key_files:
  created:
    - src/lib/actionRegistry.ts
    - src/lib/actionRegistry.test.ts
    - src/lib/shellAllowlist.ts
    - src/lib/shellAllowlist.test.ts
  modified: []
decisions:
  - "Registry uses flat array with find-by-name lookup (simple, 9 entries)"
  - "Shell metacharacter regex rejects all injection vectors in a single check"
  - "Multi-word command prefixes (git, npm, yarn, pnpm) parsed as 2-token base commands"
metrics:
  duration: 140s
  completed: "2026-04-02T10:39:47Z"
  tasks: 2
  files: 4
---

# Phase 25 Plan 01: Action Registry and Shell Allowlist Summary

Shared action registry defining all 9 bot skills with JSON Schema inputs, destructive flags, and Tauri command mappings, plus shell allowlist validation rejecting injection vectors via metacharacter detection and prefix-based command matching.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Create shared action registry with all bot skill definitions | bff2582 | src/lib/actionRegistry.ts, src/lib/actionRegistry.test.ts |
| 2 | Create shell allowlist validation with injection prevention | 79592e8 | src/lib/shellAllowlist.ts, src/lib/shellAllowlist.test.ts |

## Implementation Details

### Action Registry (src/lib/actionRegistry.ts)

- `ActionDefinition` interface: name, description, inputSchema, destructive, tauriCommand
- 9 registered actions per D-11: create_task, update_task, update_task_status, delete_task, update_phase_status, create_project, create_theme, create_file, execute_shell
- `getToolDefinitions()` generates LLM-compatible `{name, description, input_schema}` arrays (D-03)
- `getAction()` lookup by name, `isDestructive()` checks destructive flag
- Destructive actions: delete_task (D-12), execute_shell (D-06)

### Shell Allowlist (src/lib/shellAllowlist.ts)

- 20 default allowlist entries: git (4), npm/yarn/pnpm (3 each), Unix utils (8)
- `parseBaseCommand()` handles multi-word prefixes (git, npm, yarn, pnpm) vs single commands
- `isCommandAllowed()` rejects empty commands, shell metacharacters (`;|&\`$()><`), and non-allowlisted commands
- Supports custom allowlist entries for D-08 settings extension

### Test Coverage

- actionRegistry.test.ts: 10 tests (registry structure, D-11 completeness, D-12 destructive flags, tool definitions, lookup)
- shellAllowlist.test.ts: 24 tests (allowlist contents, allowed commands, 7 injection vectors, edge cases, custom entries, parsing)
- Total: 34 tests, all passing

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- both modules are fully implemented with no placeholder data.

## Decisions Made

1. Registry uses flat array with find-by-name lookup -- simple and sufficient for 9 entries
2. Shell metacharacter regex (`/[;|&\`$()><]/`) rejects all injection vectors in a single check before allowlist matching
3. Multi-word command prefixes (git, npm, yarn, pnpm) are parsed as 2-token base commands; all others as single-token

## Self-Check: PASSED

- All 4 created files exist on disk
- Both task commits (bff2582, 79592e8) found in git history
- 34/34 tests passing
