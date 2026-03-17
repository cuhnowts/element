# Requirements: Element

**Defined:** 2026-03-15
**Core Value:** The workflow engine must reliably define, organize, schedule, and monitor tasks — everything else builds on top of it.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Task Management

- [x] **TASK-01**: User can create tasks with title, description, and context
- [x] **TASK-02**: User can organize tasks by project, type, priority, or custom tags
- [x] **TASK-03**: User can track task status (pending, in-progress, complete, blocked)
- [x] **TASK-04**: User can view task execution history and outcomes
- [x] **TASK-05**: User can define multi-step task workflows with execution diagrams
- [x] **TASK-06**: User can assign agents/tools/skills to task steps

### Automation

- [x] **AUTO-01**: User can schedule recurring tasks on cron schedules
- [x] **AUTO-02**: User can promote a manual task to an automated workflow
- [ ] **AUTO-03**: User can execute shell commands and CLI tools from tasks
- [ ] **AUTO-04**: User can make HTTP/API calls as task steps

### Desktop UI

- [x] **UI-01**: App displays calendar view toggle in top-left panel
- [x] **UI-02**: App displays today's tasks/workflows below calendar
- [x] **UI-03**: Central panel shows task context and execution diagram
- [x] **UI-04**: Central panel shows assigned agents, skills, and tools
- [x] **UI-05**: Output panel displays task execution logs and results
- [x] **UI-06**: App has native desktop feel (macOS primary, menus, shortcuts)

### AI Integration

- [ ] **AI-01**: App supports model-agnostic AI layer (Claude, GPT, local models)
- [ ] **AI-02**: AI assists task creation (suggests structure, steps, context)

### Plugins & Integrations

- [ ] **PLUG-01**: User can add plugins by dropping files into a directory
- [ ] **PLUG-02**: App securely stores credentials (API keys, tokens, secrets)
- [ ] **PLUG-03**: Core plugins: shell command, HTTP request, file system operations
- [ ] **PLUG-04**: Calendar integration plugin reads Google/Outlook events

### Scheduling

- [ ] **SCHED-01**: App auto-fills open time blocks with work sessions around meetings
- [ ] **SCHED-02**: App assigns tasks to work sessions based on priority

### Data & Storage

- [x] **DATA-01**: App metadata stored locally in SQLite (task state, execution history, credentials, preferences, calendar cache)
- [x] **DATA-02**: Workflow definitions stored as structured files (YAML/JSON)
- [x] **DATA-03**: Project work lives in external repos — Element orchestrates, doesn't store project files

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Intelligence

- **INTEL-01**: Pulse system ingests calendar/email signals into structured daily briefing
- **INTEL-02**: Memory system learns user preferences, habits, and patterns over time
- **INTEL-03**: Pattern detection suggests automations from repeated manual tasks
- **INTEL-04**: Reporting pipelines (news, spending, analytics) on cron schedules

### Platform

- **PLAT-01**: Windows support
- **PLAT-02**: Plugin marketplace with paid workflow plugins
- **PLAT-03**: Workflow import/export for sharing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full node-graph visual editor | Structured list covers 90% of use cases at 20% engineering cost |
| Built-in work execution runtime | Element orchestrates, external tools execute |
| Mobile app | Desktop-first, mobile notifications via existing channels |
| Real-time collaboration | Personal work OS is personal — single-user v1 |
| Built-in calendar/email clients | Ingest signals via plugins, don't replicate source apps |
| Chat-based workflow generation | AI assists, user builds — workflow defs must be human-readable |
| No-code for everything | Code-first with good GUI — target is developers and power users |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TASK-01 | Phase 1 | Complete |
| TASK-02 | Phase 1 | Complete |
| TASK-03 | Phase 1 | Complete |
| TASK-04 | Phase 2 | Complete |
| TASK-05 | Phase 3 | Complete |
| TASK-06 | Phase 3 | Complete |
| AUTO-01 | Phase 3 | Complete |
| AUTO-02 | Phase 3 | Complete |
| AUTO-03 | Phase 3 | Pending |
| AUTO-04 | Phase 3 | Pending |
| UI-01 | Phase 2 | Complete |
| UI-02 | Phase 2 | Complete |
| UI-03 | Phase 2 | Complete |
| UI-04 | Phase 2 | Complete |
| UI-05 | Phase 2 | Complete |
| UI-06 | Phase 1 | Complete |
| AI-01 | Phase 5 | Pending |
| AI-02 | Phase 5 | Pending |
| PLUG-01 | Phase 4 | Pending |
| PLUG-02 | Phase 4 | Pending |
| PLUG-03 | Phase 4 | Pending |
| PLUG-04 | Phase 4 | Pending |
| SCHED-01 | Phase 5 | Pending |
| SCHED-02 | Phase 5 | Pending |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-15*
*Last updated: 2026-03-15 after roadmap creation*
