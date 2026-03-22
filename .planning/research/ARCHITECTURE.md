# Architecture Research

**Domain:** Desktop project management features integrating into existing Tauri 2.x + React 19 + SQLite app
**Researched:** 2026-03-22
**Confidence:** HIGH

## System Overview

### Current Architecture (v1.0)

```
Frontend (React 19 + TypeScript)
+---------------------------------------------------------------------------+
|  AppLayout                                                                 |
|  +----------+  +------------------+  +----------------------------------+ |
|  | Sidebar  |  | CenterPanel      |  | OutputDrawer (collapsible)       | |
|  | (280px)  |  | (TodayView /     |  | (logs, execution output)         | |
|  |          |  |  TaskDetail /     |  |                                  | |
|  |          |  |  WorkflowDetail)  |  |                                  | |
|  +----------+  +------------------+  +----------------------------------+ |
+---------------------------------------------------------------------------+
       |                |                       |
       v                v                       v
  Zustand Stores: AppStore (8 slices) + useTaskStore + useWorkspaceStore
       |
       v  Tauri IPC (invoke / events)
+---------------------------------------------------------------------------+
|  Rust Backend                                                              |
|  +----------+  +-----------+  +----------+  +----------+  +----------+   |
|  | Commands |  | Models    |  | AI       |  | Plugins  |  | Engine   |   |
|  | (12 mods)|  | (project, |  | (gateway,|  | (host,   |  | (sched,  |   |
|  |          |  |  task,    |  |  4 provs)|  |  registry)|  |  exec)   |   |
|  +----------+  |  workflow)|  +----------+  +----------+  +----------+   |
|       |        +----------+       |                            |          |
|       v                           v                            v          |
|  +------------------------------------------------------------------+    |
|  | Database: Arc<Mutex<Database>> wrapping rusqlite::Connection      |    |
|  | SQLite: 6 migration files, ~15 tables                             |    |
|  +------------------------------------------------------------------+    |
+---------------------------------------------------------------------------+
```

### v1.1 Architecture Additions

```
Frontend Additions
+---------------------------------------------------------------------------+
|  AppLayout (MODIFIED)                                                      |
|  +----------+  +------------------+  +----------------------------------+ |
|  | Sidebar  |  | CenterPanel      |  | OutputDrawer (EXTENDED)          | |
|  | MODIFIED:|  | NEW views:       |  | NEW tabs:                        | |
|  | +Theme   |  | +ProjectWorkspace|  | +Terminal (xterm.js + PTY)       | |
|  |  groups  |  | +OnboardingWizard|  | +FileExplorer                    | |
|  | +Project |  | +ThemeView       |  |                                  | |
|  |  tree    |  |                  |  |                                  | |
|  +----------+  +------------------+  +----------------------------------+ |
+---------------------------------------------------------------------------+
       |                |                       |
       v                v                       v
  NEW Zustand slices: themeSlice, terminalSlice, fileExplorerSlice
  MODIFIED slices: projectSlice (dir_path, theme_id, ai_mode, phases)
       |
       v  Tauri IPC + NEW: PTY plugin events
+---------------------------------------------------------------------------+
|  Rust Backend Additions                                                    |
|  +----------+  +-----------+  +----------+  +----------+  +----------+   |
|  | NEW cmds |  | MODIFIED  |  | AI       |  | NEW      |  | Engine   |   |
|  | +theme   |  | models:   |  | EXTENDED:|  | plugin:  |  |          |   |
|  | +fs_read |  | +theme    |  | +onboard |  | +PTY     |  |          |   |
|  | +onboard |  | +phase    |  | +project |  |          |  |          |   |
|  |          |  | +project  |  |  context  |  |          |  |          |   |
|  +----------+  |  (extend) |  +----------+  +----------+  +----------+   |
|       |        +----------+       |                            |          |
|       v                           v                            v          |
|  +------------------------------------------------------------------+    |
|  | Database: migration 007_themes_projects.sql                       |    |
|  | NEW tables: themes, project_phases                                |    |
|  | MODIFIED: projects (+ dir_path, theme_id, ai_mode)                |    |
|  +------------------------------------------------------------------+    |
+---------------------------------------------------------------------------+
```

## Component Responsibilities

### NEW Backend Components

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `models/theme.rs` | Theme CRUD, theme-project relationships | Struct with id, name, color, icon, sort_order; DB methods on Database impl |
| `models/phase.rs` | Project phase lifecycle (plan, active, complete) | Struct with id, project_id, name, description, status, sort_order |
| `commands/theme_commands.rs` | Tauri IPC for theme CRUD | 5-6 commands: create/list/update/delete/reorder themes |
| `commands/fs_commands.rs` | Directory reading for file explorer | read_directory, get_file_info; scoped to project dir_path |
| `commands/onboarding_commands.rs` | AI project onboarding conversation flow | start_onboarding, submit_answers, generate_phases, apply_onboarding |
| `ai/onboarding.rs` | Prompt templates for project breakdown | Structured prompts: scope -> questions -> phases/tasks generation |

### MODIFIED Backend Components

| Component | Change | Why |
|-----------|--------|-----|
| `models/project.rs` | Add dir_path, theme_id, ai_mode fields | Projects need directory linking and theme membership |
| `commands/project_commands.rs` | Extended create/update to accept new fields | Frontend needs to set dir_path, theme_id on project creation |
| `ai/gateway.rs` | No changes needed | Existing gateway handles all AI calls; onboarding uses same provider trait |
| `db/sql/007_themes_projects.sql` | New migration | Add themes table, project_phases table, alter projects table |

### NEW Frontend Components

| Component | Responsibility | Location |
|-----------|----------------|----------|
| `stores/themeSlice.ts` | Theme state, CRUD operations | New slice in AppStore |
| `stores/terminalSlice.ts` | Terminal session state, PTY process IDs | New slice in AppStore |
| `stores/fileExplorerSlice.ts` | Directory tree state, expanded nodes, selected file | New slice in AppStore |
| `components/sidebar/ThemeGroup.tsx` | Collapsible theme section with projects inside | Sidebar child |
| `components/center/ProjectWorkspace.tsx` | Combined view: file tree + task progress + phase overview | New CenterPanel view |
| `components/center/OnboardingWizard.tsx` | Multi-step AI onboarding flow | New CenterPanel view |
| `components/center/ThemeView.tsx` | Theme overview with all projects | New CenterPanel view |
| `components/output/TerminalTab.tsx` | xterm.js terminal with PTY backend | New OutputDrawer tab |
| `components/output/FileExplorerTab.tsx` | Tree view of project directory | New OutputDrawer tab |

### MODIFIED Frontend Components

| Component | Change | Why |
|-----------|--------|-----|
| `stores/projectSlice.ts` | Add dirPath, themeId, aiMode, phases to Project type | Extended data model |
| `stores/index.ts` | Add 3 new slices to AppStore | Store composition |
| `components/layout/Sidebar.tsx` | Replace flat ProjectList with theme-grouped tree | Theme hierarchy display |
| `components/layout/OutputDrawer.tsx` | Add Terminal and FileExplorer tabs | New workspace features |
| `components/layout/CenterPanel.tsx` | Route to ProjectWorkspace, OnboardingWizard, ThemeView | New view routing |
| `useWorkspaceStore.ts` | Add activeOutputTab, activeTerminalId | Track which drawer tab is active |

## Recommended Project Structure (new files only)

```
src-tauri/src/
├── models/
│   ├── theme.rs                    # NEW: Theme struct + DB methods
│   └── phase.rs                    # NEW: ProjectPhase struct + DB methods
├── commands/
│   ├── theme_commands.rs           # NEW: Theme CRUD commands
│   ├── fs_commands.rs              # NEW: Directory reading commands
│   └── onboarding_commands.rs      # NEW: AI onboarding flow commands
├── ai/
│   └── onboarding.rs              # NEW: Onboarding prompt templates
└── db/sql/
    └── 007_themes_projects.sql     # NEW: Migration for themes + project extensions

src/
├── stores/
│   ├── themeSlice.ts              # NEW: Theme state
│   ├── terminalSlice.ts           # NEW: Terminal session state
│   └── fileExplorerSlice.ts       # NEW: File tree state
├── components/
│   ├── sidebar/
│   │   └── ThemeGroup.tsx         # NEW: Collapsible theme with projects
│   ├── center/
│   │   ├── ProjectWorkspace.tsx   # NEW: File tree + phases + tasks
│   │   ├── OnboardingWizard.tsx   # NEW: AI onboarding multi-step
│   │   └── ThemeView.tsx          # NEW: Theme overview
│   └── output/
│       ├── TerminalTab.tsx        # NEW: xterm.js wrapper
│       └── FileExplorerTab.tsx    # NEW: Directory tree view
└── types/
    ├── theme.ts                   # NEW: Theme + Phase types
    └── terminal.ts                # NEW: Terminal session types
```

### Structure Rationale

- **models/theme.rs, models/phase.rs:** Follow existing pattern (models/project.rs, models/task.rs) where each entity gets its own file with struct + Database impl block
- **commands/fs_commands.rs:** Separate from project_commands because filesystem operations are security-sensitive and should be auditable in isolation
- **ai/onboarding.rs:** Prompt templates separate from gateway because onboarding prompts are complex multi-turn and evolve independently
- **New slices vs extending existing:** Theme, terminal, and file explorer are independent domains; cramming them into projectSlice would violate the existing slice-per-domain pattern

## Architectural Patterns

### Pattern 1: Directory-Scoped Filesystem Access

**What:** All file explorer operations are scoped to a project's `dir_path`. The backend validates every filesystem request against the project's registered directory.
**When to use:** Every file read, directory listing, or file info request.
**Trade-offs:** Slightly more overhead per request (path validation), but prevents path traversal attacks and accidental access to files outside the project.

**Implementation:**
```rust
// fs_commands.rs
#[tauri::command]
pub async fn read_project_directory(
    state: State<'_, Arc<Mutex<Database>>>,
    project_id: String,
    relative_path: String,  // relative to project dir_path
) -> Result<Vec<FileEntry>, String> {
    let db = state.lock().map_err(|e| e.to_string())?;
    let project = db.get_project(&project_id).map_err(|e| e.to_string())?;

    let dir_path = project.dir_path
        .ok_or("Project has no linked directory")?;

    let full_path = PathBuf::from(&dir_path).join(&relative_path);

    // Security: ensure resolved path is still under dir_path
    let canonical = full_path.canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;
    if !canonical.starts_with(&dir_path) {
        return Err("Path traversal denied".into());
    }

    // Read directory entries
    read_dir_entries(&canonical)
}
```

### Pattern 2: PTY-Backed Terminal via Plugin

**What:** Use `tauri-plugin-pty` to spawn a real shell process, with xterm.js rendering in the frontend. The PTY plugin handles bidirectional data streaming via Tauri events.
**When to use:** Embedded terminal in the output drawer.
**Trade-offs:** Adds a native dependency (portable-pty) but provides a real terminal experience. The existing `run_cli_tool` command is one-shot; PTY gives interactive sessions.

**Implementation approach:**
```rust
// In lib.rs setup:
tauri::Builder::default()
    .plugin(tauri_plugin_pty::init())  // Add PTY plugin
    // ... existing plugins
```

```typescript
// TerminalTab.tsx
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { spawn, write, resize } from 'tauri-pty';

function TerminalTab({ projectDirPath }: { projectDirPath: string }) {
    const termRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const term = new Terminal();
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(termRef.current!);
        fitAddon.fit();

        // Spawn shell in project directory
        const pty = spawn('/bin/zsh', [], {
            cwd: projectDirPath,
            cols: term.cols,
            rows: term.rows,
        });

        // Wire bidirectional data
        pty.onData((data) => term.write(data));
        term.onData((data) => write(pty.id, data));

        return () => { /* kill pty, dispose term */ };
    }, [projectDirPath]);

    return <div ref={termRef} className="h-full" />;
}
```

### Pattern 3: AI Onboarding as Multi-Turn Conversation

**What:** Project onboarding uses the existing AiGateway to conduct a structured conversation: user provides scope/goals/constraints, AI asks clarifying questions, then generates phases and tasks.
**When to use:** Creating a new project with AI assistance.
**Trade-offs:** Re-uses existing AI infrastructure (no new providers needed). The conversation state lives in the frontend (React state), not persisted until the user confirms the generated plan.

**Flow:**
```
User fills form (name, scope, goals, constraints)
    |
    v
Frontend sends to onboarding command with structured prompt
    |
    v
Backend: AiGateway.get_default_provider() -> provider.complete_stream()
    |
    v
AI returns clarifying questions (streamed via Tauri events)
    |
    v
User answers questions -> second AI call with full context
    |
    v
AI generates phases + tasks (structured JSON)
    |
    v
Frontend shows preview -> User confirms/edits
    |
    v
Backend: create_project + create_phases + create_tasks in transaction
```

### Pattern 4: Theme Hierarchy as Grouping Layer

**What:** Themes are a flat grouping mechanism (not nested). Projects and standalone tasks belong to a theme. The sidebar renders themes as collapsible sections.
**When to use:** Organizing projects by category (Business, Personal, Dev).
**Trade-offs:** Simpler than recursive category trees. One level of hierarchy covers the stated use case. If deeper nesting is needed later, themes can become parent-child, but avoid premature complexity.

**Data model:**
```sql
CREATE TABLE themes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,          -- hex color for sidebar accent
    icon TEXT,           -- optional icon identifier
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Projects get a nullable theme_id
ALTER TABLE projects ADD COLUMN theme_id TEXT REFERENCES themes(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN dir_path TEXT;
ALTER TABLE projects ADD COLUMN ai_mode TEXT DEFAULT 'on-demand'
    CHECK(ai_mode IN ('track-suggest', 'track-auto', 'on-demand'));
```

### Pattern 5: Per-Project AI Mode as Configuration Column

**What:** Each project stores its AI assistance mode directly on the project row. The AI system checks this before taking action.
**When to use:** Any AI operation scoped to a project (suggestions, auto-execution, context tracking).
**Trade-offs:** Simplest possible implementation. Could be a separate `project_ai_config` table if configuration grows complex, but a single column is sufficient for three modes.

**Modes:**
- `on-demand`: AI only responds when explicitly asked (default, matches v1.0 behavior)
- `track-suggest`: AI monitors progress and suggests actions via notifications
- `track-auto`: AI monitors and auto-executes suggestions (requires user confirmation flow)

## Data Flow

### Theme-Project-Task Hierarchy Flow

```
Sidebar render:
  loadThemes() -> themes[]
      |
      v
  For each theme: loadProjectsByTheme(themeId) -> projects[]
      |                                               |
      v                                               v
  ThemeGroup component                    For selected project:
  (collapsible)                           loadTasks(projectId) -> tasks[]
      |                                               |
      v                                               v
  ProjectList items                       CenterPanel (TaskDetail / ProjectWorkspace)
```

### File Explorer Data Flow

```
User clicks project with dir_path set
    |
    v
read_project_directory(projectId, "")  -- root listing
    |
    v
Backend validates path, reads fs::read_dir
    |
    v
Returns Vec<FileEntry> { name, is_dir, size, modified }
    |
    v
Frontend renders tree; on expand:
read_project_directory(projectId, "src/components")  -- sub-directory
    |
    v
Lazy-loaded tree expansion (no full recursive scan)
```

### Terminal Session Flow

```
User opens Terminal tab for project
    |
    v
tauri-plugin-pty: spawn(shell, cwd: project.dir_path)
    |
    v
PTY process created, shell running in project directory
    |
    v
Bidirectional streaming:
  User types -> xterm.js onData -> pty.write()
  PTY output -> pty.onData -> xterm.js term.write()
    |
    v
On tab close or project switch: kill PTY process
```

### AI Onboarding Flow

```
User clicks "New Project with AI"
    |
    v
OnboardingWizard renders Step 1: basic info form
    |
    v
User submits: { name, scope, goals, constraints, dir_path? }
    |
    v
start_onboarding(input) -> AI generates clarifying questions
    |                       (streamed via "onboarding-stream" event)
    v
Step 2: User answers questions
    |
    v
generate_phases(projectId, answers) -> AI generates phases + tasks
    |                                   (structured JSON response)
    v
Step 3: Preview generated plan, user edits/confirms
    |
    v
apply_onboarding(projectId, phases) -> Bulk insert phases + tasks
    |
    v
Redirect to ProjectWorkspace view
```

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Theme <-> Project | SQLite FK (projects.theme_id) | SET NULL on theme delete; projects without themes appear in "Uncategorized" |
| Project <-> FileSystem | dir_path column + fs_commands validation | All fs access scoped to project dir; no global filesystem browsing |
| Project <-> Terminal | PTY spawned with cwd=project.dir_path | Terminal session tied to project context; session ID tracked in terminalSlice |
| Project <-> AI Onboarding | AiGateway reused; onboarding prompts in ai/onboarding.rs | No new AI infrastructure; uses existing provider + streaming |
| Project <-> AI Mode | ai_mode column checked before AI actions | on-demand (default) means zero behavioral change from v1.0 |
| Phase <-> Task | task.phase_id nullable FK | Tasks can exist without phases; phases group tasks within a project |
| OutputDrawer <-> Terminal/FileExplorer | Tab-based routing in OutputDrawer | Existing Logs/Output tab remains; Terminal and FileExplorer are new tabs |

### External Dependencies

| Dependency | Integration Pattern | Notes |
|------------|---------------------|-------|
| `tauri-plugin-pty` | Tauri plugin (Rust + npm) | Required for embedded terminal. Provides portable-pty wrapper with Tauri event transport. Version 0.1.1 available. |
| `@xterm/xterm` | npm package, React component wrapper | Terminal UI rendering. Needs `@xterm/addon-fit` for auto-resize. |
| `tauri-plugin-fs` | NOT recommended -- use custom commands | For file explorer. Custom commands give more control over security scoping. Use custom `fs_commands.rs` over the generic plugin. |

### Tauri Capabilities Required

```json
{
  "permissions": [
    "pty:default",
    "pty:allow-spawn",
    "pty:allow-write",
    "pty:allow-resize",
    "pty:allow-kill"
  ]
}
```

Note: File explorer uses custom Tauri commands (not the fs plugin), so no additional fs permissions needed beyond what custom commands provide.

## Anti-Patterns

### Anti-Pattern 1: Full Recursive Directory Scan on Load

**What people do:** Read the entire directory tree recursively when the file explorer opens.
**Why it's wrong:** Large projects (node_modules alone has 50K+ entries) will freeze the UI and consume excessive memory.
**Do this instead:** Lazy-load directory contents one level at a time. Only read children when the user expands a node. Add .gitignore-aware filtering to skip node_modules, .git, build artifacts.

### Anti-Pattern 2: Global PTY Process Without Project Scoping

**What people do:** Spawn a single terminal process and let it roam the filesystem.
**Why it's wrong:** Loses the project context that makes the embedded terminal valuable. User might `cd` to unrelated directories.
**Do this instead:** Each terminal session is tied to a project. Spawn the shell with `cwd` set to the project directory. If the user needs a different project's terminal, switch project context (which spawns a new PTY or reuses a cached one).

### Anti-Pattern 3: Storing AI Onboarding Conversation in the Database

**What people do:** Persist every AI message exchange during onboarding.
**Why it's wrong:** The conversation is transient -- only the final output (phases + tasks) matters. Storing the conversation adds schema complexity and storage for no user value.
**Do this instead:** Keep conversation state in React component state during the onboarding wizard. Only persist the confirmed phases and tasks via standard CRUD commands.

### Anti-Pattern 4: Deep Theme Nesting

**What people do:** Build a recursive theme/category tree with unlimited depth.
**Why it's wrong:** The PROJECT.md explicitly defines themes as "top-level categories." Deep nesting adds UI complexity (indentation, breadcrumbs, drag-drop reordering) with minimal organizational benefit for a personal tool.
**Do this instead:** One level only: Theme -> Projects/Tasks. If a user has too many themes, that is a user problem, not an architecture problem.

### Anti-Pattern 5: Separate AI Service for Onboarding

**What people do:** Create a new AI integration layer specifically for project onboarding, separate from the existing AiGateway.
**Why it's wrong:** The existing AiGateway already handles provider selection, credential management, and streaming. Duplicating this creates maintenance burden and inconsistency.
**Do this instead:** Add onboarding-specific prompt templates in `ai/onboarding.rs` and call `AiGateway::get_default_provider()` for the actual AI calls. The onboarding flow is just a different prompt, not a different AI system.

## Build Order (Dependency-Driven)

### Phase 1: Data Foundation (no UI dependencies)

1. **Migration 007:** themes table, projects ALTER (dir_path, theme_id, ai_mode), project_phases table
2. **models/theme.rs + models/phase.rs:** CRUD implementations
3. **commands/theme_commands.rs:** Tauri IPC for themes
4. **Extend project_commands.rs:** Accept and return new fields (dir_path, theme_id, ai_mode)

*Rationale:* Everything else depends on the data model. Build and test this first.

### Phase 2: Sidebar Hierarchy (depends on Phase 1)

5. **themeSlice.ts + extend projectSlice.ts:** Frontend state for themes and extended projects
6. **ThemeGroup.tsx + modify Sidebar.tsx:** Theme-grouped sidebar navigation
7. **Extend CenterPanel.tsx routing:** Add ThemeView and ProjectWorkspace routes

*Rationale:* Users need to see and navigate themes before other features make sense.

### Phase 3: File Explorer (depends on Phase 1 for dir_path)

8. **commands/fs_commands.rs:** Directory reading with project-scoped security
9. **fileExplorerSlice.ts:** Tree state management
10. **FileExplorerTab.tsx:** Tree component in output drawer
11. **Extend OutputDrawer.tsx:** Add file explorer tab

*Rationale:* File explorer is self-contained after dir_path exists. No dependency on terminal or AI.

### Phase 4: Embedded Terminal (independent of Phase 3, can be parallel)

12. **Add tauri-plugin-pty:** Cargo.toml + plugin registration + capabilities
13. **Add @xterm/xterm + addons:** npm dependencies
14. **terminalSlice.ts:** Session state management
15. **TerminalTab.tsx:** xterm.js component in output drawer

*Rationale:* Terminal is fully independent. Can be built in parallel with file explorer.

### Phase 5: AI Onboarding (depends on Phase 1 for phases, existing AI for gateway)

16. **ai/onboarding.rs:** Prompt templates for project breakdown
17. **commands/onboarding_commands.rs:** Multi-step onboarding flow
18. **OnboardingWizard.tsx:** Multi-step wizard UI
19. **Per-project AI mode UI:** Settings within ProjectWorkspace

*Rationale:* Onboarding generates phases and tasks, so it depends on the Phase 1 data model. It uses the existing AI gateway, so no AI infrastructure work needed.

### Phase 6: Project Workspace View (depends on Phases 2-5)

20. **ProjectWorkspace.tsx:** Combines phase overview, task list, file explorer sidebar, terminal access into a unified project view

*Rationale:* This is the integration point. All constituent parts must exist first.

## Sources

- [tauri-plugin-pty (GitHub)](https://github.com/Tnze/tauri-plugin-pty) -- PTY plugin for Tauri 2, version 0.1.1
- [tauri-plugin-pty (crates.io)](https://crates.io/crates/tauri-plugin-pty) -- Rust crate
- [Tauri File System Plugin](https://v2.tauri.app/plugin/file-system/) -- Official Tauri FS plugin docs
- [xterm.js (GitHub)](https://github.com/xtermjs/xterm.js/) -- Terminal emulator for the web
- Existing codebase: `src-tauri/src/lib.rs`, `src-tauri/src/models/project.rs`, `src/stores/index.ts`, `src/components/layout/AppLayout.tsx`

---
*Architecture research for: Element v1.1 Project Manager feature integration*
*Researched: 2026-03-22*
