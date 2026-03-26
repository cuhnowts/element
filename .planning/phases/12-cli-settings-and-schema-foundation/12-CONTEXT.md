# Phase 12: CLI Settings and Schema Foundation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Configurable AI terminal tool in Settings, schema additions for planning tier and sync source tagging, and CLI validation before launch. This phase replaces the hardcoded `claude --dangerously-skip-permissions` with a user-configurable command, adds the `planning_tier` column (replacing dead `ai_mode`), and adds `source` tagging to phases and tasks for future sync.

</domain>

<decisions>
## Implementation Decisions

### CLI Tool Setting UX
- **D-01:** CLI tool setting lives in the existing AI Providers tab, which gets renamed from "AI Providers" to "AI"
- **D-02:** Input is two separate fields: command (e.g., `claude`, `aider`) and default arguments (e.g., `--dangerously-skip-permissions`)
- **D-03:** Default is empty (no pre-filled command). When user clicks "Open AI" without configuring, show a toast directing them to Settings > AI
- **D-04:** Both fields stored in `app_settings` table (keys: `cli_command`, `cli_args` or similar)

### CLI Validation Behavior
- **D-05:** Validation runs on "Open AI" click, not on save in Settings
- **D-06:** Validation method: spawn `[tool] --version` on the Rust backend and check exit code. Confirms the tool actually runs, not just that a binary exists
- **D-07:** If tool is missing/fails: toast error with message directing user to Settings > AI. Uses existing toast pattern
- **D-08:** If no CLI tool is configured at all: toast "No AI tool configured. Set one up in Settings > AI."

### Planning Tier Storage
- **D-09:** Replace the dead `ai_mode` column on `projects` table with `planning_tier`. The `ai_mode` column was from a removed per-project AI mode feature
- **D-10:** Tier values: `quick`, `medium`, `full` (not "gsd" — more user-facing friendly). NULL means no tier selected yet
- **D-11:** `planning_tier` exposed in the Project struct to the frontend as `Option<String>`
- **D-12:** Dedicated `set_planning_tier(project_id, tier)` Tauri command for Phase 14 to call from the tier selection dialog

### Sync Source Tagging
- **D-13:** Add `source` TEXT NOT NULL DEFAULT 'user' column to both `phases` and `tasks` tables
- **D-14:** Values: `user` (default, all existing rows) or `sync` (for Phase 15 to use when importing from .planning/)
- **D-15:** `source` field exposed in Phase and Task structs so the frontend can read it

### Claude's Discretion
- Storage key naming for CLI command/args in app_settings (e.g., `cli_command`/`cli_args` vs `ai_cli_command`/`ai_cli_args`)
- Migration numbering (next after 009)
- Whether to clean up dead ai_mode references in frontend code during the column replacement

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Settings UI
- `src/components/settings/AiSettings.tsx` — Current AI Providers tab, will gain CLI tool section
- `src/components/settings/SettingsNav.tsx` — Tab navigation, "AI Providers" label rename to "AI"
- `src/components/settings/SettingsPage.tsx` — Settings routing, tab heading map needs update

### CLI Integration
- `src/components/center/OpenAiButton.tsx` — Hardcoded `claude` + `--dangerously-skip-permissions`, must read from settings
- `src-tauri/src/commands/cli_commands.rs` — Existing `run_cli_tool` command for reference
- `src/stores/useWorkspaceStore.ts` — `launchTerminalCommand(command, args)` already accepts arbitrary command/args

### Database & Models
- `src-tauri/src/db/migrations.rs` — Migration runner, add migration 010
- `src-tauri/src/db/sql/009_ai_onboarding.sql` — Created `app_settings` table and `ai_mode` column
- `src-tauri/src/models/project.rs` — Project struct (add planning_tier), get_app_setting/set_app_setting methods
- `src-tauri/src/models/phase.rs` — Phase struct, add source field
- `src-tauri/src/models/task.rs` — Task struct, add source field

### Tauri Commands
- `src-tauri/src/commands/mod.rs` — Command registration
- `src-tauri/src/lib.rs` — App builder, command registration
- `src/lib/tauri.ts` — Frontend API bindings

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app_settings` table: Already exists with key/value store — CLI command/args can use this directly
- `get_app_setting` / `set_app_setting` methods: Ready to use on Database struct
- `toast` from sonner: Used throughout for error messaging, consistent with D-07/D-08
- `launchTerminalCommand(command, args)`: Already accepts arbitrary command/args — just need to read from settings instead of hardcoding

### Established Patterns
- Migration system: SQL files in `src-tauri/src/db/sql/`, version-numbered, run via `migrations.rs`
- Tauri commands: `#[tauri::command]` in `commands/` directory, registered in `lib.rs`
- Frontend API: `api.*` wrappers in `src/lib/tauri.ts`
- Settings tabs: Component per tab, registered in `SettingsNav.tsx` and `SettingsPage.tsx`

### Integration Points
- `OpenAiButton.tsx` line 32: Replace hardcoded `launchTerminalCommand("claude", [...])` with settings-based command
- `SettingsNav.tsx` tabs array: Add/rename tab entry
- `SettingsPage.tsx` tabHeadings: Update heading map
- Migration 010: Column additions and ai_mode replacement

</code_context>

<specifics>
## Specific Ideas

- Use `full` instead of `gsd` for the planning tier value — GSD is an internal tool name the user wouldn't recognize
- The `ai_mode` column is confirmed dead code from a removed feature (per-project AI mode removed in v1.1) — safe to replace
- The `--dangerously-skip-permissions` flag is broken after claude v2.1.77, so the args field gives users a way to configure whatever flags their tool version supports

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-cli-settings-and-schema-foundation*
*Context gathered: 2026-03-26*
