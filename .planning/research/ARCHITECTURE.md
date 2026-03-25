# Architecture Research: v1.2 Intelligent Planning Integration

**Domain:** Tiered AI planning, .planning/ folder sync, context-adaptive AI, CLI settings
**Researched:** 2026-03-25
**Confidence:** HIGH (based on existing codebase analysis, proven patterns from v1.0/v1.1)

## System Overview: What Changes

The v1.2 milestone adds four capabilities to the existing architecture. The diagram below shows new components (marked with `*`) integrated into the existing system.

```
┌─ React Frontend ──────────────────────────────────────────────────────┐
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐   │
│  │ OpenAiButton     │  │ *PlanningTierDlg │  │ *CliSettingsForm  │   │
│  │ (MODIFY)         │  │ (NEW)            │  │ (NEW)             │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬──────────┘   │
│           │                      │                      │             │
│  ┌────────┴──────────────────────┴──────────────────────┴──────────┐  │
│  │                    Zustand Store Layer                          │  │
│  │  ┌─────────────────┐  ┌───────────────────┐                    │  │
│  │  │ *planningSlice  │  │ onboardingSlice   │                    │  │
│  │  │ (NEW)           │  │ (MODIFY)          │                    │  │
│  │  └────────┬────────┘  └───────────────────┘                    │  │
│  └───────────┼────────────────────────────────────────────────────┘  │
│              │                                                        │
│  ┌───────────┼────────────────────────────────────────────────────┐  │
│  │           │           api (lib/tauri.ts)                       │  │
│  │           │ invoke() — NEW commands added                      │  │
│  └───────────┼────────────────────────────────────────────────────┘  │
└──────────────┼────────────────────────────────────────────────────────┘
               │ Tauri IPC boundary
┌──────────────┼────────────────────────────────────────────────────────┐
│ Rust Backend │                                                        │
│  ┌───────────┴───────────────────────────────────────────────────┐   │
│  │                    Tauri Commands                             │   │
│  │  *planning_commands.rs  onboarding_commands.rs (MODIFY)       │   │
│  └────────────┬──────────────────────┬───────────────────────────┘   │
│               │                      │                               │
│  ┌────────────┴──────────────────────┴───────────────────────────┐   │
│  │                    Models + Sync Engine                        │   │
│  │  *planning_sync.rs     *context_builder.rs    onboarding.rs   │   │
│  │  (NEW: .planning/      (NEW: adaptive        (MODIFY)         │   │
│  │   folder parser)        context gen)                          │   │
│  └────────────┬──────────────────────┬───────────────────────────┘   │
│               │                      │                               │
│  ┌────────────┴──────────────────────┴───────────────────────────┐   │
│  │  Database (rusqlite)     File System (notify)                 │   │
│  │  projects, phases,       .planning/ watcher                    │   │
│  │  tasks, app_settings     (RecursiveMode)                      │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

## New vs Modified Components

### Rust Backend -- New Modules

| Module | File | Responsibility |
|--------|------|----------------|
| `planning_sync` | `src-tauri/src/models/planning_sync.rs` | Parse .planning/ ROADMAP.md, extract phases + tasks, diff against DB, apply sync |
| `context_builder` | `src-tauri/src/models/context_builder.rs` | Adaptive context file generation (replaces hardcoded templates in onboarding.rs) |
| `planning_commands` | `src-tauri/src/commands/planning_commands.rs` | Tauri commands: start/stop planning watcher, trigger sync, get planning tier |

### Rust Backend -- Modified Modules

| Module | File | Change |
|--------|------|--------|
| `onboarding_commands` | `commands/onboarding_commands.rs` | `generate_context_file` delegates to `context_builder` with mode param; plan watcher expanded to handle .planning/ dir |
| `onboarding` | `models/onboarding.rs` | Context generation logic moves to `context_builder.rs`; add planning tier enum |
| `lib.rs` | `src-tauri/src/lib.rs` | Register new commands, manage `PlanningWatcherState` |

### Frontend -- New Components

| Component | File | Purpose |
|-----------|------|---------|
| `PlanningTierDialog` | `components/center/PlanningTierDialog.tsx` | First-time "Open AI" flow: choose Quick/Medium/GSD |
| `CliSettingsForm` | `components/settings/CliSettingsForm.tsx` | Configure CLI tool command in Settings |

### Frontend -- Modified Components

| Component | File | Change |
|-----------|------|--------|
| `OpenAiButton` | `components/center/OpenAiButton.tsx` | Decision tree: check if plan exists, show tier dialog vs "what's next?" mode |
| `SettingsPage` | `components/settings/SettingsPage.tsx` | Add "CLI Tool" nav entry |
| `SettingsNav` | `components/settings/SettingsNav.tsx` | Add CLI tab |

### Frontend -- New/Modified Stores

| Store | File | Change |
|-------|------|--------|
| `planningSlice` (NEW) | `stores/planningSlice.ts` | Planning tier state, sync status, planning watcher lifecycle |
| `onboardingSlice` (MODIFY) | `stores/onboardingSlice.ts` | Adapt for tiered planning flow; merge with planning state or keep separate |

## Detailed Architecture: .planning/ Folder Sync

This is the most architecturally complex feature. Here is the recommended approach.

### What Gets Parsed

The GSD `.planning/` folder has this structure:

```
project-dir/
└── .planning/
    ├── PROJECT.md              # Project metadata (not synced -- Element owns this)
    └── milestones/
        └── v1.2-ROADMAP.md     # <-- PRIMARY SYNC TARGET
```

The ROADMAP.md contains the phase list with checkbox status. Example:

```markdown
## Phases
- [x] **Phase 1: Desktop Shell** - Description (completed 2026-03-16)
- [ ] **Phase 2: Task UI** - Description
- [ ] **Phase 3: Workflows** - Description

## Phase Details
### Phase 1: Desktop Shell
**Goal**: ...
Plans:
- [x] 01-01-PLAN.md -- Plan description
- [ ] 01-02-PLAN.md -- Plan description
```

### Parsing Strategy: Regex Over AST

Use regex-based line parsing, not a full markdown AST. Rationale:

1. **The ROADMAP format is structured and predictable** -- GSD generates it from templates
2. **pulldown-cmark adds dependency weight** for minimal benefit here
3. **The existing `parse_plan_output_file` uses serde_json** -- regex parsing follows the "simple tool for simple job" pattern
4. **Maintenance**: regex patterns are easier to update if the GSD format evolves

```rust
// models/planning_sync.rs

/// A phase extracted from ROADMAP.md
#[derive(Debug, Clone)]
pub struct ParsedPhase {
    pub number: String,          // "1", "2.1", etc.
    pub name: String,            // "Desktop Shell and Task Foundation"
    pub description: String,     // "Description after the dash"
    pub completed: bool,         // [x] vs [ ]
    pub completed_date: Option<String>,
    pub plans: Vec<ParsedPlan>,
}

#[derive(Debug, Clone)]
pub struct ParsedPlan {
    pub filename: String,        // "01-01-PLAN.md"
    pub description: String,     // "Plan description"
    pub completed: bool,
}

/// Parse ROADMAP.md phases section
pub fn parse_roadmap(content: &str) -> Result<Vec<ParsedPhase>, String> {
    // Phase line pattern:
    // - [x] **Phase 1: Desktop Shell** - Description (completed 2026-03-16)
    // - [ ] **Phase 2: Task UI** - Description
    let phase_re = regex::Regex::new(
        r"^-\s+\[([ x])\]\s+\*\*Phase\s+([\d.]+):\s+(.+?)\*\*\s*-?\s*(.*?)(?:\(completed\s+([\d-]+)\))?$"
    ).unwrap();

    // Plan line pattern:
    // - [x] 01-01-PLAN.md -- Description
    let plan_re = regex::Regex::new(
        r"^-\s+\[([ x])\]\s+(\d[\d.]*-\d+-PLAN\.md)\s+--?\s+(.+)$"
    ).unwrap();

    // Parse line by line, building phases
    // ... (implementation in actual code)
}
```

### Sync Algorithm: Incremental Diff

The sync must handle: (a) initial import, (b) GSD updates phases on disk, (c) user edits phases in Element UI.

**Decision: Disk is source of truth for structure, DB is source of truth for task status.**

```
Sync Flow:
1. Parse ROADMAP.md -> Vec<ParsedPhase>
2. Load DB phases for project -> Vec<Phase>
3. Match by phase name (fuzzy: trim, lowercase compare)
4. For each parsed phase:
   a. EXISTS in DB with same name? -> Update sort_order if changed
   b. NEW (not in DB)? -> Insert new phase
   c. Parsed phase marked completed? -> Mark all tasks complete
5. For each DB phase:
   a. NOT in parsed phases? -> Keep (don't delete user-created phases)
6. Convert plans to tasks:
   a. Plan title -> task title
   b. Plan completed -> task status
7. Emit "planning-synced" event -> frontend refreshes
```

**Why not delete missing phases:** The user may have added phases manually in Element UI. Deleting them because GSD removed a phase from ROADMAP would cause data loss. Instead, phases from ROADMAP get a `source = 'planning'` marker (new column) so we know which ones are GSD-managed.

### Schema Change

```sql
-- Migration 010_planning_sync.sql
ALTER TABLE phases ADD COLUMN source TEXT NOT NULL DEFAULT 'user'
    CHECK(source IN ('user', 'planning'));

ALTER TABLE phases ADD COLUMN external_ref TEXT;
-- Stores the phase number from ROADMAP (e.g., "1", "2.1")
-- Used for matching during sync

ALTER TABLE projects ADD COLUMN planning_tier TEXT
    CHECK(planning_tier IN ('quick', 'medium', 'gsd'));
-- NULL = not yet decided (triggers tier dialog)
```

### File Watcher Architecture

Reuse the existing `notify_debouncer_mini` pattern from `PlanWatcherState` and `FileWatcherState`, but watch the `.planning/` directory recursively.

```rust
// commands/planning_commands.rs

pub struct PlanningWatcherState(
    pub StdMutex<Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>>
);

#[tauri::command]
pub async fn start_planning_watcher(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    watcher_state: State<'_, PlanningWatcherState>,
    project_id: String,
    project_dir: String,
) -> Result<(), String> {
    let planning_dir = PathBuf::from(&project_dir).join(".planning");
    if !planning_dir.exists() {
        return Ok(()); // No .planning/ dir -- nothing to watch
    }

    let db = state.inner().clone();
    let pid = project_id.clone();
    let app_handle = app.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(1000), // Longer debounce -- GSD writes multiple files
        move |events: Result<Vec<DebouncedEvent>, notify::Error>| {
            if let Ok(events) = events {
                let roadmap_changed = events.iter().any(|e| {
                    e.path.extension().map_or(false, |ext| ext == "md")
                        && e.path.to_string_lossy().contains("ROADMAP")
                });
                if roadmap_changed {
                    // Sync on ROADMAP changes only
                    if let Ok(db_lock) = db.lock() {
                        match sync_planning_to_db(&db_lock, &pid, &planning_dir) {
                            Ok(result) => {
                                let _ = app_handle.emit("planning-synced", &result);
                            }
                            Err(e) => {
                                let _ = app_handle.emit("planning-sync-error", &e);
                            }
                        }
                    }
                }
            }
        },
    ).map_err(|e| e.to_string())?;

    debouncer.watcher()
        .watch(&planning_dir, notify::RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    let mut ws = watcher_state.0.lock().map_err(|e| e.to_string())?;
    *ws = Some(debouncer);
    Ok(())
}
```

**Key design decisions:**
- **1000ms debounce** (vs 500ms for plan watcher) because GSD writes multiple files in rapid succession during phase transitions
- **Only trigger on ROADMAP.md changes** -- individual plan files changing don't affect the phase/task structure
- **RecursiveMode::Recursive** -- ROADMAP.md may be in `milestones/` subdirectory
- **Lock DB inside callback** -- follows existing pattern from plan watcher

### ROADMAP Discovery

The `.planning/` directory may have ROADMAP files at different paths:

```
.planning/milestones/v1.0-ROADMAP.md
.planning/milestones/v1.1-ROADMAP.md
.planning/milestones/v1.2-ROADMAP.md
```

Strategy: Find the most recent ROADMAP.md (by milestone version) and sync from it. A project may only have one active roadmap at a time.

```rust
fn find_active_roadmap(planning_dir: &Path) -> Option<PathBuf> {
    let milestones_dir = planning_dir.join("milestones");
    if !milestones_dir.exists() {
        return None;
    }

    // Find all *-ROADMAP.md files, sort by version, take latest
    let mut roadmaps: Vec<PathBuf> = std::fs::read_dir(&milestones_dir)
        .ok()?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.file_name()
            .map_or(false, |n| n.to_string_lossy().ends_with("-ROADMAP.md")))
        .collect();

    roadmaps.sort(); // Lexicographic sort works for v1.0, v1.1, v1.2
    roadmaps.last().cloned()
}
```

## Detailed Architecture: Planning Tier Decision Tree

### Flow

```
User clicks "Open AI"
    |
    +-- Project has planning_tier set?
    |   +-- YES -> Has phases/tasks?
    |   |         +-- YES -> "What's next?" mode (execution context)
    |   |         +-- NO  -> Re-run planning with saved tier
    |   +-- NO  -> Show PlanningTierDialog
    |             User selects: Quick / Medium / GSD
    |             |
    |             +-- Quick  -> Generate flat todo context, launch CLI
    |             +-- Medium -> Generate question-asking context, launch CLI
    |             +-- GSD    -> Generate full GSD context, launch CLI
    |
    +-- Save planning_tier to project
```

### Implementation: OpenAiButton Changes

The OpenAiButton currently does three things:
1. Generate context file
2. Start plan watcher
3. Launch terminal command

For v1.2, it needs to:
1. Check project state (planning_tier, has phases/tasks)
2. If no tier: show PlanningTierDialog (returns selected tier)
3. Generate context file **with mode parameter** (planning vs execution)
4. Start appropriate watcher (.element/ for quick/medium, .planning/ for GSD)
5. Launch terminal command (using configured CLI tool, not hardcoded `claude`)

```typescript
// OpenAiButton.tsx (modified)
const handleOpenAi = async () => {
  if (!directoryPath) { toast.error("..."); return; }

  const project = projects.find(p => p.id === projectId);
  const hasWork = phases.length > 0 || tasks.length > 0;

  if (!project?.planningTier) {
    // Show tier selection dialog
    setShowTierDialog(true);
    return;
  }

  if (hasWork) {
    // Execution mode: "What's next?"
    await launchExecutionMode(projectId, directoryPath);
  } else {
    // Planning mode with saved tier
    await launchPlanningMode(projectId, directoryPath, project.planningTier);
  }
};
```

## Detailed Architecture: Adaptive Context Builder

The current `generate_context_file_content` produces one of two templates (empty project vs populated). v1.2 needs five modes:

| Mode | Trigger | Template Focus |
|------|---------|----------------|
| `planning-quick` | No plan, Quick tier | "Generate a flat task list" |
| `planning-medium` | No plan, Medium tier | "Ask questions, generate phases + tasks" |
| `planning-gsd` | No plan, GSD tier | "Run full GSD workflow" |
| `execution` | Has plan, incomplete | "Here's progress, what's next?" |
| `execution-done` | All tasks complete | "All done, review and close out" |

### Refactoring onboarding.rs

Extract context generation into `models/context_builder.rs`:

```rust
// models/context_builder.rs

pub enum ContextMode {
    PlanningQuick,
    PlanningMedium,
    PlanningGsd,
    Execution,
    ExecutionDone,
}

pub fn determine_context_mode(
    planning_tier: Option<&str>,
    total_tasks: usize,
    completed_tasks: usize,
) -> ContextMode {
    match planning_tier {
        None => ContextMode::PlanningMedium, // Default fallback
        Some(tier) if total_tasks == 0 => match tier {
            "quick" => ContextMode::PlanningQuick,
            "medium" => ContextMode::PlanningMedium,
            "gsd" => ContextMode::PlanningGsd,
            _ => ContextMode::PlanningMedium,
        },
        Some(_) if completed_tasks == total_tasks && total_tasks > 0 => {
            ContextMode::ExecutionDone
        }
        Some(_) => ContextMode::Execution,
    }
}

pub fn generate_context(data: &ProjectContextData, mode: ContextMode) -> String {
    match mode {
        ContextMode::PlanningQuick => generate_quick_planning_context(data),
        ContextMode::PlanningMedium => generate_medium_planning_context(data),
        ContextMode::PlanningGsd => generate_gsd_planning_context(data),
        ContextMode::Execution => generate_execution_context(data),
        ContextMode::ExecutionDone => generate_done_context(data),
    }
}
```

### Output Contracts by Tier

Each tier uses a different output contract for the CLI tool:

- **Quick**: Write to `.element/plan-output.json` (same as current, flat list treated as single phase)
- **Medium**: Write to `.element/plan-output.json` (same format, phases + tasks)
- **GSD**: Writes to `.planning/` directory (Element watches and syncs via planning_sync)

This means the **existing plan watcher** handles Quick and Medium, while the **new planning watcher** handles GSD. Both can coexist.

## Detailed Architecture: CLI Tool Settings

### Schema

Already exists: `app_settings` table with key/value pairs. Use key `cli_tool_command` with default value `claude --dangerously-skip-permissions`.

### Settings UI

New component in Settings page:

```typescript
// components/settings/CliSettingsForm.tsx
// - Text input for CLI command (e.g., "claude", "aider", "cursor")
// - Text input for additional args (e.g., "--dangerously-skip-permissions")
// - "Test" button: spawns `<command> --version` to verify it exists
// - "Reset to Default" button
```

### Integration with OpenAiButton

Currently hardcoded:
```typescript
launchTerminalCommand("claude", ["--dangerously-skip-permissions", contextPath]);
```

Change to:
```typescript
const cliSetting = await api.getAppSetting("cli_tool_command");
const [command, ...baseArgs] = (cliSetting ?? "claude --dangerously-skip-permissions").split(" ");
launchTerminalCommand(command, [...baseArgs, contextPath]);
```

## Data Flow: Complete v1.2 Lifecycle

### Planning Flow (New Project)

```
1. User creates project, links directory
2. User clicks "Open AI" -> no planning_tier -> PlanningTierDialog
3. User selects "Medium" -> saved to DB
4. generate_context_file(projectId, mode="planning-medium")
   -> writes .element/context.md with questioning template
5. start_plan_watcher(projectDir) -> watches .element/plan-output.json
6. launchTerminalCommand(cliTool, [contextPath])
   -> terminal opens, AI asks questions, generates plan
7. AI writes .element/plan-output.json
8. Plan watcher detects -> emits "plan-output-detected"
9. Frontend shows AiPlanReview -> user confirms
10. batch_create_plan -> phases + tasks in DB
11. project now has work -> next "Open AI" click enters execution mode
```

### Planning Flow (GSD Tier)

```
1-3. Same as above, but user selects "GSD"
4. generate_context_file(projectId, mode="planning-gsd")
   -> writes .element/context.md with GSD instructions
5. start_planning_watcher(projectDir) -> watches .planning/ recursively
6. launchTerminalCommand(cliTool, [contextPath])
   -> terminal opens, GSD runs full planning workflow
7. GSD writes .planning/milestones/vX.Y-ROADMAP.md
8. Planning watcher detects ROADMAP change -> triggers sync
9. sync_planning_to_db parses ROADMAP -> creates/updates phases + tasks
10. Emits "planning-synced" -> frontend refreshes phase/task lists
11. Further GSD updates (phase transitions) -> watcher re-syncs automatically
```

### Execution Flow ("What's next?")

```
1. User clicks "Open AI" -> has planning_tier AND has tasks
2. generate_context_file(projectId, mode="execution")
   -> writes .element/context.md with progress summary + "what's next?"
3. launchTerminalCommand(cliTool, [contextPath])
   -> AI sees progress, guides next steps
4. No watcher needed -- execution mode is advisory only
```

## New Tauri Commands

| Command | Module | Parameters | Returns |
|---------|--------|------------|---------|
| `start_planning_watcher` | planning_commands | project_id, project_dir | () |
| `stop_planning_watcher` | planning_commands | - | () |
| `sync_planning_folder` | planning_commands | project_id, project_dir | SyncResult |
| `set_project_planning_tier` | planning_commands | project_id, tier | Project |
| `get_project_planning_tier` | planning_commands | project_id | Option<String> |

The `generate_context_file` command in `onboarding_commands.rs` gains an optional `mode` parameter (backward-compatible: defaults to auto-detection).

## Project Structure: New Files

```
src-tauri/src/
├── models/
│   ├── planning_sync.rs       # NEW: ROADMAP parser, diff engine, sync logic
│   ├── context_builder.rs     # NEW: Adaptive context generation (5 modes)
│   └── onboarding.rs          # MODIFY: Delegate to context_builder
├── commands/
│   ├── planning_commands.rs   # NEW: Planning watcher, sync, tier commands
│   └── onboarding_commands.rs # MODIFY: generate_context_file gains mode param
├── db/
│   └── sql/
│       └── 010_planning_sync.sql  # NEW: phases.source, phases.external_ref, projects.planning_tier
└── lib.rs                     # MODIFY: Register new commands + PlanningWatcherState

src/
├── stores/
│   └── planningSlice.ts       # NEW: Planning tier, sync status, watcher lifecycle
├── components/
│   ├── center/
│   │   ├── OpenAiButton.tsx   # MODIFY: Decision tree + tier dialog trigger
│   │   └── PlanningTierDialog.tsx  # NEW: Quick/Medium/GSD selection
│   └── settings/
│       ├── CliSettingsForm.tsx     # NEW: CLI tool configuration
│       ├── SettingsPage.tsx        # MODIFY: Add CLI tab
│       └── SettingsNav.tsx         # MODIFY: Add CLI nav entry
├── lib/
│   ├── tauri.ts               # MODIFY: Add new API methods
│   └── types.ts               # MODIFY: Add PlanningTier type, update Project
└── types/
    └── planning.ts            # NEW: Planning-specific types
```

## Suggested Build Order

Build order is driven by dependencies. Each phase produces a testable increment.

### Phase 1: CLI Settings + Planning Tier Schema (Foundation)

**Why first:** No new watchers or complex logic. Lays schema foundation that everything else depends on.

1. Migration 010: Add `planning_tier` to projects, `source`/`external_ref` to phases
2. `CliSettingsForm` component + Settings page integration
3. `set_project_planning_tier` / `get_project_planning_tier` commands
4. Update `Project` type on frontend with `planningTier` field

**Tests:** Settings persist, migration runs, tier saves to DB.

### Phase 2: Adaptive Context Builder (Unlocks Planning Modes)

**Why second:** Refactors existing code (context generation) before adding new features that depend on it.

1. Extract `context_builder.rs` from `onboarding.rs`
2. Implement 5 context modes
3. Update `generate_context_file` command with mode param
4. Verify existing "Open AI" button still works (backward compat)

**Tests:** Each mode generates correct markdown template. Existing tests pass.

### Phase 3: Planning Tier Decision Tree (User-Facing Flow)

**Why third:** Combines Phase 1 (tier storage) + Phase 2 (context modes) into the user flow.

1. `PlanningTierDialog` component
2. `planningSlice.ts` store
3. Modify `OpenAiButton` with decision tree logic
4. Wire tier selection -> DB save -> context generation -> terminal launch
5. Use configured CLI tool from settings (not hardcoded claude)

**Tests:** Decision tree branches correctly. Tier dialog renders. CLI setting used.

### Phase 4: .planning/ Folder Sync (Most Complex)

**Why last:** Depends on schema (Phase 1), is the most complex, and has the narrowest user impact (only GSD tier users).

1. `planning_sync.rs`: ROADMAP parser + regex patterns
2. `planning_sync.rs`: Diff engine (parsed vs DB)
3. `planning_commands.rs`: Watcher setup (reuse notify pattern)
4. Frontend: Listen for `planning-synced` event, refresh phases/tasks
5. Integration: GSD tier in decision tree starts planning watcher

**Tests:** Parser handles all ROADMAP format variations. Diff correctly identifies adds/updates. Watcher triggers on file changes.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Full Markdown AST for ROADMAP Parsing

**What people do:** Use pulldown-cmark or comrak to parse ROADMAP.md into an AST, then walk the tree to extract phases.
**Why it's wrong:** The ROADMAP format is line-oriented and predictable. An AST parser adds complexity (node traversal, edge cases with nested formatting) for a problem that regex solves in 20 lines.
**Do this instead:** Regex-based line parsing with clear patterns. If GSD changes format, update the regex -- it is simpler than updating AST traversal logic.

### Anti-Pattern 2: Bidirectional Sync

**What people do:** Try to write changes back to ROADMAP.md when the user edits in the UI.
**Why it's wrong:** GSD manages the .planning/ directory. Writing back creates conflicts (GSD overwrites Element's changes, or vice versa). File format fidelity is nearly impossible to maintain.
**Do this instead:** Disk is source of truth for structure (phases, plan titles). DB is source of truth for task status and user additions. One-way sync: disk to DB.

### Anti-Pattern 3: Separate Watcher Per Feature

**What people do:** Create independent watchers for .element/plan-output.json, .planning/ROADMAP.md, and file explorer.
**Why it's wrong:** Three watchers on overlapping directories waste OS resources and create ordering issues.
**Do this instead:** For v1.2, keep the existing PlanWatcherState (watches .element/) and add PlanningWatcherState (watches .planning/). They watch different directories so no conflict. The FileWatcherState watches the project root but filters by relevance.

### Anti-Pattern 4: Storing Full ROADMAP Content in DB

**What people do:** Store raw markdown in a `planning_content` column for "offline" access.
**Why it's wrong:** The .planning/ directory is on disk in the project. Duplicating it in SQLite creates stale data and doubles storage.
**Do this instead:** Read from disk on demand. Cache parsed results in memory if needed for performance.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| PlanningWatcher -> DB | Direct rusqlite call inside callback | Same thread as watcher callback; must lock Arc<Mutex<Database>> |
| PlanningWatcher -> Frontend | Tauri event `planning-synced` | Frontend listens via `listen()`, triggers store refresh |
| OpenAiButton -> PlanningTierDialog | React state (showTierDialog) | Dialog returns tier, button continues flow |
| CliSettingsForm -> OpenAiButton | Via app_settings in DB | Button reads setting at launch time |
| context_builder -> onboarding_commands | Direct function call | No IPC -- same Rust process |

### Event Bus (Tauri Events)

| Event | Emitter | Listener | Payload |
|-------|---------|----------|---------|
| `planning-synced` | PlanningWatcher | planningSlice | `{ projectId, phasesAdded, phasesUpdated }` |
| `planning-sync-error` | PlanningWatcher | planningSlice | `String` (error message) |
| `plan-output-detected` | PlanWatcher (existing) | onboardingSlice | `PlanOutput` |

## Sources

- Existing codebase analysis: `onboarding_commands.rs`, `onboarding.rs`, `file_explorer_commands.rs` patterns
- [notify crate docs](https://docs.rs/notify/latest/notify/)
- [notify-debouncer-mini](https://lib.rs/crates/notify-debouncer-mini)
- [pulldown-cmark-frontmatter](https://lib.rs/crates/pulldown-cmark-frontmatter) (evaluated, not recommended for this use case)
- GSD ROADMAP format: analyzed from `.planning/milestones/v1.0-ROADMAP.md` and `.planning/milestones/v1.1-ROADMAP.md`

---
*Architecture research for: Element v1.2 Intelligent Planning*
*Researched: 2026-03-25*
