# Milestones

## v1.1 Project Manager (Shipped: 2026-03-25)

**Phases completed:** 11 phases, 17 plans, 32 tasks

**Key accomplishments:**

- SQLite migration 007 with themes table, nullable project_id via table recreation, theme CRUD model with 8 tests, and 10 Tauri commands registered
- Theme sidebar with Zustand store, DnD reorder via @dnd-kit, create/edit dialog with color palette, and restructured sidebar replacing ProjectList + TaskList
- Phases table with CRUD/reorder, directory_path on projects, phase_id FK on tasks, and 7 Tauri commands registered with dialog plugin
- Phase/directory type system with Zustand PhaseSlice, 7 Tauri API methods, and dnd-kit/shadcn component dependencies
- Redesigned ProjectDetail with DnD phase management, task drag between phases, directory linking via native OS picker, progress tracking, and inline task/phase creation
- 5 Tauri commands for file explorer: gitignore-aware directory listing via ignore crate, open-in-editor, reveal-in-file-manager, and debounced file watcher lifecycle
- Complete file explorer UI: tree view with context menus, tab bar for Detail/Files switching, Zustand store with lazy loading and localStorage-persisted expand state, and live filesystem update wiring
- PTY backend via tauri-plugin-pty with xterm.js terminal hook managing spawn, bidirectional data, resize, WebGL rendering, and cleanup
- Terminal tab in output drawer with xterm.js rendering, empty states, Ctrl+backtick shortcut, and focus guard for uninterrupted terminal typing
- Migration 009 with ai_mode and app_settings, Rust onboarding commands (skill file, file watcher, batch create), and Zustand onboarding slice with full plan editing state machine
- Four onboarding UI components (PlanWithAi, ScopeInput, WaitingCard, AiModeSelect) integrated into ProjectDetail with step-based state machine rendering, directory guard, and terminal auto-open
- AiPlanReview component with accordion layout, inline editing, drag-and-drop phase reorder, add/delete phases and tasks, confirm & save batch creation, and discard confirmation dialog
- Backend Tauri command that generates .element/context.md with full project context (phases, tasks, progress, attention items) or onboarding instructions for empty projects
- Per-project workspace state map with save/restore on project switch, plus terminal kill/respawn infrastructure via session key and initialCommand support
- "Open AI" button in ProjectDetail that generates context file, starts plan watcher, and launches claude --dangerously-skip-permissions in visible terminal via PTY kill/respawn

---

## v1.0 MVP (Shipped: 2026-03-22)

**Phases completed:** 6 phases, 29 plans, 63 tasks

**Key accomplishments:**

- Tauri 2.x desktop app with SQLite data layer, rusqlite CRUD models for projects/tasks/tags, and JSON workflow file I/O -- 24 tests passing
- 14 Tauri IPC commands for project/task/tag CRUD with event emission, native macOS menu bar (Element/File/Edit), and system tray (Show/Quit)
- Sidebar layout with project/task lists, task detail with inline editing, Zustand state management, keyboard shortcuts, and dark/light mode theming
- Vitest configured with jsdom, Tauri invoke/listen mocks, and 38 todo test stubs across 7 files covering all Phase 2 requirements
- Two-column workspace layout with resizable bottom drawer, Zustand state management with localStorage persistence, TypeScript type contracts, and Tauri IPC command wrappers
- Calendar toggle, mini calendar with date picker, today's task list with selection highlighting, and workflow placeholder wired into sidebar layout
- Center panel with welcome dashboard, task detail view with execution diagram, and output drawer with auto-scrolling terminal-style log viewer
- Restored Phase 2 multi-panel layout with Cmd+B drawer toggle and execution event listeners, unblocking all 6 Phase 2 requirements
- WelcomeDashboard New Task button wired to dual-store task creation, and Cmd+B drawer toggle wired to imperative panel collapse/expand
- SQLite migration adding 5 scheduling columns with indexes, Rust CRUD integration, scheduling-aware today query, and consolidated TypeScript types
- Time-grouped TodayView replacing WelcomeDashboard with overdue/morning/afternoon/evening/unscheduled sections, progress header, and next-up highlighting
- SchedulingBadges, DurationChips, and RecurrenceIndicator components with overdue detection, radiogroup accessibility, and TaskDetail integration
- Global hotkey Ctrl+Space opens frameless floating capture window with task form, cross-window event refresh via Tauri multi-window architecture
- Typed Workflow/Schedule/Execution models with StepDefinition enum, SQLite migration for 4 tables, and 13 Tauri IPC commands for full CRUD
- Rust PipelineExecutor with shell/HTTP step executors, {{template}} variable resolution, and async Tauri command integration
- Cron scheduler with missed-run catch-up, TypeScript workflow/schedule/execution types, Zustand store with 17 Tauri command wrappers and real-time event listeners
- WorkflowBuilder with insert-anywhere step editing, CodeMirror shell/JSON editors, HTTP step form, and task-to-workflow promotion via PromoteButton
- Cron scheduling with presets and advanced input, real-time step progress indicators (spinner/check/X), retry-from-failure, and run history browsing in output drawer
- Wave-0 test scaffolding: 45 vitest todo stubs for plugin settings UI plus 10 Rust const-str fixtures for manifest and calendar API parsing
- Plugin manifest parsing with hot-reload FS watcher, credential vault with OS keychain abstraction, SQLite migration for 4 new tables, and 12 Tauri IPC commands for plugin and credential management
- Settings page with plugin list (status dots, enable/disable, error detail) and credential vault (add/edit dialog, reveal with 10s auto-mask, copy, delete) wired to Zustand stores and Tauri IPC
- Shell, HTTP, and filesystem core plugins with tokio async execution, path-scoped FS security, and React step configuration UIs
- Calendar plugin with Google/Outlook OAuth PKCE flows, event syncing with incremental tokens, SQLite caching, and mini calendar dot indicators -- partially verified (calendar OAuth needs debugging)
- Rust foundation for AI providers and smart scheduling: database migration with ai_providers/work_hours/scheduled_blocks tables, AiProvider trait, type definitions, OS keychain credential storage, and task estimated_minutes field
- 4 AI provider implementations (Anthropic, OpenAI, Ollama, OpenAI-compatible) with gateway router, OS keychain credential flow, and streaming scaffold generation via 7 Tauri IPC commands
- Greedy scheduling engine with open time-block detection, priority+due-date task scoring, and task splitting across blocks via Tauri IPC
- AI provider settings UI with sparkle-button task scaffolding, streaming suggestions, and per-field accept/dismiss including related tasks
- Zustand scheduling store with work hours settings UI and colored schedule block overlay on existing calendar panel
- CLI tool invocation panel in TaskDetail using tokio process spawning with real-time stdout/stderr streaming via Tauri events

---
