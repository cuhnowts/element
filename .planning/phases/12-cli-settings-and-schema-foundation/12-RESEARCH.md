# Phase 12: CLI Settings and Schema Foundation - Research

**Researched:** 2026-03-27
**Domain:** Tauri app settings UI, SQLite schema migration, CLI tool validation
**Confidence:** HIGH

## Summary

Phase 12 is a well-scoped "plumbing + minor UI" phase. It adds a CLI tool configuration section to the existing AI settings tab, replaces the dead `ai_mode` column with `planning_tier`, adds `source` tagging to phases and tasks, and introduces CLI validation on the "Open AI" button click path. All four requirements (CLI-01, CLI-02, PLAN-05, SYNC-04) map cleanly to existing patterns already established in the codebase.

The codebase has strong conventions: SQL migration files numbered sequentially, `#[tauri::command]` handlers in dedicated command modules, frontend API wrappers in `src/lib/tauri.ts`, and TypeScript types in `src/lib/types.ts`. The phase requires no new libraries, no new shadcn components, and no architectural departures. The existing `app_settings` key-value table, `get_app_setting`/`set_app_setting` methods, `launchTerminalCommand` store action, and `toast` patterns provide all the building blocks.

**Primary recommendation:** Follow existing migration and command patterns exactly. The biggest implementation risk is ensuring all SELECT queries across `project.rs`, `phase.rs`, and `task.rs` are updated to include the new columns -- missing one causes a runtime column-index mismatch error in rusqlite.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** CLI tool setting lives in the existing AI Providers tab, which gets renamed from "AI Providers" to "AI"
- **D-02:** Input is two separate fields: command (e.g., `claude`, `aider`) and default arguments (e.g., `--dangerously-skip-permissions`)
- **D-03:** Default is empty (no pre-filled command). When user clicks "Open AI" without configuring, show a toast directing them to Settings > AI
- **D-04:** Both fields stored in `app_settings` table (keys: `cli_command`, `cli_args` or similar)
- **D-05:** Validation runs on "Open AI" click, not on save in Settings
- **D-06:** Validation method: spawn `[tool] --version` on the Rust backend and check exit code. Confirms the tool actually runs, not just that a binary exists
- **D-07:** If tool is missing/fails: toast error with message directing user to Settings > AI. Uses existing toast pattern
- **D-08:** If no CLI tool is configured at all: toast "No AI tool configured. Set one up in Settings > AI."
- **D-09:** Replace the dead `ai_mode` column on `projects` table with `planning_tier`. The `ai_mode` column was from a removed per-project AI mode feature
- **D-10:** Tier values: `quick`, `medium`, `full` (not "gsd" -- more user-facing friendly). NULL means no tier selected yet
- **D-11:** `planning_tier` exposed in the Project struct to the frontend as `Option<String>`
- **D-12:** Dedicated `set_planning_tier(project_id, tier)` Tauri command for Phase 14 to call from the tier selection dialog
- **D-13:** Add `source` TEXT NOT NULL DEFAULT 'user' column to both `phases` and `tasks` tables
- **D-14:** Values: `user` (default, all existing rows) or `sync` (for Phase 15 to use when importing from .planning/)
- **D-15:** `source` field exposed in Phase and Task structs so the frontend can read it

### Claude's Discretion
- Storage key naming for CLI command/args in app_settings (e.g., `cli_command`/`cli_args` vs `ai_cli_command`/`ai_cli_args`)
- Migration numbering (next after 009)
- Whether to clean up dead ai_mode references in frontend code during the column replacement

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLI-01 | User can set the AI terminal command in Settings (replaces hardcoded claude) | D-01 through D-04: CLI tool section in AiSettings.tsx with two fields stored in app_settings table via existing get/set methods |
| CLI-02 | App validates CLI tool availability before launching and shows actionable error if missing | D-05 through D-08: New `validate_cli_tool` Tauri command spawns `[tool] --version`, OpenAiButton calls it before launch |
| PLAN-05 | User's tier choice is stored per-project so subsequent "Open AI" clicks skip the tier dialog | D-09 through D-12: Replace ai_mode with planning_tier column, expose in Project struct, dedicated set_planning_tier command |
| SYNC-04 | Phases and tasks created by sync are tagged with source so the app knows they originated externally | D-13 through D-15: Add source column to phases and tasks tables, expose in structs |
</phase_requirements>

## Architecture Patterns

### Migration 010 SQL Structure

The next migration is `010_cli_planning_sync.sql`. It must handle three concerns in a single migration file:

```sql
-- 1. Replace dead ai_mode with planning_tier on projects
-- SQLite cannot DROP COLUMN (pre-3.35.0), but Tauri's bundled SQLite is modern enough.
-- However, the safe pattern used throughout this codebase is ALTER TABLE ADD COLUMN.
-- Since ai_mode has a NOT NULL DEFAULT constraint, we cannot just drop it without
-- risking issues. Safest approach: add planning_tier, leave ai_mode in place (dead column).
-- The column is small and harmless. Alternatively, if SQLite >= 3.35.0 is confirmed,
-- ALTER TABLE projects DROP COLUMN ai_mode is valid.

ALTER TABLE projects ADD COLUMN planning_tier TEXT
    CHECK(planning_tier IN ('quick', 'medium', 'full'));

-- 2. Add source column to phases
ALTER TABLE phases ADD COLUMN source TEXT NOT NULL DEFAULT 'user'
    CHECK(source IN ('user', 'sync'));

-- 3. Add source column to tasks
ALTER TABLE tasks ADD COLUMN source TEXT NOT NULL DEFAULT 'user'
    CHECK(source IN ('user', 'sync'));
```

**Key insight about ai_mode:** The `ai_mode` column was added in migration 009 with `NOT NULL DEFAULT 'on-demand'` and a CHECK constraint. Since no frontend code references it (confirmed by grep), it is dead code. The cleanest approach is to add `planning_tier` as a new nullable column and leave `ai_mode` in place -- it costs nothing in SQLite and avoids any ALTER TABLE DROP COLUMN compatibility concerns.

### Struct Update Pattern

Every struct that maps to a table with new columns must be updated in lockstep:

1. **Rust struct** -- add field with correct serde attribute
2. **SELECT query** -- add column to the column list
3. **row mapping** -- add `row.get(N)?` at the correct index
4. **Frontend type** -- add field to TypeScript interface
5. **Frontend API** -- no changes needed if the field is just returned from existing queries

For `Project`:
- Add `planning_tier: Option<String>` to struct
- Update all 3 SELECT queries in `project.rs` (list_projects, get_project, and the one in update_project)
- Update `row.get` indices

For `Phase`:
- Add `source: String` to struct
- Update all SELECT queries in `phase.rs`
- Update `row.get` indices

For `Task`:
- Add `source: String` to struct
- Update `TASK_COLUMNS` constant (add `source` column)
- Update `row_to_task` function (add `row.get` for new index)
- Update `create_task` INSERT to include source column

### Tauri Command Pattern for validate_cli_tool

The validation command should use `tokio::process::Command` (already used in `cli_commands.rs`) to spawn `[tool] --version`:

```rust
#[tauri::command]
pub async fn validate_cli_tool(command: String) -> Result<bool, String> {
    use tokio::process::Command as TokioCommand;

    let result = TokioCommand::new(&command)
        .arg("--version")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .await;

    match result {
        Ok(status) => Ok(status.success()),
        Err(_) => Ok(false), // Command not found or failed to spawn
    }
}
```

This returns `Ok(false)` rather than `Err(...)` when the tool is missing, because "tool not found" is an expected validation result, not an error. The frontend uses the boolean to decide which toast to show.

### OpenAiButton Integration Pattern

The updated flow in `OpenAiButton.tsx`:

```typescript
const handleOpenAi = async () => {
  // 1. Read CLI settings
  const command = await api.getAppSetting("cli_command");
  const args = await api.getAppSetting("cli_args");

  if (!command) {
    toast.error("No AI tool configured. Set one up in Settings > AI.");
    return;
  }

  // 2. Validate tool exists (D-05: validation on click, not on save)
  const isValid = await api.validateCliTool(command);
  if (!isValid) {
    toast.error(`${command} not found on your system. Check the command in Settings > AI.`);
    return;
  }

  // 3. Generate context and launch
  const contextPath = await api.generateContextFile(projectId);
  await api.startPlanWatcher(directoryPath);

  const argsList = args ? args.split(/\s+/).filter(Boolean) : [];
  argsList.push(contextPath);

  launchTerminalCommand(command, argsList);
};
```

### Settings Key Naming (Claude's Discretion)

Use `cli_command` and `cli_args` as the app_settings keys. The `ai_` prefix is unnecessary because the app_settings table is a general-purpose store and the keys are self-descriptive. This matches the concise naming style of existing code.

### Dead ai_mode Cleanup (Claude's Discretion)

Do NOT clean up `ai_mode` references in frontend code during this phase because there are none -- grep confirms zero frontend references. The column itself in the database is harmless dead weight. If a future migration needs to drop it, that can be done then.

### Recommended File Touches

```
src-tauri/src/db/sql/010_cli_planning_sync.sql    # NEW: migration
src-tauri/src/db/migrations.rs                     # ADD: version < 10 block
src-tauri/src/models/project.rs                    # EDIT: add planning_tier field, update queries
src-tauri/src/models/phase.rs                      # EDIT: add source field, update queries
src-tauri/src/models/task.rs                       # EDIT: add source field, update TASK_COLUMNS/row_to_task
src-tauri/src/commands/onboarding_commands.rs       # EDIT: add validate_cli_tool command
src-tauri/src/lib.rs                               # EDIT: register validate_cli_tool + set_planning_tier
src/lib/tauri.ts                                   # EDIT: add validateCliTool + setPlanningTier API wrappers
src/lib/types.ts                                   # EDIT: add planningTier to Project, source to Phase/Task
src/components/settings/AiSettings.tsx              # EDIT: add CLI Tool section
src/components/settings/SettingsNav.tsx             # EDIT: rename "AI Providers" to "AI"
src/components/settings/SettingsPage.tsx            # EDIT: update tabHeadings
src/components/center/OpenAiButton.tsx              # EDIT: read from settings, add validation
```

### Anti-Patterns to Avoid
- **Column index mismatch:** When adding columns to a table, every `row.get(N)` call in the corresponding model must be re-indexed. Missing one causes a runtime panic, not a compile error.
- **Forgetting CHECK constraints:** The `planning_tier` and `source` columns use CHECK constraints for data integrity. Omitting these allows garbage values.
- **Splitting args with spaces naively:** The CLI args field stores a string like `--dangerously-skip-permissions --verbose`. Splitting on whitespace is sufficient for this use case (tool flags), but be aware it does not handle quoted arguments. This is acceptable per the phase scope.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Key-value settings storage | Custom settings table/ORM | Existing `app_settings` table + `get_app_setting`/`set_app_setting` | Already built and tested |
| CLI tool existence check | Custom PATH lookup or `which` | Spawn `[tool] --version` via tokio Command | Actually confirms tool runs, not just exists on PATH |
| Toast notifications | Custom notification system | `toast` from sonner (already used) | Consistent UX pattern |
| Terminal launch | Custom PTY spawn | `launchTerminalCommand` from useWorkspaceStore | Already handles session key, drawer state |

## Common Pitfalls

### Pitfall 1: Column Index Drift in rusqlite
**What goes wrong:** Adding a column to a table but not updating the positional index in `row.get(N)` calls, or updating SELECT column lists inconsistently across methods.
**Why it happens:** rusqlite uses positional indexing, not named columns. The `project.rs` model has 3 separate SELECT queries that all need the same column list update.
**How to avoid:** Update the struct, then grep for every SELECT on that table. Use a `COLUMNS` constant like `task.rs` does (`TASK_COLUMNS`) for consistency.
**Warning signs:** Runtime panic on "column index out of range" or wrong data in wrong fields.

### Pitfall 2: CREATE_TASK INSERT Missing New Column
**What goes wrong:** The `create_task` and `batch_create_plan` INSERT statements don't include the `source` column, but since `source` has `DEFAULT 'user'`, user-created items work fine. However, Phase 15's sync code will need to pass `source: 'sync'`.
**Why it happens:** DEFAULT makes it invisible until sync needs it.
**How to avoid:** For Phase 12, the DEFAULT handles it. But ensure the `CreateTaskInput` / `CreatePhaseInput` structs do NOT add a source field yet -- Phase 15 will add that when it needs to create sync-sourced items.

### Pitfall 3: validate_cli_tool Timeout
**What goes wrong:** If a misconfigured command spawns and hangs (doesn't exit), the UI freezes waiting.
**Why it happens:** `--version` on most CLI tools exits immediately, but a misconfigured binary might not.
**How to avoid:** Add a timeout to the validation spawn (e.g., 5 seconds). Use `tokio::time::timeout` wrapping the status await.

### Pitfall 4: Args Splitting Edge Cases
**What goes wrong:** User enters args with quoted paths like `--config "/path with spaces/config.yml"` and naive whitespace split breaks it.
**Why it happens:** `split_whitespace()` doesn't respect quotes.
**How to avoid:** For Phase 12, document this as a known limitation. The target use case is simple flags (`--dangerously-skip-permissions`, `--verbose`). If needed later, use shell-words crate for proper parsing.

### Pitfall 5: Forgetting to Register Command in lib.rs
**What goes wrong:** New Tauri command compiles but frontend gets "command not found" error at runtime.
**Why it happens:** Tauri requires explicit registration in `generate_handler![]` macro.
**How to avoid:** Every new `#[tauri::command]` must be added to the `invoke_handler` list in `lib.rs` AND imported at the top of the file.

## Code Examples

### Migration 010 SQL

```sql
-- Migration 010: CLI settings schema, planning tier, sync source tagging

-- Add planning_tier to projects (replaces dead ai_mode conceptually)
-- NULL = no tier selected yet; values: quick, medium, full
ALTER TABLE projects ADD COLUMN planning_tier TEXT
    CHECK(planning_tier IN ('quick', 'medium', 'full'));

-- Add source tagging to phases (for sync in Phase 15)
ALTER TABLE phases ADD COLUMN source TEXT NOT NULL DEFAULT 'user'
    CHECK(source IN ('user', 'sync'));

-- Add source tagging to tasks (for sync in Phase 15)
ALTER TABLE tasks ADD COLUMN source TEXT NOT NULL DEFAULT 'user'
    CHECK(source IN ('user', 'sync'));
```

### Updated Project Struct (Rust)

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub directory_path: Option<String>,
    pub theme_id: Option<String>,
    pub planning_tier: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
```

### set_planning_tier Database Method

```rust
pub fn set_planning_tier(
    &self,
    project_id: &str,
    tier: Option<&str>,
) -> Result<Project, rusqlite::Error> {
    let now = chrono::Utc::now().to_rfc3339();
    self.conn().execute(
        "UPDATE projects SET planning_tier = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![tier, now, project_id],
    )?;
    self.get_project(project_id)
}
```

### CLI Tool Settings Form (AiSettings.tsx addition)

```tsx
// New section added above existing AI Providers content
<div className="mb-6 space-y-4">
  <div>
    <h2 className="text-base font-semibold">CLI Tool</h2>
    <p className="text-sm text-muted-foreground">
      Set the command that runs when you click Open AI. Leave empty to disable.
    </p>
  </div>

  <div className="max-w-[400px] space-y-4">
    <div className="space-y-2">
      <Label htmlFor="cli-command">Command</Label>
      <Input
        id="cli-command"
        placeholder="claude"
        value={cliCommand}
        onChange={(e) => setCliCommand(e.target.value)}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="cli-args">Default arguments</Label>
      <Input
        id="cli-args"
        placeholder="--dangerously-skip-permissions"
        value={cliArgs}
        onChange={(e) => setCliArgs(e.target.value)}
      />
    </div>
    <Button onClick={handleSave}>Save CLI Tool</Button>
  </div>
</div>

<Separator className="my-6" />
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust built-in test (cargo test) |
| Config file | src-tauri/Cargo.toml |
| Quick run command | `cd src-tauri && cargo test` |
| Full suite command | `cd src-tauri && cargo test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLI-01 | CLI settings stored/retrieved via app_settings | unit | `cd src-tauri && cargo test models::project::tests::test_app_setting -x` | Needs new test |
| CLI-02 | validate_cli_tool returns false for missing tool | unit | `cd src-tauri && cargo test -- validate_cli -x` | Wave 0 (command is async/Tauri, hard to unit test; manual verification primary) |
| PLAN-05 | planning_tier persists per project | unit | `cd src-tauri && cargo test models::project::tests::test_planning_tier -x` | Wave 0 |
| SYNC-04 | source column defaults to 'user' on phases and tasks | unit | `cd src-tauri && cargo test models::phase::tests::test_source_default -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd src-tauri && cargo test`
- **Per wave merge:** `cd src-tauri && cargo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/models/project.rs` -- test for `set_planning_tier` and `get_project` returning planning_tier
- [ ] `src-tauri/src/models/phase.rs` -- test that created phases have `source: "user"` by default
- [ ] `src-tauri/src/models/task.rs` -- test that created tasks have `source: "user"` by default
- [ ] Migration 010 SQL file itself -- tested implicitly by all tests via `setup_test_db()` which runs all migrations

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files listed in CONTEXT.md canonical references
- Existing migration pattern (001-009) examined directly
- Existing Tauri command pattern examined across project_commands.rs, phase_commands.rs, onboarding_commands.rs
- Existing model pattern examined across project.rs, phase.rs, task.rs

### Secondary (MEDIUM confidence)
- SQLite ALTER TABLE ADD COLUMN behavior with DEFAULT -- well-documented SQLite feature, verified by existing migration 009 which uses the same pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns established
- Architecture: HIGH -- follows existing conventions exactly
- Pitfalls: HIGH -- identified from direct code inspection of column indexing patterns

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- no external dependencies changing)
