---
phase: 05-ai-and-smart-scheduling
plan: 01
subsystem: database, ai, scheduling
tags: [rusqlite, keyring, async-trait, thiserror, ai-provider, scheduling]

requires:
  - phase: 04-plugin-system
    provides: "Plugin host, credential manager, keychain abstraction"
provides:
  - "ai_providers, work_hours, scheduled_blocks database tables"
  - "AiProvider trait for provider implementations"
  - "AI type definitions (CompletionRequest, CompletionResponse, TaskScaffold, AiError)"
  - "Scheduling type definitions (WorkHoursConfig, ScheduleBlock, TaskWithPriority)"
  - "OS keychain credential storage for AI API keys"
  - "Task model estimated_minutes field for AI-estimated duration"
affects: [05-02, 05-03, 05-04]

tech-stack:
  added: [futures, tokio-stream, async-trait, thiserror]
  patterns: [ai-provider-trait, credential-key-keychain-reference, migration-versioning]

key-files:
  created:
    - src-tauri/src/db/sql/006_ai_scheduling.sql
    - src-tauri/src/ai/mod.rs
    - src-tauri/src/ai/types.rs
    - src-tauri/src/ai/provider.rs
    - src-tauri/src/ai/credentials.rs
    - src-tauri/src/scheduling/mod.rs
    - src-tauri/src/scheduling/types.rs
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/src/db/migrations.rs
    - src-tauri/src/models/task.rs
    - src-tauri/src/commands/task_commands.rs
    - src-tauri/src/lib.rs

key-decisions:
  - "Migration numbered 006 (not 002) because versions 1-5 already taken by prior phases"
  - "estimated_minutes added as separate field from existing duration_minutes (AI estimation vs user-set)"
  - "AI credential module uses separate service name com.element.ai-providers from main keychain"

patterns-established:
  - "AiProvider async trait: complete, complete_stream, test_connection, list_models"
  - "credential_key pattern: SQLite stores reference key, OS keychain stores secret"

requirements-completed: [AI-01, SCHED-01, SCHED-02]

duration: 8min
completed: 2026-03-19
---

# Phase 05 Plan 01: AI & Scheduling Data Layer Summary

**Rust foundation for AI providers and smart scheduling: database migration with ai_providers/work_hours/scheduled_blocks tables, AiProvider trait, type definitions, OS keychain credential storage, and task estimated_minutes field**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-19T01:17:45Z
- **Completed:** 2026-03-19T01:26:00Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Database migration 006 creates ai_providers (with credential_key, not api_key), work_hours, and scheduled_blocks tables
- AiProvider trait defined with complete, complete_stream, test_connection, list_models async methods
- Full AI type system: ProviderType, AiProviderConfig, CompletionRequest/Response, TaskScaffold, AiError
- Scheduling types: BlockType, WorkHoursConfig, ScheduleBlock, CalendarEvent, TaskWithPriority
- Task model extended with estimated_minutes field for AI-estimated task duration
- OS keychain credential storage wrapper for AI provider API keys
- All 123 existing tests pass with new fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration, Cargo deps, credential storage, and task model extension** - `4e37e67` (feat)
2. **Task 2: AI and scheduling type definitions and module scaffolding** - `f454018` (feat)

## Files Created/Modified
- `src-tauri/src/db/sql/006_ai_scheduling.sql` - Migration for ai_providers, work_hours, scheduled_blocks tables and estimated_minutes column
- `src-tauri/src/ai/mod.rs` - AI module declarations
- `src-tauri/src/ai/types.rs` - ProviderType, AiProviderConfig, CompletionRequest/Response, TaskScaffold, AiError
- `src-tauri/src/ai/provider.rs` - AiProvider async trait definition
- `src-tauri/src/ai/credentials.rs` - OS keychain wrapper for AI API key storage
- `src-tauri/src/scheduling/mod.rs` - Scheduling module declarations
- `src-tauri/src/scheduling/types.rs` - WorkHoursConfig, ScheduleBlock, CalendarEvent, TaskWithPriority
- `src-tauri/Cargo.toml` - Added futures, tokio-stream, async-trait, thiserror dependencies
- `src-tauri/src/db/migrations.rs` - Version 6 migration block
- `src-tauri/src/models/task.rs` - Added estimated_minutes field to Task, CreateTaskInput, UpdateTaskInput
- `src-tauri/src/commands/task_commands.rs` - Added estimated_minutes parameter to create/update commands
- `src-tauri/src/lib.rs` - Added mod ai and mod scheduling declarations

## Decisions Made
- Migration numbered 006 (not 002 as planned) because versions 1-5 already taken by prior phases
- estimated_minutes added as a separate field from the existing duration_minutes, since they serve different purposes (AI estimation vs user-specified duration)
- AI credential module uses separate service name "com.element.ai-providers" to distinguish from the general credential manager's "com.element.app"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted migration numbering and task model fields to existing codebase state**
- **Found during:** Task 1
- **Issue:** Plan assumed migration 002 and adding due_date to tasks, but codebase was at migration 005 with due_date already present from Phase 02.1
- **Fix:** Used migration 006, only added estimated_minutes (not due_date which already existed), updated all test files with the new field
- **Files modified:** All model test files (execution.rs, project.rs, tag.rs, workflow.rs)
- **Verification:** cargo test passes with 123 tests
- **Committed in:** 4e37e67

---

**Total deviations:** 1 auto-fixed (1 blocking adaptation)
**Impact on plan:** Adaptation necessary due to plan being written before prior phases added scheduling fields. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All AI and scheduling types are compiled and importable by downstream plans
- AiProvider trait ready for concrete provider implementations (05-02)
- Database tables ready for CRUD operations (05-02)
- Task model ready for AI-estimated duration population

---
*Phase: 05-ai-and-smart-scheduling*
*Completed: 2026-03-19*
