# Phase 15: .planning/ Folder Sync - Research

**Researched:** 2026-03-27
**Domain:** Rust file watcher + markdown parser + SQLite sync + Tauri event-driven UI
**Confidence:** HIGH

## Summary

Phase 15 is a backend-heavy feature that parses `.planning/ROADMAP.md` into Element's database, watches for file changes, and prevents sync loops with SHA-256 content hashing. The codebase already contains two proven watcher patterns (`FileWatcherState` in `file_explorer_commands.rs` and `PlanWatcherState` in `onboarding_commands.rs`) plus all required dependencies (`notify` v8, `notify-debouncer-mini` v0.7, `sha2` v0.10, `regex` v1). The database schema additions (`source` column on phases/tasks, `planning_tier` on projects) are already defined in migration 010. The frontend changes are minimal -- adding "GSD" badges to PhaseRow and TaskRow, listening for new Tauri events, and gating certain interactions on `source === "sync"`.

The ROADMAP.md format is predictable GSD output with a well-defined structure: `### Phase N: Name` headers, `**Goal**:` lines, `**Success Criteria**` sections with numbered checkbox items. Regex parsing (not AST) is the confirmed approach per STATE.md. The sync strategy is full-replace: delete all `source='sync'` records for a project, then re-insert from the parsed ROADMAP. This avoids complex diffing but requires transactional batch operations, which `batch_create_plan` already demonstrates.

**Primary recommendation:** Build a new `planning_sync_commands.rs` module containing the ROADMAP parser, a `PlanningWatcherState` managed state, and start/stop watcher commands. Reuse the `PlanWatcherState` pattern from onboarding but watch `.planning/` directory. Frontend listens for `planning-sync-complete` and `planning-sync-error` events, then reloads phases/tasks.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Success criteria become tasks in Element. Each numbered success criterion under a phase maps to a task. Phase goal text becomes the phase description.
- **D-02:** Checkbox state maps to task status: `[x]` = Complete, `[ ]` = Pending. Simple binary mapping, no "in progress" detection.
- **D-03:** Extract both phase goals and success criteria text. Phase **Goal:** line becomes phase description; success criterion text becomes task title.
- **D-04:** Skip backlog phases (999.x entries). Only parse active milestone phases.
- **D-05:** Watcher activates on project select -- start watching when user opens a GSD-tier project with a linked directory, stop when switching away.
- **D-06:** Watch the entire `.planning/` directory, not just ROADMAP.md. Enables future extensibility.
- **D-07:** Separate `PlanningWatcherState` alongside existing `FileWatcherState`. Independent lifecycles, clean separation.
- **D-08:** Content hash comparison (SHA-256) to prevent sync loops. Hash ROADMAP.md after each sync, skip re-import if hash is identical.
- **D-09:** On parse error, skip sync and log warning. Emit warning event to frontend (toast). Keep existing DB state -- non-destructive.
- **D-10:** Replace all synced records on update. Delete all source-tagged phases/tasks for the project, re-insert from parsed ROADMAP.
- **D-11:** Auto-detect on project open. When a GSD-tier project is selected and `.planning/ROADMAP.md` exists, auto-import if no synced phases exist yet. No explicit button needed.
- **D-12:** Silent update with toast notification. Small toast says "Synced N phases, M tasks from .planning/".
- **D-13:** Subtle visual indicator on synced phases/tasks. Small icon or badge (e.g., sync icon or "GSD" tag).

### Claude's Discretion
- Debounce interval for the `.planning/` watcher (existing patterns use 500ms)
- Hash storage mechanism (in-memory vs database)
- Exact toast notification styling and duration
- Regex patterns for ROADMAP.md parsing (format is predictable GSD output)

### Deferred Ideas (OUT OF SCOPE)
- Git-based progress tracking for linked directories
- Bidirectional .planning/ sync (BSYNC-01, BSYNC-02)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYNC-01 | User can trigger import of .planning/ROADMAP.md into project phases and tasks | Auto-import on project open (D-11); ROADMAP parser extracts phases from `### Phase N:` headers and tasks from success criteria checkboxes (D-01, D-03); `batch_create_plan` pattern provides transactional insert |
| SYNC-02 | File watcher on .planning/ directory detects changes and syncs updates into the database | `PlanWatcherState` pattern in onboarding_commands.rs; `notify` v8 + `notify-debouncer-mini` v0.7 already in Cargo.toml; watch `.planning/` directory (D-06) with separate `PlanningWatcherState` (D-07) |
| SYNC-03 | Sync uses content hashing to prevent write loops | `sha2` v0.10 already in Cargo.toml with proven usage in calendar.rs; SHA-256 hash stored in-memory (Claude's discretion); compare before sync, skip if identical (D-08) |
</phase_requirements>

## Standard Stack

### Core (all already in Cargo.toml)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `notify` | 8 | File system event watching (macOS FSEvent) | Already used for FileWatcherState and PlanWatcherState |
| `notify-debouncer-mini` | 0.7 | Debounce rapid FS events into batched callbacks | Already used in both existing watchers |
| `sha2` | 0.10 | SHA-256 content hashing for loop prevention | Already used in calendar OAuth PKCE |
| `regex` | 1 | ROADMAP.md line-by-line parsing | Already in Cargo.toml, confirmed approach per STATE.md |
| `rusqlite` | 0.32 | SQLite database operations | Core DB layer throughout the app |

### Supporting (already available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `chrono` | 0.4 | Timestamp generation for created_at/updated_at | All DB record creation |
| `uuid` | 1 | UUID v4 generation for phase/task IDs | All DB record creation |
| `serde` / `serde_json` | 1 | Serialization for Tauri event payloads | Event emission to frontend |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory hash storage | Database `app_settings` table | DB survives app restart but adds complexity; in-memory is simpler and watcher resets on restart anyway |
| Regex parsing | Markdown AST (pulldown-cmark) | AST is more robust but overkill for predictable GSD format; regex is simpler and already decided |
| Full-replace sync | Diff-based update | Diff preserves user edits to synced records but adds complexity; full-replace is simpler and synced records are read-only |

**Installation:** No new dependencies needed. Everything is already in `Cargo.toml`.

## Architecture Patterns

### Recommended Module Structure
```
src-tauri/src/
├── commands/
│   └── planning_sync_commands.rs  # NEW: watcher, parser, sync orchestration
├── models/
│   └── planning_sync.rs           # NEW: parsed phase/task structs, parser logic
├── lib.rs                          # Register PlanningWatcherState + new commands
└── db/
    └── sql/010_cli_planning_sync.sql  # EXISTING: source column already defined
```

### Pattern 1: PlanningWatcherState (follow existing PlanWatcherState)
**What:** Managed Tauri state holding an `Option<Debouncer<RecommendedWatcher>>` behind a `Mutex`. Start/stop commands swap the debouncer in/out.
**When to use:** Watcher lifecycle management per D-05 and D-07.
**Example:**
```rust
// Source: existing onboarding_commands.rs:9-11
pub struct PlanningWatcherState(
    pub StdMutex<Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>>,
);
```

### Pattern 2: Watcher Event Callback with File Filtering
**What:** The debouncer callback checks if the changed file is ROADMAP.md before triggering sync. This prevents unnecessary sync attempts when other `.planning/` files change.
**When to use:** Inside the watcher callback (D-06 says watch whole directory, but only sync on ROADMAP.md changes).
**Example:**
```rust
// Source: existing onboarding_commands.rs:58-60 (filtering for plan-output.json)
if event.path.file_name() == Some(std::ffi::OsStr::new("ROADMAP.md")) {
    // Trigger sync
}
```

### Pattern 3: Transactional Full-Replace Sync
**What:** Within a single SQLite transaction: (1) delete all phases where `source='sync'` for this project, (2) delete all tasks where `source='sync'` for this project, (3) insert new phases and tasks from parsed ROADMAP. This ensures atomicity.
**When to use:** Every sync operation (D-10).
**Example:**
```rust
// Source: existing batch_create_plan in onboarding_commands.rs:118-170
let tx = db.conn().unchecked_transaction().map_err(|e| e.to_string())?;
// DELETE FROM tasks WHERE project_id = ?1 AND source = 'sync'
// DELETE FROM phases WHERE project_id = ?1 AND source = 'sync'
// INSERT new phases and tasks with source = 'sync'
tx.commit().map_err(|e| e.to_string())?;
```

### Pattern 4: Content Hash Check Before Sync
**What:** Before parsing, compute SHA-256 of ROADMAP.md content. Compare against last-known hash. If identical, skip sync entirely (no toast, no DB writes). Store hash in memory on the `PlanningWatcherState` or a sibling struct.
**When to use:** Every watcher event and initial auto-import (D-08).
**Example:**
```rust
// Source: existing calendar.rs:111-117 pattern
use sha2::{Digest, Sha256};
let mut hasher = Sha256::new();
hasher.update(content.as_bytes());
let hash = format!("{:x}", hasher.finalize());
```

### Pattern 5: Tauri Event Emission for Frontend Reactivity
**What:** After successful sync, emit `planning-sync-complete` with phase/task counts. On error, emit `planning-sync-error` with message. Frontend listens and shows toasts + reloads data.
**When to use:** After every sync attempt (D-09, D-12).
**Example:**
```rust
// Source: existing phase_commands.rs:21-22
app.emit("planning-sync-complete", &SyncResult { phase_count, task_count })
    .map_err(|e| e.to_string())?;
```

### Pattern 6: Frontend Event Listener (useTauriEvents)
**What:** Add listeners for `planning-sync-complete` and `planning-sync-error` to the existing `useTauriEvents` hook. On sync complete, reload phases and tasks for the selected project. Show toast via `sonner`.
**When to use:** Global event handling setup.
**Example:**
```typescript
// Source: existing useTauriEvents.ts:19-51 pattern
listen<SyncResult>("planning-sync-complete", (event) => {
  toast.success(`Synced ${event.payload.phaseCount} phases, ${event.payload.taskCount} tasks from .planning/`);
  if (selectedProjectId) {
    loadPhases(selectedProjectId);
    loadTasks(selectedProjectId);
  }
}),
```

### Anti-Patterns to Avoid
- **Bidirectional sync in Phase 15:** Explicitly out of scope. No app-side writes back to `.planning/` files.
- **Differential update:** Don't try to match existing synced records to parsed ones by name. Full-replace is simpler and avoids stale data.
- **Sync on app startup for all projects:** Only sync the currently selected project. Don't scan all projects' directories.
- **Blocking the watcher callback:** The `notify` callback runs on a dedicated thread. Do NOT perform DB operations directly in the callback. Instead, emit a Tauri event or use `app.emit()` to trigger async processing.
- **Watching ROADMAP.md directly:** D-06 specifies watching the entire `.planning/` directory. Use `NonRecursive` mode since the files of interest are at the top level.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File system watching | Custom polling loop | `notify` v8 + `notify-debouncer-mini` v0.7 | OS-native events (FSEvent on macOS), handles edge cases (rename, move, rapid writes) |
| Content hashing | Custom hash function | `sha2::Sha256` | Cryptographic strength, already in deps |
| UUID generation | Custom ID generation | `uuid::Uuid::new_v4()` | Standard pattern throughout codebase |
| Toast notifications | Custom notification UI | `sonner` (already in frontend) | Existing pattern, auto-dismiss, stacking |
| Markdown parsing beyond regex | Full AST parser | Keep regex for ROADMAP.md | GSD output is predictable; AST (pulldown-cmark) is overkill |

**Key insight:** Every dependency this phase needs is already in Cargo.toml and used elsewhere in the codebase. Zero new crates required.

## Common Pitfalls

### Pitfall 1: Sync Loop from DB-Triggered FS Events
**What goes wrong:** If the app writes anything to `.planning/` (even indirectly), the watcher detects it and triggers re-import, causing an infinite loop.
**Why it happens:** File watchers are indiscriminate -- they fire for any change, regardless of origin.
**How to avoid:** SHA-256 content hash comparison (D-08). The hash is computed after each successful sync. On next watcher event, if hash matches, skip silently. This also handles the case where the app doesn't write to `.planning/` but the user saves the file without changes.
**Warning signs:** Repeated "Synced N phases" toasts in rapid succession.

### Pitfall 2: Race Condition Between Watcher and Auto-Import
**What goes wrong:** When a GSD-tier project is first opened, both the auto-import (D-11) and the watcher might try to sync simultaneously.
**Why it happens:** Starting the watcher and checking for initial import happen in the same flow, and the watcher might fire before the initial import completes.
**How to avoid:** Perform the initial auto-import synchronously (or as a sequential async step) BEFORE starting the watcher. The watcher callback should check the hash, which will already be populated by the initial import.
**Warning signs:** Duplicate phases appearing momentarily then being cleaned up.

### Pitfall 3: Watcher Not Stopping on Project Switch
**What goes wrong:** User switches from Project A (GSD) to Project B. Watcher for Project A keeps firing, syncing changes into Project A even though it's not selected.
**Why it happens:** Watcher lifecycle not properly tied to project selection flow.
**How to avoid:** Stop the planning watcher when project selection changes (D-05). The frontend must call `stop_planning_watcher` before `start_planning_watcher` for the new project (or just stop when switching away from a GSD project). Follow the existing `start_file_watcher`/`stop_file_watcher` pattern.
**Warning signs:** Background DB writes for non-selected projects.

### Pitfall 4: Blocking the Notify Thread
**What goes wrong:** Performing synchronous DB operations inside the `notify` debouncer callback blocks the file system event thread, causing missed events.
**Why it happens:** The debouncer callback runs on the notify internal thread, not on the Tokio runtime.
**How to avoid:** In the callback, only read the file and compute the hash. For DB operations, use `app.emit()` to send an event that triggers async processing on the Tauri side, OR use a channel to communicate with an async task. The existing `PlanWatcherState` in onboarding reads the file and emits an event in the callback -- follow this pattern.
**Warning signs:** Watcher silently stops detecting changes after a sync.

### Pitfall 5: ROADMAP.md Parsing Regex Fragility
**What goes wrong:** Regex breaks when ROADMAP.md format has slight variations (extra whitespace, missing bold markers, multi-line goals).
**Why it happens:** GSD output is "predictable" but edge cases exist (e.g., success criteria text wrapping to next line, markdown links in text).
**How to avoid:** Parse line-by-line with tolerant patterns. Use `trim()` liberally. Test against the actual ROADMAP.md in the project. On parse failure, skip and warn (D-09) rather than crashing.
**Warning signs:** Parse errors on ROADMAP.md files that look correct to the human eye.

### Pitfall 6: Source Column Not Propagated to Frontend Types
**What goes wrong:** The `source` field exists in the database but is not included in the Rust `Phase`/`Task` structs or TypeScript types, so the frontend cannot distinguish synced records.
**Why it happens:** Migration 010 adds the column but Phase 12 may not have updated the model structs and SELECT queries yet.
**How to avoid:** Phase 15 must ensure the `source` field is included in: (1) Rust `Phase` struct + serialization, (2) Rust `Task` struct + `row_to_task`, (3) TypeScript `Phase` and `Task` interfaces, (4) all SELECT queries in `list_phases`, `list_tasks`, etc.
**Warning signs:** Frontend shows undefined for `phase.source`, badges never appear.

### Pitfall 7: Cascade Delete Removes Synced Records Unintentionally
**What goes wrong:** Deleting a project cascades to delete all phases and tasks including synced ones. This is actually correct behavior, but the full-replace sync (D-10) must also handle the case where synced phases were manually reordered by the user -- reorder state is lost on re-sync.
**Why it happens:** Full-replace deletes all synced records and re-inserts them with sequential sort_order.
**How to avoid:** Accept this limitation. Document that user reordering of synced phases will be reset on next sync. This matches the "one-way sync" philosophy.
**Warning signs:** User-customized sort order of synced phases reverting after ROADMAP.md changes.

## Code Examples

### ROADMAP.md Parser (core logic)
```rust
// Parse a ROADMAP.md into phases with success criteria as tasks
// Format:
//   ### Phase N: Name
//   **Goal**: Description text
//   **Success Criteria** (what must be TRUE):
//     1. [ ] Criterion text becomes task title
//     2. [x] Completed criterion

use regex::Regex;

pub struct ParsedPhase {
    pub name: String,
    pub description: String,  // from **Goal**: line
    pub tasks: Vec<ParsedTask>,
    pub sort_order: i32,
}

pub struct ParsedTask {
    pub title: String,
    pub is_complete: bool,  // [x] = true, [ ] = false
}

pub struct ParseResult {
    pub phases: Vec<ParsedPhase>,
}

pub fn parse_roadmap(content: &str) -> Result<ParseResult, String> {
    let phase_header_re = Regex::new(r"^### Phase (\d+(?:\.\d+)?): (.+)$").unwrap();
    let goal_re = Regex::new(r"^\*\*Goal\*\*\s*:\s*(.+)$").unwrap();
    let criterion_re = Regex::new(r"^\s+\d+\.\s+\[([ x])\]\s+(.+)$").unwrap();
    let backlog_re = Regex::new(r"^### Phase 999").unwrap();

    let mut phases = Vec::new();
    let mut current_phase: Option<ParsedPhase> = None;
    let mut in_success_criteria = false;
    let mut in_backlog = false;
    let mut sort_order = 0i32;

    for line in content.lines() {
        // Skip everything after backlog starts (D-04)
        if backlog_re.is_match(line) {
            in_backlog = true;
        }
        if in_backlog {
            continue;
        }

        if let Some(caps) = phase_header_re.captures(line) {
            // Save previous phase
            if let Some(phase) = current_phase.take() {
                phases.push(phase);
            }
            current_phase = Some(ParsedPhase {
                name: caps[2].trim().to_string(),
                description: String::new(),
                tasks: Vec::new(),
                sort_order,
            });
            sort_order += 1;
            in_success_criteria = false;
        } else if let Some(caps) = goal_re.captures(line) {
            if let Some(ref mut phase) = current_phase {
                phase.description = caps[1].trim().to_string();
            }
        } else if line.contains("**Success Criteria**") {
            in_success_criteria = true;
        } else if in_success_criteria {
            if let Some(caps) = criterion_re.captures(line) {
                let is_complete = &caps[1] == "x";
                let title = caps[2].trim().to_string();
                if let Some(ref mut phase) = current_phase {
                    phase.tasks.push(ParsedTask { title, is_complete });
                }
            } else if !line.trim().is_empty() && !line.starts_with("  ") {
                // Non-indented non-empty line ends success criteria section
                in_success_criteria = false;
            }
        }
    }

    // Don't forget the last phase
    if let Some(phase) = current_phase {
        phases.push(phase);
    }

    if phases.is_empty() {
        return Err("No phases found in ROADMAP.md".to_string());
    }

    Ok(ParseResult { phases })
}
```

### Sync Orchestration (watcher callback pattern)
```rust
// In the watcher callback -- lightweight, emits event for async processing
move |events: Result<Vec<DebouncedEvent>, notify::Error>| {
    if let Ok(events) = events {
        let dominated_by_roadmap = events.iter().any(|e| {
            e.path.file_name() == Some(std::ffi::OsStr::new("ROADMAP.md"))
        });
        if roadmap_changed {
            let _ = app_handle.emit("planning-file-changed", &project_id);
        }
    }
}
```

### Full-Replace Sync Transaction
```rust
// Delete all synced records, then re-insert
let tx = db.conn().unchecked_transaction().map_err(|e| e.to_string())?;

tx.execute(
    "DELETE FROM tasks WHERE project_id = ?1 AND source = 'sync'",
    rusqlite::params![project_id],
).map_err(|e| e.to_string())?;

tx.execute(
    "DELETE FROM phases WHERE project_id = ?1 AND source = 'sync'",
    rusqlite::params![project_id],
).map_err(|e| e.to_string())?;

for parsed_phase in &result.phases {
    let phase_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    tx.execute(
        "INSERT INTO phases (id, project_id, name, sort_order, source, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 'sync', ?5, ?6)",
        rusqlite::params![phase_id, project_id, parsed_phase.name, parsed_phase.sort_order, now, now],
    ).map_err(|e| e.to_string())?;

    for task in &parsed_phase.tasks {
        let task_id = uuid::Uuid::new_v4().to_string();
        let status = if task.is_complete { "complete" } else { "pending" };
        tx.execute(
            "INSERT INTO tasks (id, project_id, phase_id, title, description, context, status, priority, source, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, '', '', ?5, 'medium', 'sync', ?6, ?7)",
            rusqlite::params![task_id, project_id, phase_id, task.title, status, now, now],
        ).map_err(|e| e.to_string())?;
    }
}

tx.commit().map_err(|e| e.to_string())?;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for file changes | OS-native events via `notify` v8 | Already in use | Efficient, low-latency detection |
| Full markdown AST parsing | Regex line-by-line | Decided during v1.2 research | Simpler, sufficient for predictable format |
| Differential sync | Full-replace sync | D-10 decision | Eliminates stale data, simpler logic |

**Deprecated/outdated:**
- `notify` v7 and below: v8 is current, already used in project
- `notify-debouncer-full`: The "mini" debouncer is sufficient for this use case

## Open Questions

1. **Phase 12 completion state for `source` column**
   - What we know: Migration 010 defines `source TEXT NOT NULL DEFAULT 'user'` on phases and tasks
   - What's unclear: Whether Phase 12 implementation has already updated the Rust `Phase`/`Task` structs and TypeScript types to include `source`. If not, Phase 15 must add this.
   - Recommendation: Check at plan time whether `source` is in the Rust structs and TS types. If not, include it as a pre-requisite task in Phase 15 plan.

2. **Planning tier value for GSD**
   - What we know: Migration 010 defines `planning_tier CHECK(planning_tier IN ('quick', 'medium', 'full'))`. Phase 14 sets this value.
   - What's unclear: The tier value for GSD is `'full'` per the CHECK constraint, but the UI spec and CONTEXT.md refer to it as "GSD tier". The sync logic needs to check `planning_tier = 'full'` to determine if auto-import should fire.
   - Recommendation: Use `planning_tier = 'full'` as the GSD tier check. Document this mapping clearly.

3. **Watcher callback thread safety**
   - What we know: The `notify` callback runs on a separate thread. The existing `PlanWatcherState` in onboarding reads files and emits events inside the callback. DB operations need the `Database` lock.
   - What's unclear: Whether the sync DB operations should happen in the callback (via `Arc<Mutex<Database>>`) or be triggered asynchronously via Tauri events.
   - Recommendation: Follow the onboarding pattern: read file + compute hash in the callback, then emit a Tauri event. Have a Tauri command or event handler perform the DB sync asynchronously. This avoids holding the DB lock in the notify thread. However, the simpler approach of doing everything in the callback (like `batch_create_plan` does) also works since the DB lock is short-lived. Choose based on complexity -- the simpler approach is acceptable given the DB operations are fast.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Rust built-in (`#[cfg(test)]` + `#[test]`) / Vitest for frontend |
| Config file | `src-tauri/Cargo.toml` (Rust) / `vitest.config.ts` (frontend) |
| Quick run command | `cd src-tauri && cargo test --lib` |
| Full suite command | `cd src-tauri && cargo test --lib && cd .. && npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNC-01 | ROADMAP.md parser extracts phases and tasks correctly | unit | `cd src-tauri && cargo test planning_sync -x` | Wave 0 |
| SYNC-01 | Parser handles checkbox states ([x] vs [ ]) | unit | `cd src-tauri && cargo test planning_sync -x` | Wave 0 |
| SYNC-01 | Parser skips backlog phases (999.x) | unit | `cd src-tauri && cargo test planning_sync -x` | Wave 0 |
| SYNC-01 | Batch sync inserts phases and tasks with source='sync' | unit | `cd src-tauri && cargo test planning_sync -x` | Wave 0 |
| SYNC-02 | Watcher detects ROADMAP.md changes (integration) | manual-only | Manual: edit ROADMAP.md while app is running | N/A |
| SYNC-03 | Content hash prevents re-import of unchanged content | unit | `cd src-tauri && cargo test planning_sync -x` | Wave 0 |
| SYNC-03 | Full-replace deletes old synced records before inserting new ones | unit | `cd src-tauri && cargo test planning_sync -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd src-tauri && cargo test --lib`
- **Per wave merge:** `cd src-tauri && cargo test --lib && cd .. && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/models/planning_sync.rs` -- parser unit tests (covers SYNC-01)
- [ ] Test with actual project ROADMAP.md content (the project's own `.planning/ROADMAP.md` is a good fixture)
- [ ] `src/components/center/PhaseRow.test.tsx` -- badge visibility test (covers SYNC-01 UI)

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src-tauri/src/commands/onboarding_commands.rs` (PlanWatcherState pattern)
- Direct codebase inspection: `src-tauri/src/commands/file_explorer_commands.rs` (FileWatcherState pattern)
- Direct codebase inspection: `src-tauri/src/db/sql/010_cli_planning_sync.sql` (source column schema)
- Direct codebase inspection: `src-tauri/Cargo.toml` (all dependencies verified present)
- Direct codebase inspection: `src-tauri/src/plugins/core/calendar.rs` (SHA-256 usage pattern)
- Direct codebase inspection: `.planning/ROADMAP.md` (actual parsing target format)

### Secondary (MEDIUM confidence)
- `15-CONTEXT.md` decisions (user-confirmed during discussion)
- `15-UI-SPEC.md` (UI design contract for badges and toasts)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies already in Cargo.toml and actively used
- Architecture: HIGH -- follows two existing watcher patterns nearly identically
- Pitfalls: HIGH -- identified from analyzing existing patterns and sync loop risks
- Parser: MEDIUM -- regex patterns need testing against actual ROADMAP.md variations

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- no external dependencies, all internal patterns)
