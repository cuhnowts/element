# Phase 8: File Explorer - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can browse and interact with project files directly within the Element workspace. This phase delivers: a file tree view as a tab in the center panel, lazy-loaded directory browsing with .gitignore filtering, external editor launch, and real-time file system watching.

Requirements: FILE-01, FILE-02, FILE-03, FILE-04

</domain>

<decisions>
## Implementation Decisions

### Tree Placement & Layout
- **D-01:** File tree lives as a "Files" tab in the center panel tab bar — alongside Detail and other tabs. Does not add a column or modify the sidebar.
- **D-02:** Files tab is always visible in the tab bar when viewing a project that has a linked directory.
- **D-03:** Tree shows project directory name as a collapsible root node at the top (e.g., "element/"), providing context about which directory is being browsed.
- **D-04:** Folder contents load lazily on-demand when the user expands a folder. Brief loading indicator on first expand.
- **D-05:** Tree remembers which folders are expanded between tab switches and sessions (persisted expand state).

### File Interaction Behavior
- **D-06:** Single-click selects a file (visual highlight only, no info panel). Double-click opens the file in the default external editor.
- **D-07:** Right-click context menu on files: Open in Editor, Copy Path, Reveal in Finder/Explorer. Consistent with existing context menu patterns (ProjectList, phase rows).
- **D-08:** Right-click context menu on folders: Reveal in Finder/Explorer, Copy Path.
- **D-09:** Folders expand/collapse on single-click (chevron toggle).

### Gitignore & Filtering
- **D-10:** Gitignored files and hardcoded excludes (node_modules, .git, target, __pycache__, .DS_Store) are hidden entirely by default. Clean tree.
- **D-11:** Toggle button (eye/filter icon) in the Files tab header to show/hide filtered files. Off by default (hidden).
- **D-12:** When show-hidden toggle is ON, previously-hidden files appear dimmed/greyed with lower opacity — clearly distinguishable from normal files.
- **D-13:** No custom exclude patterns — .gitignore + hardcoded excludes only. Covers 99% of cases.

### Live Update Behavior
- **D-14:** Silent background refresh — tree updates automatically when filesystem changes are detected via the `notify` crate (already in Cargo.toml) with debouncing.
- **D-15:** File watcher monitors the entire project directory recursively, not just expanded folders.
- **D-16:** No highlight or animation for new files — they appear naturally, sorted into position.
- **D-17:** File watcher runs continuously while the project is open, regardless of which tab is active. Tree is always current when switching to Files tab.

### Claude's Discretion
- File icon strategy (file-type icons vs generic icon vs no icons)
- Sort order within directories (folders first, then files alphabetically — or mixed)
- Debounce timing for file watcher events
- Expand state persistence mechanism (Zustand, localStorage, or per-project storage)
- Exact styling of the dimmed/greyed appearance for hidden files

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend / Filesystem
- `src-tauri/src/plugins/core/filesystem.rs` — Existing `FilesystemPlugin` with `FsEntry` struct and directory listing logic (reuse patterns)
- `src-tauri/Cargo.toml` — `notify` v8 (macos_fsevent), `notify-debouncer-mini`, and `open` v5 already available as dependencies

### Frontend Patterns
- `src/components/center/` — Center panel components where Files tab will live
- `src/components/sidebar/ProjectList.tsx` — Context menu pattern (DropdownMenu) to follow for file/folder right-click
- `src/stores/projectSlice.ts` — Zustand slice pattern for state management

### Requirements
- `.planning/REQUIREMENTS.md` — FILE-01 through FILE-04 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `notify` + `notify-debouncer-mini` crates — already in Cargo.toml, file watching infrastructure ready
- `open` crate (v5) — already in Cargo.toml, opens files in default OS editor
- `FilesystemPlugin` with `FsEntry` struct — existing model for directory entries (name, path, is_dir, size)
- shadcn/ui components: ScrollArea, Button, ContextMenu, DropdownMenu — all available
- Zustand store with slice pattern — established state management approach

### Established Patterns
- Tauri commands: `#[tauri::command]` async functions with `State<Arc<Mutex<Database>>>`
- Frontend API calls via `src/lib/tauri.ts` wrapper
- Context menu pattern from `ProjectList.tsx` — right-click menus on list items
- Event system: `app.emit()` for backend-to-frontend events (used for project/task CRUD)

### Integration Points
- New Tauri commands needed: `list_directory`, `open_file_in_editor`, `start_file_watcher`, `stop_file_watcher`
- Frontend event listener for file change events from the watcher
- Center panel tab system needs "Files" tab addition
- Project detail view (from Phase 7) provides the linked directory path

</code_context>

<specifics>
## Specific Ideas

- Files tab behaves like a VS Code explorer panel but lives as a tab, not a sidebar
- Root node shows directory name for context ("element/") — user always knows which project directory they're browsing
- Lazy loading is critical — projects can be large repos (node_modules alone has thousands of entries)
- The `ignore` crate (by ripgrep author) is the recommended Rust library for .gitignore parsing — not yet in Cargo.toml

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-file-explorer*
*Context gathered: 2026-03-22*
