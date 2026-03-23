# Roadmap: Element

## Overview

Element is a desktop task orchestration platform built with Tauri 2.x (Rust) + React 19. The roadmap moves through capability layers, each delivering a complete, usable feature set.

## Milestones

- ✅ **v1.0 MVP** -- Phases 1-5 (shipped 2026-03-22) -- [archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Project Manager** -- Phases 6-11 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) -- SHIPPED 2026-03-22</summary>

- [x] Phase 1: Desktop Shell and Task Foundation (3/3 plans) -- completed 2026-03-16
- [x] Phase 2: Task UI and Execution History (6/6 plans) -- completed 2026-03-16
- [x] Phase 2.1: Daily UX Foundation (4/4 plans, INSERTED) -- completed 2026-03-16
- [x] Phase 3: Workflows and Automation (5/5 plans) -- completed 2026-03-17
- [x] Phase 4: Plugin System (5/5 plans) -- completed 2026-03-18
- [x] Phase 5: AI and Smart Scheduling (6/6 plans) -- completed 2026-03-19

</details>

### v1.1 Project Manager (In Progress)

**Milestone Goal:** Transform Element into a full project management platform with themed categories, AI-driven project setup, and an integrated workspace with file explorer and terminal.

- [ ] **Phase 6: Data Foundation and Theme System** - Schema migration + theme CRUD + themed sidebar navigation
- [ ] **Phase 7: Project Phases and Directory Linking** - Phase management within projects + directory picker + progress tracking
- [ ] **Phase 8: File Explorer** - Project file tree with gitignore filtering, external editor launch, and live updates
- [ ] **Phase 9: Embedded Terminal** - PTY-backed terminal in workspace, auto-opening in project directory
- [x] **Phase 10: AI Project Onboarding** - Structured project entry + AI questioning + generated phases/tasks + per-project AI mode (completed 2026-03-23)
- [ ] **Phase 11: Workspace Integration and AI Context** - Unified project workspace + context switching summaries + AI progress suggestions

## Phase Details

### Phase 6: Data Foundation and Theme System
**Goal**: Users can organize their projects and tasks under themed categories with a restructured sidebar
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: THEME-01, THEME-02, THEME-03, THEME-04
**Success Criteria** (what must be TRUE):
  1. User can create, rename, and delete themes from the sidebar
  2. User can assign projects and standalone tasks to themes
  3. Sidebar displays items grouped by theme with collapsible sections; uncategorized items appear in a default bucket
  4. User can create a task without assigning it to any project (standalone task)
**Plans**: 4 plans
**UI hint**: yes

Plans:
- [x] 06-01-PLAN.md -- Backend: migration, theme model, theme commands, task/project modifications
- [ ] 06-02-PLAN.md -- Frontend: types, API, store, sidebar components, sidebar restructure
- [ ] 06-03-PLAN.md -- Checkpoint: end-to-end theme system verification

### Phase 7: Project Phases and Directory Linking
**Goal**: Users can structure projects into ordered phases, track progress, and link projects to filesystem directories
**Depends on**: Phase 6
**Requirements**: PROJ-01, PROJ-02, PROJ-03, PROJ-04, PROJ-05
**Success Criteria** (what must be TRUE):
  1. User can link a project to a filesystem directory using a native directory picker
  2. User can create, reorder, and manage phases within a project
  3. User can assign tasks to specific phases within a project
  4. User can see phase-level progress showing tasks complete out of total
  5. Project detail view displays the phase list, overall progress bar, and status overview
**Plans**: 4 plans
**UI hint**: yes

Plans:
- [x] 07-01-PLAN.md -- Backend: migration (007_phases.sql), phase model, project/task extensions, Tauri commands, dialog plugin
- [x] 07-02-PLAN.md -- Frontend: npm dependencies, shadcn components, types, API layer, Zustand phase slice
- [x] 07-03-PLAN.md -- UI: ProjectDetail redesign, PhaseRow with DnD, DirectoryLink, progress bars, sidebar + TaskDetail updates

### Phase 8: File Explorer
**Goal**: Users can browse and interact with project files directly within the Element workspace
**Depends on**: Phase 7 (requires project directory linking)
**Requirements**: FILE-01, FILE-02, FILE-03, FILE-04
**Success Criteria** (what must be TRUE):
  1. User can browse project files in a tree view within the workspace panel
  2. User can open any file in their default external editor from the tree
  3. File tree automatically hides .gitignore entries and common excludes (node_modules, .git, target)
  4. File tree updates in real time when files are added, removed, or renamed on disk
**Plans**: 4 plans
**UI hint**: yes

Plans:
- [x] 08-01-PLAN.md -- Backend: ignore crate, file_explorer_commands (list_directory, open_file, watcher lifecycle)
- [x] 08-02-PLAN.md -- Frontend: types, API, store, FileExplorer/FileTreeNode/ProjectTabBar components, CenterPanel wiring, live updates
- [x] 08-03-PLAN.md -- Checkpoint: full build verification + end-to-end human verification

### Phase 9: Embedded Terminal
**Goal**: Users can run commands in an embedded terminal without leaving Element
**Depends on**: Phase 7 (requires project directory linking)
**Requirements**: TERM-01, TERM-02, TERM-03
**Success Criteria** (what must be TRUE):
  1. User can open an embedded terminal in the workspace output panel
  2. Terminal automatically starts in the project's linked directory
  3. Terminal supports standard interaction: typing commands, copy/paste, scrollback, and resize
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md -- Backend PTY plugin, frontend dependencies, workspace store extension, useTerminal hook
- [x] 09-02-PLAN.md -- UI: TerminalTab, TerminalEmptyState, OutputDrawer integration, keyboard shortcut, checkpoint

### Phase 10: AI Project Onboarding
**Goal**: Users can set up new projects through an AI-guided conversation that generates a structured phase and task breakdown
**Depends on**: Phase 7 (requires phases schema and CRUD)
**Requirements**: AIOB-01, AIOB-02, AIOB-03, AIOB-04, AIAS-01
**Success Criteria** (what must be TRUE):
  1. User can enter project scope, goals, and constraints in a structured onboarding form
  2. AI asks clarifying questions to refine understanding of the project before generating a breakdown
  3. AI generates a set of phases and tasks based on the conversation
  4. User can review, edit, and confirm the AI-generated breakdown before it is saved to the project
  5. User can set the AI assistance mode per project (Track+Suggest, Track+Auto-execute, or On-demand)
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [x] 10-01-PLAN.md -- Backend: migration (008), onboarding model, project ai_mode, Tauri commands (skill file, watcher, batch save, settings), frontend types/API/store
- [x] 10-02-PLAN.md -- Frontend: npm deps, shadcn components, PlanWithAiButton, ScopeInputForm, OnboardingWaitingCard, AiModeSelect, ProjectDetail integration
- [x] 10-03-PLAN.md -- AiPlanReview component with DnD/inline edit, confirm/save, discard, end-to-end checkpoint

### Phase 11: Workspace Integration and AI Context
**Goal**: Users experience a unified project workspace with intelligent context switching and AI-driven progress awareness
**Depends on**: Phase 8, Phase 9, Phase 10 (requires file explorer, terminal, and AI mode)
**Requirements**: AIAS-02, AIAS-03
**Success Criteria** (what must be TRUE):
  1. When switching to a project, AI generates a "where was I?" summary of recent progress and next steps
  2. In Track+Suggest mode, AI surfaces relevant suggestions based on project progress
  3. Workspace assembles file explorer, terminal, phase overview, and task list into a cohesive project view with remembered layout
**Plans**: 4 plans
**UI hint**: yes

Plans:
- [ ] 11-00-PLAN.md -- Wave 0: Test stubs for workspace state, context slice, and UI components
- [ ] 11-01-PLAN.md -- Backend: Rust types, context aggregation, prompt builders, Tauri commands, frontend API bindings
- [ ] 11-02-PLAN.md -- Frontend state: per-project workspace store extension, context summary/suggestion slice
- [ ] 11-03-PLAN.md -- UI: ContextSummaryCard, AiSuggestionCard, ProjectDetail integration, checkpoint

## Progress

**Execution Order:**
Phases execute in numeric order: 6 -> 7 -> 8 -> 9 -> 10 -> 11
(Phases 8 and 9 both depend on Phase 7 but not on each other; sequential order is safer for solo development.)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Desktop Shell and Task Foundation | v1.0 | 3/3 | Complete | 2026-03-16 |
| 2. Task UI and Execution History | v1.0 | 6/6 | Complete | 2026-03-16 |
| 2.1 Daily UX Foundation | v1.0 | 4/4 | Complete | 2026-03-16 |
| 3. Workflows and Automation | v1.0 | 5/5 | Complete | 2026-03-17 |
| 4. Plugin System | v1.0 | 5/5 | Complete | 2026-03-18 |
| 5. AI and Smart Scheduling | v1.0 | 6/6 | Complete | 2026-03-19 |
| 6. Data Foundation and Theme System | v1.1 | 0/3 | Planned    |  |
| 7. Project Phases and Directory Linking | v1.1 | 0/3 | Planning complete | - |
| 8. File Explorer | v1.1 | 0/3 | Planned    |  |
| 9. Embedded Terminal | v1.1 | 0/2 | Planning complete | - |
| 10. AI Project Onboarding | v1.1 | 3/3 | Complete   | 2026-03-23 |
| 11. Workspace Integration and AI Context | v1.1 | 0/4 | Planning complete | - |

## Backlog

### Phase 999.1: Windows Cross-Platform Compatibility Fixes (BACKLOG)

**Goal:** Fix platform-specific code that prevents Windows usage. Critical: `engine/shell.rs` hardcodes `sh -c` (needs `cmd /C` on Windows). Medium: `SettingsPage.tsx` shortcut only checks `metaKey` (needs `ctrlKey` fallback), `filesystem.rs` uses `/dev/null` (needs `NUL` on Windows). Low: several test files use Unix-specific paths/commands needing conditional compilation.
**Requirements:** TBD
**Plans:** 3/3 plans complete

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.2: Wire Calendar Events to Smart Scheduler and OAuth Setup (BACKLOG)

**Goal:** Close two v1.0 tech debt items: (1) `scheduling_commands.rs:94-97` passes an empty `Vec<CalendarEvent>` to `find_open_blocks` -- replace with a query against `calendar_events` table so meetings are factored into scheduling. (2) Add runtime guard in `connect_google_calendar`/`connect_outlook_calendar` that detects placeholder OAuth client IDs and returns an actionable error, plus create `.env.example` and setup docs for registering Google/Microsoft OAuth apps.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.3: Plugin Skills and MCP Server Support (BACKLOG)

**Goal:** Extend the plugin system so plugins can expose skills (slash-command-like capabilities) and register MCP server connections, similar to Claude Code's skill/MCP architecture. Plugins would declare skills in their manifest that appear in the workflow step picker and UI command palette. MCP server plugins would provide tool access for AI-assisted task execution -- the AI gateway routes tool calls to the appropriate MCP server based on plugin registration.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

### Phase 999.4: GSD .planning/ Directory Sync (BACKLOG)

**Goal:** When a directory is linked to a project, scan for `.planning/ROADMAP.md` and parse existing phases/tasks into the Element database. File watcher on `.planning/` syncs updates as GSD executes phases (e.g., SUMMARY.md created → mark tasks complete). This would let users run `/gsd:new-project` in a linked directory and see the resulting phases and tasks visualized in the app.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
