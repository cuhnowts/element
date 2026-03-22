# Phase 8: File Explorer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 08-file-explorer
**Areas discussed:** Tree placement & layout, File interaction behavior, Gitignore & filtering, Live update behavior

---

## Tree Placement & Layout

### Where should the file tree live?

| Option | Description | Selected |
|--------|-------------|----------|
| Left panel sidebar | Dedicated left column in workspace, alongside/replacing sidebar | |
| New dedicated column | Third column between sidebar and center, resizable | |
| Tab in center panel | File tree as a tab alongside project detail in center panel | ✓ |

**User's choice:** Tab in center panel
**Notes:** Keeps sidebar clean, doesn't add permanent screen space.

### How should the Files tab appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Files tab always present when project has linked directory | ✓ |
| On-demand toggle | Appears only when explicitly opened | |

**User's choice:** Always visible

### Root display

| Option | Description | Selected |
|--------|-------------|----------|
| Root header | Shows project directory name as collapsible root node | ✓ |
| Direct contents | Starts with top-level files, path in breadcrumb | |

**User's choice:** Root header

### Loading strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy on-demand | Reads contents when user expands folder | ✓ |
| Pre-load full tree | Reads entire tree on tab open | |

**User's choice:** Lazy on-demand

### Expanded state persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Remember expanded state | Persists which folders are open | ✓ |
| Reset on tab switch | Collapses to root on switch | |

**User's choice:** Remember expanded state

---

## File Interaction Behavior

### Click behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Single-click opens in editor | Single click triggers external editor open | |
| Single-click selects, double-click opens | Single click highlights, double click opens editor | ✓ |

**User's choice:** Single-click selects, double-click opens

### Context menu

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with basics | Open in Editor, Copy Path, Reveal in Finder/Explorer | ✓ |
| No context menu | Just click to open | |

**User's choice:** Yes, with basics

### Selection display

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight only | Visual highlight on selected row, no info panel | ✓ |
| Show file info bar | Status bar with name, size, last modified | |

**User's choice:** Highlight only

### Folder context menu

| Option | Description | Selected |
|--------|-------------|----------|
| Yes | Reveal in Finder/Explorer, Copy Path on folders | ✓ |
| No folder context menu | Folders only expand/collapse | |

**User's choice:** Yes

---

## Gitignore & Filtering

### How to handle gitignored files

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden entirely | Gitignored files don't appear at all | ✓ |
| Greyed out but visible | Filtered items appear dimmed in tree | |

**User's choice:** Hidden entirely

### Show/hide toggle

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, toggle button | Eye/filter icon in tab header, off by default | ✓ |
| No toggle | Filtered files always hidden | |

**User's choice:** Yes, toggle button

### Custom exclude patterns

| Option | Description | Selected |
|--------|-------------|----------|
| No, just .gitignore + hardcoded | .gitignore + node_modules/.git/target etc. | ✓ |
| Yes, project-level excludes | Element-specific exclude list per project | |

**User's choice:** No, just .gitignore + hardcoded

### Reveal style when toggle is ON

| Option | Description | Selected |
|--------|-------------|----------|
| Dimmed/greyed | Hidden files appear with lower opacity | ✓ |
| Normal appearance | All files look the same when revealed | |

**User's choice:** Dimmed/greyed

---

## Live Update Behavior

### Update mode

| Option | Description | Selected |
|--------|-------------|----------|
| Silent refresh | Auto-updates in background, no notification | ✓ |
| Subtle indicator + refresh | Badge/dot on tab, refresh on switch | |

**User's choice:** Silent refresh

### Watch scope

| Option | Description | Selected |
|--------|-------------|----------|
| Entire project directory | Watch full root recursively | ✓ |
| Expanded folders only | Only watch expanded directories | |

**User's choice:** Entire project directory

### New file highlight

| Option | Description | Selected |
|--------|-------------|----------|
| No highlight | Files appear naturally, no animation | ✓ |
| Brief highlight | Subtle flash for ~2 seconds | |

**User's choice:** No highlight

### Watcher lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Always watching | Runs continuously while project open | ✓ |
| Pause when hidden | Stop when Files tab not visible | |

**User's choice:** Always watching

---

## Claude's Discretion

- File icon strategy (type icons vs generic vs none)
- Sort order within directories
- Debounce timing for watcher events
- Expand state persistence mechanism
- Styling for dimmed hidden files

## Deferred Ideas

None — discussion stayed within phase scope
