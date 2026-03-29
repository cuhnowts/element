---
phase: 12-cli-settings-and-schema-foundation
verified: 2026-03-27T14:00:00Z
status: gaps_found
score: 8/9 must-haves verified
re_verification: false
gaps:
  - truth: "TypeScript compiles without errors introduced by this phase"
    status: failed
    reason: "useTerminal.ts references undeclared variable 'shell' at line 124 — the variable was removed by commit 566fc3c but the error message still references it"
    artifacts:
      - path: "src/hooks/useTerminal.ts"
        issue: "Line 124: `setError('Could not start ${shell}...') ` references 'shell' which was removed. TypeScript error: TS2304 Cannot find name 'shell'."
    missing:
      - "Replace `${shell}` in the error message at line 124 with '/bin/zsh' or a descriptive string that does not reference the removed variable"
human_verification:
  - test: "Open Settings > AI, enter a custom CLI command (e.g. 'aider'), click Save CLI Tool, then click Open AI on a project with a linked directory"
    expected: "Terminal launches aider (or shows tool-not-found toast if aider is not installed). The hardcoded 'claude' command should NOT be invoked."
    why_human: "Terminal launch behavior requires a running Tauri app — cannot test programmatically"
  - test: "Set a planning tier on Project A via set_planning_tier, then check Project B"
    expected: "Project B's planning_tier is unaffected — tiers are scoped per-project"
    why_human: "Per-project isolation requires live database state across two distinct projects in the app"
---

# Phase 12: CLI Settings and Schema Foundation — Verification Report

**Phase Goal:** Users can configure their AI terminal tool and the app is ready to store tier and sync metadata
**Verified:** 2026-03-27T14:00:00Z
**Status:** gaps_found — 1 TypeScript error introduced by phase (undeclared `shell` variable)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Migration 010 adds planning_tier to projects, source to phases and tasks | VERIFIED | `010_cli_planning_sync.sql` has all 3 ALTER TABLE statements with correct constraints |
| 2 | Project struct includes planning_tier field and set_planning_tier method works | VERIFIED | `project.rs` line 13: `pub planning_tier: Option<String>`, method at line 141, 2 passing tests |
| 3 | Phase and Task structs include source field defaulting to 'user' | VERIFIED | `phase.rs` line 12: `pub source: String`, `task.rs` line 90 and TASK_COLUMNS line 131 include `source` |
| 4 | validate_cli_tool command returns bool for real tools and false for missing tools | VERIFIED | `onboarding_commands.rs` lines 304-322: spawns `--version` with 5s tokio timeout, returns `Ok(false)` for both spawn failure and timeout |
| 5 | set_planning_tier command persists tier per project | VERIFIED | Registered in `lib.rs` line 255, delegates to `Database::set_planning_tier`, returns updated Project |
| 6 | User can set CLI command and arguments in Settings > AI tab | VERIFIED | `AiSettings.tsx` has CLI Tool section with Command/Args fields, loads from `api.getAppSetting("cli_command")`, saves via `handleSaveCliTool` |
| 7 | Open AI button reads command from settings instead of hardcoding claude | VERIFIED | `OpenAiButton.tsx`: no `"claude"` hardcoded in launch logic, reads from `api.getAppSetting("cli_command")` |
| 8 | Open AI button validates CLI tool before launching and shows toast on failure | VERIFIED | Lines 36-39: `api.validateCliTool(command)` called before launch, actionable toast on failure |
| 9 | TypeScript compiles cleanly for phase 12 files | FAILED | `useTerminal.ts` line 124 references undeclared `shell` (removed in commit 566fc3c but not cleaned up in error message) |

**Score:** 8/9 truths verified

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/src/db/sql/010_cli_planning_sync.sql` | Schema migration: planning_tier, source columns | VERIFIED | All 3 ALTER TABLE statements present with CHECK constraints |
| `src-tauri/src/db/migrations.rs` | Migration 010 registered | VERIFIED | Lines 51-53: `version < 10` block with `include_str!("sql/010_cli_planning_sync.sql")` |
| `src-tauri/src/models/project.rs` | Project struct with planning_tier, set_planning_tier method | VERIFIED | Field at line 13, method at line 141, SELECT queries updated, 2 new tests at lines 340-374 |
| `src-tauri/src/models/phase.rs` | Phase struct with source field | VERIFIED | `pub source: String` at line 12, all SELECT queries include `source`, `row.get(4)` correct |
| `src-tauri/src/models/task.rs` | Task struct with source, updated TASK_COLUMNS | VERIFIED | `pub source: String` at line 90, `TASK_COLUMNS` includes `source` at index 16, `row_to_task` maps correctly |
| `src-tauri/src/commands/onboarding_commands.rs` | validate_cli_tool and set_planning_tier Tauri commands | VERIFIED | Both functions present, `validate_cli_tool` uses tokio timeout, `set_planning_tier` delegates to DB |
| `src/lib/types.ts` | TypeScript types with planningTier and source | VERIFIED | `planningTier: string | null` on Project (line 10), `source: string` on Phase (line 31) and Task (line 51) |
| `src/lib/tauri.ts` | Frontend API bindings for validateCliTool and setPlanningTier | VERIFIED | `validateCliTool` at line 218, `setPlanningTier` at line 222 |
| `src/components/settings/AiSettings.tsx` | CLI Tool configuration form | VERIFIED | CLI Tool section with Command/Args inputs, loads on mount, saves with toast |
| `src/components/settings/SettingsNav.tsx` | Renamed AI tab label | VERIFIED | Line 23: `label: "AI"` |
| `src/components/settings/SettingsPage.tsx` | Renamed AI heading | VERIFIED | Line 17: `ai: "AI"` |
| `src/components/center/OpenAiButton.tsx` | Settings-driven CLI launch with validation | VERIFIED | Reads settings, validates with `validateCliTool`, shows 2 distinct error toasts |
| `src/hooks/useTerminal.ts` | Shell-first spawn with stdin command writing | STUB/BUG | Line 124 references undeclared variable `shell` — TS error TS2304 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src-tauri/src/db/migrations.rs` | `010_cli_planning_sync.sql` | `include_str!` and `version < 10` | WIRED | Pattern match confirmed at lines 51-53 |
| `src-tauri/src/lib.rs` | `validate_cli_tool` | `generate_handler![]` registration | WIRED | Line 254 |
| `src-tauri/src/lib.rs` | `set_planning_tier` | `generate_handler![]` registration | WIRED | Line 255 |
| `src/components/center/OpenAiButton.tsx` | `src/lib/tauri.ts` | `api.validateCliTool` call | WIRED | Line 36 |
| `src/components/settings/AiSettings.tsx` | `src/lib/tauri.ts` | `api.getAppSetting` / `api.setAppSetting` | WIRED | Lines 33, 47, 49 |
| `src/components/settings/SettingsPage.tsx` | tab heading map | `ai: "AI"` in `tabHeadings` | WIRED | Line 17 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `OpenAiButton.tsx` | `command` (cli_command setting) | `api.getAppSetting("cli_command")` → `get_app_setting` Tauri command → `app_settings` table | Yes — reads from SQLite app_settings | FLOWING |
| `AiSettings.tsx` | `cliCommand` state | `api.getAppSetting("cli_command")` on mount | Yes — loads from persistent SQLite storage | FLOWING |
| `project.rs` `set_planning_tier` | `planning_tier` column | `UPDATE projects SET planning_tier = ?1` + `get_project` round-trip | Yes — real DB write + read | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 171 cargo tests pass (including new planning_tier tests) | `cargo test` | `171 passed; 0 failed` | PASS |
| validate_cli_tool returns Ok(false) for missing tools (not Err) | Code inspection | `Ok(Err(_)) => Ok(false)` and `Err(_) => Ok(false)` | PASS |
| TypeScript types include planningTier on Project | `grep planningTier src/lib/types.ts` | Line 10: `planningTier: string \| null` | PASS |
| No hardcoded 'claude' command in OpenAiButton launch path | `grep '"claude"' OpenAiButton.tsx` | No matches | PASS |
| useTerminal.ts compiles cleanly | `npx tsc --noEmit` | TS2304: Cannot find name 'shell' at line 124 | FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| CLI-01 | 12-02-PLAN.md | User can set the AI terminal command in Settings | SATISFIED | `AiSettings.tsx` has CLI Tool form; `OpenAiButton.tsx` reads `cli_command` from settings. REQUIREMENTS.md checkbox and traceability table both show "Pending" — this is a stale documentation status, the implementation is complete. |
| CLI-02 | 12-01-PLAN.md, 12-02-PLAN.md | App validates CLI tool availability before launching | SATISFIED | `validate_cli_tool` Tauri command with 5s timeout; `OpenAiButton.tsx` calls it and shows toast |
| PLAN-05 | 12-01-PLAN.md | User's tier choice stored per-project | SATISFIED | `planning_tier` column on `projects` table, `set_planning_tier` method and Tauri command both scope updates by `project_id` |
| SYNC-04 | 12-01-PLAN.md | Phases and tasks from sync are tagged with source | SATISFIED | `source TEXT NOT NULL DEFAULT 'user'` on both `phases` and `tasks` tables; `Phase.source` and `Task.source` Rust fields present |

**Note on CLI-01 documentation state:** REQUIREMENTS.md line 12 shows `- [ ] **CLI-01**` (unchecked) and the traceability table row shows `Pending`. The implementation is complete. This is a stale documentation state that should be updated.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/hooks/useTerminal.ts` | 124 | Undeclared variable `shell` in error message string — TypeScript error TS2304 | Blocker | TypeScript build fails for this file; the runtime error message will be wrong since the variable no longer exists |

**Classification rationale:** The `shell` variable was removed in commit `566fc3c` when the tauri-pty workaround changed from using a dynamic shell path to hardcoding `/bin/zsh`. The error message at line 124 still interpolates `${shell}` but `shell` is out of scope. TypeScript catches this as TS2304. This does not prevent the Tauri app from running (Vite may still bundle it with a runtime undefined), but it is a TypeScript error introduced by phase 12 that should be fixed.

**Note on args splitting deviation:** `OpenAiButton.tsx` line 50 pushes `args.trim()` as a single string into `fullArgs` rather than splitting on whitespace as the plan specified (`args.split(/\s+/).filter(Boolean)`). This deviation is functionally harmless because `useTerminal.ts` joins all args with a space before writing to the shell's stdin — the shell's own word-splitting handles the rest. This is a warning-level observation, not a blocker.

### Human Verification Required

#### 1. End-to-end CLI settings and Open AI flow

**Test:** Open Settings (Cmd+,), click the "AI" tab. Verify: (a) tab says "AI" not "AI Providers", (b) page heading says "AI" not "AI Providers", (c) "CLI Tool" section appears above AI Providers with Command and Arguments fields.
**Expected:** Tab and heading both read "AI"; CLI Tool form is visible with correct placeholders ("claude" and "--dangerously-skip-permissions").
**Why human:** Visual layout and tab labels require a running app to verify.

#### 2. Configured CLI tool validation on Open AI click

**Test:** In Settings > AI, set Command to "nonexistent_tool_xyz", save. Open a project with a linked directory, click "Open AI".
**Expected:** Toast appears: "nonexistent_tool_xyz not found on your system. Check the command in Settings > AI."
**Why human:** Requires running Tauri app and tauri-pty PTY interaction.

#### 3. No CLI command configured flow

**Test:** In Settings > AI, clear the Command field, save. Click "Open AI" on a project.
**Expected:** Toast appears: "No AI tool configured. Set one up in Settings > AI."
**Why human:** Requires live app state.

#### 4. Per-project planning tier isolation

**Test:** In the app, call set_planning_tier on Project A (select "medium"). Then open Project B and verify its planning_tier shows null/unset.
**Expected:** Tier selection on Project A does not affect Project B.
**Why human:** Requires live database state across two projects in the running app.

### Gaps Summary

One gap blocks a clean TypeScript build: `src/hooks/useTerminal.ts` at line 124 references the variable `shell` which was removed in commit `566fc3c`. The error handling block that previously said "Could not start $SHELL" still interpolates `${shell}`, but `shell` is now out of scope. Fix: change `${shell}` on line 124 to the literal string `"/bin/zsh"` or a generic message like `"the terminal shell"`.

The REQUIREMENTS.md traceability table has a stale status for CLI-01 (shows "Pending" when the implementation is complete), but this is a documentation issue, not an implementation gap.

All backend functionality is fully implemented and all 171 cargo tests pass.

---

_Verified: 2026-03-27T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
