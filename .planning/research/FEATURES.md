# Feature Research

**Domain:** Project management platform with AI-driven onboarding, embedded workspace, and theme system
**Researched:** 2026-03-22
**Confidence:** HIGH
**Scope:** v1.1 milestone features ONLY -- builds on existing v1.0 foundation

## Feature Landscape

### Table Stakes (Users Expect These)

Features users expect from any project management tool with these capabilities. Missing these makes the feature feel broken or incomplete.

#### Theme / Category System

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Create/rename/delete themes** | Basic CRUD. Every grouping system needs this. ClickUp has Spaces, Linear has Teams, Notion has top-level pages. Without CRUD, themes are decorative. | LOW | New `themes` table in SQLite |
| **Assign projects and standalone tasks to themes** | The whole point of themes is grouping. If things cannot be assigned, themes are empty containers. | LOW | FK from projects/tasks to themes, nullable for "uncategorized" |
| **Visual theme distinction (color/icon)** | Asana uses color-coded projects, Linear has team icons, ClickUp has Space colors. Without visual cues, themes are just text labels in a list. Users need to scan quickly. | LOW | Color and icon fields on theme entity. Small icon picker UI. |
| **Theme-based sidebar navigation** | Sidebar must group items by theme. Every project tool (Linear, Asana, ClickUp, Notion) organizes the sidebar by category/team/space. The current flat project list does not scale past 5 projects. | MEDIUM | Refactor Sidebar component. Collapsible theme sections. Theme ordering (drag or manual). |
| **Default/uncategorized bucket** | Users should not be forced to categorize everything up front. ClickUp has "Everything" view, Todoist has Inbox. Items without a theme must still be visible. | LOW | NULL theme_id = uncategorized. Render as "Inbox" or "Uncategorized" section. |

#### Project Entity (Directory-Linked)

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Link project to filesystem directory** | Core differentiator for developer-focused project management. VS Code, Cursor, Zed all revolve around a directory. Without this link, the "workspace" has no context. | LOW | `directory_path` column on projects table. Directory picker dialog via Tauri file dialog API. |
| **Project phases (ordered groupings of tasks)** | Every structured project tool has phases/milestones/sprints. Linear has Cycles, Asana has Sections, ClickUp has Lists. Phases give structure beyond a flat task list. | MEDIUM | New `phases` table (id, project_id, name, position, status). Tasks get optional `phase_id`. |
| **Phase-level progress tracking** | Users expect to see "Phase 2: 3/7 tasks done." Linear shows cycle progress, Asana shows section completion. Without this, phases are just labels. | LOW | Computed from task statuses within a phase. Progress bar component already exists (`ProgressBar.tsx`). |
| **Project status overview** | A project detail view showing overall health: total tasks, completion %, active phase, recent activity. Every PM tool has a project dashboard. The current ProjectDetail.tsx only shows name/description/count. | MEDIUM | Expand `ProjectDetail.tsx` with phase list, progress metrics, and recent activity. |
| **Task-project linking (tasks belong to projects or standalone)** | Current schema already has `project_id` on tasks. But tasks are always project-bound. Standalone tasks (in a theme but not a project) are needed for quick one-offs. | LOW | Make `project_id` nullable on tasks table. Already `NOT NULL` with FK -- migration needed. |

#### Embedded Terminal

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Terminal emulator in workspace panel** | VS Code, Cursor, Zed, Warp -- every developer tool has an integrated terminal. Without it, users alt-tab to a separate terminal app, losing context. | HIGH | xterm.js frontend + tauri-plugin-pty for PTY spawning. Significant integration work. |
| **Terminal opens in project directory** | If the terminal does not open in the project's linked directory, users have to `cd` every time. VS Code does this automatically. Table stakes for context-aware terminal. | LOW | Pass `directory_path` from project entity to PTY spawn. |
| **Multiple terminal sessions** | VS Code supports multiple terminals via tabs. Users expect to run a dev server in one terminal and git commands in another. Single-terminal is frustrating. | MEDIUM | Terminal tab management. Each tab owns a PTY instance. Tab create/close/switch UI. |
| **Copy/paste and scroll** | Basic terminal interaction. xterm.js handles this out of the box with clipboard addon and scrollback buffer. Missing this makes the terminal unusable. | LOW | xterm.js addons: clipboard, fit, weblinks. Standard configuration. |

#### File Explorer

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Directory tree view** | VS Code, Cursor, Zed, Finder -- file trees are universal. Without one, the project directory link is invisible to the user. | MEDIUM | Use tauri-plugin-fs to read directory. react-arborist for tree rendering. Virtualized for large directories. |
| **Open file in external editor** | Element is NOT an editor (key decision: "simplified workspace, external editing"). Double-click must open the file in the user's default editor or configured tool (VS Code, Cursor). | LOW | Tauri shell API `open()` or configurable editor command. |
| **File type icons** | Every file explorer shows icons by extension. Without them, the tree is a wall of identical text. Users rely on icons to scan quickly. | LOW | Icon mapping by file extension. Use a small icon set (VS Code Seti icons or similar). |
| **Ignore patterns (.gitignore, node_modules)** | Showing node_modules (100K+ files) kills performance and UX. VS Code hides these by default. Must respect .gitignore and allow custom exclusions. | MEDIUM | Parse .gitignore. Add default ignores (node_modules, .git, target, dist). |
| **File system watching for live updates** | If the user creates a file in their terminal, the explorer should update. VS Code does this. Stale file trees are confusing. | MEDIUM | tauri-plugin-fs `watch` feature with debounced refresh. |

### Differentiators (Competitive Advantage)

Features that make Element's v1.1 stand out. Not expected by every PM tool, but high value.

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| **AI-driven project onboarding** | No PM tool generates a full project breakdown from a conversation. Linear has AI triage, ClickUp has AI task descriptions, but none do interactive questioning to decompose scope into phases and tasks. The closest is ChatGPT project planning, but that lives outside the PM tool. Element does it in-context. | HIGH | Existing AI provider layer (streaming). New onboarding wizard UI. Structured entry fields (scope, goals, constraints, tech stack). AI multi-turn conversation to refine. Generated phases/tasks inserted into project. |
| **Per-project AI mode** | No PM tool lets users control AI involvement per-project. Element offers three modes: Track+Suggest (AI observes and suggests), Track+Auto-execute (AI acts autonomously), On-demand (AI only when asked). This is unique trust calibration. | MEDIUM | `ai_mode` field on project entity. Mode selector in project settings. Mode-aware AI behavior layer. The three modes determine when AI surfaces suggestions vs. acts. |
| **Context switching support** | When switching between projects, AI provides a "where was I?" summary. No PM tool does this. Users currently re-read docs or scroll through history to regain context. Element tracks progress breadcrumbs per project and generates a resume summary. | MEDIUM | Track last-active timestamps, recent task completions, and terminal history per project. AI generates a short context summary on project switch. Requires AI layer + per-project state tracking. |
| **Integrated workspace view** | Terminal + file explorer + task progress in one view, scoped to a project. VS Code has terminal + files but no task tracking. Linear has tasks but no terminal. Element combines both with project context. This is the "command center" for a project. | MEDIUM | Layout component combining file tree sidebar, terminal panel, and task/progress panel. Context-aware -- all panels scoped to the selected project. |
| **AI-generated phase/task decomposition** | During onboarding, AI breaks high-level goals into structured phases with ordered tasks. Not just a flat task list -- a phased roadmap with dependencies. This is what a senior PM does, automated. | HIGH | Part of onboarding flow. AI must understand project types (software, content, research). Output must conform to the phases/tasks schema. User reviews and edits before committing. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Built-in code editor** | "If I can see files, why not edit them?" Users see file explorer and expect editor. | Building a code editor is a multi-year effort. Monaco (VS Code's editor) is 2MB+ bundled. Syntax highlighting, language servers, extensions -- infinite scope. Element is a project orchestrator, not an IDE. | Open in external editor (VS Code, Cursor, Zed, vim). One click to open. Element knows which file, the editor handles editing. The key decision already says "simplified workspace -- file tree + terminal, external editing." |
| **Full Gantt chart / timeline view** | PM tools like MS Project and GanttProject have them. "Show me a timeline." | Gantt charts are complex to build (dependency lines, drag resize, zoom, critical path). They serve teams planning months-long projects with resource allocation. Element is a personal tool for individual developers. Phases with progress bars convey the same information with 5% of the complexity. | Phase list with progress bars. Each phase shows task count, completion %, and status. Simple, scannable, and sufficient for personal project management. |
| **Kanban board per project** | Trello/Linear/Notion all have Kanban views. "Show me columns: Todo, In Progress, Done." | Kanban adds a second view paradigm to maintain (list view + board view). For personal use with a single developer, the task list grouped by status or phase is equivalent. Kanban shines for team visibility, which Element does not need. | Task list with status-based grouping or filtering. The existing task list with status badges (pending, in-progress, complete, blocked) provides the same information in a denser format. |
| **Nested sub-projects** | "I want projects inside projects." Hierarchical project structures. | Recursive data structures complicate queries, UI rendering, and navigation. Two levels (theme > project) is sufficient. Three levels creates confusion about where things belong. | Themes contain projects. Projects contain phases. Phases contain tasks. Three levels of hierarchy is the sweet spot -- more than that and navigation becomes a chore. |
| **AI auto-creating tasks without review** | "Just let the AI add tasks directly." Skip the review step in onboarding. | Users lose trust when AI makes changes they did not approve. Phantom tasks appear, wrong priorities are set, scope creeps invisibly. The onboarding flow must have a human review gate. | AI generates a proposal. User reviews, edits, and confirms. The review step is where trust is built. Show the full breakdown before committing anything to the database. |
| **Template library for project types** | "Give me templates for React app, API service, marketing campaign." | Templates go stale, require maintenance, and rarely match the user's actual needs. They create a false sense of completeness. | AI onboarding replaces templates. Instead of picking a template, the user describes their project and AI generates a custom breakdown. This is strictly better than templates -- it is personalized, current, and adapts to context. |
| **Real-time file content preview** | "Show me the file contents in a preview pane." | Preview pane for code requires syntax highlighting, scroll sync, and large file handling. For images, PDF, markdown -- each format needs a renderer. Scope creep into editor territory. | File explorer shows names and types. Double-click opens in external editor. The terminal can `cat` or `less` files when needed. Keep Element focused on orchestration, not content viewing. |

## Feature Dependencies

```
[Theme System]
    |
    +--enables--> [Theme-based sidebar navigation]
    |
    +--enables--> [Assign projects to themes]
    |                  |
    |                  +--requires--> [Project entity exists (v1.0)]
    |
    +--enables--> [Standalone tasks in themes]
                       |
                       +--requires--> [Nullable project_id on tasks]

[Project Entity Enhancement]
    |
    +--requires--> [Project CRUD (v1.0, exists)]
    |
    +--adds------> [directory_path field]
    |                  |
    |                  +--enables--> [File Explorer]
    |                  |                  |
    |                  |                  +--requires--> [tauri-plugin-fs]
    |                  |
    |                  +--enables--> [Embedded Terminal (cwd)]
    |                                     |
    |                                     +--requires--> [tauri-plugin-pty + xterm.js]
    |
    +--adds------> [Phases table]
    |                  |
    |                  +--enables--> [Phase progress tracking]
    |                  |
    |                  +--enables--> [AI-generated phase decomposition]
    |
    +--adds------> [ai_mode field]
                       |
                       +--enables--> [Per-project AI behavior]

[AI-Driven Onboarding]
    |
    +--requires--> [AI provider layer (v1.0, exists)]
    |
    +--requires--> [Project entity with phases]
    |
    +--requires--> [Streaming AI responses (v1.0, exists)]
    |
    +--produces--> [Generated phases + tasks]

[Embedded Terminal]
    |
    +--requires--> [xterm.js + tauri-plugin-pty]
    |
    +--enhanced-by--> [Project directory_path (auto-cwd)]

[File Explorer]
    |
    +--requires--> [tauri-plugin-fs read_dir + watch]
    |
    +--requires--> [Project directory_path]
    |
    +--enhanced-by--> [.gitignore parsing]

[Context Switching]
    |
    +--requires--> [Per-project state tracking]
    |
    +--requires--> [AI provider layer (v1.0, exists)]
    |
    +--enhanced-by--> [Terminal history per project]
```

### Dependency Notes

- **Theme system is independent of workspace features:** Themes can be built first as a pure data/UI layer. No backend complexity beyond a new table and FK relationships.
- **Project directory_path unlocks both file explorer and terminal:** This single field is the gateway to the workspace. Without it, the workspace has no context. Must be added before either workspace feature.
- **AI onboarding requires phases to exist:** The onboarding flow generates phases and tasks. The phases table and task-phase linking must be built before the onboarding wizard can persist its output.
- **File explorer and terminal are independent of each other:** They can be built in parallel or in either order. Both depend on `directory_path` but not on each other.
- **Context switching is an enhancement layer:** It requires everything else to be built first (projects with phases, AI layer, terminal). It is the polish feature, not the foundation.

## MVP Definition

### Launch With (v1.1 Core)

Minimum features needed to call v1.1 "Project Manager" complete.

- [ ] **Theme CRUD with sidebar navigation** -- Users can create themes, assign projects to them, and navigate by theme in the sidebar. Without this, the organizational upgrade is invisible.
- [ ] **Project directory linking** -- Projects can be linked to a filesystem directory. This is the foundation for the entire workspace concept.
- [ ] **Project phases with task grouping** -- Phases give projects structure beyond a flat task list. Progress tracking per phase. This is what makes Element a project manager, not just a task list.
- [ ] **Standalone tasks (nullable project_id)** -- Tasks can exist in a theme without belonging to a project. Quick one-offs should not require creating a project.
- [ ] **File explorer (read-only tree view)** -- See the project's files in the workspace. Opens files in external editor. Respects .gitignore.
- [ ] **Embedded terminal** -- Terminal in the workspace panel, opens in project directory. At minimum one session.
- [ ] **AI-driven project onboarding** -- Structured entry + AI conversation generates phases and tasks. This is the headline differentiator for v1.1.

### Add After Validation (v1.1.x)

Features to add once the core workspace is working and usable.

- [ ] **Multiple terminal sessions** -- Trigger: user needs to run dev server AND run commands simultaneously
- [ ] **Per-project AI mode** -- Trigger: user has multiple projects with different AI trust levels
- [ ] **Context switching summaries** -- Trigger: user has 3+ active projects and loses context when switching
- [ ] **File system watching** -- Trigger: stale file tree becomes annoying when creating files via terminal
- [ ] **Phase reordering (drag-and-drop)** -- Trigger: user restructures a project and needs to move phases around

### Future Consideration (v2+)

- [ ] **AI progress reports per project** -- Generates a weekly summary of what was accomplished. Needs more project activity data to be useful.
- [ ] **Cross-project theme dashboards** -- Theme-level progress view aggregating all projects. Needs multiple real projects per theme to validate.
- [ ] **Terminal command history linked to tasks** -- Associates terminal commands with the task being worked on. Interesting for context switching but complex to implement.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Theme CRUD + sidebar refactor | HIGH | MEDIUM | P1 |
| Project directory linking | HIGH | LOW | P1 |
| Project phases + progress | HIGH | MEDIUM | P1 |
| Standalone tasks (nullable project_id) | MEDIUM | LOW | P1 |
| File explorer (tree view) | HIGH | MEDIUM | P1 |
| Embedded terminal (single session) | HIGH | HIGH | P1 |
| AI-driven project onboarding | HIGH | HIGH | P1 |
| Multiple terminal sessions | MEDIUM | MEDIUM | P2 |
| Per-project AI mode | MEDIUM | MEDIUM | P2 |
| Context switching summaries | MEDIUM | MEDIUM | P2 |
| File system watching | MEDIUM | LOW | P2 |
| Phase drag-and-drop reordering | LOW | LOW | P2 |
| AI progress reports | MEDIUM | MEDIUM | P3 |
| Theme dashboards | LOW | MEDIUM | P3 |
| Terminal-task command linking | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.1 launch -- themes, project enhancement, workspace (terminal + files), AI onboarding
- P2: Should have, add in v1.1.x patches -- multi-terminal, AI modes, context switching, file watching
- P3: Nice to have, defer to v1.2+ -- reports, dashboards, command linking

## Competitor Feature Analysis

| Feature | VS Code / Cursor | Linear | ClickUp | Notion | Element v1.1 Approach |
|---------|-----------------|--------|---------|--------|----------------------|
| Project organization | Workspaces (directory-based) | Teams + Projects | Spaces > Folders > Lists | Pages + Databases | Themes > Projects > Phases > Tasks |
| File explorer | Full tree view with search | None | None | None | Read-only tree, open in external editor |
| Embedded terminal | Full integrated terminal | None | None | None | xterm.js + tauri-plugin-pty, project-scoped |
| AI project setup | Copilot chat (no project generation) | AI triage + description | ClickUp Brain (descriptions) | Notion AI (content) | Interactive onboarding: structured entry + AI questioning generates phases/tasks |
| AI control per project | Global settings only | Global AI settings | Global AI settings | Global AI settings | Per-project AI mode (Track+Suggest, Track+Auto-execute, On-demand) |
| Category/theme system | None (workspace = 1 project) | Teams (multi-user) | Spaces (team-oriented) | Top-level pages | Themes as personal categories (Business, Dev, Personal) |
| Phase/milestone tracking | None | Cycles (time-boxed) | Lists with statuses | Databases with status | Named phases with ordered tasks and progress bars |
| Context switching | None built-in | None | None | None | AI-generated "where was I?" summary on project switch |

### Key Differentiation

Element v1.1 occupies a unique niche: **a personal project command center that combines the workspace awareness of an IDE (files + terminal) with the organizational structure of a PM tool (themes + projects + phases) and AI-driven setup that neither category offers.** No existing tool provides this combination:

- IDEs have workspace context but no project management structure
- PM tools have organizational hierarchy but no filesystem/terminal integration
- AI tools can plan projects but the output lives outside the PM system

## Sources

- [tauri-plugin-pty](https://crates.io/crates/tauri-plugin-pty) -- PTY plugin for Tauri terminal integration
- [tauri-terminal](https://github.com/marc2332/tauri-terminal) -- Reference implementation of terminal in Tauri
- [xterm.js](https://xtermjs.org/) -- Terminal emulator for web frontends
- [tauri-plugin-fs](https://v2.tauri.app/plugin/file-system/) -- File system access with watch support
- [react-arborist](https://github.com/brimdata/react-arborist) -- Tree view component for React (file explorer)
- [Linear AI](https://linear.app/ai) -- AI triage and workflow features in Linear
- [ClickUp Brain](https://clickup.com/p/features/ai/onboarding-document-generator) -- AI-generated onboarding documents
- [Warp Terminal](https://www.warp.dev/terminal) -- AI-powered terminal with project awareness

---
*Feature research for: Element v1.1 Project Manager milestone*
*Researched: 2026-03-22*
