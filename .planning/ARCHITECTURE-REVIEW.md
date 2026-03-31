
# Architecture Review: Element

**Reviewed:** 2026-03-16
**Reviewer:** External (Claude Cowork session)
**Scope:** Full codebase review against stated goal: daily work organizer with AI-powered scheduling
**Status:** Advisory — proposed changes to PROJECT.md, REQUIREMENTS.md, ROADMAP.md

---

## Summary

Element has a strong foundation (Phases 1-2 complete). The Tauri + Rust + React stack is the right choice, the IPC patterns are clean, and the SQLite local-first model is solid. However, the current roadmap is optimized for building an **automation platform** (n8n-style workflow pipelines) when the stated need is a **daily work organizer with intelligent scheduling**. The following proposals realign the roadmap to ship a usable daily organizer faster, then layer automation on top.

---

## Proposed Changes

### 1. PROJECT.md — New Requirements (Active)

Add to **Active** requirements list:

```
- [ ] Quick-capture: global hotkey opens minimal input for instant task creation (< 2 seconds)
- [ ] Today view: primary screen showing time-blocked schedule with tasks ordered by priority and time
- [ ] Task duration: estimated_minutes, scheduled_start, scheduled_end on every task
- [ ] Recurring tasks: repeating task definitions (daily standup, weekly review) independent of workflow cron
- [ ] Calendar integration (read-only): pull meetings from Google/Outlook to know when user is free
- [ ] AI provider trait: simple model-agnostic interface brought forward from Phase 5
```

### 2. PROJECT.md — New Key Decisions

Add to **Key Decisions** table:

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Quick-capture as first-class feature | If task entry takes > 2 seconds, adoption drops to zero — Raycast/Alfred-style UX | Proposed |
| Today view as default screen | Daily organizer lives or dies by the "what do I do next?" view | Proposed |
| Task duration fields on schema now | Can't build scheduling engine without time estimates — schema change before Phase 3 | Proposed |
| Recurring tasks separate from workflow cron | "Standup every morning" is not a workflow — it's a repeating task | Proposed |
| Pull AI provider forward to Phase 3 | AI is the differentiator — waiting until Phase 5 means 60% of dev without the core value prop | Proposed |
| Calendar read before write | Read-only iCal/CalDAV import first — OAuth for Google/Outlook can wait for plugins | Proposed |

### 3. REQUIREMENTS.md — New v1 Requirements

Add new requirement group:

```markdown
### Daily Planning

- [ ] **PLAN-01**: User can capture a task in < 2 seconds via global hotkey (quick-capture)
- [ ] **PLAN-02**: App displays a "Today" view as the default screen with time-blocked schedule
- [ ] **PLAN-03**: User can set estimated duration (minutes) on any task
- [ ] **PLAN-04**: User can set scheduled_start and scheduled_end on any task
- [ ] **PLAN-05**: User can define recurring tasks with repeat rules (daily, weekdays, weekly, monthly, custom)
- [ ] **PLAN-06**: App displays calendar events (read-only) from iCal/CalDAV sources alongside tasks
```

Update **Traceability** table — these map to a new Phase 2.5 (see below).

### 4. ROADMAP.md — Proposed Phase Insertion

Insert **Phase 2.5** (decimal phase per GSD convention for urgent insertions):

```markdown
- [ ] **Phase 2.5: Daily Planning Foundation** — INSERTED — Quick-capture, today view, task scheduling fields, recurring tasks, calendar read
```

#### Phase 2.5: Daily Planning Foundation
**Goal**: User has a functional daily planner — quick task capture, time-blocked today view, recurring tasks, and calendar awareness
**Depends on**: Phase 2
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06
**Success Criteria** (what must be TRUE):
  1. User can press a global hotkey, type a task title, hit enter, and see it appear in today's list (< 2 seconds)
  2. Default app screen shows today's tasks in time-block order with duration bars
  3. User can drag tasks to reschedule them within the today view
  4. User can create a recurring task that auto-generates instances (daily, weekdays, weekly, monthly)
  5. User can add an iCal URL and see external calendar events rendered alongside tasks in the today view
**Plans**: 4 plans

Plans:
- [ ] 02.5-01-PLAN.md — Schema migration: add estimated_minutes, scheduled_start, scheduled_end to tasks table; add recurrence_rules table; add calendar_sources and calendar_events tables; Tauri CRUD commands for new fields
- [ ] 02.5-02-PLAN.md — Quick-capture UI: global hotkey listener, floating input window (Tauri webview), minimal form (title + optional duration), keyboard-driven (enter to save, escape to dismiss)
- [ ] 02.5-03-PLAN.md — Today view: replace WelcomeDashboard as default, time-block layout, task cards with duration bars, drag-to-reschedule, recurring task instance generation
- [ ] 02.5-04-PLAN.md — Calendar read: iCal/CalDAV parser in Rust, calendar_sources CRUD, periodic sync, render events as read-only blocks in today view

#### Revised Phase 3: Workflows and Automation
No changes to Phase 3 scope — but it now depends on Phase 2.5 instead of Phase 2. The scheduling fields from 2.5 feed into workflow scheduling (cron uses the same calendar awareness).

#### Revised Phase 5: AI and Smart Scheduling
Pull **AI provider trait + basic integration** into Phase 3 as Plan 03-00 (wave 0):

```markdown
- [ ] 03-00-PLAN.md — AI provider trait: AiProvider trait in Rust, OpenAI-compatible HTTP implementation, API key storage in SQLite (encrypted), Tauri commands for provider CRUD and chat completion, basic "plan my day" prompt that takes today's tasks + free time blocks and suggests ordering
```

This means AI is available during Phase 3+ development for testing smart scheduling as workflows are built. Phase 5 then becomes **AI refinement and advanced scheduling** rather than introducing AI from scratch.

### 5. STATE.md — Accumulated Context Updates

Add to **Decisions**:

```
- [Architecture Review]: Quick-capture and Today view identified as critical missing UX for daily organizer use case
- [Architecture Review]: Task model needs estimated_minutes, scheduled_start, scheduled_end before scheduling engine
- [Architecture Review]: Recurring tasks (PLAN-05) are distinct from workflow cron schedules (AUTO-01) — different data models
- [Architecture Review]: AI provider trait should move to Phase 3 wave 0 to enable testing throughout remaining phases
- [Architecture Review]: Workflow/task distinction needs clarity — tasks are things user does, workflows are automations that run
- [Architecture Review]: Calendar read-only (iCal import) is achievable without OAuth — pull forward from Phase 4 PLUG-04
```

Add to **Pending Todos**:

```
- [ ] Decide: Phase 2.5 insertion vs. folding daily planning into Phase 3 scope expansion
- [ ] Decide: Zustand store split — useScheduleStore and useAiStore vs. expanding existing stores
- [ ] Decide: Quick-capture implementation — separate Tauri window vs. overlay in main window
```

Add to **Blockers/Concerns**:

```
- Task model has no time/duration fields — blocks all scheduling work. Must be resolved before Phase 3 execution engine makes sense.
- Workflow vs. task execution model is blurry — both have "steps" and "agents/skills/tools". Needs explicit boundary before Phase 3 adds more overlap.
```

---

## Architecture Notes (Not GSD-Formatted)

These don't map to specific GSD files but are worth noting:

**Zustand store scaling**: Current `useTaskStore` handles tasks, detail, execution history, and logs. Adding scheduling, calendar data, AI state, and workflow editing will make it unwieldy. Recommend splitting into domain-specific stores (`useScheduleStore`, `useCalendarStore`, `useAiStore`) before Phase 3 rather than after.

**Mutex<Connection> is fine for now**: Single-threaded Tauri app, no concurrent DB access. But if the cron scheduler or AI provider runs background tasks in Phase 3, you may need to move to a connection pool or spawn a dedicated DB thread. Flag this as a Phase 3 concern, not a blocker.

**BSD piping model vs. daily planning**: The piping model (step outputs → next step inputs) is great for automation workflows. But daily task scheduling doesn't need piping — it needs time-block allocation. These are two different execution models. Keep them separate in the architecture rather than trying to make the scheduling engine a special case of the workflow engine.

---

*This file is advisory. Run `/gsd:discuss-phase` with this context to incorporate into the GSD planning cycle, or apply changes manually to the respective files.*
