# Coverage Baselines

**Generated:** 2026-04-05
**Purpose:** Track tested vs untested modules for both Vitest and cargo test suites.
Parseable by Phase 40 MCP server.

## TypeScript (Vitest)

### Coverage Target: src/lib/

| File | Test File | Stmts | Branch | Funcs | Lines |
|------|-----------|-------|--------|-------|-------|
| src/lib/actionRegistry.ts | actionRegistry.test.ts | 100% | 50% | 100% | 100% |
| src/lib/date-utils.ts | date-utils.test.ts | 100% | 100% | 100% | 100% |
| src/lib/shellAllowlist.ts | shellAllowlist.test.ts | 100% | 100% | 100% | 100% |
| src/lib/errorLogger.ts | (indirect) | 100% | 90.9% | 90% | 100% |
| src/lib/utils.ts | (none) | 100% | 100% | 100% | 100% |
| src/lib/tauri.ts | (none) | 4.44% | 100% | 3.37% | 4.44% |
| src/lib/tauri-commands.ts | (none) | 0% | 0% | 0% | 0% |
| src/lib/types.ts | (none) | 0% | 100% | 100% | 0% |

### Coverage Summary

| Metric | Value |
|--------|-------|
| Statements | 71.24% (270/379) |
| Branches | 89.81% (97/108) |
| Functions | 43.22% (83/192) |
| Lines | 69.88% (253/362) |

### Not Targeted (out of scope per D-01)
- src/components/ — UI verified via screenshots, not automated tests
- src/stores/ — have tests but not targeted for coverage reporting
- src/hooks/ — have tests but not targeted for coverage reporting

## Rust (cargo test)

**Total: 297 tests passing**

### Models (src-tauri/src/models/)

| File | #[test] count | Status |
|------|---------------|--------|
| task.rs | 14 | Covered |
| project.rs | 11 | Covered |
| theme.rs | 8 | Covered |
| phase.rs | 7 | Covered |
| schedule.rs | 3 | Covered |
| tag.rs | 6 | Covered |
| execution.rs | 8 | Covered |
| scoring.rs | 10 | Covered |
| workflow.rs | 5 | Covered |
| manifest.rs | 3 | Covered |
| planning_sync.rs | 13 | Covered |
| onboarding.rs | 45 | Covered |
| notification.rs | 0 | Not covered |
| mod.rs | 0 | Module re-exports only |

### Scheduling (src-tauri/src/scheduling/)

| File | #[test] count | Status |
|------|---------------|--------|
| time_blocks.rs | 6 | Covered |
| assignment.rs | 12 | Covered |
| types.rs | 0 | Type definitions only |
| mod.rs | 0 | Module re-exports only |

### Commands with Integration Tests (src-tauri/src/commands/)

| File | #[test] count | Status |
|------|---------------|--------|
| task_commands.rs | 3 | Covered (new in Phase 37) |
| project_commands.rs | 2 | Covered (new in Phase 37) |
| theme_commands.rs | 2 | Covered (new in Phase 37) |
| phase_commands.rs | 2 | Covered (new in Phase 37) |
| shell_commands.rs | 8 | Covered |
| manifest_commands.rs | 6 | Covered |
| file_explorer_commands.rs | 4 | Covered |
| plugin_commands.rs | 3 | Covered |
| scheduling_commands.rs | 3 | Covered |

### Commands Without Tests (out of scope per D-09)

| File | Reason |
|------|--------|
| ai_commands.rs | External AI providers |
| calendar_commands.rs | OAuth/external calendar APIs |
| credential_commands.rs | Keychain access |
| cli_commands.rs | External CLI processes |
| heartbeat_commands.rs | Background scheduler + AI |
| hub_chat_commands.rs | AI provider dependency |
| execution_commands.rs | May be testable in future |
| notification_commands.rs | May be testable in future |
| onboarding_commands.rs | May be testable in future |
| planning_sync_commands.rs | May be testable in future |
| schedule_commands.rs | May be testable in future |
| workflow_commands.rs | May be testable in future |

### Plugins (src-tauri/src/plugins/)

| File | #[test] count | Status |
|------|---------------|--------|
| plugins/mod.rs | 6 | Covered |
| plugins/registry.rs | 5 | Covered |
| plugins/manifest.rs | 6 | Covered |
| plugins/core/mod.rs | 6 | Covered |
| plugins/core/http.rs | 5 | Covered |
| plugins/core/calendar.rs | 28 | Covered |

### Heartbeat (src-tauri/src/heartbeat/)

| File | #[test] count | Status |
|------|---------------|--------|
| heartbeat/mod.rs | 6 | Covered |
| heartbeat/risk.rs | 10 | Covered |
| heartbeat/summary.rs | 6 | Covered |

### Engine (src-tauri/src/engine/)

| File | #[test] count | Status |
|------|---------------|--------|
| engine/executor.rs | 4 | Covered |

### Credentials (src-tauri/src/credentials/)

| File | #[test] count | Status |
|------|---------------|--------|
| credentials/mod.rs | 6 | Covered |
| credentials/keychain.rs | 4 | Covered |

## Summary

| Suite | Tested Modules | Untested Modules | Total Tests |
|-------|----------------|------------------|-------------|
| Vitest (src/lib/) | 5 | 3 | 21 |
| Rust models | 12 | 1 (notification.rs) | 133 |
| Rust scheduling | 2 | 0 | 18 |
| Rust commands | 9 | 12 | 33 |
| Rust plugins | 6 | 0 | 56 |
| Rust heartbeat | 3 | 0 | 22 |
| Rust engine | 1 | 0 | 4 |
| Rust credentials | 2 | 0 | 10 |
| **Total** | **40** | **16** | **297** |
