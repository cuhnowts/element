# Roadmap: Element

## Overview

Element is built from the ground up as a desktop task orchestration platform. The roadmap moves from a working desktop shell with local data persistence, through core task management and multi-panel UI, into multi-step workflow composition and automation, then plugin extensibility, and finally AI-powered intelligence and smart scheduling. Each phase delivers a complete, usable capability layer that the next phase builds upon.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Desktop Shell and Task Foundation** - Native app with local data storage and basic task CRUD
- [ ] **Phase 2: Task UI and Execution History** - Multi-panel layout with calendar view, task context, and output logs
- [ ] **Phase 3: Workflows and Automation** - Multi-step task workflows with scheduling and shell/HTTP execution
- [ ] **Phase 4: Plugin System** - File-drop plugins, credential management, and core connectors
- [ ] **Phase 5: AI and Smart Scheduling** - Model-agnostic AI assistance and intelligent time-block scheduling

## Phase Details

### Phase 1: Desktop Shell and Task Foundation
**Goal**: User can launch a native desktop app, create and organize tasks, and all data persists locally
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, UI-06, TASK-01, TASK-02, TASK-03
**Success Criteria** (what must be TRUE):
  1. User can launch the app and it feels like a native desktop application (menus, shortcuts, system tray)
  2. User can create a task with title, description, and context
  3. User can organize tasks by project, type, priority, or custom tags
  4. User can change task status (pending, in-progress, complete, blocked) and see it reflected immediately
  5. App data persists across restarts in local SQLite; workflow definitions are stored as structured files
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold Tauri project, SQLite data layer, Rust models, workflow file I/O
- [ ] 01-02-PLAN.md — Tauri CRUD commands, desktop shell (menus, tray, event emission)
- [ ] 01-03-PLAN.md — React UI (sidebar, task detail, stores, keyboard shortcuts, dark/light mode)

### Phase 2: Task UI and Execution History
**Goal**: User has a full multi-panel workspace showing calendar, today's tasks, task details, and execution output
**Depends on**: Phase 1
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, TASK-04
**Success Criteria** (what must be TRUE):
  1. User can toggle a calendar view in the top-left panel to see time-based task layout
  2. User can see today's tasks and workflows listed below the calendar
  3. User can select a task and see its full context and execution diagram in the central panel
  4. User can see assigned agents, skills, and tools for any task in the central panel
  5. User can view task execution history, logs, and results in the output panel
**Plans**: 4 plans

Plans:
- [ ] 02-00-PLAN.md — Wave 0: Vitest setup, Tauri mocks, test stubs for all requirements
- [ ] 02-01-PLAN.md — Layout shell, stores, types, hooks, and shared components
- [ ] 02-02-PLAN.md — Left sidebar: calendar toggle, mini calendar, task list, workflow list
- [ ] 02-03-PLAN.md — Center panel: task detail, execution diagram, output drawer with log viewer

### Phase 3: Workflows and Automation
**Goal**: User can compose multi-step task workflows, schedule them on cron, and execute shell commands and HTTP calls as steps
**Depends on**: Phase 2
**Requirements**: TASK-05, TASK-06, AUTO-01, AUTO-02, AUTO-03, AUTO-04
**Success Criteria** (what must be TRUE):
  1. User can define a multi-step task workflow with an execution diagram showing step order and flow
  2. User can assign agents, tools, or skills to individual workflow steps
  3. User can schedule any task or workflow to run on a recurring cron schedule
  4. User can promote a manual task into an automated workflow with one action
  5. User can add shell command and HTTP/API call steps that execute and return results
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Plugin System
**Goal**: User can extend Element with file-drop plugins, securely store credentials, and use core connectors for shell, HTTP, file system, and calendar
**Depends on**: Phase 3
**Requirements**: PLUG-01, PLUG-02, PLUG-03, PLUG-04
**Success Criteria** (what must be TRUE):
  1. User can install a plugin by dropping files into the plugins directory and it appears in the app
  2. User can securely store and manage API keys, tokens, and secrets within the app
  3. Core plugins (shell command, HTTP request, file system operations) are available out of the box as workflow steps
  4. User can connect a Google or Outlook calendar and see events pulled into Element
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: AI and Smart Scheduling
**Goal**: User has AI-assisted task creation and intelligent scheduling that fills open time blocks with prioritized work
**Depends on**: Phase 4
**Requirements**: AI-01, AI-02, SCHED-01, SCHED-02
**Success Criteria** (what must be TRUE):
  1. User can configure AI providers (Claude, GPT, or local models) and switch between them
  2. AI suggests task structure, steps, and context when the user creates or edits a task
  3. App automatically identifies open time blocks around calendar meetings and suggests work sessions
  4. App assigns tasks to suggested work sessions based on priority, with user override
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Desktop Shell and Task Foundation | 1/3 | In Progress|  |
| 2. Task UI and Execution History | 0/4 | Not started | - |
| 3. Workflows and Automation | 0/3 | Not started | - |
| 4. Plugin System | 0/2 | Not started | - |
| 5. AI and Smart Scheduling | 0/2 | Not started | - |
