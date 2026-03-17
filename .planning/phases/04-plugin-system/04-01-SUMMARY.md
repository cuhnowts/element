---
phase: 04-plugin-system
plan: 01
subsystem: plugins, credentials, database
tags: [keyring, notify, plugin-host, credential-vault, tauri-ipc, sqlite-migration]

# Dependency graph
requires:
  - phase: 03-workflows-and-automation
    provides: "Arc<Mutex<Database>> pattern, Tauri IPC command patterns, existing migration chain (versions 1-4)"
provides:
  - "PluginManifest parsing and validation (manifest.rs)"
  - "PluginRegistry for tracking loaded plugins with status (registry.rs)"
  - "PluginHost with directory scanning and FS watcher hot-reload (plugins/mod.rs)"
  - "PluginApi trait defining plugin capability surface (api.rs)"
  - "CredentialManager with SQLite metadata + SecretStore trait abstraction (credentials/mod.rs)"
  - "KeychainStore and InMemoryStore SecretStore implementations (keychain.rs)"
  - "SQLite migration 005: plugins, credentials, calendar_accounts, calendar_events tables"
  - "Tauri IPC commands for plugin management (list, get, enable, disable, reload, scan)"
  - "Tauri IPC commands for credential CRUD (list, create, get_secret, update, delete)"
affects: [04-plugin-system, frontend-settings-ui, core-plugins, calendar-integration]

# Tech tracking
tech-stack:
  added: [keyring 3.6, notify 8, notify-debouncer-mini 0.7, jsonschema 0.28, tempfile 3]
  patterns: [SecretStore trait abstraction, PluginHost with FS watcher, Mutex-managed Tauri state for plugins and credentials]

key-files:
  created:
    - src-tauri/src/plugins/manifest.rs
    - src-tauri/src/plugins/registry.rs
    - src-tauri/src/plugins/api.rs
    - src-tauri/src/plugins/mod.rs
    - src-tauri/src/credentials/keychain.rs
    - src-tauri/src/credentials/mod.rs
    - src-tauri/src/db/sql/005_plugins_credentials_calendar.sql
    - src-tauri/src/commands/plugin_commands.rs
    - src-tauri/src/commands/credential_commands.rs
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/src/db/migrations.rs
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/lib.rs

key-decisions:
  - "Migration numbered 005 (not 002) because versions 1-4 already exist from prior phases"
  - "notify-debouncer-mini 0.7 (not 0.5) for compatibility with notify v8"
  - "PluginHost uses Arc<RwLock<PluginRegistry>> internally for concurrent read access"
  - "CredentialManager as Mutex<CredentialManager> Tauri state with Arc<Mutex<Database>> shared with existing commands"
  - "PluginInfo DTO with camelCase serialization and From<LoadedPlugin> conversion for clean IPC boundary"

patterns-established:
  - "SecretStore trait: abstracts keychain access, InMemoryStore for tests, KeychainStore for production"
  - "PluginInfo DTO: separate serializable struct for IPC, converted from internal LoadedPlugin"
  - "Plugin directory at app_data_dir/plugins, created automatically on startup"

requirements-completed: [PLUG-01, PLUG-02]

# Metrics
duration: 7min
completed: 2026-03-17
---

# Phase 04 Plan 01: Plugin Backend Foundation Summary

**Plugin manifest parsing with hot-reload FS watcher, credential vault with OS keychain abstraction, SQLite migration for 4 new tables, and 12 Tauri IPC commands for plugin and credential management**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-17T10:47:25Z
- **Completed:** 2026-03-17T10:54:49Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Plugin system foundation: manifest parsing, registry, PluginHost with directory scanning and debounced FS watcher for hot-reload
- Credential vault: CredentialManager with SQLite metadata storage and SecretStore trait (KeychainStore for production, InMemoryStore for tests)
- 12 new Tauri IPC commands registered: 7 for plugin management, 5 for credential CRUD
- Migration 005 creates plugins, credentials, calendar_accounts, and calendar_events tables
- 30 new unit tests (79 total), all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: SQLite migration, plugin manifest types, and credential manager** - `b9485c1` (feat)
2. **Task 2: Tauri IPC commands for plugin management and credential vault** - `09955d8` (feat)

## Files Created/Modified
- `src-tauri/src/plugins/manifest.rs` - PluginManifest, PluginCapability, StepTypeDefinition, load_plugin_manifest, PluginError
- `src-tauri/src/plugins/registry.rs` - PluginRegistry, LoadedPlugin, PluginStatus
- `src-tauri/src/plugins/api.rs` - PluginApi trait, HttpRequest/Response, ShellOutput
- `src-tauri/src/plugins/mod.rs` - PluginHost with scan_and_load, start_watching, get_plugin, set_enabled
- `src-tauri/src/credentials/keychain.rs` - SecretStore trait, KeychainStore, InMemoryStore
- `src-tauri/src/credentials/mod.rs` - CredentialManager with CRUD, Credential struct
- `src-tauri/src/db/sql/005_plugins_credentials_calendar.sql` - Migration for 4 new tables
- `src-tauri/src/db/migrations.rs` - Added version 5 migration block
- `src-tauri/src/commands/plugin_commands.rs` - 7 Tauri IPC commands, PluginInfo DTO
- `src-tauri/src/commands/credential_commands.rs` - 5 Tauri IPC commands
- `src-tauri/src/commands/mod.rs` - Added new command modules
- `src-tauri/src/lib.rs` - Module declarations, PluginHost/CredentialManager state setup, command registration
- `src-tauri/Cargo.toml` - Added keyring, notify, notify-debouncer-mini, jsonschema, tempfile

## Decisions Made
- Migration numbered 005 (not 002 as plan suggested) because versions 1-4 already taken by prior phases
- Used notify-debouncer-mini 0.7 instead of 0.5 for compatibility with notify v8 (0.5 depends on notify v7)
- PluginHost uses Arc<RwLock<PluginRegistry>> for concurrent read access during FS watcher callbacks
- CredentialManager managed as Mutex<CredentialManager> in Tauri state, sharing Arc<Mutex<Database>> with existing commands
- PluginInfo DTO as separate camelCase-serialized struct for clean IPC boundary

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration file numbered 005 instead of 002**
- **Found during:** Task 1 (SQLite migration)
- **Issue:** Plan specified 002_plugins_credentials_calendar.sql but migration versions 1-4 already exist
- **Fix:** Created 005_plugins_credentials_calendar.sql with `if version < 5` block
- **Files modified:** src-tauri/src/db/sql/005_plugins_credentials_calendar.sql, src-tauri/src/db/migrations.rs
- **Verification:** Migration test passes, creates all 4 tables
- **Committed in:** b9485c1

**2. [Rule 3 - Blocking] notify-debouncer-mini version upgrade from 0.5 to 0.7**
- **Found during:** Task 1 (PluginHost implementation)
- **Issue:** notify-debouncer-mini 0.5 depends on notify v7, incompatible with notify v8
- **Fix:** Updated Cargo.toml to use notify-debouncer-mini 0.7 which supports notify v8
- **Files modified:** src-tauri/Cargo.toml
- **Verification:** Compilation succeeds, FS watcher tests pass
- **Committed in:** b9485c1

---

**Total deviations:** 2 auto-fixed (both blocking issues)
**Impact on plan:** Both necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plugin system backend ready for frontend settings UI (Plan 02)
- Core plugins (Plan 03) can implement PluginApi trait
- Calendar integration (Plan 04) can use credential storage and calendar_accounts/events tables
- FS watcher provides hot-reload foundation for plugin development workflow

---
*Phase: 04-plugin-system*
*Completed: 2026-03-17*
