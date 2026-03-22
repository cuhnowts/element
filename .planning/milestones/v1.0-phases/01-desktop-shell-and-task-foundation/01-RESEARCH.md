# Phase 1: Desktop Shell and Task Foundation - Research

**Researched:** 2026-03-15
**Domain:** Tauri 2.x desktop app shell, React 19 UI with shadcn/ui, SQLite persistence via rusqlite, task CRUD
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire application foundation: a Tauri 2.x desktop shell with native feel (system tray, menus, keyboard shortcuts), a React 19 frontend with shadcn/ui components for the sidebar + main area layout, a Rust backend with SQLite persistence via rusqlite for task data, and structured file storage for workflow definitions. This phase is greenfield -- no existing code, no legacy constraints.

The core technical challenge is not complexity but correctness of architecture boundaries. The Rust backend must own all data access via rusqlite; the frontend must be purely presentational, receiving state via Tauri events and sending commands via `invoke`. Getting this boundary right in Phase 1 prevents the most common Tauri app failure mode: frontend pollution where business logic leaks into the WebView.

**Primary recommendation:** Build bottom-up: SQLite schema and Rust data layer first, then Tauri commands for CRUD, then React UI components, then desktop shell features (menus, tray, shortcuts). Each layer is testable independently before integration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Tasks have: title, description, context (freeform markdown/rich-text notes field), status, priority, project, tags
- Context is a flexible notes area for links, code snippets, reference material -- not structured metadata
- Projects are the top-level organizational unit -- every task belongs to a project
- Tags provide secondary categorization (type, custom labels) within projects
- Priority is a fixed 4-level scale: Urgent, High, Medium, Low
- Status is a fixed 4-value enum: Pending, In Progress, Complete, Blocked
- Sidebar + main area layout (like Linear)
- Left sidebar split into two sections: project list (top) and task list for selected project (bottom)
- Main area shows selected task detail (title, status, priority, tags, context)
- Sidebar is resizable via drag (using shadcn resizable panels) -- establishes the pattern for Phase 2's multi-panel layout
- Task list uses compact rows: status icon + title + priority badge -- one line per task, dense and scannable
- Empty state on first launch: clean onboarding prompt with "Create your first project" CTA
- Dark and light mode supported, defaulting to OS system preference (Tailwind v4 + shadcn theming)

### Claude's Discretion
- Desktop shell details: system tray behavior, menu structure, keyboard shortcuts
- Workflow definition file format (YAML vs JSON vs TOML) -- user chose not to discuss
- Task detail panel layout specifics (field ordering, edit interactions)
- Loading states and error handling patterns
- Exact color scheme / design tokens beyond dark/light mode

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | App metadata stored locally in SQLite (task state, execution history, credentials, preferences, calendar cache) | rusqlite with bundled SQLite, PRAGMA user_version for migrations, Tauri app data directory for DB file location |
| DATA-02 | Workflow definitions stored as structured files (YAML/JSON) | JSON recommended for Phase 1 (see rationale in Architecture Patterns); serde_json in Rust, filesystem storage in app config directory |
| DATA-03 | Project work lives in external repos -- Element orchestrates, doesn't store project files | Task model includes optional `external_path` field pointing to repo; Element never copies or manages external files |
| UI-06 | App has native desktop feel (macOS primary, menus, shortcuts) | Tauri 2.x system tray (TrayIconBuilder), window menus (MenuBuilder with accelerators), tauri-plugin-global-shortcut for keyboard shortcuts |
| TASK-01 | User can create tasks with title, description, and context | Rust CRUD commands via Tauri invoke, SQLite table with title/description/context columns, React form in detail panel |
| TASK-02 | User can organize tasks by project, type, priority, or custom tags | Projects table + foreign key on tasks, priority enum column, tags as junction table (tasks_tags), filtering/sorting in frontend |
| TASK-03 | User can track task status (pending, in-progress, complete, blocked) | Status enum column on tasks table, Rust command to update status, frontend reflects change via Tauri event emission |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tauri | 2.10.x | Desktop app shell | Native OS webview, ~5MB bundles, Rust backend, capability-based security. Official `create-tauri-app` scaffolds the project. |
| Rust (stable) | 1.80+ | Backend logic, data layer, IPC commands | Type-safe, memory-safe. Tauri's native language. All business logic lives here. |
| React | 19.x | UI framework | Largest component ecosystem. shadcn/ui, react-resizable-panels built for React. |
| TypeScript | 5.7+ | Frontend type safety | Non-negotiable. Type-safe IPC with Tauri commands via `invoke<T>()`. |
| Vite | 6.x | Build tool / dev server | Tauri's recommended bundler. Fast HMR for desktop app development. |
| shadcn/ui | latest (CLI v4) | Component library | Copy-paste components: Sidebar, ResizablePanel, Dialog, Command, Input, Badge, Select. Full control over styling. |
| Tailwind CSS | 4.x | Styling | CSS-first config via `@theme` in app.css. OKLCH colors. Dark/light mode via `prefers-color-scheme`. |
| Zustand | 5.x | Client state management | Centralized store for active project, selected task, panel state. Slice pattern for modularity. |
| rusqlite | 0.32.x | SQLite from Rust | Bundled SQLite feature -- zero external dependency. Direct Rust access, no IPC overhead for backend ops. |
| serde / serde_json | 1.x | Serialization | All IPC payloads, workflow definitions, and DB query results serialize through serde. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-resizable-panels | 4.x | Panel layout engine | Powers shadcn's Resizable component. Used for sidebar resize and future multi-panel layout. |
| @tauri-apps/api | 2.x | Frontend Tauri bindings | `invoke()` for commands, `listen()` for events, `emit()` for frontend-to-backend. |
| @tauri-apps/plugin-global-shortcut | 2.x | Keyboard shortcuts | Register system-wide shortcuts (Cmd+N for new task, etc.). |
| uuid (Rust crate) | 1.x | ID generation | UUIDs for tasks, projects, tags. Avoids auto-increment ID collisions. |
| chrono (Rust crate) | 0.4.x | Timestamps | Created/updated timestamps on all entities. ISO 8601 format for serialization. |
| Biome | 1.x | Lint + format | Single tool replaces ESLint + Prettier. 10-100x faster. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rusqlite (direct) | tauri-plugin-sql (sqlx) | Plugin adds abstraction layer; rusqlite gives more control for migrations and is simpler for a Rust-owned data layer |
| Zustand | Jotai | Jotai's atomic model is better for independent state; Zustand's centralized store fits Element's interconnected state (project/task/panel) |
| JSON for workflow defs | YAML | YAML is more human-readable but serde-yaml is deprecated; serde_yaml_ng exists but adds ecosystem risk. JSON with serde_json is stable and well-tested. |
| shadcn Sidebar | Custom sidebar | shadcn Sidebar provides collapsible modes (offcanvas, icon, none), keyboard support, and theming out of the box |

**Installation:**

```bash
# Create Tauri project
npm create tauri-app@latest element -- --template react-ts

# Frontend dependencies
npm install react@19 react-dom@19
npm install zustand
npm install tailwindcss@4 @tailwindcss/vite
npm install @tauri-apps/plugin-global-shortcut

# shadcn/ui (CLI adds components individually)
npx shadcn@latest init
npx shadcn@latest add sidebar resizable input badge select dialog command textarea

# Dev dependencies
npm install -D typescript @types/react @types/react-dom
npm install -D vite @vitejs/plugin-react
npm install -D @biomejs/biome
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri = { version = "~2.10", features = ["tray-icon"] }
rusqlite = { version = "0.32", features = ["bundled"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
tokio = { version = "1", features = ["full"] }

[dependencies.tauri-plugin-global-shortcut]
version = "2"
```

## Architecture Patterns

### Recommended Project Structure

```
element/
├── src/                          # React frontend
│   ├── App.tsx                   # Root component with SidebarProvider + ResizablePanelGroup
│   ├── main.tsx                  # Entry point
│   ├── app.css                   # Tailwind v4 @theme config, dark/light mode
│   ├── components/
│   │   ├── ui/                   # shadcn components (auto-generated)
│   │   ├── sidebar/
│   │   │   ├── ProjectList.tsx   # Top section: project list
│   │   │   ├── TaskList.tsx      # Bottom section: task list for selected project
│   │   │   └── TaskRow.tsx       # Compact row: status icon + title + priority badge
│   │   ├── detail/
│   │   │   ├── TaskDetail.tsx    # Main area: selected task detail
│   │   │   ├── TaskForm.tsx      # Create/edit task form
│   │   │   └── EmptyState.tsx    # First-launch onboarding CTA
│   │   └── layout/
│   │       └── AppLayout.tsx     # SidebarProvider + ResizablePanelGroup shell
│   ├── stores/
│   │   ├── index.ts              # Combined store
│   │   ├── projectSlice.ts       # Projects state + actions
│   │   ├── taskSlice.ts          # Tasks state + actions
│   │   └── uiSlice.ts            # Panel state, selected items
│   ├── lib/
│   │   ├── tauri.ts              # Typed invoke wrappers
│   │   └── types.ts              # Shared TypeScript types matching Rust structs
│   └── hooks/
│       ├── useProjects.ts        # Project CRUD hooks
│       └── useTasks.ts           # Task CRUD hooks
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs                # Tauri setup, command registration, menu/tray
│   │   ├── main.rs               # Entry point
│   │   ├── db/
│   │   │   ├── mod.rs            # Database module
│   │   │   ├── connection.rs     # SQLite connection management
│   │   │   ├── migrations.rs     # Schema migrations via PRAGMA user_version
│   │   │   └── schema.rs         # Table creation SQL
│   │   ├── models/
│   │   │   ├── mod.rs
│   │   │   ├── project.rs        # Project struct + DB operations
│   │   │   ├── task.rs           # Task struct + DB operations
│   │   │   └── tag.rs            # Tag struct + DB operations
│   │   └── commands/
│   │       ├── mod.rs
│   │       ├── project_commands.rs  # Tauri commands for project CRUD
│   │       └── task_commands.rs     # Tauri commands for task CRUD
│   ├── Cargo.toml
│   └── tauri.conf.json
├── workflows/                    # Workflow definition files (structured JSON)
│   └── .gitkeep
├── biome.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Pattern 1: Rust-Owned Data Layer with Tauri Commands

**What:** All database access happens in Rust. The frontend never touches SQLite directly. Each CRUD operation is a Tauri command that the frontend calls via `invoke`.

**When to use:** Every data operation in the application.

**Example:**

```rust
// src-tauri/src/models/task.rs
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: String,
    pub context: String,             // Freeform markdown
    pub status: TaskStatus,
    pub priority: TaskPriority,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Pending,
    #[serde(rename = "in-progress")]
    InProgress,
    Complete,
    Blocked,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum TaskPriority {
    Urgent,
    High,
    Medium,
    Low,
}

// src-tauri/src/commands/task_commands.rs
use tauri::{AppHandle, Emitter, State};
use crate::db::DbPool;
use crate::models::task::{Task, TaskStatus, TaskPriority};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub context: Option<String>,
    pub priority: Option<TaskPriority>,
    pub tags: Option<Vec<String>>,
}

#[tauri::command]
pub async fn create_task(
    app: AppHandle,
    state: State<'_, DbPool>,
    input: CreateTaskInput,
) -> Result<Task, String> {
    let task = state.create_task(input).map_err(|e| e.to_string())?;
    app.emit("task-created", &task).map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
pub async fn list_tasks(
    state: State<'_, DbPool>,
    project_id: String,
) -> Result<Vec<Task>, String> {
    state.list_tasks(&project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_task_status(
    app: AppHandle,
    state: State<'_, DbPool>,
    task_id: String,
    status: TaskStatus,
) -> Result<Task, String> {
    let task = state.update_task_status(&task_id, status)
        .map_err(|e| e.to_string())?;
    app.emit("task-updated", &task).map_err(|e| e.to_string())?;
    Ok(task)
}
```

```typescript
// src/lib/tauri.ts
import { invoke } from '@tauri-apps/api/core';
import type { Task, Project, CreateTaskInput } from './types';

export const api = {
  createTask: (input: CreateTaskInput) =>
    invoke<Task>('create_task', { input }),
  listTasks: (projectId: string) =>
    invoke<Task[]>('list_tasks', { projectId }),
  updateTaskStatus: (taskId: string, status: string) =>
    invoke<Task>('update_task_status', { taskId, status }),
  // ... other commands
};
```

### Pattern 2: Zustand Store with Slices

**What:** A single Zustand store with slice pattern for modularity. Each slice manages one domain (projects, tasks, UI state). Custom hooks expose only what components need.

**When to use:** All frontend state management.

**Example:**

```typescript
// src/stores/taskSlice.ts
import type { StateCreator } from 'zustand';
import { api } from '../lib/tauri';
import type { Task, CreateTaskInput } from '../lib/types';

export interface TaskSlice {
  tasks: Task[];
  selectedTaskId: string | null;
  loading: boolean;
  // Actions
  loadTasks: (projectId: string) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTaskStatus: (taskId: string, status: string) => Promise<void>;
  selectTask: (taskId: string | null) => void;
}

export const createTaskSlice: StateCreator<TaskSlice> = (set, get) => ({
  tasks: [],
  selectedTaskId: null,
  loading: false,

  loadTasks: async (projectId) => {
    set({ loading: true });
    const tasks = await api.listTasks(projectId);
    set({ tasks, loading: false });
  },

  createTask: async (input) => {
    const task = await api.createTask(input);
    set((state) => ({ tasks: [...state.tasks, task] }));
    return task;
  },

  updateTaskStatus: async (taskId, status) => {
    await api.updateTaskStatus(taskId, status);
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status } : t
      ),
    }));
  },

  selectTask: (taskId) => set({ selectedTaskId: taskId }),
});
```

### Pattern 3: Event-Driven UI Updates

**What:** Rust emits events after state changes. Frontend listens and updates Zustand store. This ensures UI stays in sync even when multiple operations happen.

**When to use:** After any backend state mutation.

**Example:**

```typescript
// src/hooks/useTauriEvents.ts
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useStore } from '../stores';

export function useTauriEvents() {
  const { loadTasks, selectedProjectId } = useStore();

  useEffect(() => {
    const unlisten = Promise.all([
      listen<Task>('task-created', () => {
        if (selectedProjectId) loadTasks(selectedProjectId);
      }),
      listen<Task>('task-updated', () => {
        if (selectedProjectId) loadTasks(selectedProjectId);
      }),
    ]);

    return () => {
      unlisten.then((fns) => fns.forEach((fn) => fn()));
    };
  }, [selectedProjectId]);
}
```

### Pattern 4: SQLite Migrations via PRAGMA user_version

**What:** Use SQLite's built-in `PRAGMA user_version` to track schema version. Each version bump runs migration SQL in a transaction.

**When to use:** Database initialization and all future schema changes.

**Example:**

```rust
// src-tauri/src/db/migrations.rs
use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    let version: i32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(include_str!("sql/001_initial.sql"))?;
        conn.pragma_update(None, "user_version", 1)?;
    }
    // Future migrations:
    // if version < 2 { ... conn.pragma_update(None, "user_version", 2)?; }

    Ok(())
}
```

```sql
-- src-tauri/src/db/sql/001_initial.sql
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    context TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'in-progress', 'complete', 'blocked')),
    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK(priority IN ('urgent', 'high', 'medium', 'low')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_tags (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag_id ON task_tags(tag_id);
```

### Anti-Patterns to Avoid

- **Frontend DB access:** Never use tauri-plugin-sql to let the frontend query SQLite directly. All queries go through Rust commands. This boundary is critical for Phase 2+ when the workflow engine also needs DB access.
- **Business logic in components:** React components should call store actions, not invoke Tauri commands directly. Store actions are the boundary.
- **Polling for updates:** Never use `setInterval` to refresh task lists. Use Tauri's event system (`listen`/`emit`) for reactive updates.
- **Monolithic Rust file:** Split commands, models, and DB logic into separate modules from day one. A single `lib.rs` with everything becomes unmaintainable by Phase 2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resizable sidebar panels | Custom drag-resize logic | shadcn Resizable (react-resizable-panels v4) | Handles keyboard accessibility, min/max sizes, persist state, RTL support |
| Sidebar with collapsible modes | Custom sidebar component | shadcn Sidebar (SidebarProvider, SidebarContent, etc.) | Handles offcanvas/icon/none modes, keyboard nav, theming |
| System tray icon + menu | Custom native integration | Tauri TrayIconBuilder + Menu API | Cross-platform, handles macOS menu quirks (first submenu = app menu) |
| Keyboard shortcuts | Custom key listeners | tauri-plugin-global-shortcut | System-wide, handles Cmd vs Ctrl per platform, conflict resolution |
| Dark/light mode | Custom theme toggle | Tailwind v4 `prefers-color-scheme` + `@theme` | OS preference detection built in, CSS variables for theming |
| UUID generation | Custom ID scheme | `uuid` crate (Rust) | Collision-free across devices, serde support, standard format |
| SQLite connection pooling | Manual connection management | rusqlite with Mutex-wrapped connection | Single-writer SQLite doesn't benefit from pooling; Mutex is correct |

**Key insight:** Phase 1 has very little novel engineering. The value is in correct assembly of well-understood pieces. Every component listed above has official documentation and production usage patterns.

## Common Pitfalls

### Pitfall 1: SQLite Connection Threading in Tauri

**What goes wrong:** Tauri commands run on a thread pool. SQLite in WAL mode supports concurrent reads but only one writer. Sharing a connection without synchronization causes `SQLITE_BUSY` errors.
**Why it happens:** Developers create one `Connection` in setup and pass it to all commands without synchronization.
**How to avoid:** Wrap the SQLite connection in `Mutex<Connection>` and store it in Tauri's managed state. Lock briefly for each operation. For Phase 1's simple CRUD, this is sufficient. Consider `r2d2-sqlite` connection pool only if Phase 2+ needs concurrent writes.
**Warning signs:** Intermittent "database is locked" errors under any concurrent use.

### Pitfall 2: Tauri Command Argument Naming

**What goes wrong:** Rust uses `snake_case` for function parameters. JavaScript uses `camelCase`. If the Tauri command parameter is `project_id` in Rust, the frontend must pass `projectId` in the invoke call -- Tauri handles the conversion. But if you use `#[serde(rename_all = "camelCase")]` on the command input struct, the conversion is explicit and predictable.
**Why it happens:** Implicit serde renaming conventions differ between struct fields and function parameters.
**How to avoid:** Always use `#[serde(rename_all = "camelCase")]` on input/output structs. For command function parameters, Tauri automatically converts snake_case to camelCase.
**Warning signs:** `invoke` calls silently fail or return unexpected null values.

### Pitfall 3: macOS Menu Structure Requirements

**What goes wrong:** On macOS, the first submenu in the menu bar is always the application menu (with About, Preferences, Quit). Developers add their first real menu item and it disappears into the app menu.
**Why it happens:** macOS convention is that the first menu item is the app name menu. Tauri follows this convention.
**How to avoid:** Always add an explicit "app name" submenu as the first menu entry. Put File, Edit, View, etc. after it.
**Warning signs:** First menu item is invisible or appears under the wrong menu.

### Pitfall 4: Tailwind v4 Configuration Migration

**What goes wrong:** Developers look for `tailwind.config.js` and can't find it. Tailwind v4 uses CSS-first configuration via `@theme` blocks in the CSS file. There is no config JS file.
**Why it happens:** All Tailwind v3 documentation and tutorials reference the config file. Tailwind v4 is a paradigm shift.
**How to avoid:** All theme customization goes in `app.css` using `@theme { }`. No `tailwind.config.js` file exists or should be created.
**Warning signs:** Creating a `tailwind.config.js` that is silently ignored.

### Pitfall 5: Forgetting Foreign Key Enforcement in SQLite

**What goes wrong:** SQLite has foreign keys disabled by default. Tasks reference projects via `project_id`, but without foreign key enforcement, orphaned tasks survive after project deletion.
**Why it happens:** SQLite's default is `PRAGMA foreign_keys = OFF` for backwards compatibility.
**How to avoid:** Run `PRAGMA foreign_keys = ON;` immediately after opening the connection, before any other queries.
**Warning signs:** Deleting a project leaves its tasks in the database, or `ON DELETE CASCADE` doesn't fire.

## Code Examples

### Tauri App Setup with Menu, Tray, and Database

```rust
// src-tauri/src/lib.rs
// Source: Tauri v2 official docs (v2.tauri.app)
use tauri::{
    menu::{Menu, MenuItem, Submenu, MenuBuilder, SubmenuBuilder},
    tray::TrayIconBuilder,
    Manager,
};
use std::sync::Mutex;

mod db;
mod models;
mod commands;

use db::connection::Database;
use commands::project_commands::*;
use commands::task_commands::*;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Initialize database
            let db = Database::new(app.handle())?;
            app.manage(Mutex::new(db));

            // System tray
            let quit = MenuItem::with_id(app, "quit", "Quit Element", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show Element", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::new()
                .menu(&tray_menu)
                .menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            // Window menu
            let app_menu = SubmenuBuilder::new(app, "Element")
                .about(None)
                .separator()
                .quit()
                .build()?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .text("new-project", "New Project")
                .text("new-task", "New Task")
                .separator()
                .close_window()
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let menu = Menu::with_items(app, &[&app_menu, &file_menu, &edit_menu])?;
            app.set_menu(menu)?;

            app.on_menu_event(move |app_handle, event| {
                match event.id().0.as_str() {
                    "new-project" => {
                        let _ = app_handle.emit("menu-new-project", ());
                    }
                    "new-task" => {
                        let _ = app_handle.emit("menu-new-task", ());
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_project,
            list_projects,
            delete_project,
            create_task,
            list_tasks,
            get_task,
            update_task,
            update_task_status,
            delete_task,
            add_tag_to_task,
            remove_tag_from_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### App Layout with shadcn Components

```tsx
// src/components/layout/AppLayout.tsx
// Source: shadcn/ui docs (ui.shadcn.com)
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from '../ui/sidebar';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '../ui/resizable';
import { ProjectList } from '../sidebar/ProjectList';
import { TaskList } from '../sidebar/TaskList';
import { TaskDetail } from '../detail/TaskDetail';
import { EmptyState } from '../detail/EmptyState';
import { useStore } from '../../stores';

export function AppLayout() {
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const hasProjects = useStore((s) => s.projects.length > 0);

  return (
    <SidebarProvider>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
          <Sidebar>
            <SidebarHeader>
              <h1 className="text-lg font-semibold px-4 py-2">Element</h1>
            </SidebarHeader>
            <SidebarContent>
              <ProjectList />
              <TaskList />
            </SidebarContent>
          </Sidebar>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={70}>
          <main className="h-full overflow-auto">
            {!hasProjects ? (
              <EmptyState />
            ) : selectedTaskId ? (
              <TaskDetail taskId={selectedTaskId} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a task to view details
              </div>
            )}
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  );
}
```

### Dark/Light Mode with Tailwind v4

```css
/* src/app.css */
/* Source: Tailwind v4 docs, shadcn/ui Tailwind v4 guide */
@import "tailwindcss";

@theme {
  /* shadcn theme tokens are auto-configured by `npx shadcn init` */
  /* Custom additions: */
  --color-sidebar-bg: oklch(0.97 0 0);
  --color-sidebar-fg: oklch(0.2 0 0);
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode overrides are handled by shadcn's CSS variables */
    /* Custom dark additions: */
    --color-sidebar-bg: oklch(0.15 0 0);
    --color-sidebar-fg: oklch(0.9 0 0);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind config JS file | Tailwind v4 CSS-first `@theme` | Feb 2025 | No tailwind.config.js; all config in CSS |
| serde-yaml (dtolnay) | serde_yaml_ng or serde_json | Mar 2024 (deprecated) | Original serde-yaml unmaintained; use JSON or maintained fork |
| react-resizable-panels v3 (`direction` prop) | v4 (`orientation` prop) | Feb 2025 | Prop rename; shadcn wrapper handles compatibility |
| Tauri 1.x plugin system | Tauri 2.x capability-based plugins | Oct 2024 | New permission model, different plugin registration |
| shadcn/ui with Tailwind v3 | shadcn/ui with Tailwind v4 support | 2025 | CLI detects Tailwind version and configures accordingly |

**Deprecated/outdated:**
- `serde-yaml` (dtolnay): Unmaintained since March 2024. Use `serde_json` for workflow definitions in Phase 1. If YAML is needed later, use `serde_yaml_ng`.
- `tailwind.config.js`: Does not exist in Tailwind v4. All configuration via CSS `@theme`.
- Tauri v1 APIs: Ensure all documentation references are v2.tauri.app, not v1.tauri.app.

## Workflow Definition Format Recommendation

**Recommendation: JSON for Phase 1.**

The ARCHITECTURE.md recommends YAML, but the Rust YAML ecosystem is fragmented (serde-yaml deprecated March 2024, serde_yaml_ng is a community fork, serde_yml has unsoundness advisories). JSON via serde_json is stable, well-tested, and ships with serde. For Phase 1, workflow definitions are minimal (just task metadata), so human readability is not yet critical. YAML can be added in later phases via serde_yaml_ng if user demand warrants it.

```json
{
  "version": "1",
  "name": "example-workflow",
  "description": "A simple workflow definition",
  "steps": []
}
```

## Open Questions

1. **Workflow definition schema scope for Phase 1**
   - What we know: DATA-02 requires structured files for workflow definitions. Phase 1 is about task CRUD, not workflow execution.
   - What's unclear: How much workflow definition structure to build now vs. defer to Phase 2/3.
   - Recommendation: Define the file format and a minimal schema (name, description, steps array) but don't build execution. The schema exists for DATA-02 compliance; execution is Phase 2+.

2. **TanStack Router in Phase 1**
   - What we know: STACK.md recommends TanStack Router for routing.
   - What's unclear: Phase 1 is a single-view app (sidebar + detail). Routing may be unnecessary until Phase 2 adds views.
   - Recommendation: Skip TanStack Router in Phase 1. The app is a single view managed by Zustand state (which project/task is selected). Add routing in Phase 2 when multiple views exist.

3. **Drizzle ORM in Phase 1**
   - What we know: STACK.md recommends Drizzle for TypeScript-side type-safe queries.
   - What's unclear: If the Rust backend owns all DB access, when does Drizzle come in?
   - Recommendation: Skip Drizzle in Phase 1. The frontend never queries the DB directly. TypeScript types are manually synced with Rust structs. Consider Drizzle only if/when a TypeScript layer needs direct DB access (unlikely given the architecture).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (frontend) + cargo test (Rust backend) |
| Config file | vitest.config.ts (Wave 0) + built-in Cargo.toml test config |
| Quick run command | `npm run test -- --run` and `cd src-tauri && cargo test` |
| Full suite command | `npm run test && cd src-tauri && cargo test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | SQLite DB created in app data dir, tables exist | unit (Rust) | `cd src-tauri && cargo test db::tests -q` | Wave 0 |
| DATA-02 | Workflow definition files can be read/written as JSON | unit (Rust) | `cd src-tauri && cargo test models::workflow::tests -q` | Wave 0 |
| DATA-03 | Tasks reference external paths without storing project files | unit (Rust) | `cd src-tauri && cargo test models::task::tests -q` | Wave 0 |
| UI-06 | App launches with menu, tray icon, responds to shortcuts | manual + smoke | Manual verification (Tauri window opens with native chrome) | Manual-only: requires GUI |
| TASK-01 | Create task with title, description, context | unit (Rust) + component (React) | `cd src-tauri && cargo test commands::task_commands::tests -q` | Wave 0 |
| TASK-02 | Filter/organize tasks by project, priority, tags | unit (Rust) | `cd src-tauri && cargo test commands::task_commands::tests::filter -q` | Wave 0 |
| TASK-03 | Update task status, event emitted | unit (Rust) | `cd src-tauri && cargo test commands::task_commands::tests::status -q` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd src-tauri && cargo test -q && npm run test -- --run`
- **Per wave merge:** Full suite: `npm run test && cd src-tauri && cargo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` -- Vitest configuration with jsdom environment
- [ ] `src/test/setup.ts` -- Testing Library setup file
- [ ] `src-tauri/src/db/tests.rs` -- Database initialization and migration tests
- [ ] `src-tauri/src/commands/tests.rs` -- Command handler tests with in-memory SQLite
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`

## Sources

### Primary (HIGH confidence)
- [Tauri v2 - Create Project](https://v2.tauri.app/start/create-project/) -- project scaffolding
- [Tauri v2 - Calling Rust from Frontend](https://v2.tauri.app/develop/calling-rust/) -- invoke commands, State, error handling
- [Tauri v2 - Calling Frontend from Rust](https://v2.tauri.app/develop/calling-frontend/) -- emit events, typed payloads
- [Tauri v2 - System Tray](https://v2.tauri.app/learn/system-tray/) -- TrayIconBuilder, menu events
- [Tauri v2 - Window Menu](https://v2.tauri.app/learn/window-menu/) -- MenuBuilder, accelerators, event handling
- [Tauri v2 - Global Shortcut Plugin](https://v2.tauri.app/plugin/global-shortcut/) -- system-wide keyboard shortcuts
- [shadcn/ui - Sidebar](https://ui.shadcn.com/docs/components/radix/sidebar) -- SidebarProvider, composable sidebar architecture
- [shadcn/ui - Resizable](https://ui.shadcn.com/docs/components/radix/resizable) -- ResizablePanelGroup, react-resizable-panels v4
- [shadcn/ui - Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) -- CSS-first config, @theme blocks

### Secondary (MEDIUM confidence)
- [MoonGuard - SQLite with Tauri and Rust](https://blog.moonguard.dev/how-to-use-local-sqlite-database-with-tauri) -- rusqlite patterns in Tauri
- [RandomEngy/tauri-sqlite](https://github.com/RandomEngy/tauri-sqlite) -- PRAGMA user_version migration pattern
- [Zustand Slices Pattern (DeepWiki)](https://deepwiki.com/pmndrs/zustand/7.1-slices-pattern) -- store organization
- [serde-yaml deprecation discussion](https://users.rust-lang.org/t/serde-yaml-deprecation-alternatives/108868) -- YAML ecosystem status
- [RUSTSEC-2025-0068](https://rustsec.org/advisories/RUSTSEC-2025-0068.html) -- serde_yml unsoundness advisory

### Tertiary (LOW confidence)
- [dannysmith/tauri-template](https://github.com/dannysmith/tauri-template) -- Tauri v2 + React 19 template with theme system (community template, not official)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all core libraries have official docs and production usage; Tauri 2.x, React 19, shadcn/ui, rusqlite are mature
- Architecture: HIGH -- patterns from Tauri official docs, confirmed by community templates and prior research in ARCHITECTURE.md
- Pitfalls: HIGH -- SQLite threading, macOS menu quirks, Tailwind v4 migration all documented in official sources
- Workflow format: MEDIUM -- JSON recommendation based on serde-yaml deprecation; may need YAML later for human readability

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable stack, 30-day validity)
