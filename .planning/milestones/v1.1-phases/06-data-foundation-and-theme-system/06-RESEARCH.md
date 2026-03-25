# Phase 6: Data Foundation and Theme System - Research

**Researched:** 2026-03-22
**Domain:** SQLite schema migration, Rust/Tauri backend CRUD, React sidebar restructure, Zustand state management
**Confidence:** HIGH

## Summary

This phase adds a "themes" organizational layer to the existing project/task hierarchy. The core work spans three layers: (1) a SQLite migration that creates a `themes` table and adds `theme_id` foreign keys to `projects` and `tasks` while making `tasks.project_id` nullable, (2) Rust backend commands for theme CRUD plus modifications to existing project/task commands, and (3) a React sidebar restructure from flat project/task lists to accordion-style theme sections with collapsible groups.

The codebase has very well-established patterns for all three layers. Every new entity (projects, tasks, workflows, credentials, calendar accounts) follows the same Rust model-with-DB-impl pattern, the same Tauri command pattern, and the same Zustand slice pattern. Theme implementation follows these patterns exactly. The only non-trivial technical challenge is the SQLite table recreation pattern needed to make `tasks.project_id` nullable (SQLite does not support `ALTER TABLE ... ALTER COLUMN`).

**Primary recommendation:** Follow existing codebase patterns exactly. The migration uses SQLite's table recreation idiom. The sidebar restructure replaces the flat `ProjectList` + `TaskList` layout with theme-grouped accordion sections. Use `@dnd-kit/core` for theme reordering drag-and-drop -- it is the standard React DnD library and has zero existing dependencies in the project.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Theme creation uses inline "+" button in sidebar for quick creation, plus a dialog accessible for editing details (name, color) after creation
- **D-02:** Theme rename/delete via both right-click context menu (full options) and subtle hover icons for quick actions
- **D-03:** Themes display a color dot/accent from a preset palette of 8-10 colors for visual distinction
- **D-04:** Deleting a theme with items shows confirmation dialog with item count: "Delete 'Business'? 3 projects and 5 tasks will become uncategorized."
- **D-05:** Sidebar uses accordion-style theme sections. Each theme is a collapsible section containing its projects (with expand arrow), then standalone tasks below. Uncategorized bucket at bottom for items with no theme.
- **D-06:** Calendar toggle and mini-calendar stay at the top of the sidebar, above themes (global feature, not theme-specific)
- **D-07:** Workflows remain in their own section below themes, separated by a divider
- **D-08:** Themes are manually reorderable via drag-and-drop, stored as sort_order column
- **D-09:** Reassigning items between themes uses right-click context menu -> "Move to theme" submenu (no drag-and-drop reassignment)
- **D-10:** Clicking a project: arrow icon expands to show tasks inline in sidebar; clicking the project name navigates to project detail view in center panel
- **D-11:** Existing task creation flow stays, but project becomes optional. If created from a theme section, auto-assigns that theme. Quick capture creates standalone tasks.
- **D-12:** Standalone tasks appear in sidebar under their theme, listed after projects with a task icon
- **D-13:** Standalone tasks appear in Today View the same as project tasks -- no visual distinction
- **D-14:** Existing tasks (all currently linked to projects) keep their project_id during migration. No data changes for existing rows.
- **D-15:** Single migration file (007_themes.sql): creates themes table, adds theme_id to projects and tasks, makes project_id nullable on tasks
- **D-16:** Existing projects and tasks get NULL theme_id. UI renders them in an "Uncategorized" bucket. No auto-created default theme row.
- **D-17:** Themes table schema includes color from the start: themes(id, name, color, sort_order, created_at, updated_at)
- **D-18:** SQLite table recreation pattern for making tasks.project_id nullable (create new table, copy data, drop old, rename)

### Claude's Discretion
- Technical implementation details of drag-and-drop reordering (library choice, event handling)
- Exact preset color palette selection
- Internal Zustand store structure for themes
- Rust command naming and API design patterns

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| THEME-01 | User can create, rename, and delete themes | Theme CRUD backend (Rust model + commands), theme dialog + context menu (frontend), themeSlice (Zustand) |
| THEME-02 | User can assign projects and standalone tasks to themes | theme_id FK on projects/tasks, "Move to theme" context menu, update_project/update_task commands extended with theme_id |
| THEME-03 | Sidebar groups items by theme with collapsible sections and an uncategorized bucket | Sidebar restructure with accordion pattern, loadThemesWithItems query, collapsible state management |
| THEME-04 | User can create tasks that exist independently without a project | tasks.project_id made nullable via table recreation migration, create_task command accepts optional project_id |

</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.11 | State management for themes | Already used for all app state via slice pattern |
| lucide-react | 0.577.0 | Icons (ChevronDown, ChevronRight, Plus, MoreHorizontal, Circle) | Already used throughout the app |
| @radix-ui (via shadcn) | latest | DropdownMenu, Dialog, ScrollArea components | Already available in src/components/ui/ |
| rusqlite | (in Cargo.toml) | SQLite operations for theme CRUD | Already used for all DB operations |
| uuid + chrono | (in Cargo.toml) | ID generation and timestamps | Already used in all Rust models |

### New Dependency
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/core | 6.3.1 | Drag-and-drop for theme reordering | D-08 theme reorder only -- NOT for reassigning items between themes (D-09 uses context menu) |
| @dnd-kit/sortable | 10.0.0 | Sortable list preset for dnd-kit | Used with @dnd-kit/core for vertical list reordering |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-beautiful-dnd | react-beautiful-dnd is unmaintained (last release 2021). @dnd-kit is the active standard. |
| @dnd-kit | Native HTML drag events | Would work for simple reorder but lacks accessibility, animations, and sortable abstractions |
| Accordion component (custom) | Radix Accordion | Radix Accordion enforces single/multiple mode constraints that may conflict with sidebar needs. Custom collapsible state with ChevronDown/Right toggle is simpler and matches existing sidebar patterns. |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

## Architecture Patterns

### Recommended Project Structure (new files)
```
src-tauri/src/
  db/sql/007_themes.sql              # Migration
  models/theme.rs                     # Theme model + Database impl
  commands/theme_commands.rs          # Tauri commands

src/
  lib/types.ts                        # Add Theme type, update Task/Project types
  lib/tauri.ts                        # Add theme API functions
  stores/themeSlice.ts                # Zustand slice for themes
  stores/index.ts                     # Register themeSlice
  components/sidebar/
    ThemeSection.tsx                   # Single theme accordion section
    ThemeHeader.tsx                    # Theme name + color dot + collapse toggle + actions
    ThemeSidebar.tsx                   # All themes container with DnD context
    UncategorizedSection.tsx           # Default bucket for unthemed items
    StandaloneTaskItem.tsx             # Task item for sidebar display
    CreateThemeDialog.tsx              # Dialog for theme name + color
    MoveToThemeMenu.tsx               # Submenu component for reassignment
  components/layout/Sidebar.tsx       # Restructured to use ThemeSidebar
```

### Pattern 1: Rust Model with Database Impl (follow existing)
**What:** Each entity has a model file containing the struct, input types, and `impl Database` block with CRUD methods.
**When to use:** Always -- this is the established pattern for projects, tasks, workflows, etc.
**Example:**
```rust
// src-tauri/src/models/theme.rs (follows project.rs pattern exactly)
use serde::{Deserialize, Serialize};
use crate::db::connection::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Theme {
    pub id: String,
    pub name: String,
    pub color: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateThemeInput {
    pub name: String,
    pub color: String,
}

impl Database {
    pub fn create_theme(&self, input: CreateThemeInput) -> Result<Theme, rusqlite::Error> {
        // Get max sort_order and add 1
        let max_order: i32 = self.conn()
            .query_row("SELECT COALESCE(MAX(sort_order), -1) FROM themes", [], |r| r.get(0))?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        self.conn().execute(
            "INSERT INTO themes (id, name, color, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![id, input.name, input.color, max_order + 1, now, now],
        )?;
        Ok(Theme { id, name: input.name, color: input.color, sort_order: max_order + 1, created_at: now.clone(), updated_at: now })
    }
    // ... list_themes, update_theme, delete_theme, reorder_themes
}
```

### Pattern 2: Tauri Command (follow existing)
**What:** Each command acquires the Database mutex, calls model methods, emits events, returns Result.
**When to use:** Every backend operation.
**Example:**
```rust
// src-tauri/src/commands/theme_commands.rs
#[tauri::command]
pub async fn create_theme(
    app: AppHandle,
    state: State<'_, std::sync::Arc<std::sync::Mutex<Database>>>,
    name: String,
    color: String,
) -> Result<Theme, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let input = CreateThemeInput { name, color };
    let theme = db.create_theme(input).map_err(|e| e.to_string())?;
    app.emit("theme-created", &theme).map_err(|e| e.to_string())?;
    Ok(theme)
}
```

### Pattern 3: Zustand Slice (follow existing)
**What:** StateCreator<AppStore> with state + async actions calling `api.*` and updating via `set()`.
**When to use:** For theme state management.
**Example:**
```typescript
// src/stores/themeSlice.ts
export interface ThemeSlice {
  themes: Theme[];
  themesLoading: boolean;
  loadThemes: () => Promise<void>;
  createTheme: (name: string, color: string) => Promise<Theme>;
  updateTheme: (id: string, name: string, color: string) => Promise<void>;
  deleteTheme: (id: string) => Promise<void>;
  reorderThemes: (orderedIds: string[]) => Promise<void>;
  // Project/task assignment
  assignProjectToTheme: (projectId: string, themeId: string | null) => Promise<void>;
  assignTaskToTheme: (taskId: string, themeId: string | null) => Promise<void>;
}
```

### Pattern 4: Sidebar Accordion Section
**What:** Each theme renders as a collapsible section with header (color dot + name + actions) and children (projects then standalone tasks).
**When to use:** For the restructured sidebar.
**Example:**
```tsx
// ThemeSection.tsx
function ThemeSection({ theme, projects, tasks }: Props) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <ThemeHeader theme={theme} expanded={expanded} onToggle={() => setExpanded(!expanded)} />
      {expanded && (
        <div className="pl-2">
          {projects.map(p => <ProjectItem key={p.id} project={p} />)}
          {tasks.map(t => <StandaloneTaskItem key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Fetching themes, projects, and tasks separately then joining in React:** Use a single backend query that returns themes with their items, or load all three and group in the store. Do NOT make N+1 queries per theme.
- **Storing collapsed state in the backend:** Collapsed/expanded is ephemeral UI state. Keep it in component state or a separate Zustand slice, not in the database.
- **Using `ALTER TABLE tasks ALTER COLUMN project_id` in SQLite:** This does not work. SQLite requires the table recreation pattern (D-18).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reordering | Custom pointer event tracking | @dnd-kit/core + @dnd-kit/sortable | Handles accessibility, touch, keyboard, animations, edge cases (scroll during drag, item displacement) |
| Color picker for theme palette | Custom color grid component | Simple array of preset hex values with styled buttons | D-03 specifies preset palette of 8-10 colors; a full color picker is out of scope |
| SQLite migration diffing | Custom ALTER TABLE logic | Table recreation pattern (CREATE new, INSERT...SELECT, DROP old, ALTER TABLE RENAME) | SQLite's ALTER TABLE is extremely limited; table recreation is the documented approach |
| Context menu | Custom right-click handler | shadcn DropdownMenu (already used in ProjectList.tsx) | Handles positioning, keyboard navigation, focus management |

**Key insight:** The project already has established patterns for every layer. The implementation should be repetitive by design -- follow the project_commands/projectSlice/ProjectList patterns and adapt for themes.

## Common Pitfalls

### Pitfall 1: SQLite Table Recreation Ordering
**What goes wrong:** Foreign key constraints from other tables referencing `tasks` will block dropping the old table.
**Why it happens:** `tasks` has references from `task_tags(task_id)`, `execution_records` (if any reference tasks), and potentially scheduling tables.
**How to avoid:** The migration must: (1) PRAGMA foreign_keys=OFF, (2) BEGIN TRANSACTION, (3) CREATE tasks_new, (4) INSERT INTO tasks_new SELECT, (5) DROP tasks, (6) ALTER TABLE tasks_new RENAME TO tasks, (7) recreate indexes, (8) COMMIT, (9) PRAGMA foreign_keys=ON, (10) PRAGMA foreign_key_check. This is the documented SQLite pattern.
**Warning signs:** Migration fails with "FOREIGN KEY constraint failed" or referencing tables lose their data.

### Pitfall 2: project_id Nullability Cascade Through Frontend
**What goes wrong:** Making `project_id` nullable on tasks means every frontend location that assumes `task.projectId` is a string will break.
**Why it happens:** The current TypeScript type `Task.projectId: string` and the `createTask` function signature both assume project_id is required.
**How to avoid:** Update `Task.projectId` to `string | null`, update `CreateTaskInput.projectId` to optional, grep for all `task.projectId` usages and add null checks. The `listTasks(projectId)` API also needs a companion `listStandaloneTasks()` or `listTasksByTheme(themeId)`.
**Warning signs:** TypeScript errors during compilation, runtime errors when clicking standalone tasks.

### Pitfall 3: Sidebar Data Loading Strategy
**What goes wrong:** Loading themes, then projects per theme, then tasks per project creates a waterfall of sequential API calls.
**Why it happens:** Naive implementation queries each entity independently.
**How to avoid:** Create a single backend command like `list_sidebar_data` that returns all themes + projects + tasks in one call, or load all three flat lists and group them client-side in the Zustand store. The latter is simpler and matches existing patterns (projects and tasks are already loaded flat).
**Warning signs:** Sidebar flickers or loads incrementally (theme headers appear, then projects fill in).

### Pitfall 4: DnD-Kit with Sorted Lists
**What goes wrong:** Reordering themes visually works but sort_order values are not persisted correctly.
**Why it happens:** @dnd-kit gives you the reordered array, but you need to map new positions to sort_order values and batch-update them in the database.
**How to avoid:** On drag end, compute the new order array, optimistically update the Zustand store, then call a `reorder_themes` command that accepts `Vec<String>` (ordered theme IDs) and updates sort_order for each.
**Warning signs:** Theme order reverts on page refresh.

### Pitfall 5: Task Query Changes for Standalone Tasks
**What goes wrong:** Existing `list_tasks(project_id)` query uses `WHERE project_id = ?1`, which never returns standalone tasks (where project_id IS NULL).
**Why it happens:** The current API assumes every task belongs to a project.
**How to avoid:** Add new queries: `list_tasks_by_theme(theme_id)` for sidebar grouping, `list_standalone_tasks()` for uncategorized, and update `get_todays_tasks` to include standalone tasks. Keep `list_tasks(project_id)` working as-is for project detail views.
**Warning signs:** Standalone tasks vanish from Today View or are invisible in the sidebar.

### Pitfall 6: Existing Data After Migration
**What goes wrong:** Assuming existing projects/tasks need to be assigned to a theme during migration.
**Why it happens:** Temptation to create a "Default" theme and assign everything.
**How to avoid:** D-16 is explicit: existing rows get NULL theme_id, rendered in "Uncategorized" UI bucket. Migration only adds columns with NULL defaults.
**Warning signs:** Migration creates theme rows or updates existing data.

## Code Examples

### Migration SQL (007_themes.sql)
```sql
-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Add theme_id to projects
ALTER TABLE projects ADD COLUMN theme_id TEXT REFERENCES themes(id) ON DELETE SET NULL;

-- Recreate tasks table to make project_id nullable and add theme_id
-- Step 1: Disable FK checks for table recreation
PRAGMA foreign_keys=OFF;

-- Step 2: Create new table with nullable project_id and theme_id
CREATE TABLE tasks_new (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    theme_id TEXT REFERENCES themes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    context TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'in-progress', 'complete', 'blocked')),
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK(priority IN ('urgent', 'high', 'medium', 'low')),
    external_path TEXT,
    due_date TEXT,
    scheduled_date TEXT,
    scheduled_time TEXT,
    duration_minutes INTEGER,
    recurrence_rule TEXT,
    estimated_minutes INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Step 3: Copy existing data (project_id preserved, theme_id NULL)
INSERT INTO tasks_new SELECT
    id, project_id, NULL, title, description, context, status, priority,
    external_path, due_date, scheduled_date, scheduled_time,
    duration_minutes, recurrence_rule, estimated_minutes,
    created_at, updated_at
FROM tasks;

-- Step 4: Drop old table and rename
DROP TABLE tasks;
ALTER TABLE tasks_new RENAME TO tasks;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_theme_id ON tasks(theme_id);

-- Step 6: Re-enable FK checks
PRAGMA foreign_keys=ON;

-- Step 7: Add index for theme_id on projects
CREATE INDEX IF NOT EXISTS idx_projects_theme_id ON projects(theme_id);

-- Step 8: Add index for themes sort_order
CREATE INDEX IF NOT EXISTS idx_themes_sort_order ON themes(sort_order);
```

**Note:** The `task_tags` table references `tasks(id)` with ON DELETE CASCADE. After the table recreation, the `task_tags` foreign key will reference the new `tasks` table (SQLite resolves FKs by table name, not by object identity). Verify with `PRAGMA foreign_key_check` after migration.

### Theme Color Palette (recommended preset)
```typescript
// 10 preset colors that work on both light and dark themes
export const THEME_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#6b7280', // gray
] as const;
```

### Frontend Type Updates
```typescript
// src/lib/types.ts additions
export interface Theme {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Update existing types
export interface Project {
  id: string;
  name: string;
  description: string;
  themeId: string | null;  // NEW
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string | null;  // CHANGED from string to string | null
  themeId: string | null;     // NEW
  title: string;
  // ... rest unchanged
}

export interface CreateTaskInput {
  projectId?: string;  // CHANGED from required to optional
  themeId?: string;    // NEW
  title: string;
  // ... rest unchanged
}
```

### API Layer Additions
```typescript
// src/lib/tauri.ts additions
// Themes
createTheme: (name: string, color: string) =>
  invoke<Theme>("create_theme", { name, color }),
listThemes: () => invoke<Theme[]>("list_themes"),
updateTheme: (themeId: string, name: string, color: string) =>
  invoke<Theme>("update_theme", { themeId, name, color }),
deleteTheme: (themeId: string) =>
  invoke<void>("delete_theme", { themeId }),
reorderThemes: (orderedIds: string[]) =>
  invoke<void>("reorder_themes", { orderedIds }),

// Theme assignment
assignProjectTheme: (projectId: string, themeId: string | null) =>
  invoke<Project>("assign_project_theme", { projectId, themeId }),
assignTaskTheme: (taskId: string, themeId: string | null) =>
  invoke<Task>("assign_task_theme", { taskId, themeId }),

// Standalone tasks
listStandaloneTasks: () =>
  invoke<Task[]>("list_standalone_tasks"),
listTasksByTheme: (themeId: string) =>
  invoke<Task[]>("list_tasks_by_theme", { themeId }),
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2022+ | rbd is unmaintained; @dnd-kit is the active standard for React DnD |
| SQLite ALTER COLUMN | Table recreation pattern | Always (SQLite limitation) | SQLite has never supported ALTER COLUMN; table recreation is the only way |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Last release Dec 2021, does not support React 18+ strict mode properly. Use @dnd-kit instead.

## Open Questions

1. **task_tags FK after table recreation**
   - What we know: `task_tags` references `tasks(id)` ON DELETE CASCADE. After dropping and recreating `tasks`, SQLite resolves FKs by table name so it should work.
   - What's unclear: Whether any other tables (execution_records, schedule_blocks) have FKs to tasks that need verification.
   - Recommendation: Run `PRAGMA foreign_key_check` as the last step of migration. If violations found, the migration wrapping in a transaction allows rollback.

2. **Sidebar data loading granularity**
   - What we know: Current pattern loads projects and tasks in separate flat queries. Themes adds a third entity.
   - What's unclear: Whether a single combined query is worth the complexity vs. three parallel flat queries grouped client-side.
   - Recommendation: Three parallel flat queries (list_themes, list_projects, list_standalone_tasks) grouped in the Zustand store. Simpler, follows existing patterns, and the data volume is small enough that N queries are fine.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (frontend) | Vitest 4.1.0 + Testing Library |
| Framework (backend) | Rust cargo test (in-memory SQLite) |
| Config file | vite.config.ts (test section) |
| Quick run command (frontend) | `npm run test` |
| Quick run command (backend) | `cargo test --manifest-path src-tauri/Cargo.toml` |
| Full suite command | `npm run test && cargo test --manifest-path src-tauri/Cargo.toml` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| THEME-01 | Theme CRUD (create, rename, delete) | unit (Rust) | `cargo test --manifest-path src-tauri/Cargo.toml -- models::theme` | Wave 0 |
| THEME-01 | Theme CRUD frontend store | unit (Vitest) | `npx vitest run src/stores/themeSlice.test.ts` | Wave 0 |
| THEME-02 | Assign project/task to theme | unit (Rust) | `cargo test --manifest-path src-tauri/Cargo.toml -- models::theme::tests::test_assign` | Wave 0 |
| THEME-03 | Sidebar grouping logic | unit (Vitest) | `npx vitest run src/components/sidebar/ThemeSidebar.test.tsx` | Wave 0 |
| THEME-04 | Create task without project | unit (Rust) | `cargo test --manifest-path src-tauri/Cargo.toml -- models::task::tests::test_create_standalone` | Wave 0 |
| THEME-04 | Standalone task in Today View | unit (Vitest) | `npx vitest run src/components/center/__tests__/TodayView.test.tsx` | Exists (update) |
| ALL | Migration applies cleanly | unit (Rust) | `cargo test --manifest-path src-tauri/Cargo.toml -- models::theme::tests::test_migration` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test && cargo test --manifest-path src-tauri/Cargo.toml`
- **Per wave merge:** Full suite (same as above)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/models/theme.rs` tests -- covers THEME-01, THEME-02 (Rust CRUD + assignment)
- [ ] `src/stores/themeSlice.test.ts` -- covers THEME-01 frontend store actions
- [ ] `src/components/sidebar/ThemeSidebar.test.tsx` -- covers THEME-03 grouping logic
- [ ] Update `src/components/center/__tests__/TodayView.test.tsx` -- covers THEME-04 standalone tasks in today view
- [ ] Standalone task creation test in `models::task::tests` -- covers THEME-04 backend

## Sources

### Primary (HIGH confidence)
- Project codebase: `src-tauri/src/models/project.rs`, `task.rs` -- established Rust model pattern
- Project codebase: `src/stores/projectSlice.ts`, `taskSlice.ts` -- established Zustand slice pattern
- Project codebase: `src-tauri/src/db/migrations.rs` -- migration numbering and execution pattern
- Project codebase: `src/components/sidebar/ProjectList.tsx` -- sidebar component pattern with DropdownMenu
- SQLite documentation: Table recreation is the documented approach for column modification (sqlite.org/lang_altertable.html)

### Secondary (MEDIUM confidence)
- @dnd-kit: Well-established React DnD library, actively maintained. Version numbers based on training data -- verify with npm before install.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all core libraries already in use; only new dep is @dnd-kit
- Architecture: HIGH - follows exact existing patterns from codebase analysis
- Pitfalls: HIGH - SQLite table recreation is well-documented; FK cascade is verifiable
- Migration: HIGH - D-15 through D-18 are extremely specific locked decisions

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- no fast-moving external dependencies)
