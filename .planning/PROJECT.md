# Element

## What This Is

Element is a desktop workflow orchestration platform — a personal work OS that ingests signals (calendar, email, tasks), structures them into organized workflows, and learns user behavior over time. Built with Tauri 2.x (Rust backend) + React 19 (TypeScript frontend) + SQLite (local-first storage), it orchestrates work through external tools (Claude Code, CLIs, agents) rather than executing it directly.

## Core Value

The workflow engine must reliably define, organize, schedule, and monitor workflows — everything else (Pulse, reporting, memory) builds on top of it.

## Current Milestone: v1.2 Intelligent Planning

**Goal:** Two-mode AI assistant — a planning mode that scales from quick todos to full GSD breakdowns, and an execution mode that answers "what's next?" based on current project state.

**Target features:**
- Planning decision tree — first-time "Open AI" detects no plan, asks complexity tier, runs appropriate flow
- Quick tier — AI generates flat todo list from brief description (same-week work)
- Medium tier — AI asks focused questions, generates phases + tasks (multi-week projects)
- GSD tier — AI runs full GSD workflow with research, milestones, phases (complex long-running projects)
- "What's next?" mode — once planned, AI seeds current progress and guides execution
- `.planning/` folder sync — reads ROADMAP.md into database, file watcher syncs as GSD executes
- Configurable CLI tool — Settings UI for the terminal command
- Smart context file — adapts markdown based on project state and mode

## Current State

**Shipped:** v1.1 Project Manager (2026-03-25)
**Codebase:** ~164K LOC across 137+ files (Rust + TypeScript)
**Tech stack:** Tauri 2.x, React 19, SQLite, Zustand, shadcn/ui, Tailwind CSS, xterm.js, tauri-plugin-pty, reqwest, tokio, keyring

v1.0 delivered: task/project CRUD, multi-panel workspace, time-aware today view, global-hotkey quick-capture, multi-step workflows with cron scheduling, plugin system with credential vault, calendar integration (Google/Outlook OAuth), model-agnostic AI assistance, and intelligent time-block scheduling.

v1.1 delivered: theme system with DnD reorder, project phases with directory linking, file explorer with live updates and gitignore filtering, embedded PTY terminal, AI plan review with inline editing, "Open AI" button that seeds full project context into terminal, and per-project workspace state restore.

v1.2 progress: Phase 14 complete — users now choose Quick/Medium/GSD tier before first AI session. TierSelectionDialog gates "Open AI" for new projects. Quick tier creates flat tasks without phases. Backend generates tier-appropriate context files with execution mode. D-07: context file regenerates to "What's Next?" after plan confirmation.

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

### Active

- [ ] Scalable planning decision tree (Quick/Medium/GSD tiers)
- [ ] "What's next?" execution mode with progress-aware context
- [ ] `.planning/` folder sync into Element database
- [ ] Configurable CLI tool setting in Settings UI
- ✓ Smart context file adapting to project state and mode — Phase 13

### Future

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
| Hardcoded claude CLI | Use `claude --dangerously-skip-permissions` for now, configurable later | ⚠️ Revisit — add settings UI |

## Known Tech Debt

- Calendar events not wired to scheduler (`scheduling_commands.rs:94-97` passes empty vec)
- OAuth placeholder client IDs need runtime guard or setup documentation
- Phase 2 sidebar removed ProjectList — projects not loaded on startup
- File > New Task menu event handler is empty (Cmd+N works)
- 3 pre-existing TS errors in ThemeSidebar.tsx and UncategorizedSection.tsx (runtime unaffected)
- Orphaned files: ScopeInputForm.tsx, OnboardingWaitingCard.tsx (zero importers after Phase 11)
- CLI tool hardcoded to `claude --dangerously-skip-permissions` (needs configurable setting)

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
*Last updated: 2026-03-27 after Phase 13 completion*
