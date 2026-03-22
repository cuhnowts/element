# Project Research Summary

**Project:** Element v1.1 — Project Manager milestone
**Domain:** Desktop project management + AI-driven onboarding + embedded developer workspace (Tauri 2.x + React 19)
**Researched:** 2026-03-22
**Confidence:** HIGH

## Executive Summary

Element v1.1 is a developer-focused personal project management desktop app that bridges the gap between IDEs (which have workspace context but no PM structure) and PM tools (which have organizational hierarchy but no filesystem/terminal integration). The milestone adds four interconnected capability areas to the validated v1.0 foundation: a theme/category system for organizing projects, an enhanced project entity with directory linking and phases, an embedded workspace (terminal + file explorer), and AI-driven project onboarding. Research confirms this combination has no direct competitor — Linear, ClickUp, and Notion lack workspace integration; VS Code and Cursor lack PM structure; neither category offers in-context AI project decomposition that generates a full phased plan and inserts it into the PM system.

The recommended approach is strongly incremental and dependency-driven. A single database migration (007) unlocks the entire feature surface: adding the themes table, project_phases table, nullable project_id on tasks, and new columns on projects (dir_path, theme_id, ai_mode). Everything else — sidebar refactor, file explorer, terminal, AI onboarding — is gated on this migration. The stack additions are minimal: `portable-pty` + `@xterm/xterm` (plus two addons) for the embedded terminal, and `tauri-plugin-fs` for filesystem access. All other features (AI onboarding, themes, phases, AI mode) reuse the existing v1.0 stack without new dependencies, leveraging existing patterns from `cli_commands.rs` and `ai_commands.rs`.

Three architectural risks must be addressed upfront, not retrofitted. PTY lifecycle mismanagement (orphaned shell processes) requires explicit Rust-side session management with `Drop` cleanup — React `useEffect` alone is insufficient at the Tauri IPC boundary. File explorer IPC serialization bottlenecks will freeze the UI on real codebases with node_modules unless lazy loading (one level at a time) is built from day one. Schema rigidity must be resolved in migration 007 itself: making tasks.project_id nullable and establishing sort_order columns across themes, projects, and tasks. All three are HIGH recovery cost if left for later.

## Key Findings

### Recommended Stack

The v1.0 stack (Tauri 2.x, React 19, SQLite, Zustand, shadcn/ui, Tailwind CSS) is fully preserved. Only 6 new dependencies are added: 2 Rust crates and 4 npm packages.

**Core technologies (new additions only):**
- `portable-pty` 0.9 (Rust): Cross-platform PTY spawning for the embedded terminal — industry standard from the wezterm project; handles macOS/Windows PTY differences; integrates cleanly with the existing tokio runtime via `spawn_blocking`
- `@xterm/xterm` 6.0 (npm): Terminal rendering in webview — the only production-grade web terminal emulator; v6 is 30% smaller than v5; no React wrapper needed (30-line component with `useRef + useEffect` matches the existing CodeMirror integration pattern)
- `@xterm/addon-fit` 0.11 + `@xterm/addon-web-links` 0.12 (npm): Required addons for auto-resize and clickable URLs
- `tauri-plugin-fs` 2.x (Rust + npm): Official Tauri plugin for scoped filesystem access — provides `readDir`, `stat`, `exists` with permission-based security scoping; wrapped in custom `fs_commands.rs` for project-scoped path validation

**Explicitly rejected:** `tauri-plugin-pty` v0.1.1 (low maturity, thin wrapper), React xterm wrappers (all thin or abandoned), `react-arborist` (brings react-window dependency, over-engineered for project-scale trees), Monaco editor (2MB+ bundle, Element is not an IDE), custom chat UI libraries (clash with shadcn/ui). See STACK.md for full alternatives matrix.

### Expected Features

**Must have (v1.1 launch — table stakes):**
- Theme CRUD with color/icon and theme-grouped sidebar navigation — organizational foundation; without this the v1.1 upgrade is invisible to users
- Project directory linking (`dir_path` field) — the single field that unlocks both file explorer and terminal; blocks all workspace features
- Project phases with task grouping and progress tracking — transforms Element from a task list into a project manager
- Standalone tasks (nullable project_id) — quick one-offs must not require creating a project; requires schema change in migration 007
- File explorer (read-only tree, opens in external editor, respects .gitignore) — the directory link is invisible without a visual representation
- Embedded terminal (at minimum one session, opens in project directory) — highest-complexity table-stakes feature
- AI-driven project onboarding (structured form + multi-turn AI conversation + generated phases/tasks + user review gate) — the headline differentiator for v1.1

**Should have (v1.1.x patches, add after core validation):**
- Multiple terminal sessions — triggered when users need to run a dev server and git commands simultaneously
- Per-project AI mode (On-demand / Track+Suggest / Track+Auto) — triggered when users manage multiple projects with different AI trust levels
- Context switching summaries ("where was I?") — triggered when users have 3+ active projects
- File system watching for live tree updates — triggered when creating files in terminal leaves the explorer stale
- Phase drag-and-drop reordering

**Defer to v2+:**
- AI progress reports per project, cross-project theme dashboards, terminal command history linked to tasks

**Anti-features (do not build):**
- Built-in code editor — multi-year scope; open in external editor is the correct model
- Gantt charts — team-scale complexity; phase list with progress bars conveys the same information for personal use
- Kanban view — task list with status badges is equivalent for a single developer; Kanban shines for team visibility
- Nested sub-projects beyond 3 levels (theme > project > task is the sweet spot)
- AI auto-creating tasks without a review gate — users lose trust; the review step is where trust is built
- Template libraries — AI onboarding is strictly better: personalized, current, adapts to context

### Architecture Approach

The v1.1 architecture extends the existing three-panel layout (Sidebar + CenterPanel + OutputDrawer) without restructuring it. The Sidebar gains theme-grouped collapsible sections replacing the flat project list. The CenterPanel routes to two new views: `ProjectWorkspace.tsx` (phases + task list + file explorer sidebar) and `OnboardingWizard.tsx` (multi-step AI onboarding). The OutputDrawer gains two new tabs: `TerminalTab.tsx` and `FileExplorerTab.tsx`. Three new Zustand slices (`themeSlice`, `terminalSlice`, `fileExplorerSlice`) follow the existing slice-per-domain pattern. Six new Rust files are added: `models/theme.rs`, `models/phase.rs`, `commands/theme_commands.rs`, `commands/fs_commands.rs`, `commands/onboarding_commands.rs`, `ai/onboarding.rs`. One new migration: `db/sql/007_themes_projects.sql`.

**Major components and responsibilities:**
1. `models/theme.rs` + `commands/theme_commands.rs` — theme CRUD with sort_order; nullable FK from projects and tasks
2. `models/phase.rs` — project phase lifecycle (plan/active/complete); sort_order for ordering; nullable FK from tasks
3. `commands/fs_commands.rs` — directory reading scoped to project dir_path; Rust-side path traversal validation; lazy one-level-at-a-time loading with gitignore filtering
4. Terminal backend using `portable-pty` — PTY session lifecycle stored in `HashMap<String, TerminalSession>` behind `Arc<Mutex<>>`; explicit `terminal_spawn` and `terminal_kill` Tauri commands; `Drop` on TerminalSession kills the child process; `tokio::task::spawn_blocking` for PTY read loops
5. `ai/onboarding.rs` + `commands/onboarding_commands.rs` — finite state machine (scope_entry → ai_questions → user_answers → phase_generation → review → confirm); state persisted to SQLite after each step; reuses existing `AiGateway` + `complete_stream()` with no new AI infrastructure
6. `ProjectWorkspace.tsx` — integration capstone combining file tree sidebar, phase overview, and task list; requires all constituent workspace features to exist first

### Critical Pitfalls

1. **PTY lifecycle mismanagement** — Rust-side `HashMap<sessionId, TerminalSession>` with `Drop` cleanup; explicit `terminal_kill` Tauri command; orphan sweep on `tauri::RunEvent::ExitRequested`. Never trust React `useEffect` cleanup as the sole kill path. Use `tokio::task::spawn_blocking` for PTY read loops (blocking read starves the tokio async runtime if called directly). Recovery cost: MEDIUM if caught early, HIGH if discovered after shipping.

2. **File explorer IPC serialization bottleneck** — Lazy load one directory level at a time (no recursive scan). Filter node_modules, .git, target, build artifacts in Rust before any data crosses the IPC bridge. Cap at 200 entries per IPC call. Return minimal entry data `{name, is_dir, size}`. This has been confirmed in Tauri issue #1817 — it is a known bottleneck, not a hypothesis. Recovery cost: MEDIUM (requires refactoring tree to lazy-load; harder to retrofit than build correctly).

3. **Schema rigidity** — Migration 007 must make tasks.project_id nullable immediately. Add sort_order columns to themes, projects, and tasks from the start. Support all four valid membership states: task-in-project-in-theme, task-in-project-no-theme, standalone-task-in-theme, standalone-task-no-theme. Adjacency list with nullable parents is correct for max 3 hierarchy levels. Recovery cost: MEDIUM (migration + query updates + frontend logic changes).

4. **AI onboarding conversation state explosion** — Implement as a 6-state finite state machine, not a growing message array. Persist state machine position to SQLite after each step so the user can resume after an app crash. Each AI call uses a fresh structured prompt built from accumulated state data — never replay message history. Cap at 3-5 AI question rounds. Recovery cost: LOW if FSM is designed upfront; MEDIUM if retrofitting free-form conversation storage.

5. **Per-project AI mode adds multiplicative complexity** — Implement a `SuggestionQueue` pattern: AI always produces suggestions; mode only controls the consumer (auto-apply vs. present-for-approval vs. do-nothing). Never branch on AI mode inside feature logic. Build On-demand first, Track+Suggest second, Track+Auto last (only after an undo system exists). Recovery cost: MEDIUM (requires refactoring mode branches out of feature code).

6. **Tauri permission scope drift** — Create separate capability files (`workspace.json`, `terminal.json`). Use the runtime scope API for per-project directory access rather than static allow-all path patterns. Rust-side path traversal validation makes unauthorized access architecturally impossible, not just permission-blocked. Recovery cost: LOW (audit + tighten capability files), but a security vulnerability if unaddressed.

7. **Context switching destroys in-flight work** — Design per-project session state (`Map<projectId, ProjectSession>`) from the start. Background PTY sessions on project switch rather than killing them. Persist session state (expanded tree paths, terminal session ID, scroll position, pending AI suggestions) to SQLite on project switch. Recovery cost: HIGH if not planned during the workspace phase architecture.

## Implications for Roadmap

Based on research findings and the dependency graph, six phases emerge from the architecture build order documented in ARCHITECTURE.md:

### Phase 1: Data Foundation and Theme System

**Rationale:** Migration 007 is the dependency root for all v1.1 features. Building the theme system first delivers immediate user value (organizational upgrade) while the high-complexity workspace work is prepared. The data model is the cheapest place to get decisions right — schema changes after features are built on top are expensive.
**Delivers:** Migration 007 (themes table, project_phases table, projects ALTER for dir_path/theme_id/ai_mode, tasks ALTER for nullable project_id, sort_order columns across the hierarchy); theme and phase models with CRUD; theme Tauri commands; extended project commands accepting new fields; themeSlice.ts; theme-grouped Sidebar with collapsible ThemeGroup.tsx; ThemeView in CenterPanel.
**Addresses:** Theme CRUD (FEATURES.md table stakes), sidebar navigation, standalone tasks (schema change), default uncategorized bucket
**Avoids:** Schema rigidity pitfall — nullable project_id, sort_order, and all four membership states must be correct before building on top

### Phase 2: Project Enhancement and Phases UI

**Rationale:** Once the data foundation exists, phases must surface in the UI before the workspace view can integrate them. ProjectWorkspace.tsx needs phases to display progress; AI onboarding needs phases to persist its output. This phase completes the "project manager" identity upgrade before adding workspace complexity.
**Delivers:** Phase CRUD UI (create, rename, reorder, delete); phase-level progress tracking using existing ProgressBar.tsx; project directory linking UI (directory picker dialog via Tauri file dialog); expanded ProjectDetail.tsx showing phases, completion metrics, and recent activity; ProjectWorkspace.tsx scaffold (empty shell for Phase 6 to fill).
**Addresses:** Project phases with task grouping, phase-level progress tracking, project status overview, project directory linking (FEATURES.md table stakes)
**Avoids:** Building the workspace integration point before the constituent data exists

### Phase 3: File Explorer

**Rationale:** File explorer is self-contained once dir_path exists. Independent of terminal — can be built and validated without PTY complexity. Establishing the lazy-loading and IPC serialization discipline here sets the precedent for the terminal phase to follow.
**Delivers:** `commands/fs_commands.rs` with Rust-side path traversal security; gitignore-aware filtering in Rust; fileExplorerSlice.ts; FileExplorerTab.tsx with lazy-loaded tree; OutputDrawer file explorer tab; "open in external editor" via Tauri shell API; separate `workspace.json` capability file.
**Uses:** `tauri-plugin-fs` 2.x (STACK.md)
**Avoids:** IPC serialization bottleneck (lazy load from day one — never recursive scan on open), permission scope drift (separate capability file, runtime scope for per-project directories), symlink infinite loop (detect symlinks in Rust, do not follow outside project root)

### Phase 4: Embedded Terminal

**Rationale:** Architecturally independent of the file explorer — both depend on dir_path (Phase 1) but not on each other. PTY lifecycle complexity justifies its own phase. This is the highest-risk implementation in v1.1 and benefits from file explorer having already established Tauri event streaming patterns.
**Delivers:** `portable-pty` integration with `tokio::task::spawn_blocking` read loops; PTY session lifecycle manager (`HashMap<id, TerminalSession>` + `Drop` + `ExitRequested` sweep); `terminal_spawn`, `terminal_write`, `terminal_resize`, `terminal_kill` Tauri commands; terminalSlice.ts; TerminalTab.tsx with xterm.js + fit addon + web-links addon; terminal opens with cwd set to project.dir_path; separate `terminal.json` capability file.
**Uses:** `portable-pty` 0.9, `@xterm/xterm` 6.0, `@xterm/addon-fit` 0.11, `@xterm/addon-web-links` 0.12 (STACK.md)
**Avoids:** PTY lifecycle mismanagement (explicit session map + Drop + app shutdown sweep), terminal output in React state (xterm.js manages its own scrollback buffer — never pipe through Zustand), missing resize handling (fit addon + SIGWINCH forwarding to PTY), xterm.js + Tauri string serialization on every keystroke (use Tauri Channel API with 16ms batching)

### Phase 5: AI-Driven Project Onboarding

**Rationale:** Requires the Phase 1 data model (project_phases table) as the persistence target for generated output. The AI infrastructure (AiGateway, complete_stream, event streaming) is already validated from v1.0. The headline differentiator for v1.1 — ship it after the workspace is working so the generated phases and tasks can be immediately explored in context.
**Delivers:** `ai/onboarding.rs` with structured prompt templates for multi-turn project decomposition; `commands/onboarding_commands.rs` implementing the 6-state FSM; FSM state persisted to SQLite after each step; OnboardingWizard.tsx multi-step UI with structured entry form and AI conversation display; user review and edit step before any database writes; per-project AI mode field surfaced in project settings (radio group using existing shadcn/ui).
**Addresses:** AI-driven project onboarding, AI-generated phase/task decomposition, per-project AI mode configuration (FEATURES.md differentiators)
**Avoids:** Conversation state explosion (FSM + fresh structured prompts, not growing chat history replay), AI auto-creating without review gate, missing rate limiting on rapid regenerate (debounce + disable button during in-flight AI call), missing error recovery (FSM state persisted so app crash mid-onboarding resumes from last completed step)

### Phase 6: Project Workspace Integration

**Rationale:** ProjectWorkspace.tsx is the integration capstone — it assembles file explorer sidebar, phase overview, task list, and terminal access into the unified project view. All constituent features must exist before this view can be meaningfully assembled. This phase also establishes the per-project session state architecture that enables context switching without destroying in-flight work.
**Delivers:** Fully populated ProjectWorkspace.tsx combining phase overview + task list + file explorer sidebar panel + terminal tab access; per-project session state map (`Map<projectId, ProjectSession>`) in Zustand and persisted to SQLite; backgrounded PTY sessions on project switch with "processes running" indicator; remembered panel sizes; collapsible panel layout.
**Avoids:** Context switching destroying in-flight work (session state map designed here, even though context-switching AI summaries are deferred to v1.1.x), Zustand store bloat rendering cascades (per-project workspace stores rather than adding more slices to the main AppStore)

### Phase Ordering Rationale

- Migration 007 and the theme data model gate everything — data foundation is non-negotiable as Phase 1.
- File explorer and terminal are architecturally independent but both require dir_path (Phase 1) and the workspace scaffold (Phase 2). Sequential is safer than parallel for solo development.
- AI onboarding requires project_phases table as a persistence target — cannot ship before Phase 1, benefits from shipping after the workspace is visible.
- ProjectWorkspace.tsx is the integration capstone — building it last prevents the common mistake of assembling the container before the contained features exist.
- Per-project AI mode is surfaced in Phase 5 as a simple field on the project entity. Full Track+Suggest and Track+Auto behavior is deferred to v1.1.x — PITFALLS.md makes clear that building AI mode behavior simultaneously with onboarding multiplies complexity unacceptably.
- Context switching AI summaries are deferred to v1.1.x but the session state architecture that enables them is designed in Phase 6 to avoid the HIGH recovery cost retrofit.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Embedded Terminal):** PTY cross-platform behavior (macOS PTY vs Windows ConPTY) has lifecycle differences not fully covered in current research. The xterm.js + Tauri Channel API integration for binary data batching (vs string event serialization) needs a spike before committing to an implementation plan. Validate `tokio::task::spawn_blocking` against Element's specific tokio runtime configuration.
- **Phase 5 (AI Onboarding):** The FSM state persistence schema and the prompt templates for multi-turn project decomposition should be prototyped before full planning — prompt quality for generating well-structured phases cannot be known from research alone and requires iteration with real AI calls.

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1 (Data Foundation):** SQLite migrations are fully understood; adjacency list for 3-level hierarchy is textbook; existing Element migration pattern is proven and repeatable.
- **Phase 2 (Project Enhancement):** Extends existing CRUD and adds UI to existing views. Follows Element's established patterns exactly.
- **Phase 3 (File Explorer):** `tauri-plugin-fs` is the official plugin with clear documentation; lazy tree loading is a well-documented pattern; the primary constraints (lazy load + gitignore filter + path scoping) are already resolved in research.
- **Phase 6 (Workspace Integration):** Assembly of existing components into a layout; the per-project session state map is a straightforward Zustand + SQLite pattern with no novel technical territory.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against existing Element codebase patterns (cli_commands.rs, ai_commands.rs, plugins/mod.rs) and official Tauri 2.x documentation. The 6 new dependencies have clear integration paths with zero ambiguity. |
| Features | HIGH | Competitor analysis grounded in public product documentation (Linear, ClickUp, VS Code, Cursor, Warp). Table stakes derived from established PM tool conventions. Feature dependency graph explicit and cross-validated against v1.0 schema. |
| Architecture | HIGH | Build order derived from actual dependency graph, not estimation. Integration patterns verified against existing codebase files. Anti-patterns documented with confirmed examples (Tauri issue #1817, #9190). |
| Pitfalls | MEDIUM-HIGH | PTY pitfall confirmed against known Tauri IPC issues and community reports. Schema rigidity pitfall identified from existing code (`tasks.project_id NOT NULL`). IPC bottleneck confirmed from Tauri issue tracker. AI FSM pitfall is pattern-derived from adjacent LLM conversation state problems, not from direct Element failure observation. |

**Overall confidence:** HIGH

### Gaps to Address

- **Windows ConPTY behavior:** Research focused on macOS PTY. Windows ConPTY has different lifecycle semantics and is called out in PITFALLS.md checklist. Needs validation during terminal phase implementation — at minimum a Windows CI environment or manual test on Windows before shipping Phase 4.
- **xterm.js binary Channel vs string events:** Research recommends Tauri `Channel` API for binary PTY data batching rather than string event serialization, but this was not validated against Element's specific Tauri 2.10 version. Confirm early in Phase 4 with a spike.
- **AI prompt quality for phase generation:** The FSM design is architecturally sound, but the prompt templates in `ai/onboarding.rs` will require iteration. Budget iteration time in Phase 5 planning — prompt engineering quality cannot be assessed from research alone.
- **tauri-plugin-fs vs custom fs_commands minor inconsistency:** ARCHITECTURE.md recommends custom commands for tighter security; STACK.md recommends the official plugin. Resolution: use `tauri-plugin-fs` as the underlying readDir implementation (it is already security-scoped) but wrap it in custom `fs_commands.rs` commands that add Rust-side project-scope validation. Both research files converge on this pattern when read carefully — it is not a genuine conflict.

## Sources

### Primary (HIGH confidence)
- Element codebase: `src-tauri/src/cli_commands.rs`, `ai_commands.rs`, `plugins/mod.rs`, `db/sql/001_initial.sql`, `src/stores/index.ts`, `capabilities/default.json` — existing patterns verified directly
- [portable-pty on crates.io](https://crates.io/crates/portable-pty) — v0.9.0, released 2025-02-11
- [@xterm/xterm on npm](https://www.npmjs.com/@xterm/xterm) — v6.0.0, 30% bundle size reduction vs v5
- [Tauri File System Plugin docs](https://v2.tauri.app/plugin/file-system/) — official; readDir API and permission scoping
- [Tauri Permissions docs](https://v2.tauri.app/security/permissions/) — capability and scope architecture
- [xterm.js releases](https://github.com/xtermjs/xterm.js/releases) — v6.0.0 changelog confirmed

### Secondary (MEDIUM confidence)
- [tauri-terminal reference implementation](https://github.com/marc2332/tauri-terminal) — xterm.js + portable-pty + Tauri integration pattern
- [Tauri IPC serialization issue #1817](https://github.com/tauri-apps/tauri/issues/1817) — file reading IPC bottleneck, confirmed
- [Tauri memory issue #9190](https://github.com/tauri-apps/tauri/issues/9190) — memory issues with file reading confirmed
- [Shell plugin security advisory GHSA-c9pr-q8gx-3mgp](https://github.com/tauri-apps/plugins-workspace/security/advisories/GHSA-c9pr-q8gx-3mgp) — scope validation vulnerability, informs capability design
- [conaticus/FileExplorer](https://github.com/conaticus/FileExplorer) — Tauri file explorer performance patterns
- [react-arborist on npm](https://www.npmjs.com/package/react-arborist) — v3.4.3, evaluated and rejected

### Tertiary (LOW confidence — directional only)
- Linear AI, ClickUp Brain, Warp Terminal — competitor feature comparison; capabilities are publicly documented but evolve rapidly
- SQLite hierarchical data strategy comparisons — adjacency list recommendation well-supported; specific query performance at Element's scale not benchmarked

---
*Research completed: 2026-03-22*
*Ready for roadmap: yes*
