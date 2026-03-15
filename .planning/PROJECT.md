# Element

## What This Is

Element is a desktop workflow orchestration platform — a personal work OS that ingests signals (calendar, email, tasks), structures them into organized workflows, and learns user behavior over time. It's the brain that decides what needs to happen, when, and tracks outcomes — while actual work execution happens through external tools (Claude Code, CLIs, agents).

## Core Value

The workflow engine must reliably define, organize, schedule, and monitor workflows — everything else (Pulse, reporting, memory) builds on top of it.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Workflow engine: define, run, monitor, and compose workflows
- [ ] Structured list-based workflow editor (step-by-step builder)
- [ ] Plugin system: local file drop-in workflow packages
- [ ] Pulse system: ingest calendar/email signals into structured daily work
- [ ] Reporting pipelines on cron schedules (news, spending, analytics)
- [ ] Ad-hoc workflow creation with pattern detection for automation suggestions
- [ ] Memory system: full context model that learns user preferences, habits, and patterns
- [ ] Model-agnostic AI layer (Claude, GPT, local models)
- [ ] Code + GUI workflow definition (developers write code, GUI for visual building)
- [ ] Daily briefing: wake up to a structured workday ready to go
- [ ] Status panel, output panel, and tools panel in the UI
- [ ] CRON-scheduled report delivery

### Out of Scope

- Full node-graph visual editor — structured list approach instead, simpler and more focused
- Built-in work execution runtime — Element orchestrates, external tools execute
- Mobile app — desktop first (macOS primary, Windows secondary)
- Real-time collaboration — single-user focus for v1

## Context

- The creator develops on macOS but also needs Windows support for work
- Comparable to n8n conceptually but AI-native and focused on personal work orchestration
- Execution model inspired by BSD-style piping: workflows compose by passing documents between stages
- The app should feel like Discord or Outlook — a native desktop experience, not a web page
- C# was considered but the best tech stack should be determined by research
- Business model: open source core + paid workflow plugins (marketplace)
- Signals to ingest are flexible/plugin-based — Outlook calendar, Gmail, Slack, GitHub, etc.
- Data is local-first — user owns all their data, stored on device

## Constraints

- **Platform**: macOS primary, Windows secondary — must be cross-platform desktop
- **Data**: Local-first storage — no cloud dependency for core functionality
- **AI**: Model-agnostic — must abstract AI layer to support multiple providers
- **Plugins**: File-based plugin system — drop workflow files into a directory
- **Business**: Open source core — architecture must support paid plugin ecosystem

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Structured list over node graph | Simpler, more focused UX — not building a visual programming tool | — Pending |
| Local-first data | User data sovereignty, no cloud dependency | — Pending |
| Model-agnostic AI layer | Avoid vendor lock-in, let users choose their AI provider | — Pending |
| Workflow engine as core (not Pulse) | Everything else depends on the engine working — it's the foundation | — Pending |
| Desktop app (not web) | Native experience like Discord/Outlook, local-first aligns with desktop | — Pending |
| Open source + paid plugins | Community builds the ecosystem, revenue from premium workflows | — Pending |
| Code + GUI workflow definition | Power users write code, others use the GUI builder | — Pending |

---
*Last updated: 2026-03-15 after initialization*
