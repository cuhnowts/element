# Element

## What This Is

Element is a desktop project management platform with an AI-first approach — it structures work into themes, projects, phases, and tasks, then orchestrates execution through external AI tools (Claude Code, CLIs, agents). A central AI agent manages across all projects: planning at the right complexity level, auto-executing what it can, and notifying the user when human input is needed. Built with Tauri 2.x (Rust backend) + React 19 (TypeScript frontend) + SQLite (local-first storage).

## Core Value

The AI agent must reliably orchestrate project work — planning, executing, and monitoring across all projects so the user focuses on decisions, not mechanics.

## Current Milestone: v1.4 Daily Hub

**Goal:** Replace the existing TodayView with an AI-powered daily hub that greets the user, summarizes priorities across all projects, and provides a conversational interface to the central orchestrator.

**Target features:**
- Hub UI — 3-column layout (goals tree, AI briefing + chat, calendar placeholder)
- AI daily briefing — LLM-generated summary of today's focus across all projects
- Hub chat — conversational input to the orchestrator (separate from agent panel)
- Bot skills — extend orchestrator tools to run commands, create files, and access all app entities
- Central context manifest — auto-generated high-level project status file that feeds the orchestrator efficiently

## Current State

**Shipped:** v1.2 Intelligent Planning (2026-03-28)
**Codebase:** ~170K LOC across 200+ files (Rust + TypeScript)
**Tech stack:** Tauri 2.x, React 19, SQLite, Zustand, shadcn/ui, Tailwind CSS, xterm.js, tauri-plugin-pty, reqwest, tokio, keyring

v1.0 delivered: task/project CRUD, multi-panel workspace, time-aware today view, global-hotkey quick-capture, multi-step workflows with cron scheduling, plugin system with credential vault, calendar integration (Google/Outlook OAuth), model-agnostic AI assistance, and intelligent time-block scheduling.

v1.1 delivered: theme system with DnD reorder, project phases with directory linking, file explorer with live updates and gitignore filtering, embedded PTY terminal, AI plan review with inline editing, "Open AI" button that seeds full project context into terminal, and per-project workspace state restore.

v1.2 delivered: Tiered AI planning (Quick/Medium/GSD), adaptive context builder with token budgets, configurable CLI tool, .planning/ folder sync with live file watcher, and AI product orientation context. Projects auto-detect GSD when directory is linked.

v1.3 Phase 17 complete: Zero TypeScript compiler errors, orphaned files removed, Open AI navigation bug fixed (startPlanWatcher error handling with toast).

v1.3 Phase 18 complete: Sidebar left-click navigates directly, theme sections collapse with persistence, terminal is default drawer tab, AI button state machine with dynamic labels ("Plan Project"/"Check Progress"/"Open AI"), DirectoryLink on same row as AI button, task detail simplified with accordion sections.

v1.3 Phase 19 complete: Multi-terminal sessions with per-project isolation, named tabs (SessionTabBar), mount-all/show-one rendering for scroll preservation, graceful PTY cleanup (SIGTERM+3s+SIGKILL), refresh AI context dialog, sidebar session indicator, app-quit cleanup hook.

v1.4 Phase 22 complete: Hub shell with 3-column resizable layout (goals tree, center, calendar), explicit activeView state machine replacing cascading if/else routing, HomeButton for hub navigation, collapsible goals tree with project/phase hierarchy and progress dots, chores section with standalone task checkboxes.

v1.4 Phase 25 complete: Bot skills — action registry (9 skills), shell allowlist with injection prevention, MCP write tools (8 handlers for tasks/projects/themes/files), AI gateway tool_use support (Anthropic + OpenAI), hub chat action dispatch with confirmation UI, Tauri shell execution with allowlist enforcement, shell output block, and allowlist settings.

## Requirements

### Validated

- ✓ Workflow engine: define, run, monitor, and compose workflows — v1.0
- ✓ Structured list-based workflow editor (step-by-step builder) — v1.0
- ✓ Plugin system: local file drop-in workflow packages — v1.0
- ✓ Model-agnostic AI layer (Claude, GPT, local models) — v1.0
- ✓ Status panel, output panel, and tools panel in the UI — v1.0
- ✓ CRON-scheduled report delivery — v1.0
- ✓ Theme system: top-level categories organizing projects and standalone tasks — v1.1
- ✓ Project entity: directory-linked projects with phases, tasks, and progress tracking — v1.1
- ✓ AI project onboarding: AI generates phases/tasks, user reviews with inline editing — v1.1
- ✓ Project workspace: file tree with gitignore, live updates, external editor launch — v1.1
- ✓ Project workspace: embedded PTY terminal with project-aware CWD — v1.1
- ✓ Task-project linking: tasks belong to projects or standalone within themes — v1.1
- ✓ "Open AI" button: one-click context seeding into terminal with project state — v1.1
- ✓ Per-project workspace state: center tab and drawer state restore on switch — v1.1
- ✓ Configurable CLI tool with pre-flight validation — v1.2
- ✓ Tiered AI planning: Quick (flat tasks), Medium (phases), GSD (full workflow) — v1.2
- ✓ Adaptive context builder: state-aware, tier-aware, token-budgeted — v1.2
- ✓ "What's next?" execution mode with progress and blockers — v1.2
- ✓ .planning/ folder sync: ROADMAP.md parsing, live file watcher, auto-sync on link — v1.2
- ✓ AI product orientation in context file — v1.2
- ✓ Tech debt cleanup: zero TS errors, orphaned files removed, Open AI navigation bug fixed — v1.3
- ✓ UI polish: sidebar direct nav, collapsible themes, smart AI button, task accordion — v1.3
- ✓ Multi-terminal sessions with per-project isolation — v1.3
- ✓ Notification system: SQLite persistence, OS-native, Sonner toasts — v1.3
- ✓ MCP server sidecar with 10 tools and file-based agent queue — v1.3
- ✓ Agent lifecycle, panel UI, and bidirectional queue watcher — v1.3

### Active

- [ ] Hub UI — 3-column layout replacing TodayView (goals tree, AI briefing + chat, calendar placeholder)
- [ ] AI daily briefing — LLM-generated summary aggregating all project priorities
- [ ] Hub chat — conversational interface to the central orchestrator
- ✓ Bot skills — orchestrator tools for commands, file creation, and full app entity access — v1.4
- [ ] Central context manifest — auto-generated project status file for orchestrator consumption

### Future

- [ ] Hub calendar view — gantt or outlook-style day view with bot-created blocks
- [ ] Hub calendar integration — Google/Outlook calendar data in hub view
- [ ] Hub email signal ingestion — email context fed into daily briefing
- [ ] Hub urgency scoring — AI-driven priority scoring for tasks and projects
- [ ] Pulse system: ingest calendar/email signals into structured daily work
- [ ] Reporting pipelines on cron schedules (news, spending, analytics)
- [ ] Ad-hoc workflow creation with pattern detection for automation suggestions
- [ ] Memory system: full context model that learns user preferences, habits, and patterns
- [ ] Code + GUI workflow definition (developers write code, GUI for visual building)
- [ ] Daily briefing: wake up to a structured workday ready to go
- [ ] Calendar events wired to smart scheduler
- [ ] Windows support
- [ ] Plugin marketplace with paid workflow plugins

### Out of Scope

- Full node-graph visual editor — structured list covers 90% of use cases at 20% engineering cost
- Built-in work execution runtime — Element orchestrates, external tools execute
- Mobile app — desktop-first, mobile notifications via existing channels
- Real-time collaboration — personal work OS is personal, single-user focus
- Built-in calendar/email clients — ingest signals via plugins, don't replicate source apps

## Context

- The creator develops on macOS but also needs Windows support for work
- Comparable to n8n conceptually but AI-native and focused on personal work orchestration
- Execution model inspired by BSD-style piping: workflows compose by passing documents between stages
- The app should feel like Discord or Outlook — a native desktop experience, not a web page
- Business model: open source core + paid workflow plugins (marketplace)
- Signals to ingest are flexible/plugin-based — Outlook calendar, Gmail, Slack, GitHub, etc.
- Data is local-first — user owns all their data, stored on device
- v1.0 shipped in 7 days with 155 commits across 6 phases
- v1.1 shipped in 10 days with 6 phases, 17 plans, +16.7K lines across 137 files

## Constraints

- **Platform**: macOS primary, Windows secondary — must be cross-platform desktop
- **Data**: Local-first storage — no cloud dependency for core functionality
- **AI**: Model-agnostic — must abstract AI layer to support multiple providers
- **Plugins**: File-based plugin system — drop workflow files into a directory
- **Business**: Open source core — architecture must support paid plugin ecosystem

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Structured list over node graph | Simpler, more focused UX — not building a visual programming tool | ✓ Good — WorkflowBuilder works well |
| Local-first data | User data sovereignty, no cloud dependency | ✓ Good — SQLite performs well |
| Model-agnostic AI layer | Avoid vendor lock-in, let users choose their AI provider | ✓ Good — 4 providers implemented |
| Workflow engine as core (not Pulse) | Everything else depends on the engine working — it's the foundation | ✓ Good — engine is solid |
| Desktop app (not web) | Native experience like Discord/Outlook, local-first aligns with desktop | ✓ Good — Tauri delivers |
| Open source + paid plugins | Community builds the ecosystem, revenue from premium workflows | — Pending |
| Code + GUI workflow definition | Power users write code, others use the GUI builder | — Pending |
| Tauri 2.x + Rust + React 19 | Research recommended for cross-platform native desktop | ✓ Good |
| JSON over YAML for workflows | serde-yaml deprecated; serde_json is stable | ✓ Good |
| Arc<Mutex<Database>> for async | Required for tokio::spawn in workflow execution | ✓ Good |
| SecretStore trait for keychain | KeychainStore for prod, InMemoryStore for tests | ✓ Good |
| OAuth client IDs via option_env! | Users supply their own OAuth apps | ⚠️ Revisit — needs better UX |
| Themes as top-level categories | Projects and tasks organized under user-defined themes (Business, Dev, Personal) | ✓ Good — sidebar grouping works well |
| Per-project AI mode removed | Replaced with simpler "Open AI" button — user controls when to invoke AI | ✓ Good — less ceremony |
| Simplified workspace (not full IDE) | File tree + terminal, external editing — 90% value at 20% cost | ✓ Good — file tree + terminal delivered |
| AI-driven project onboarding | Structured entry fields + AI questioning for project breakdown | ✓ Good — AiPlanReview with DnD |
| Hardcoded claude CLI | Use `claude --dangerously-skip-permissions` for now, configurable later | ✓ Resolved — Phase 12 added settings UI, Phase 16 wires it into context |
| Tiered planning over one-size-fits-all | Quick for same-week, Medium for multi-week, GSD for complex | ✓ Good — scales to project complexity |
| One-way .planning/ sync | Disk → DB only, bidirectional deferred | ✓ Good — avoids sync conflicts |
| Auto-detect GSD on directory link | If .planning/ROADMAP.md exists, auto-sync and set GSD tier | ✓ Good — seamless onboarding |

## Known Tech Debt

- Calendar events not wired to scheduler (`scheduling_commands.rs:94-97` passes empty vec)
- OAuth placeholder client IDs need runtime guard or setup documentation
- Phase 2 sidebar removed ProjectList — projects not loaded on startup
- File > New Task menu event handler is empty (Cmd+N works)
- 3 pre-existing TS errors in ThemeSidebar.tsx and UncategorizedSection.tsx (runtime unaffected)
- Orphaned files: ScopeInputForm.tsx, OnboardingWaitingCard.tsx (zero importers after Phase 11)
- ~~CLI tool hardcoded~~ — resolved in v1.2
- Single terminal session kills previous on "Open AI" (v1.3 Phase 19)
- Terminal not scoped per-project (v1.3 Phase 19)
- Central AI agent concept: persistent orchestrator that manages across all projects, feeds context to project AI sessions, auto-executes safe actions, notifies for human input (v1.3 Phase 21)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-01 after Phase 22 hub-shell-and-goals-tree complete*
