# Phase 7: Project Phases and Directory Linking - Research

**Researched:** 2026-03-22
**Domain:** Tauri backend (Rust/SQLite), React frontend (Zustand, shadcn/ui), drag-and-drop, native OS dialogs
**Confidence:** HIGH

## Summary

Phase 7 adds two backend concepts (phases table, directory_path on projects) and a substantial frontend redesign of the ProjectDetail view. The data layer follows the established migration pattern (next migration is 007), model pattern (new `phase.rs`), and commands pattern (new `phase_commands.rs`). The directory picker requires adding the `tauri-plugin-dialog` Cargo crate and `@tauri-apps/plugin-dialog` npm package, plus registering the plugin in `lib.rs` and adding permissions in the capabilities file. Phase reordering requires `@dnd-kit/core` + `@dnd-kit/sortable` npm packages (not currently installed). The frontend extends the Zustand store with a phase slice and modifies existing Project/Task types to include `directoryPath` and `phaseId` respectively.

**Primary recommendation:** Build backend-first (migration, model, commands), then wire up the Zustand store and API layer, then build the redesigned ProjectDetail with phases, progress bars, and directory linking. The "Unassigned" bucket is simply tasks with `phase_id IS NULL` -- no special data model needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Stacked sections layout -- directory link at top, overall progress bar, then phase list as expandable/collapsible sections with tasks shown inside each expanded phase.
- **D-02:** Header area includes all four metadata items: directory path with change button, overall progress bar, editable project description, and created date + task count.
- **D-03:** Directory picker uses Tauri's native OS directory dialog. Button shows "Link Directory" when unset, shows path + "Change" button when linked.
- **D-04:** New phases created via inline "+ Add phase" button at bottom of phase list. Clicking adds a new phase with auto-focused name field -- no modal.
- **D-05:** Phase reordering via drag and drop on phase rows.
- **D-06:** Phase rename and delete via right-click context menu on phase rows (consistent with existing ProjectList context menu pattern).
- **D-07:** Tasks assigned to phases via a "Phase" dropdown in the task detail/edit view.
- **D-08:** New tasks created within expanded phase sections via "+ Add task" button inside each phase -- task automatically assigned to that phase.
- **D-09:** Tasks without a phase assignment appear in a collapsible "Unassigned" bucket at the bottom of the phase list in the project detail view.
- **D-10:** Phase-level progress: task count + inline progress bar next to each phase header (e.g., "3/5").
- **D-11:** Overall project progress: full-width progress bar in header with fraction text below (e.g., "3 of 12 tasks complete").
- **D-12:** Sidebar project list shows small progress indicator next to each project name (thin bar or fraction like "3/12").

### Claude's Discretion
- Schema design for phases table (columns, constraints, ordering mechanism)
- How drag-and-drop reordering persists sort order (integer position field, etc.)
- Progress bar component implementation (shadcn Progress or custom)
- How the "Unassigned" bucket is represented in the data model (null phase_id)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROJ-01 | User can link a project to a filesystem directory via directory picker | `tauri-plugin-dialog` with `open({ directory: true })` -- see Standard Stack and Directory Picker pattern |
| PROJ-02 | User can create ordered phases within a project | New `phases` table with `sort_order INTEGER`, CRUD model + commands -- see Schema Design |
| PROJ-03 | User can assign tasks to phases within a project | `phase_id TEXT REFERENCES phases(id)` nullable FK on tasks table -- see Schema Design |
| PROJ-04 | User can see phase-level progress (tasks complete / total) | Computed in frontend from task status counts per phase -- see Progress Calculation pattern |
| PROJ-05 | Project detail view shows phase list, overall progress, and status overview | ProjectDetail redesign with phases, progress bars, directory link -- see Architecture Patterns |
</phase_requirements>

## Standard Stack

### Core (New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tauri-plugin-dialog` | 2 (Cargo) | Native OS directory picker dialog | Official Tauri v2 plugin for file/directory dialogs. Only sanctioned way to open native OS pickers. |
| `@tauri-apps/plugin-dialog` | 2.6.0 (npm) | JS bindings for dialog plugin | Companion JS package for the Cargo plugin |
| `@dnd-kit/core` | 6.3.1 (npm) | Drag and drop primitives | Standard React DnD library -- accessible, lightweight, hook-based |
| `@dnd-kit/sortable` | 10.0.0 (npm) | Sortable list preset | Built on dnd-kit/core, provides SortableContext + useSortable hook |
| `@dnd-kit/utilities` | 3.2.2 (npm) | CSS transform utilities | Helper for applying drag transforms to DOM elements |

### New shadcn Components to Install

| Component | Purpose |
|-----------|---------|
| `context-menu` | Phase right-click menu (rename, delete) per D-06 |
| `collapsible` | Phase expand/collapse to show tasks per D-01 |
| `progress` | Overall project progress bar per D-11 |
| `select` | Phase dropdown in TaskDetail per D-07 |

### Existing (No Changes Needed)

| Library | Purpose |
|---------|---------|
| `rusqlite` 0.32 | SQLite with migrations |
| `zustand` | State management (extend existing slices) |
| `shadcn/ui` (Button, Input, Textarea, ScrollArea, Dialog) | Existing UI components |
| `lucide-react` 0.577 | Icons (GripVertical, ChevronRight, FolderOpen, Plus) |

**Installation:**
```bash
# Rust (from src-tauri/)
cargo add tauri-plugin-dialog

# Frontend
npm install @tauri-apps/plugin-dialog @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# shadcn components
npx shadcn@latest add context-menu collapsible progress select
```

## Architecture Patterns

### Schema Design (Claude's Discretion -- RECOMMENDATION)

**Phases table (migration 007):**
```sql
-- Add directory_path to projects
ALTER TABLE projects ADD COLUMN directory_path TEXT;

-- Create phases table
CREATE TABLE IF NOT EXISTS phases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_phases_project_id ON phases(project_id);

-- Add phase_id to tasks (nullable -- null means unassigned)
ALTER TABLE tasks ADD COLUMN phase_id TEXT REFERENCES phases(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON tasks(phase_id);
```

**Key design decisions:**
- `sort_order INTEGER` for ordering. Use integers with gaps (e.g., 0, 1, 2...). On reorder, update all `sort_order` values for the project's phases in a single transaction.
- `phase_id` on tasks is nullable. `NULL` = unassigned (the "Unassigned" bucket). `ON DELETE SET NULL` ensures deleting a phase moves its tasks to unassigned (matches D-06 copy: "Its N tasks will be moved to Unassigned").
- `directory_path TEXT` on projects is nullable. `NULL` = no directory linked yet.

**Confidence:** HIGH -- follows established project patterns exactly (UUID primary keys, TEXT timestamps, FK with CASCADE/SET NULL).

### Recommended Project Structure (New Files)

```
src-tauri/src/
├── db/sql/007_phases.sql          # New migration
├── models/phase.rs                # Phase model + CRUD
├── commands/phase_commands.rs     # Tauri commands for phase CRUD + directory linking

src/
├── lib/types.ts                   # Extend Project, Task, add Phase type
├── lib/tauri.ts                   # Add phase API methods + directory link
├── stores/phaseSlice.ts           # New Zustand slice for phases
├── stores/index.ts                # Wire in phaseSlice
├── components/center/
│   ├── ProjectDetail.tsx          # Full redesign (header, phases, progress)
│   ├── PhaseRow.tsx               # Collapsible phase row with DnD
│   ├── PhaseTaskList.tsx          # Task list within expanded phase
│   ├── DirectoryLink.tsx          # Directory path display + picker button
│   └── UnassignedBucket.tsx       # Collapsible unassigned tasks section
├── components/sidebar/
│   └── ProjectList.tsx            # Add progress fraction next to project name
├── components/center/
│   └── TaskDetail.tsx             # Add Phase dropdown (Select)
```

### Pattern: Tauri Command for Directory Linking

```rust
// In phase_commands.rs (or project_commands.rs)
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn link_project_directory(
    app: AppHandle,
    state: State<'_, Arc<Mutex<Database>>>,
    project_id: String,
    directory_path: String,
) -> Result<Project, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let project = db.link_directory(&project_id, &directory_path)
        .map_err(|e| e.to_string())?;
    app.emit("project-updated", &project)
        .map_err(|e| e.to_string())?;
    Ok(project)
}
```

The directory picker dialog itself runs on the frontend via JS:
```typescript
import { open } from '@tauri-apps/plugin-dialog';

const selected = await open({
  directory: true,
  multiple: false,
  title: "Select project directory",
});
// selected is string | null
if (selected) {
  await api.linkProjectDirectory(projectId, selected);
}
```

### Pattern: Phase CRUD Model

```rust
// src-tauri/src/models/phase.rs
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Phase {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePhaseInput {
    pub project_id: String,
    pub name: String,
}
```

### Pattern: Sort Order Reordering

```rust
// Reorder: receive Vec<String> of phase IDs in desired order
pub fn reorder_phases(&self, project_id: &str, ordered_ids: Vec<String>) -> Result<(), rusqlite::Error> {
    let tx = self.conn().unchecked_transaction()?;
    for (index, phase_id) in ordered_ids.iter().enumerate() {
        tx.execute(
            "UPDATE phases SET sort_order = ?1, updated_at = ?2 WHERE id = ?3 AND project_id = ?4",
            rusqlite::params![index as i32, chrono::Utc::now().to_rfc3339(), phase_id, project_id],
        )?;
    }
    tx.commit()?;
    Ok(())
}
```

**Confidence:** HIGH -- uses `unchecked_transaction()` which is available on rusqlite 0.32 (the version in use).

### Pattern: Progress Calculation (Frontend)

Progress is computed purely in the frontend from task data -- no backend aggregation needed:

```typescript
// Compute progress for a phase
function phaseProgress(tasks: Task[], phaseId: string | null) {
  const phaseTasks = tasks.filter(t =>
    phaseId === null ? t.phaseId === null : t.phaseId === phaseId
  );
  const complete = phaseTasks.filter(t => t.status === "complete").length;
  return { complete, total: phaseTasks.length };
}

// Overall project progress
function projectProgress(tasks: Task[]) {
  const complete = tasks.filter(t => t.status === "complete").length;
  return { complete, total: tasks.length };
}
```

### Pattern: dnd-kit Sortable Phase List

```tsx
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

function PhaseList({ phases, onReorder }: Props) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = phases.findIndex(p => p.id === active.id);
      const newIndex = phases.findIndex(p => p.id === over.id);
      // arrayMove and persist new order
      const reordered = arrayMove(phases, oldIndex, newIndex);
      onReorder(reordered.map(p => p.id));
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={phases.map(p => p.id)} strategy={verticalListSortingStrategy}>
        {phases.map(phase => (
          <SortablePhaseRow key={phase.id} phase={phase} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

### Anti-Patterns to Avoid

- **Computing progress on the backend per request:** For a single-user desktop app with small task counts, frontend computation is simpler and avoids extra SQL queries. Backend aggregation would only be justified at scale.
- **Fractional sort_order (float-based):** While fractional ordering avoids re-indexing, it leads to precision issues over time. Integer re-indexing in a transaction is cleaner for a desktop app with small phase counts (<20).
- **Storing progress percentages in the database:** Progress is derived data. Storing it creates a cache invalidation problem. Compute from task statuses.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Native directory picker | Custom file input or path text field | `@tauri-apps/plugin-dialog` open({ directory: true }) | OS-native dialog handles permissions, recent folders, platform differences |
| Drag and drop reordering | onMouseDown/onMouseMove handlers | `@dnd-kit/sortable` | Keyboard accessibility, touch support, smooth animations, collision detection |
| Collapsible sections | Manual useState + height animation | shadcn `Collapsible` (Radix) | Accessible aria-expanded, smooth animation, keyboard support |
| Context menus | Custom right-click handler | shadcn `ContextMenu` (Radix) | Accessible, positioned correctly, keyboard navigation, focus management |
| Progress bars | Custom div with width% | shadcn `Progress` (Radix) | Accessible role=progressbar with aria attributes |

## Common Pitfalls

### Pitfall 1: Dialog Plugin Not Registered
**What goes wrong:** `open()` call from JS throws "plugin not found" error
**Why it happens:** `tauri-plugin-dialog` must be registered both as Cargo dependency AND as `.plugin(tauri_plugin_dialog::init())` in `lib.rs` setup, AND permissions must be added to capabilities JSON
**How to avoid:** Three-step checklist: (1) `cargo add tauri-plugin-dialog`, (2) `.plugin(tauri_plugin_dialog::init())` in Builder chain, (3) Add `"dialog:default"` to `src-tauri/capabilities/default.json` permissions array
**Warning signs:** Runtime error mentioning "dialog" plugin not found

### Pitfall 2: Foreign Key ON DELETE SET NULL Not Working
**What goes wrong:** Deleting a phase causes FK constraint error instead of setting tasks' phase_id to NULL
**Why it happens:** SQLite requires `PRAGMA foreign_keys = ON` before any operations. The project already handles this in `Database::new()`, but test databases must also enable it.
**How to avoid:** The existing `setup_test_db()` pattern already includes `PRAGMA foreign_keys = ON;` -- follow it exactly.
**Warning signs:** FK constraint violations in tests

### Pitfall 3: Sort Order Gaps After Deletion
**What goes wrong:** After deleting a phase, sort_order values have gaps (e.g., 0, 2, 3), causing incorrect ordering or off-by-one issues
**Why it happens:** Delete removes the row but doesn't renumber remaining phases
**How to avoid:** Either (a) accept gaps -- they work fine for ORDER BY, or (b) renumber after delete. Recommendation: accept gaps. ORDER BY sort_order works regardless of gaps.
**Warning signs:** UI showing phases in wrong order after delete

### Pitfall 4: Race Condition on Optimistic Phase Reorder
**What goes wrong:** User rapidly reorders phases, backend updates arrive out of order, UI shows stale order
**Why it happens:** Multiple reorder API calls in flight simultaneously
**How to avoid:** Debounce reorder saves (300ms), or use an AbortController to cancel in-flight reorder requests. Optimistic update is applied immediately to state; only the final server state matters.
**Warning signs:** Phase list "jumping" after rapid reordering

### Pitfall 5: Task Count Includes All Statuses
**What goes wrong:** Progress shows "3/12" but user expects only non-blocked tasks counted
**Why it happens:** Ambiguity about whether "blocked" tasks count toward total
**How to avoid:** Per D-10 and D-11, count ALL tasks regardless of status. Progress = tasks with status "complete" / total tasks. Keep it simple.
**Warning signs:** User confusion about progress numbers

### Pitfall 6: Project Type Change Breaks Existing Code
**What goes wrong:** Adding `directoryPath` and `phaseId` fields to existing types causes TypeScript errors across the codebase
**Why it happens:** The `Project` interface is used in many components. Adding a required field breaks them.
**How to avoid:** Both `directoryPath` on Project and `phaseId` on Task must be `string | null` (nullable). The Rust `#[serde(rename_all = "camelCase")]` will serialize `directory_path` as `directoryPath`.
**Warning signs:** TypeScript compilation errors after type changes

## Code Examples

### Migration File (007_phases.sql)
```sql
-- Add directory_path to projects
ALTER TABLE projects ADD COLUMN directory_path TEXT;

-- Create phases table
CREATE TABLE IF NOT EXISTS phases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_phases_project_id ON phases(project_id);

-- Add phase_id to tasks (nullable FK, SET NULL on phase delete)
ALTER TABLE tasks ADD COLUMN phase_id TEXT REFERENCES phases(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON tasks(phase_id);
```

### Capabilities Update (src-tauri/capabilities/default.json)
```json
{
  "permissions": [
    "core:default",
    "core:event:default",
    "core:event:allow-listen",
    "core:event:allow-emit",
    "core:webview:allow-create-webview-window",
    "core:window:allow-close",
    "core:window:allow-set-focus",
    "global-shortcut:default",
    "global-shortcut:allow-register",
    "global-shortcut:allow-unregister",
    "dialog:default"
  ]
}
```

### Frontend Type Extensions (types.ts)
```typescript
export interface Project {
  id: string;
  name: string;
  description: string;
  directoryPath: string | null;  // NEW
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  // ... existing fields ...
  phaseId: string | null;  // NEW
}

export interface Phase {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

### Plugin Registration (lib.rs addition)
```rust
// In the Builder chain, add before .invoke_handler():
.plugin(tauri_plugin_dialog::init())
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2023+ | react-beautiful-dnd is unmaintained; dnd-kit is the standard |
| Tauri v1 dialog API | tauri-plugin-dialog v2 | Tauri v2 release | Plugin-based architecture, separate crate |
| Custom context menus | Radix ContextMenu (shadcn) | Already in use | Consistent with existing DropdownMenu usage |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Rust) | `cargo test` (built-in, rusqlite in-memory) |
| Framework (Frontend) | vitest + jsdom |
| Config file | `vite.config.ts` (test section) |
| Quick run command (Rust) | `cd src-tauri && cargo test` |
| Quick run command (Frontend) | `npm test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROJ-01 | Link directory stores path on project | unit (Rust) | `cd src-tauri && cargo test models::project::tests::test_link_directory` | Wave 0 |
| PROJ-02 | Create, list, reorder, delete phases | unit (Rust) | `cd src-tauri && cargo test models::phase::tests` | Wave 0 |
| PROJ-03 | Assign task to phase, unassign on phase delete | unit (Rust) | `cd src-tauri && cargo test models::phase::tests::test_task_phase_assignment` | Wave 0 |
| PROJ-04 | Phase progress computed correctly | unit (Frontend) | `npm test -- --run src/components/center/__tests__/ProjectDetail.test.tsx` | Wave 0 |
| PROJ-05 | ProjectDetail renders phases, progress, directory | unit (Frontend) | `npm test -- --run src/components/center/__tests__/ProjectDetail.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd src-tauri && cargo test` + `npm test`
- **Per wave merge:** Full suite (`cd src-tauri && cargo test && npm test`)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/models/phase.rs` -- Rust unit tests for Phase CRUD (create, list, reorder, delete, cascade behavior)
- [ ] `src-tauri/src/models/project.rs` -- Additional test for `link_directory` / `update_project` with directory_path
- [ ] `src/components/center/__tests__/ProjectDetail.test.tsx` -- Frontend tests for progress computation, phase rendering (existing file likely needs full rewrite since ProjectDetail is redesigned)

## Open Questions

1. **dnd-kit/modifiers package needed?**
   - What we know: `restrictToVerticalAxis` modifier is useful for phase reorder to prevent horizontal dragging
   - What's unclear: Whether the UI spec requires this or if free-axis dragging is acceptable
   - Recommendation: Install `@dnd-kit/modifiers` as well -- it is tiny and the vertical constraint improves UX. Current version is likely same era as core 6.3.1.

2. **arrayMove utility location**
   - What we know: dnd-kit docs reference `arrayMove` from `@dnd-kit/sortable`
   - What's unclear: Whether it is exported from the sortable package directly
   - Recommendation: Import from `@dnd-kit/sortable` -- it is exported there.

## Sources

### Primary (HIGH confidence)
- Project codebase: `001_initial.sql`, `project.rs`, `task.rs`, `project_commands.rs`, `lib.rs`, `connection.rs`, `migrations.rs` -- established patterns
- Project codebase: `projectSlice.ts`, `taskSlice.ts`, `types.ts`, `tauri.ts` -- frontend patterns
- Project codebase: `07-CONTEXT.md`, `07-UI-SPEC.md` -- locked decisions and UI contract
- [Tauri v2 Dialog Plugin docs](https://v2.tauri.app/plugin/dialog/) -- installation, usage, permissions
- npm registry: @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @tauri-apps/plugin-dialog@2.6.0 -- verified versions

### Secondary (MEDIUM confidence)
- [dnd-kit official docs](https://docs.dndkit.com/presets/sortable) -- sortable preset documentation
- [dnd-kit GitHub](https://github.com/clauderic/dnd-kit) -- source of truth for API

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- versions verified via npm registry, Tauri docs verified via official site
- Architecture: HIGH -- follows established project patterns exactly (models, commands, migrations, Zustand slices)
- Pitfalls: HIGH -- derived from direct codebase analysis (FK behavior, plugin registration, type compatibility)

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- Tauri v2 and dnd-kit are mature)
