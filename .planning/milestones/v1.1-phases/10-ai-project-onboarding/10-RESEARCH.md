# Phase 10: AI Project Onboarding - Research

**Researched:** 2026-03-22
**Domain:** AI-guided project planning via CLI delegation, file watching, review UI
**Confidence:** HIGH

## Summary

Phase 10 adds an AI-guided onboarding flow where users describe their project scope, Element writes a skill file to the project directory, launches a configured CLI tool (Claude Code, Cursor, etc.) in the embedded terminal, watches for structured JSON output, and presents a review/edit screen before batch-saving phases and tasks. Additionally, a per-project AI assistance mode (On-demand / Track+Suggest / Track+Auto-execute) is persisted.

The architecture is a "skill file + output contract" delegation pattern -- Element never calls an AI API directly for planning. Instead, it writes a `.element/onboard.md` skill file and a JSON schema contract, launches the user's CLI tool, and watches for `.element/plan-output.json`. This makes the system tool-agnostic.

**Primary recommendation:** Build in three vertical slices: (1) schema + backend commands for ai_mode and skill file generation, (2) file watcher + CLI launch integration, (3) frontend flow (scope input, waiting state, review/edit, confirm/save). The `notify` crate already used for plugin hot-reloading provides the file watcher pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Two-step approach -- user creates project normally, then sees "Plan with AI" button in empty project detail view (zero phases only)
- D-02: Clicking "Plan with AI" triggers: skill file write, embedded terminal open, CLI tool launch
- D-03: Minimal input form: project scope (required) + optional goals
- D-04: Cancel returns to empty project detail view
- D-05: Pluggable planning backends via skill file + output contract pattern
- D-06: Global CLI tool setting in Element settings (alongside AI Providers)
- D-07: Skill file defines context, guidance, output contract (JSON schema)
- D-08: Skill file + output parsing: `.element/onboard.md` (skill) and `.element/plan-output.json` (output)
- D-09: File watcher detects `plan-output.json`, auto-transitions to review screen
- D-10: Waiting state card with project info, scope summary, terminal hint, cancel button
- D-11: Terminal tab auto-opens and receives focus on "Plan with AI"
- D-12: Review screen uses Phase 7 phase accordion layout
- D-13: Full inline editing: rename, delete, reorder (drag-and-drop), add phases and tasks
- D-14: "Confirm & Save" batch-creates all phases/tasks. Toast confirms counts.
- D-15: "Discard" returns to empty project detail view
- D-16: AI mode dropdown in project detail header, always visible
- D-17: Three modes: Track+Suggest, Track+Auto-execute, On-demand. Default: On-demand
- D-18: Phase 10 delivers UI to set/persist ai_mode only. Behavior in Phase 11.

### Claude's Discretion
- Exact skill file template content and output JSON schema design
- File watcher implementation (notify crate, polling, etc.)
- CLI tool path validation and error handling
- Review screen component structure and state management
- Batch save transaction handling
- `.element/` directory creation and cleanup

### Deferred Ideas (OUT OF SCOPE)
- Re-trigger AI planning for existing projects (merge/append complexity)
- Per-project CLI tool override (global setting sufficient)
- Track+Suggest behavior (Phase 11)
- Track+Auto-execute behavior (Phase 11)
- Skill marketplace (future)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AIOB-01 | User can enter project scope, goals, and constraints in a structured form | ScopeInputForm component with scope textarea (required) + goals input. Pre-launch form in ProjectDetail. |
| AIOB-02 | AI asks clarifying questions to refine project understanding | Delegated to CLI tool via skill file guidance. Element writes onboard.md with conversation instructions; CLI tool handles the dialogue in terminal. |
| AIOB-03 | AI generates phases and tasks from the conversation | CLI tool writes plan-output.json; Element reads and parses via file watcher + JSON schema validation. |
| AIOB-04 | User can review, edit, and confirm AI-generated breakdown before it's saved | AiPlanReview component with accordion layout, inline editing, drag-and-drop reorder, add/delete, "Confirm & Save" batch operation. |
| AIAS-01 | User can set AI mode per project (Track+Suggest, Track+Auto-execute, On-demand) | New `ai_mode` column on projects table + AiModeSelect dropdown in project detail header. Backend update command. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tauri | 2.10 | Desktop framework, IPC, event system | Project foundation |
| Zustand | 5.0.11 | State management (slice pattern) | Established project pattern |
| React | 19.2.4 | UI framework | Project foundation |
| shadcn/ui | latest | Component library (radix-based) | Established project pattern |
| notify + notify-debouncer-mini | 8.x / 0.7 | File system watching (Rust) | Already used for plugin hot-reload |
| sonner | 2.0.7 | Toast notifications | Already used for success/error toasts |
| rusqlite | 0.32 | SQLite database | Project database layer |

### New Dependencies to Install

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/core | latest | Drag-and-drop framework | Phase reorder in review screen (D-13) |
| @dnd-kit/sortable | latest | Sortable list abstraction | Phase reorder in review screen |
| @dnd-kit/utilities | latest | CSS transform utilities | Required by @dnd-kit/sortable |

Note: @dnd-kit is also needed by Phase 7 for phase reorder. If Phase 7 installs it first, this phase reuses it. If Phase 10 is implemented first, install it here.

### shadcn Components to Install

| Component | Reason |
|-----------|--------|
| `accordion` | Review screen phase sections (D-12) |
| `card` | Waiting state card, scope input form container |
| `label` | Form field labels in scope input |

Note: `radio-group` listed in UI-SPEC but Select dropdown (D-16) is the chosen pattern for AI mode. Select is already installed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| notify crate file watcher | Polling with tokio interval | notify is already in Cargo.toml and used for plugins; polling wastes CPU and has latency |
| @dnd-kit | react-beautiful-dnd | react-beautiful-dnd is deprecated; @dnd-kit is the community standard for React 18+/19 |
| Accordion for review | Custom collapsible | Accordion from shadcn provides accessibility out of the box |

**Installation:**
```bash
# Frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npx shadcn@latest add accordion card label

# Backend -- no new Cargo dependencies needed
# notify, notify-debouncer-mini, serde_json, jsonschema already present
```

## Architecture Patterns

### Recommended Project Structure

```
src-tauri/src/
  commands/
    onboarding_commands.rs   # New: skill file write, file watcher start/stop, parse plan output
    project_commands.rs      # Extended: update_project_ai_mode
  models/
    project.rs               # Extended: ai_mode field
    onboarding.rs            # New: PlanOutput, PendingPhase, PendingTask types
  db/sql/
    008_ai_onboarding.sql    # New: ai_mode column, cli_tool_path setting

src/
  components/center/
    ProjectDetail.tsx         # Extended: "Plan with AI" empty state, AI mode dropdown
    ScopeInputForm.tsx        # New: scope + goals input form
    OnboardingWaitingCard.tsx  # New: waiting state card
    AiPlanReview.tsx           # New: review/edit screen with accordion
    AiModeSelect.tsx           # New: AI mode dropdown
  stores/
    onboardingSlice.ts        # New: onboarding flow state
    projectSlice.ts           # Extended: ai_mode on Project type
  types/
    onboarding.ts             # New: onboarding types (PendingPhase, PendingTask, PlanOutput)
  lib/
    tauri.ts                  # Extended: new API methods
```

### Pattern 1: Skill File + Output Contract (Delegation Pattern)

**What:** Element writes a structured markdown skill file to the project directory, launches a CLI tool that reads it, and watches for structured JSON output.

**When to use:** When delegating AI planning to an external CLI tool.

**Skill file template (.element/onboard.md):**
```markdown
# Project Onboarding: {project_name}

## Project Context
- **Name:** {project_name}
- **Scope:** {user_scope_input}
- **Goals:** {user_goals_input}

## Your Task
You are helping the user plan this project. Have a conversation to understand:
1. What are the major deliverables?
2. What are the technical constraints?
3. What is the priority order?

Ask clarifying questions before generating the plan.

## Output Contract
When the user confirms the plan, write a JSON file to `.element/plan-output.json` with this exact schema:

```json
{
  "phases": [
    {
      "name": "Phase name",
      "sort_order": 1,
      "tasks": [
        { "title": "Task title", "description": "Optional description" }
      ]
    }
  ]
}
```

IMPORTANT: The output file MUST be valid JSON matching this schema exactly.
```

**Output JSON schema (for validation):**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["phases"],
  "properties": {
    "phases": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "tasks"],
        "properties": {
          "name": { "type": "string" },
          "sort_order": { "type": "integer" },
          "tasks": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["title"],
              "properties": {
                "title": { "type": "string" },
                "description": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

### Pattern 2: File Watcher with Tauri Event Bridge

**What:** Use the `notify` crate (already in Cargo.toml) to watch for `.element/plan-output.json`, emit a Tauri event when detected, frontend listens and transitions UI.

**When to use:** Detecting CLI tool output completion.

**Backend pattern (mirrors existing plugin watcher in `plugins/mod.rs`):**
```rust
use notify::Watcher;
use notify_debouncer_mini::new_debouncer;

pub fn start_plan_watcher(
    project_dir: PathBuf,
    app: AppHandle,
) -> Result<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>, notify::Error> {
    let element_dir = project_dir.join(".element");

    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        move |events: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
            if let Ok(events) = events {
                for event in events {
                    if event.path.file_name() == Some("plan-output.json".as_ref()) {
                        // Read and validate the file
                        if let Ok(content) = std::fs::read_to_string(&event.path) {
                            if let Ok(plan) = serde_json::from_str::<PlanOutput>(&content) {
                                let _ = app.emit("plan-output-detected", &plan);
                            } else {
                                let _ = app.emit("plan-output-error", "Invalid JSON format");
                            }
                        }
                        break;
                    }
                }
            }
        },
    )?;

    // Ensure .element directory exists before watching
    std::fs::create_dir_all(&element_dir)?;

    debouncer.watcher().watch(
        &element_dir,
        notify::RecursiveMode::NonRecursive,
    )?;

    Ok(debouncer)
}
```

**Frontend listener pattern (mirrors existing `useTauriEvents.ts`):**
```typescript
import { listen } from "@tauri-apps/api/event";

// In a useEffect or custom hook
const unlisten = await listen<PlanOutput>("plan-output-detected", (event) => {
    store.setPendingPlan(event.payload);
    store.setOnboardingStep("review");
});
```

### Pattern 3: Onboarding Flow State Machine

**What:** Onboarding step state drives which view renders in ProjectDetail.

**States:** `idle` -> `scope-input` -> `waiting` -> `review` -> `idle` (on confirm/discard)

```typescript
// onboardingSlice.ts
export type OnboardingStep = "idle" | "scope-input" | "waiting" | "review";

export interface OnboardingSlice {
    onboardingStep: OnboardingStep;
    onboardingScope: string;
    onboardingGoals: string;
    pendingPlan: PlanOutput | null;
    onboardingSaving: boolean;

    setOnboardingStep: (step: OnboardingStep) => void;
    setOnboardingScope: (text: string) => void;
    setOnboardingGoals: (text: string) => void;
    setPendingPlan: (plan: PlanOutput | null) => void;
    // Review editing actions
    updatePendingPhase: (index: number, updates: Partial<PendingPhase>) => void;
    removePendingPhase: (index: number) => void;
    addPendingPhase: () => void;
    reorderPendingPhases: (fromIndex: number, toIndex: number) => void;
    updatePendingTask: (phaseIndex: number, taskIndex: number, updates: Partial<PendingTask>) => void;
    removePendingTask: (phaseIndex: number, taskIndex: number) => void;
    addPendingTask: (phaseIndex: number) => void;
    confirmAndSavePlan: (projectId: string) => Promise<void>;
    discardPlan: () => void;
}
```

### Pattern 4: Batch Save Transaction

**What:** "Confirm & Save" creates all phases and tasks in a single backend call for atomicity.

```rust
#[tauri::command]
pub async fn batch_create_plan(
    state: State<'_, Arc<Mutex<Database>>>,
    app: AppHandle,
    project_id: String,
    phases: Vec<PendingPhaseInput>,
) -> Result<(), String> {
    let db = state.lock().map_err(|e| e.to_string())?;

    // Use a transaction for atomicity
    let tx = db.conn().transaction().map_err(|e| e.to_string())?;

    for (i, phase) in phases.iter().enumerate() {
        let phase_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        tx.execute(
            "INSERT INTO phases (id, project_id, name, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![phase_id, project_id, phase.name, i as i32, now, now],
        ).map_err(|e| e.to_string())?;

        for task in &phase.tasks {
            let task_id = uuid::Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO tasks (id, project_id, phase_id, title, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![task_id, project_id, phase_id, task.title, task.description.as_deref().unwrap_or(""), now, now],
            ).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    let _ = app.emit("plan-saved", &project_id);
    Ok(())
}
```

Note: This depends on Phase 7's `phases` table existing. If Phase 7 is not yet implemented, the migration for phase 10 must include the phases table creation, or this phase must be sequenced after Phase 7.

### Anti-Patterns to Avoid

- **Calling AI APIs from Element for planning:** The architecture deliberately delegates to CLI tools. Don't bypass this with direct API calls.
- **Storing onboarding state in the database:** The onboarding flow state (scope input, waiting, review) is transient UI state. Use Zustand only, don't persist it.
- **Watching the entire project directory:** Watch only `.element/` with `NonRecursive` mode to avoid performance issues on large codebases.
- **Blocking the UI on file watcher:** The watcher runs in the Rust backend; the frontend listens for events. Never poll from the frontend.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File system watching | Custom polling loop | `notify` crate (already in Cargo.toml) | Cross-platform, debounced, handles edge cases (file locks, partial writes) |
| JSON schema validation | Manual field checking | `jsonschema` crate (already in Cargo.toml) | Handles nested validation, gives clear error messages |
| Drag-and-drop reorder | Custom mouse event handlers | `@dnd-kit` | Accessibility (keyboard support), touch support, animation |
| Accordion UI | Custom collapse logic | shadcn `accordion` | Accessibility (aria-expanded), animation, keyboard nav |
| Toast notifications | Custom notification system | `sonner` (already installed) | Already used throughout the app |

**Key insight:** The biggest complexity in this phase is the file watcher lifecycle management and the review screen state. Both have well-established patterns in the existing codebase (plugin watcher, AI suggestion accept/dismiss).

## Common Pitfalls

### Pitfall 1: File Watcher Race Condition

**What goes wrong:** CLI tool writes `plan-output.json` in multiple write operations (create, write, flush). The watcher fires on the initial create event before the file is fully written, reading partial/empty JSON.

**Why it happens:** `notify` fires events for each filesystem operation. A file write typically generates Create + Modify events.

**How to avoid:** Use `notify-debouncer-mini` with a 500ms debounce (already the project pattern). After debounce fires, validate the JSON before emitting the event. If validation fails, wait and retry once after another 500ms.

**Warning signs:** Intermittent "Invalid JSON" errors that work on retry.

### Pitfall 2: Watcher Lifecycle Leak

**What goes wrong:** Starting a file watcher without properly stopping it when the user navigates away, cancels, or the plan is saved. Multiple watchers accumulate.

**Why it happens:** The watcher `Debouncer` must be stored somewhere and dropped when no longer needed.

**How to avoid:** Store the watcher handle in Tauri app state (behind a Mutex<Option<Debouncer>>). Provide explicit `start_plan_watcher` and `stop_plan_watcher` commands. Stop the watcher on: plan confirmed, plan discarded, user cancels, user navigates to different project.

**Warning signs:** High CPU usage, duplicate events.

### Pitfall 3: Missing Project Directory

**What goes wrong:** User clicks "Plan with AI" but the project has no linked directory. Element can't write the skill file or set up the file watcher.

**Why it happens:** Directory linking is optional in Phase 7 (PROJ-01).

**How to avoid:** Check for linked directory before proceeding. If missing, show a dialog prompting the user to link a directory first (D-05 in UI-SPEC interaction contract). Gate the "Start AI Planning" button on directory presence.

**Warning signs:** Errors when trying to write to undefined path.

### Pitfall 4: Phase 7 Dependency

**What goes wrong:** Phase 10 requires phases table and CRUD operations from Phase 7 (PROJ-02, PROJ-03). If Phase 7 isn't complete, batch_create_plan has no table to write to.

**Why it happens:** Phase 10 depends on Phase 7's schema (phases table with project_id, name, sort_order).

**How to avoid:** Phase 10's migration (008) should be written to work whether or not Phase 7's migration created the phases table. If Phase 7 is done first, Phase 10 only adds `ai_mode`. If not, Phase 10's migration must include the phases table. The planner should verify Phase 7 status before planning.

**Warning signs:** SQL errors on batch save.

### Pitfall 5: CLI Tool Not Found

**What goes wrong:** User configures a CLI tool path that doesn't exist or isn't executable. The terminal launch fails silently or with a cryptic error.

**Why it happens:** No validation of the CLI tool path at configuration time.

**How to avoid:** Validate CLI tool path when saving the setting (`command -v` / `which` equivalent in Rust). Show clear error in the waiting state if the CLI tool fails to spawn (existing `run_cli_tool` already returns spawn errors). Add a "Test" button in settings.

**Warning signs:** "Failed to spawn" errors in terminal.

### Pitfall 6: Stale plan-output.json

**What goes wrong:** A `plan-output.json` from a previous session exists when the user starts a new "Plan with AI" flow. The watcher immediately fires, showing the old plan.

**Why it happens:** D-10/cancel doesn't clean up the file (by design per CONTEXT.md).

**How to avoid:** On starting a new onboarding flow, check if `.element/plan-output.json` already exists. If it does, either delete it before starting the watcher, or record its modification timestamp and only trigger on newer timestamps.

**Warning signs:** Review screen appears immediately with stale data.

## Code Examples

### Tauri Event Listener Pattern (from existing codebase)

```typescript
// Source: src/hooks/useTauriEvents.ts
import { listen } from "@tauri-apps/api/event";

useEffect(() => {
    const unlisteners = Promise.all([
        listen("plan-output-detected", (event) => {
            setPendingPlan(event.payload as PlanOutput);
            setOnboardingStep("review");
        }),
        listen("plan-output-error", (event) => {
            toast.error(event.payload as string);
        }),
    ]);

    return () => {
        unlisteners.then((fns) => fns.forEach((fn) => fn()));
    };
}, []);
```

### Zustand Slice Pattern (from existing codebase)

```typescript
// Source: src/stores/projectSlice.ts pattern
export const createOnboardingSlice: StateCreator<
    AppStore, [], [], OnboardingSlice
> = (set, get) => ({
    onboardingStep: "idle",
    pendingPlan: null,
    onboardingScope: "",
    onboardingGoals: "",
    onboardingSaving: false,

    setOnboardingStep: (step) => set({ onboardingStep: step }),
    setPendingPlan: (plan) => set({ pendingPlan: plan }),
    // ... other actions
});
```

### SQL Migration Pattern (from existing 007_themes.sql)

```sql
-- 008_ai_onboarding.sql
-- Add ai_mode to projects
ALTER TABLE projects ADD COLUMN ai_mode TEXT NOT NULL DEFAULT 'on-demand'
    CHECK(ai_mode IN ('on-demand', 'track-suggest', 'track-auto-execute'));

-- App settings for CLI tool (using existing settings pattern if available, or new table)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### Tauri Command Pattern (from existing project_commands.rs)

```rust
#[tauri::command]
pub async fn update_project_ai_mode(
    app: AppHandle,
    state: State<'_, Arc<Mutex<Database>>>,
    project_id: String,
    ai_mode: String,
) -> Result<Project, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();
    db.conn().execute(
        "UPDATE projects SET ai_mode = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![ai_mode, now, project_id],
    ).map_err(|e| e.to_string())?;
    let project = db.get_project(&project_id).map_err(|e| e.to_string())?;
    app.emit("project-updated", &project).map_err(|e| e.to_string())?;
    Ok(project)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct API calls for AI features | CLI tool delegation via skill files | Architecture decision (D-05) | Tool-agnostic, supports Claude Code, Cursor, any CLI |
| Template libraries for project types | AI-generated plans from conversation | Out of scope decision | Personalized, always current |
| react-beautiful-dnd | @dnd-kit | 2023+ | react-beautiful-dnd deprecated; @dnd-kit supports React 18+/19 |

## Open Questions

1. **Phase 7 completion status at execution time**
   - What we know: Phase 7 defines phases table schema and CRUD. Phase 10 depends on it.
   - What's unclear: Whether Phase 7 will be fully implemented before Phase 10 starts.
   - Recommendation: Phase 10 migration should be resilient -- check if phases table exists before creating. Batch save command must handle the case where Phase 7 CRUD is the mechanism for phase creation.

2. **CLI tool invocation in embedded terminal vs. run_cli_tool**
   - What we know: `run_cli_tool` in `cli_commands.rs` runs a command and streams stdout/stderr via events. Phase 9 will add an embedded terminal (xterm.js or similar).
   - What's unclear: Whether Phase 9's terminal supports programmatic command injection, or if we use `run_cli_tool` alongside the terminal.
   - Recommendation: Plan for both paths. If Phase 9's terminal supports command injection, use it. If not, fall back to `run_cli_tool` with output displayed in the terminal panel.

3. **App settings storage for CLI tool path**
   - What we know: AI providers are stored in a dedicated table. No general app settings table exists.
   - What's unclear: Whether to add a general `app_settings` key-value table or a specific column somewhere.
   - Recommendation: Create a simple `app_settings` key-value table. It will be useful for future settings beyond CLI tool path.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Tauri | Desktop app framework | Yes | 2.10 | -- |
| notify crate | File watcher | Yes | 8.x | -- |
| notify-debouncer-mini | Debounced file events | Yes | 0.7 | -- |
| jsonschema crate | Plan output validation | Yes | 0.28 | -- |
| @dnd-kit/core | Phase reorder in review | No | -- | Install: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` |
| shadcn accordion | Review screen | No | -- | Install: `npx shadcn@latest add accordion` |
| shadcn card | Waiting/scope cards | No | -- | Install: `npx shadcn@latest add card` |
| shadcn label | Form labels | No | -- | Install: `npx shadcn@latest add label` |

**Missing dependencies with no fallback:** None (all can be installed).

**Missing dependencies with fallback:** @dnd-kit and shadcn components need npm install. No blocking issues.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (frontend) + Rust tests (backend) |
| Config file | `vitest.config.ts` (frontend), `cargo test` (backend) |
| Quick run command | `npx vitest run --reporter=verbose` / `cargo test` |
| Full suite command | `npx vitest run && cargo test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AIOB-01 | Scope input form renders, validates required scope field | unit | `npx vitest run src/__tests__/ScopeInputForm.test.tsx` | No -- Wave 0 |
| AIOB-02 | Skill file written with correct template content | unit (Rust) | `cargo test --lib onboarding` | No -- Wave 0 |
| AIOB-03 | Plan output JSON parsed and validated against schema | unit (Rust) | `cargo test --lib onboarding` | No -- Wave 0 |
| AIOB-04 | Review screen renders plan, supports edit/delete/add/reorder | unit | `npx vitest run src/__tests__/AiPlanReview.test.tsx` | No -- Wave 0 |
| AIOB-04 | Batch save creates correct phases and tasks | unit (Rust) | `cargo test --lib onboarding` | No -- Wave 0 |
| AIAS-01 | AI mode dropdown renders, persists selection | unit | `npx vitest run src/__tests__/AiModeSelect.test.tsx` | No -- Wave 0 |
| AIAS-01 | ai_mode column migration works | unit (Rust) | `cargo test --lib project` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `cargo test --lib` + `npx vitest run --reporter=verbose`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps

- [ ] `src/__tests__/ScopeInputForm.test.tsx` -- covers AIOB-01
- [ ] `src/__tests__/AiPlanReview.test.tsx` -- covers AIOB-04
- [ ] `src/__tests__/AiModeSelect.test.tsx` -- covers AIAS-01
- [ ] Rust test module in `src-tauri/src/models/onboarding.rs` -- covers AIOB-02, AIOB-03
- [ ] Rust test for batch_create_plan -- covers AIOB-04 backend

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src-tauri/src/plugins/mod.rs` -- notify/file watcher pattern
- Existing codebase: `src-tauri/src/commands/cli_commands.rs` -- CLI tool invocation pattern
- Existing codebase: `src-tauri/src/commands/ai_commands.rs` -- Tauri command + event emit pattern
- Existing codebase: `src/stores/aiSlice.ts` -- Zustand slice pattern for AI state
- Existing codebase: `src/hooks/useTauriEvents.ts` -- Tauri event listener pattern
- Existing codebase: `src-tauri/Cargo.toml` -- confirmed notify 8.x, jsonschema 0.28

### Secondary (MEDIUM confidence)
- Phase 7 UI-SPEC (`07-UI-SPEC.md`) -- phase accordion layout, drag-and-drop pattern
- Phase 10 UI-SPEC (`10-UI-SPEC.md`) -- component inventory, layout contracts, interaction flows
- Phase 10 CONTEXT.md -- all locked decisions (D-01 through D-18)

### Tertiary (LOW confidence)
- @dnd-kit version -- needs `npm view` verification at install time. Compatible with React 19 based on project pattern expectations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all core dependencies already in the project; only @dnd-kit and shadcn components need adding
- Architecture: HIGH -- patterns directly mirror existing codebase (plugin watcher, AI commands, Zustand slices)
- Pitfalls: HIGH -- identified from direct codebase analysis (file watcher lifecycle, race conditions, missing directory)

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- no fast-moving external dependencies)
