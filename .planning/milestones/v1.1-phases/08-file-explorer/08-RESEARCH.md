# Phase 8: File Explorer - Research

**Researched:** 2026-03-22
**Domain:** Tauri backend (Rust/notify/ignore crates), React frontend (Zustand, shadcn/ui tree view), filesystem watching
**Confidence:** HIGH

## Summary

Phase 8 delivers a file explorer tree view as a "Files" tab in the center panel. The backend requires four new Tauri commands: `list_directory` (lazy directory listing with .gitignore filtering), `open_file_in_editor` (via `open` crate), `start_file_watcher` and `stop_file_watcher` (via `notify` + `notify-debouncer-mini` crates). The `ignore` crate (v0.4.25, by ripgrep's author) is the standard Rust library for .gitignore-aware directory traversal and must be added to Cargo.toml. All other backend dependencies (`notify` v8, `notify-debouncer-mini` v0.7, `open` v5) are already in Cargo.toml.

The frontend builds a recursive tree component using native React state (no tree library needed -- the tree is simple enough with expand/collapse and lazy loading). A new `fileExplorerSlice` in the Zustand store manages tree state, expanded folders, and show-hidden toggle. The shadcn `context-menu` component (not yet installed) provides right-click menus on files and folders. File watcher events flow from backend to frontend via Tauri's `app.emit()` / `listen()` pattern already established in the codebase.

**Primary recommendation:** Build backend commands first (list_directory with ignore crate filtering, open_file_in_editor, watcher lifecycle), then build the frontend tree component with lazy loading, then wire up the real-time watcher events. The `ignore` crate's `WalkBuilder` handles .gitignore parsing, nested .gitignore files, and global gitignore automatically -- do not hand-roll gitignore parsing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** File tree lives as a "Files" tab in the center panel tab bar -- alongside Detail and other tabs. Does not add a column or modify the sidebar.
- **D-02:** Files tab is always visible in the tab bar when viewing a project that has a linked directory.
- **D-03:** Tree shows project directory name as a collapsible root node at the top (e.g., "element/"), providing context about which directory is being browsed.
- **D-04:** Folder contents load lazily on-demand when the user expands a folder. Brief loading indicator on first expand.
- **D-05:** Tree remembers which folders are expanded between tab switches and sessions (persisted expand state).
- **D-06:** Single-click selects a file (visual highlight only, no info panel). Double-click opens the file in the default external editor.
- **D-07:** Right-click context menu on files: Open in Editor, Copy Path, Reveal in Finder/Explorer. Consistent with existing context menu patterns (ProjectList, phase rows).
- **D-08:** Right-click context menu on folders: Reveal in Finder/Explorer, Copy Path.
- **D-09:** Folders expand/collapse on single-click (chevron toggle).
- **D-10:** Gitignored files and hardcoded excludes (node_modules, .git, target, __pycache__, .DS_Store) are hidden entirely by default. Clean tree.
- **D-11:** Toggle button (eye/filter icon) in the Files tab header to show/hide filtered files. Off by default (hidden).
- **D-12:** When show-hidden toggle is ON, previously-hidden files appear dimmed/greyed with lower opacity -- clearly distinguishable from normal files.
- **D-13:** No custom exclude patterns -- .gitignore + hardcoded excludes only. Covers 99% of cases.
- **D-14:** Silent background refresh -- tree updates automatically when filesystem changes are detected via the `notify` crate (already in Cargo.toml) with debouncing.
- **D-15:** File watcher monitors the entire project directory recursively, not just expanded folders.
- **D-16:** No highlight or animation for new files -- they appear naturally, sorted into position.
- **D-17:** File watcher runs continuously while the project is open, regardless of which tab is active. Tree is always current when switching to Files tab.

### Claude's Discretion
- File icon strategy (file-type icons vs generic icon vs no icons)
- Sort order within directories (folders first, then files alphabetically -- or mixed)
- Debounce timing for file watcher events
- Expand state persistence mechanism (Zustand, localStorage, or per-project storage)
- Exact styling of the dimmed/greyed appearance for hidden files

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FILE-01 | User can browse project files in a tree view within the workspace | `list_directory` Tauri command with `ignore` crate for .gitignore-aware listing, lazy-loaded tree component in center panel Files tab |
| FILE-02 | User can open files in their default external editor (VS Code, etc.) | `open_file_in_editor` Tauri command using `open::that_detached()` -- crate already in Cargo.toml, already used in calendar commands |
| FILE-03 | File tree respects .gitignore and hides common excludes (node_modules, .git, target) | `ignore` crate v0.4.25 `WalkBuilder` with `.max_depth(1)` per lazy-loaded directory, plus hardcoded exclude list |
| FILE-04 | File tree updates live when files change on disk | `notify` v8 + `notify-debouncer-mini` v0.7 (both in Cargo.toml), `app.emit("file-changed")` to frontend listener |
</phase_requirements>

## Standard Stack

### Core (New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ignore` (Cargo) | 0.4.25 | .gitignore-aware directory traversal | By ripgrep author (BurntSushi). Handles .gitignore, nested .gitignore, .git/info/exclude, global gitignore. The standard Rust solution. |

### New shadcn Components to Install

| Component | Purpose |
|-----------|---------|
| `context-menu` | Right-click menus on files (D-07) and folders (D-08) |

### Existing (No Changes Needed)

| Library | Version | Purpose |
|---------|---------|---------|
| `notify` (Cargo) | 8.x | Filesystem change notifications (already in Cargo.toml with `macos_fsevent` feature) |
| `notify-debouncer-mini` (Cargo) | 0.7.x | Debounces rapid filesystem events (already in Cargo.toml) |
| `open` (Cargo) | 5.x | Opens files in OS default application (already in Cargo.toml, used by calendar commands) |
| `@tauri-apps/api` (npm) | 2.10.1 | Tauri invoke/listen API (already installed) |
| `zustand` (npm) | 5.0.11 | State management (already installed) |
| `lucide-react` (npm) | 0.577.0 | Icons: File, Folder, FolderOpen, ChevronRight, ChevronDown, Eye, EyeOff, Copy, ExternalLink (already installed) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ignore` crate | Hand-rolled .gitignore parsing | Never. Gitignore spec has complex precedence rules, negation patterns, nested overrides. The `ignore` crate handles all of this. |
| Custom tree component | react-arborist or similar | Custom is better here -- the tree is simple (expand/collapse/lazy-load), and a library adds bundle weight + API constraints for minimal gain |
| `notify-debouncer-mini` | Full `notify-debouncer-full` | Mini is sufficient -- we only need to know "something changed in directory X", not detailed event types |

**Installation:**
```bash
# Rust
cd src-tauri && cargo add ignore@0.4

# Frontend (shadcn component)
npx shadcn@latest add context-menu
```

## Architecture Patterns

### Backend Command Structure

```
src-tauri/src/
  commands/
    file_explorer_commands.rs  # New: list_directory, open_file_in_editor, start/stop_file_watcher
    mod.rs                     # Add pub mod file_explorer_commands
  lib.rs                       # Register new commands in invoke_handler
```

### Frontend Component Structure

```
src/
  components/
    center/
      FileExplorer.tsx          # Files tab container: header (toggle, root label) + tree
      FileTreeNode.tsx          # Recursive tree node: file or folder row
  stores/
    fileExplorerSlice.ts        # Zustand slice: tree data, expanded set, show-hidden toggle, selected path
  lib/
    tauri.ts                    # Extend api object with file explorer commands
```

### Pattern 1: Lazy Directory Listing with ignore Crate

**What:** Each `list_directory` call returns immediate children of one directory, filtered through .gitignore rules.
**When to use:** Every time a user expands a folder node.

```rust
// Source: ignore crate docs (https://docs.rs/ignore/latest/ignore/struct.WalkBuilder.html)
use ignore::WalkBuilder;

#[derive(Debug, Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_hidden: bool,  // true if would be filtered by gitignore/excludes
}

#[tauri::command]
pub async fn list_directory(
    dir_path: String,
    show_hidden: bool,
) -> Result<Vec<FileEntry>, String> {
    let path = std::path::Path::new(&dir_path);
    if !path.is_dir() {
        return Err("Not a directory".to_string());
    }

    let mut entries = Vec::new();

    // Use WalkBuilder for gitignore-aware listing, depth 1 for lazy loading
    let walker = WalkBuilder::new(&dir_path)
        .max_depth(Some(1))
        .hidden(false)        // Don't auto-skip hidden -- we control visibility
        .git_ignore(!show_hidden) // Respect .gitignore when hiding
        .git_global(!show_hidden)
        .git_exclude(!show_hidden)
        .build();

    // Hardcoded excludes
    let hardcoded_excludes = ["node_modules", ".git", "target", "__pycache__", ".DS_Store"];

    for result in walker {
        let entry = result.map_err(|e| e.to_string())?;
        if entry.path() == path { continue; } // Skip root itself

        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry.path().is_dir();
        let is_hardcoded_hidden = hardcoded_excludes.contains(&name.as_str());

        if !show_hidden && is_hardcoded_hidden { continue; }

        entries.push(FileEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir,
            is_hidden: is_hardcoded_hidden, // Frontend uses this for dimming
        });
    }

    // Sort: folders first, then alphabetical (case-insensitive)
    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(entries)
}
```

**Important nuance:** When `show_hidden` is true, we need a second pass approach. Run `WalkBuilder` with gitignore OFF to get ALL files, then mark which ones are hidden by checking against a gitignore-enabled walk. Alternatively, run two walks and diff. Simpler approach: when `show_hidden` is true, do a plain `std::fs::read_dir` and mark entries as `is_hidden` by checking the `ignore` crate's `Gitignore` type directly or by checking the hardcoded list + running a gitignore check. The planner should design this carefully.

### Pattern 2: File Watcher with notify-debouncer-mini

**What:** Start a recursive file watcher on the project directory, emit Tauri events on changes.
**When to use:** When a project with a linked directory is selected.

```rust
// Source: notify-debouncer-mini docs (https://docs.rs/notify-debouncer-mini/latest/)
use notify_debouncer_mini::new_debouncer;
use std::time::Duration;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

// Store watcher handle in Tauri managed state so it can be stopped
pub struct FileWatcherState {
    pub watcher: Mutex<Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>>,
}

#[tauri::command]
pub async fn start_file_watcher(
    app: AppHandle,
    state: tauri::State<'_, FileWatcherState>,
    dir_path: String,
) -> Result<(), String> {
    // Stop existing watcher first
    let mut guard = state.watcher.lock().map_err(|e| e.to_string())?;
    *guard = None;

    let app_clone = app.clone();
    let debouncer = new_debouncer(
        Duration::from_millis(500), // Debounce window
        move |res: notify_debouncer_mini::DebounceEventResult| {
            if let Ok(events) = res {
                // Collect unique parent directories that changed
                let changed_dirs: std::collections::HashSet<String> = events
                    .iter()
                    .filter_map(|e| e.path.parent().map(|p| p.to_string_lossy().to_string()))
                    .collect();
                let _ = app_clone.emit("file-system-changed", changed_dirs.into_iter().collect::<Vec<_>>());
            }
        },
    ).map_err(|e| e.to_string())?;

    // Cannot call watch inside the closure -- must access the watcher directly
    // The debouncer owns the watcher, use debouncer.watcher() to add paths
    // NOTE: actual API requires mutable reference
    let mut debouncer = debouncer;
    debouncer.watcher().watch(
        std::path::Path::new(&dir_path),
        notify::RecursiveMode::Recursive,
    ).map_err(|e| e.to_string())?;

    *guard = Some(debouncer);
    Ok(())
}

#[tauri::command]
pub async fn stop_file_watcher(
    state: tauri::State<'_, FileWatcherState>,
) -> Result<(), String> {
    let mut guard = state.watcher.lock().map_err(|e| e.to_string())?;
    *guard = None; // Dropping the debouncer stops watching
    Ok(())
}
```

### Pattern 3: Frontend Event Listener for File Changes

**What:** Listen for `file-system-changed` events and refresh affected directories.
**When to use:** In the useTauriEvents hook or within the FileExplorer component.

```typescript
// Source: existing useTauriEvents.ts pattern in this codebase
import { listen } from "@tauri-apps/api/event";

// In FileExplorer component or useTauriEvents hook:
useEffect(() => {
  const unlisten = listen<string[]>("file-system-changed", (event) => {
    const changedDirs = event.payload;
    // Refresh only expanded directories that overlap with changed paths
    refreshAffectedDirectories(changedDirs);
  });
  return () => { unlisten.then(fn => fn()); };
}, []);
```

### Pattern 4: Open File in External Editor

**What:** Use `open::that_detached()` to open a file in the OS default application.
**When to use:** On double-click (D-06) or "Open in Editor" context menu item (D-07).

```rust
// Source: open crate (already used in calendar_commands.rs in this codebase)
#[tauri::command]
pub async fn open_file_in_editor(file_path: String) -> Result<(), String> {
    open::that_detached(&file_path).map_err(|e| format!("Failed to open file: {}", e))
}

// For "Reveal in Finder/Explorer":
#[tauri::command]
pub async fn reveal_in_file_manager(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        // Open containing directory
        let parent = std::path::Path::new(&path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone());
        open::that_detached(&parent).map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

### Pattern 5: Center Panel Tab System

**What:** The CenterPanel currently uses conditional rendering based on selection state. It needs a tab system added.
**Current code:**

```typescript
// Current CenterPanel.tsx -- selection-based routing, no tabs
{selectedWorkflowId ? <WorkflowDetail />
  : selectedTaskId ? <TaskDetail />
  : selectedProjectId ? <ProjectDetail />
  : <TodayView />}
```

**Required change:** When a project is selected AND has a linked directory, show a tab bar above the content area with "Detail" and "Files" tabs. The tab bar only appears when there's a project with a directory -- otherwise, the current behavior continues unchanged.

```typescript
// Conceptual approach for CenterPanel
if (selectedProjectId && project?.directoryPath) {
  return (
    <div className="h-full flex flex-col">
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-auto">
        {activeTab === "detail" ? <ProjectDetail /> : <FileExplorer />}
      </div>
    </div>
  );
}
// ... existing conditional rendering for other cases
```

### Anti-Patterns to Avoid

- **Loading entire tree at once:** Projects can have tens of thousands of files. Always lazy-load one directory level at a time (D-04).
- **Parsing .gitignore manually:** The `ignore` crate handles nested .gitignore files, negation patterns (`!important.txt`), and global gitignore. Never reimplement this.
- **Polling for file changes:** Use the `notify` crate's OS-native watchers (FSEvents on macOS, inotify on Linux), not polling.
- **Blocking the main thread with directory reads:** All directory listing must be async. The `ignore` crate's `Walk` is synchronous, so wrap in `tokio::task::spawn_blocking`.
- **Forgetting to stop the watcher:** When switching projects or closing the app, the watcher must be stopped to avoid resource leaks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| .gitignore parsing | Regex-based gitignore matcher | `ignore` crate v0.4.25 | Gitignore has complex semantics: negation, nested files, precedence ordering, global config. The `ignore` crate handles all edge cases. |
| File change detection | Polling loop or manual stat() | `notify` v8 + `notify-debouncer-mini` v0.7 | OS-native watchers (FSEvents, inotify) are efficient. Polling wastes CPU and misses rapid changes. |
| Opening files in default app | Platform-specific `Command::new` | `open` crate v5 | Cross-platform, handles macOS/Windows/Linux differences |
| Tree view component | Complex third-party tree library | Simple recursive React component | The tree here is straightforward: expand/collapse folders, click files. A recursive `FileTreeNode` component with 50-80 lines is all that's needed. |

## Common Pitfalls

### Pitfall 1: WalkBuilder max_depth Off-By-One
**What goes wrong:** `max_depth(Some(1))` includes ONLY the root entry and its immediate children. The root itself counts as depth 0.
**Why it happens:** Developers expect depth 1 to mean "one level of children" but forget the root is included.
**How to avoid:** Filter out entries where `entry.path() == root_path` from results.
**Warning signs:** Root directory appearing as a child entry in the tree.

### Pitfall 2: Watcher Events Contain Stale Paths
**What goes wrong:** File watcher events contain paths that may no longer exist by the time the frontend processes them (file was created then immediately deleted).
**Why it happens:** Debouncing collapses events but the final state may differ from any individual event.
**How to avoid:** Treat watcher events as "this directory changed, re-list it" signals, not as specific file operations. Always re-fetch the directory listing from the backend.
**Warning signs:** "File not found" errors when trying to render tree nodes from watcher events.

### Pitfall 3: Recursive Watcher on Large Repos
**What goes wrong:** Watching a repo with node_modules or .git causes thousands of inotify watches, hitting OS limits.
**Why it happens:** The watcher sees ALL files recursively, including gitignored directories.
**How to avoid:** The `notify` crate's `RecursiveMode::Recursive` does watch everything, but modern macOS FSEvents handles this efficiently. On Linux, consider filtering watched paths or increasing inotify limits. For v1, accept this limitation -- most development machines have adequate limits.
**Warning signs:** "Too many open files" errors on Linux systems.

### Pitfall 4: Race Between Expand and Watcher Refresh
**What goes wrong:** User expands a folder while a watcher event triggers a refresh, causing the tree to flicker or reset expand state.
**Why it happens:** Both operations update the same tree data independently.
**How to avoid:** Watcher refresh should only update already-loaded directory contents, never collapse folders. Expand state is separate from tree data. The Zustand slice should maintain expanded paths independently from file entries.
**Warning signs:** Folders collapsing or flickering during active filesystem changes.

### Pitfall 5: ignore Crate Walk is Synchronous
**What goes wrong:** Calling `WalkBuilder::build()` on the main async runtime blocks the thread.
**Why it happens:** The `ignore` crate returns a synchronous iterator.
**How to avoid:** Wrap the walk in `tokio::task::spawn_blocking()` to move it to a blocking thread pool.
**Warning signs:** UI freeze when expanding folders with many files.

### Pitfall 6: Show-Hidden Toggle Complexity
**What goes wrong:** When toggling "show hidden", need to re-fetch all expanded directories with the new setting.
**Why it happens:** The backend filtering is parameterized by `show_hidden` -- cached data becomes stale.
**How to avoid:** On toggle change, re-fetch all currently expanded directories. The `is_hidden` field on entries enables dimming without a separate data structure.
**Warning signs:** Hidden files not appearing/disappearing when toggle is flipped.

## Code Examples

### Zustand File Explorer Slice

```typescript
// Source: existing slice pattern in src/stores/projectSlice.ts
import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { AppStore } from "./index";

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  isHidden: boolean;
}

export interface FileExplorerSlice {
  // Tree data: map of directory path -> children entries
  fileTree: Record<string, FileEntry[]>;
  // Set of expanded directory paths
  expandedPaths: Set<string>;
  // Currently selected file/folder path
  selectedFilePath: string | null;
  // Show hidden files toggle
  showHiddenFiles: boolean;
  // Loading state per directory
  loadingPaths: Set<string>;

  loadDirectory: (dirPath: string) => Promise<void>;
  toggleExpand: (dirPath: string) => void;
  selectFile: (path: string | null) => void;
  toggleShowHidden: () => void;
  openFileInEditor: (filePath: string) => Promise<void>;
  refreshDirectory: (dirPath: string) => Promise<void>;
}
```

### Context Menu Pattern

```typescript
// Source: existing DropdownMenu pattern in src/components/sidebar/ProjectList.tsx
// For file tree, use shadcn ContextMenu (right-click triggered) instead of DropdownMenu
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// File context menu
<ContextMenu>
  <ContextMenuTrigger asChild>
    <div className="..." onDoubleClick={() => openFileInEditor(entry.path)}>
      {/* file row content */}
    </div>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem onClick={() => openFileInEditor(entry.path)}>
      Open in Editor
    </ContextMenuItem>
    <ContextMenuItem onClick={() => copyToClipboard(entry.path)}>
      Copy Path
    </ContextMenuItem>
    <ContextMenuItem onClick={() => revealInFileManager(entry.path)}>
      Reveal in Finder
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

### API Extension

```typescript
// Extend src/lib/tauri.ts
export const api = {
  // ... existing methods ...

  // File Explorer
  listDirectory: (dirPath: string, showHidden: boolean) =>
    invoke<FileEntry[]>("list_directory", { dirPath, showHidden }),
  openFileInEditor: (filePath: string) =>
    invoke<void>("open_file_in_editor", { filePath }),
  revealInFileManager: (path: string) =>
    invoke<void>("reveal_in_file_manager", { path }),
  startFileWatcher: (dirPath: string) =>
    invoke<void>("start_file_watcher", { dirPath }),
  stopFileWatcher: () =>
    invoke<void>("stop_file_watcher"),
};
```

## Discretion Recommendations

### File Icons: Generic icon approach
Use `lucide-react` icons: `File` for files, `Folder`/`FolderOpen` for collapsed/expanded directories. No file-type-specific icons -- keeps it clean and avoids needing an icon mapping system. Can be enhanced later.

### Sort Order: Folders first, then alphabetical
Standard convention matching VS Code, Finder, and most file managers. Case-insensitive alphabetical within each group.

### Debounce Timing: 500ms
Balance between responsiveness and avoiding event storms. 500ms is standard for file watcher debouncers. Can be tuned later.

### Expand State Persistence: Zustand persist middleware
Extend the existing `useWorkspaceStore` (which already uses `zustand/middleware/persist`) with a `expandedPaths` map keyed by project ID. This follows the established pattern and persists across sessions automatically.

### Hidden File Styling: opacity-40
Apply `opacity-40` class to dimmed entries. Clear visual distinction without being invisible.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `notify` v6 API | `notify` v8 with builder pattern | 2024 | New `Config` builder, `RecommendedWatcher` type, different event types |
| `notify-debouncer-full` | `notify-debouncer-mini` for simple use cases | 2024 | Mini is lighter, only emits path + kind, no rename tracking |
| `ignore` 0.4.x synchronous only | Same (still sync) | Stable | Must wrap in `spawn_blocking` for async contexts |

## Open Questions

1. **Clipboard access from Tauri**
   - What we know: "Copy Path" context menu item needs to write to system clipboard.
   - What's unclear: Whether `tauri-plugin-clipboard-manager` is needed or if `navigator.clipboard.writeText()` works in Tauri webview.
   - Recommendation: Try `navigator.clipboard.writeText()` first (works in most webviews). Fall back to `tauri-plugin-clipboard-manager` if it fails. The planner should test this early.

2. **Phase 7 dependency: project.directoryPath**
   - What we know: Phase 7 adds `directory_path` to the projects table and `directoryPath` to the frontend `Project` type.
   - What's unclear: Exact field name and API shape until Phase 7 is implemented.
   - Recommendation: Phase 8 implementation assumes `project.directoryPath: string | null` exists on the frontend `Project` type. If Phase 7 naming differs, adapt at implementation time.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `ignore` crate | .gitignore filtering | Not yet installed | 0.4.25 (latest) | Must install -- no alternative |
| `notify` crate | File watching | Installed | 8.x | -- |
| `notify-debouncer-mini` | Event debouncing | Installed | 0.7.x | -- |
| `open` crate | Open in editor | Installed | 5.x | -- |
| shadcn `context-menu` | Right-click menus | Not yet installed | -- | Must install via `npx shadcn@latest add context-menu` |

**Missing dependencies with no fallback:**
- `ignore` crate -- must be added to Cargo.toml
- shadcn `context-menu` component -- must be installed

**Missing dependencies with fallback:**
- None -- all missing items must be installed.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Frontend) | vitest 4.1.0 |
| Config file | None detected -- needs vite/vitest config or inline |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |
| Framework (Backend) | Rust built-in `#[cfg(test)]` + `#[tokio::test]` |
| Backend run command | `cd src-tauri && cargo test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILE-01 | Browse project files in tree view | integration (backend) + manual (UI) | `cd src-tauri && cargo test file_explorer` | No -- Wave 0 |
| FILE-02 | Open file in default editor | unit (backend command) | `cd src-tauri && cargo test open_file` | No -- Wave 0 |
| FILE-03 | .gitignore + hardcoded excludes filtering | unit (backend) | `cd src-tauri && cargo test list_directory` | No -- Wave 0 |
| FILE-04 | Live file tree updates | integration (backend watcher) + manual (UI) | `cd src-tauri && cargo test file_watcher` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd src-tauri && cargo test file_explorer` + `npm run test`
- **Per wave merge:** Full suite (`cargo test` + `npm run test`)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/commands/file_explorer_commands.rs` -- backend unit tests for list_directory filtering, open_file, watcher lifecycle
- [ ] Test helper: temp directory with .gitignore file and various file types for testing ignore behavior
- [ ] Frontend: `src/components/center/__tests__/FileExplorer.test.tsx` -- if vitest config supports component testing

## Sources

### Primary (HIGH confidence)
- [ignore crate docs](https://docs.rs/ignore/latest/ignore/struct.WalkBuilder.html) -- WalkBuilder API, configuration methods, depth control
- [notify-debouncer-mini docs](https://docs.rs/notify-debouncer-mini/latest/notify_debouncer_mini/) -- Debouncer creation, event handling, watcher access
- Existing codebase: `src-tauri/Cargo.toml` -- confirmed `notify` v8, `notify-debouncer-mini` v0.7, `open` v5 present
- Existing codebase: `src-tauri/src/commands/calendar_commands.rs` -- confirmed `open::that()` usage pattern
- Existing codebase: `src/hooks/useTauriEvents.ts` -- confirmed `listen()` event pattern
- Existing codebase: `src/stores/useWorkspaceStore.ts` -- confirmed Zustand persist middleware pattern

### Secondary (MEDIUM confidence)
- [ignore crate on crates.io](https://crates.io/crates/ignore) -- version 0.4.25 confirmed
- [notify-rs GitHub](https://github.com/notify-rs/notify) -- v8 API reference

### Tertiary (LOW confidence)
- Clipboard API in Tauri webview -- needs runtime testing, `navigator.clipboard` may require permissions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all crates verified in Cargo.toml or on crates.io, APIs confirmed via official docs
- Architecture: HIGH -- follows established patterns in the codebase (Tauri commands, Zustand slices, event system)
- Pitfalls: HIGH -- based on known characteristics of notify/ignore crates and documented codebase patterns

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable crates, unlikely to change)
