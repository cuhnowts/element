# Stack Research

**Domain:** Desktop app feature additions (terminal, file tree, AI onboarding, themes)
**Researched:** 2026-03-22
**Confidence:** HIGH

## Scope

This document covers ONLY new library additions for v1.1 features. The existing stack (Tauri 2.x, React 19, SQLite, Zustand, shadcn/ui, Tailwind CSS, reqwest, tokio, keyring, etc.) is validated from v1.0 and unchanged.

---

## Recommended Stack Additions

### Embedded Terminal

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `portable-pty` (Rust) | 0.9.0 | Cross-platform PTY spawning | Industry standard from the wezterm project. Handles macOS/Windows PTY differences. Direct integration gives full control over shell lifecycle, env vars, and per-project working directories. |
| `@xterm/xterm` (JS) | 6.0.0 | Terminal rendering in webview | The only production-grade terminal emulator for the web. v6 has 30% smaller bundle (265kb). Scoped package replaces deprecated `xterm`. |
| `@xterm/addon-fit` (JS) | 0.11.0 | Auto-resize terminal to container | Required for responsive layout within react-resizable-panels. |
| `@xterm/addon-web-links` (JS) | 0.12.0 | Clickable URLs in terminal output | Expected UX for any terminal. Low effort, high value. |

**Why `portable-pty` directly instead of `tauri-plugin-pty`:** The plugin (v0.1.1) is a thin community wrapper with ~50 GitHub stars. Element already has the pattern for Rust backend commands with event streaming (see `cli_commands.rs` and `ai_commands.rs` -- both use `tauri::Emitter` for output streaming). Building directly on `portable-pty` gives full control over shell lifecycle and avoids coupling to a low-maturity plugin.

**Why NOT a React xterm wrapper:** All React wrappers (`xterm-for-react`, `@pablo-lion/xterm-react`, etc.) are either abandoned or trivial wrappers. xterm.js has a simple imperative API: mount a div, call `terminal.open(element)`. A 30-line React component with `useRef` + `useEffect` is sufficient. This matches the existing CodeMirror integration pattern (`@uiw/react-codemirror`).

### File System Tree Browser

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `tauri-plugin-fs` (Rust) | 2.x | Scoped filesystem access | Official Tauri plugin. Provides `readDir` with security scoping, path traversal prevention, and permission-based access control. |
| `@tauri-apps/plugin-fs` (JS) | 2.x | Frontend FS bindings | Official companion to the Rust plugin. Typed `readDir`, `stat`, `exists` APIs. |

**File watching:** Already available. The codebase uses `notify` v8 + `notify-debouncer-mini` v0.7 for plugin directory watching. Reuse the same crates to watch project directories and push tree updates to the frontend via Tauri events.

**Why NOT react-arborist or react-complex-tree:** The file tree for a project workspace is a simple recursive structure (folders + files, expand/collapse, click to select). Element uses shadcn/ui + Tailwind for all UI. Building a custom `<FileTree>` component with recursive rendering and `lucide-react` icons produces better design system integration than adapting a third-party tree library. React-arborist (v3.4.3) brings `react-window` for virtualisation -- unnecessary for project trees under 10K nodes.

### AI-Driven Project Onboarding

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| No new libraries | -- | -- | Existing AI streaming infrastructure handles this entirely. |

**Rationale:** The codebase already has:
- `AiGateway` with provider abstraction (4 providers configured)
- `complete_stream()` with `tokio::sync::mpsc` channel streaming to frontend
- Event listeners: `ai-stream-chunk`, `ai-stream-complete`, `ai-stream-error`
- `prompts` module for structured prompt building and response parsing

Conversational onboarding = new prompt template + new Tauri command + React chat UI component. The chat UI is a scrollable message list -- basic React + Tailwind, no library needed. The structured entry form (project name, scope, goals, constraints) uses existing shadcn/ui form components.

### Theme/Category System

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| No new libraries | -- | -- | Pure data model change (SQLite migration + Zustand store + UI). |

**Rationale:** Themes are a data entity (id, name, color, icon, sort_order) with a one-to-many relationship to projects and tasks. This requires:
- New SQLite migration adding a `themes` table
- New Zustand store slice
- New UI components using existing shadcn/ui + `lucide-react` icons
- Color selection via preset swatches from Tailwind's palette (no color picker library needed)

Note: The existing `next-themes` package (v0.4.6, in package.json but unused) is for light/dark mode switching, NOT for the "theme/category" concept. Keep it for future dark mode but it is unrelated to this feature.

### Per-Project AI Mode Configuration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| No new libraries | -- | -- | Schema field on project entity + UI radio group. |

**Rationale:** AI mode (Track+Suggest, Track+Auto-execute, On-demand) is a single enum field on the project record. The UI is a radio group or segmented control, both available in shadcn/ui.

---

## Summary of New Dependencies

### Rust (Cargo.toml additions)

```toml
portable-pty = "0.9"
tauri-plugin-fs = "2"
```

### JavaScript (package.json additions)

```bash
npm install @xterm/xterm@^6.0.0 @xterm/addon-fit@^0.11.0 @xterm/addon-web-links@^0.12.0 @tauri-apps/plugin-fs
```

### Total: 6 new dependencies (2 Rust, 4 npm)

---

## Installation

```bash
# Terminal (frontend)
npm install @xterm/xterm@^6.0.0 @xterm/addon-fit@^0.11.0 @xterm/addon-web-links@^0.12.0

# File system plugin (frontend bindings)
npm install @tauri-apps/plugin-fs

# Rust dependencies -- add to src-tauri/Cargo.toml:
# portable-pty = "0.9"
# tauri-plugin-fs = "2"

# Tauri plugin registration -- add to src-tauri/src/lib.rs:
# .plugin(tauri_plugin_fs::init())

# Tauri capability -- add fs permissions to capabilities config
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `portable-pty` directly | `tauri-plugin-pty` v0.1.1 | Low maturity (0.1.x), thin wrapper, adds plugin coupling. Element's existing command+event pattern is cleaner and proven. |
| Custom `<FileTree>` | `react-arborist` v3.4.3 | Brings `react-window` dep. Harder to match shadcn/ui design system. Over-engineered for project-scale trees. |
| Custom `<FileTree>` | `react-complex-tree` | Same concern. Better for apps where the tree IS the product (IDEs). |
| Direct xterm.js | `xterm-for-react-18` | Thin wrapper, adds indirection. xterm.js imperative API is simpler than any wrapper. |
| Custom chat UI | `@chatscope/chat-ui-kit-react` | Heavy dependency for a simple message list. Clashes with shadcn/ui design system. |
| Preset color swatches | `react-colorful` | Themes need a curated palette (8-12 colors), not arbitrary color selection. Simpler UX, no dependency. |

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `tauri-plugin-shell` | Element already has `tokio::process::Command` for CLI execution and will use `portable-pty` for interactive terminals | Existing `cli_commands.rs` + `portable-pty` |
| Any React terminal wrapper lib | All are thin/abandoned wrappers around xterm.js | Direct `@xterm/xterm` with custom 30-line React component |
| `monaco-editor` | Massive bundle. Element is not an IDE. CodeMirror already handles code display. | Existing `@uiw/react-codemirror` |
| `node-pty` (npm) | Node.js native module, incompatible with Tauri's webview | `portable-pty` on Rust side, communicate via Tauri events |
| Additional state management | Zustand handles all needs. New features add stores, not frameworks. | Zustand stores for themes, file tree state, terminal sessions |
| `react-colorful` or color picker | Theme colors should be curated presets, not arbitrary | Tailwind color palette swatches |
| Chat UI libraries | Overkill for a structured conversation flow | Custom component with shadcn/ui primitives |

---

## Integration Points with Existing Stack

### Terminal <-> Existing Architecture
- **Backend:** New `terminal_commands.rs` using `portable-pty`. Spawn shell, pipe I/O through `tauri::Emitter` events (same pattern as `cli_commands.rs` stdout/stderr streaming and `ai_commands.rs` chunk streaming).
- **Frontend:** xterm.js instance inside a `react-resizable-panels` panel. Terminal input sent via `invoke()`, output received via `listen()` events.
- **Per-project:** Terminal spawns with `cwd` set to project's linked directory. Managed state maps `project_id` -> PTY handle in Rust backend.

### File Tree <-> Existing Architecture
- **Backend:** `tauri-plugin-fs` provides `readDir`. Custom Tauri command wraps it to return typed tree structure with file metadata. Existing `notify` crate watches for changes and emits `file-tree-changed` events.
- **Frontend:** Custom `<FileTree>` component with recursive rendering. Expand/collapse state in local React state (ephemeral UI state, not Zustand). Click emits file path for context display.
- **Per-project:** Tree root is the project's linked directory. Scoped via Tauri fs permissions at runtime.

### AI Onboarding <-> Existing Architecture
- **Backend:** New `ai_onboarding_commands.rs` extending existing `AiGateway` + `complete_stream()`. New prompt templates in `prompts` module for multi-turn conversation (structured entry fields -> AI questions -> phase/task generation).
- **Frontend:** Chat-style component using existing design tokens. Structured form (shadcn/ui inputs) feeds context into AI prompt. Response parsing generates project phases and tasks via existing CRUD commands.

### Theme System <-> Existing Architecture
- **Backend:** New SQLite migration adds `themes` table. Foreign key from `projects.theme_id` and `tasks.theme_id`. New `theme_commands.rs` with standard CRUD.
- **Frontend:** New Zustand store for themes. Sidebar groups items by theme with color-coded indicators. Uses Tailwind dynamic classes for theme colors.

---

## Tauri Capability Configuration

The file system plugin requires capability configuration for project directory access:

```json
{
  "identifier": "default",
  "permissions": [
    "fs:default",
    {
      "identifier": "fs:scope",
      "allow": [{ "path": "$HOME/**/*" }],
      "deny": [
        { "path": "$HOME/.ssh/**/*" },
        { "path": "$HOME/.gnupg/**/*" }
      ]
    },
    "fs:allow-read-dir",
    "fs:allow-stat",
    "fs:allow-exists"
  ]
}
```

Consider narrowing the scope to only user-selected project directories at runtime for better security.

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `portable-pty` 0.9 | `tokio` 1.x | Async-compatible, works with existing tokio runtime |
| `@xterm/xterm` 6.0 | `@xterm/addon-fit` 0.11, `@xterm/addon-web-links` 0.12 | Addon versions track xterm major version |
| `tauri-plugin-fs` 2.x | `tauri` 2.10 | Official plugin, version-matched to Tauri 2.x |
| `@tauri-apps/plugin-fs` 2.x | `@tauri-apps/api` 2.10 | Official bindings, version-matched |

---

## Sources

- [portable-pty on crates.io](https://crates.io/crates/portable-pty) -- v0.9.0, released 2025-02-11, HIGH confidence
- [tauri-plugin-pty on GitHub](https://github.com/Tnze/tauri-plugin-pty) -- v0.1.1, evaluated and rejected, MEDIUM confidence
- [@xterm/xterm on npm](https://www.npmjs.com/@xterm/xterm) -- v6.0.0, 30% bundle size reduction, HIGH confidence
- [xterm.js releases](https://github.com/xtermjs/xterm.js/releases) -- v6.0.0 changelog, HIGH confidence
- [Tauri File System Plugin](https://v2.tauri.app/plugin/file-system/) -- official docs, readDir API and permissions, HIGH confidence
- [react-arborist on npm](https://www.npmjs.com/package/react-arborist) -- v3.4.3, evaluated and rejected, HIGH confidence
- Element codebase: `cli_commands.rs`, `ai_commands.rs`, `plugins/mod.rs` -- existing patterns verified, HIGH confidence

---
*Stack research for: Element v1.1 Project Manager milestone*
*Researched: 2026-03-22*
