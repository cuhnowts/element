# Feature Research

**Domain:** AI scheduling assistant with calendar-aware task management and proactive deadline monitoring
**Researched:** 2026-04-02
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist when they see "daily planning assistant" and "calendar view." Missing these = product feels broken or half-baked.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Calendar day/week view with time blocks | Every scheduling app shows calendar. Users cannot plan a day without seeing it. | MEDIUM | Hub column 3 is currently a placeholder. Need a real time-grid component showing meetings + work blocks side by side. Existing `ScheduleBlock` type already has `start_time`, `end_time`, `block_type` (work/meeting/buffer). |
| Calendar sync working reliably | Google/Outlook OAuth already exists but has bugs. Calendar data must flow before anything else works. | HIGH | Known tech debt: `scheduling_commands.rs:94-97` passes empty vec for calendar events. OAuth placeholder client IDs need fixing. This is the critical-path dependency. |
| Daily planning conversation | "Here's what fits today" is the v1.5 headline. Users expect the bot to present prioritized tasks against available time and ask what to work on. | MEDIUM | Hub chat infrastructure exists (v1.4). Need a new bot skill that calls `generate_schedule` internally, formats results conversationally, and lets user confirm/adjust. Greedy scheduler already scores by priority + due date urgency. |
| Due dates on tasks | Tasks without due dates cannot be scheduled intelligently. The scheduler already uses `due_date` for urgency scoring. | LOW | `due_date` column already exists on tasks table. UI needs to surface it more prominently and the bot needs a skill to set/suggest them. |
| Schedule visualization of meetings vs work blocks | Users need to distinguish external commitments (meetings) from planned work at a glance. Color coding or visual separation. | LOW | `BlockType` enum already has Work, Meeting, Buffer. Frontend rendering needs to use these for distinct styles. |
| Manual drag-to-reschedule on calendar | Once blocks are visible, users expect to move them. Trevor AI and Morgen both allow this. | MEDIUM | Requires DnD on time grid. Can use existing DnD patterns from theme sidebar (v1.1). |

### Differentiators (Competitive Advantage)

Features that set Element apart. These align with the core value of "AI agent manages across all projects."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Conversational schedule negotiation | Unlike Motion/Reclaim which auto-schedule silently, Element has a chat interface. "I can't do the report today, move it" as natural language through hub chat. This is the Discord-meets-scheduler feel. | MEDIUM | Build on hub chat (v1.4). New bot skill that interprets rescheduling intent, calls schedule mutation commands, confirms changes. Key differentiator because most tools either fully-auto (Motion) or fully-manual (Morgen) -- Element is conversational. |
| Heartbeat with deadline risk alerts | Periodic background check that flags "Phase X has 12 tasks, 3 days left, only 4 hours of calendar gaps -- this will slip." Proactive, not reactive. Motion does this but Element can tie it to the multi-project hierarchy (themes > projects > phases > tasks). | HIGH | Needs a timer-based loop (Rust `tokio::interval` or Tauri event). Calculates remaining work vs remaining calendar capacity. Sends notifications via existing notification system (v1.3). LLM optional for natural-language summaries; core math is deterministic. |
| Cross-project daily planning | "You have tasks from 3 projects today. Given your 5 hours free, here's the split." No competitor does multi-project daily planning well because they don't have Element's hierarchy. | MEDIUM | Existing `generate_schedule` already pulls all incomplete tasks across projects. Need the bot skill to present them grouped by project/theme for context. |
| AI-suggested due dates | Bot analyzes project scope, phase deadlines, and task dependencies to suggest due dates conversationally. "This phase has 8 tasks and the project deadline is April 15 -- I'd suggest April 10 for the phase, with tasks spread across the next 5 days." | MEDIUM | No competitor does this conversationally. Most require manual date entry. Need phase-level due dates (new column) plus a bot skill that reasons about workload distribution. |
| Backlog exemption | Backlog items (phase 999.x) are explicitly immune to due date enforcement and scheduling pressure. Prevents the AI from nagging about aspirational items. | LOW | Roadmap parser already skips backlog phases (999.x). Need a `is_backlog` flag on tasks/phases that the scheduler and heartbeat respect. Simple boolean column + filter. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for Element specifically.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Fully automatic scheduling (Motion-style) | "Just schedule everything for me" | Users lose agency. Element's value is conversational control, not autopilot. Auto-scheduling without confirmation leads to plans users don't own. Also requires very high confidence in priority/duration estimates that new users won't have. | **Suggest-and-confirm**: Bot proposes a plan, user approves or adjusts through chat. Trevor AI model. |
| Energy-level / productive-hours optimization | "Schedule hard tasks when I'm most productive" | Requires weeks of behavioral data collection. Adds complexity to first-run experience. Morgen and Reclaim struggle with this -- users find the learning period frustrating. | **Defer to v2+**. For now, respect work hours config (already exists) and let users manually indicate morning/afternoon preference if needed. |
| Calendar write-back (push events to Google/Outlook) | "Block time on my real calendar so coworkers see it" | Two-way sync is extremely complex. Creates conflicts, duplicate events, permission issues. Already listed as "Future" in PROJECT.md. | **Read-only for v1.5**. Show meetings from external calendars, schedule work blocks locally only. Write-back is a separate milestone. |
| Real-time continuous rescheduling | "Reshuffle my whole day every time something changes" | Creates cognitive whiplash. Users report frustration with Motion when tasks keep moving. | **Reshuffle on demand**: User says "replan my afternoon" or heartbeat suggests it. Never move confirmed blocks without asking. |
| Multi-user / team scheduling | "Schedule across my team" | Element is explicitly single-user (PROJECT.md out-of-scope). Would require server infrastructure. | **Stay single-user**. Team features are out of scope. |
| Pomodoro / time-boxing within blocks | "Break my 2-hour block into 25-min pomodoros" | Adds UI complexity to the calendar view for marginal value. Most users who want Pomodoro already use dedicated tools. | **Not for v1.5**. If requested later, could be a simple timer overlay. |

## Feature Dependencies

```
[Calendar sync fix]
    |
    v
[Calendar MCP tools] -----> [Hub calendar view]
    |                              |
    v                              v
[Daily planning skill] <---- [Schedule visualization]
    |
    +-----> [Due date enforcement / AI suggestions]
    |              |
    |              v
    +-----> [Heartbeat deadline monitoring]
    |
    v
[Schedule negotiation]

[Backlog exemption] ---- independent, wire into scheduler + heartbeat filters
```

### Dependency Notes

- **Calendar sync fix is the hard prerequisite**: Nothing calendar-aware works until Google/Outlook OAuth is debugged and events flow into `calendar_events` table. The scheduler currently uses an empty vec (known tech debt).
- **Calendar MCP tools require working sync**: Bot needs to read meetings to reason about schedule. These tools extend the existing action registry.
- **Hub calendar view requires events data**: Can be built in parallel with MCP tools but needs sync working to show real data. Can show work blocks immediately from `scheduled_blocks` table.
- **Daily planning skill requires calendar MCP tools + scheduler**: Combines meeting awareness with greedy scheduling algorithm. Formats as conversational output.
- **Due date enforcement requires daily planning**: Users set due dates conversationally during planning. AI suggests them based on project scope.
- **Heartbeat requires due dates + calendar**: Calculates remaining-work vs remaining-capacity. Meaningless without both inputs.
- **Schedule negotiation requires daily planning**: Extends the planning conversation with rescheduling commands.
- **Backlog exemption is independent**: A filter flag that threads through scheduler and heartbeat. Can be done anytime.

## MVP Definition

### Launch With (v1.5 Core)

The minimum to deliver "daily scheduling assistant" value:

- [ ] **Calendar sync fix** -- debug OAuth, reliable background sync, events into `calendar_events` table
- [ ] **Hub calendar view (day view)** -- time-grid showing meetings + work blocks for today, with color distinction
- [ ] **Daily planning skill** -- bot presents "here's what fits today" using greedy scheduler + calendar gaps, user confirms
- [ ] **Due date prominence** -- surface existing `due_date` field in task UI, bot skill to set due dates
- [ ] **Backlog exemption flag** -- `is_backlog` boolean, scheduler/heartbeat skip these items

### Add After Validation (v1.5 Extended)

Features to add once core daily planning loop works:

- [ ] **Schedule negotiation** -- "move the report to tomorrow" via chat, trigger when user rejects daily plan items
- [ ] **Heartbeat monitoring** -- periodic background check (start with deterministic math, LLM summary optional)
- [ ] **AI-suggested due dates** -- bot proposes dates for tasks/phases without them during planning conversations
- [ ] **Week view** -- extend day view to week, useful once daily planning is habitual
- [ ] **Phase-level due dates** -- new column on phases table, propagates to heartbeat risk calculations

### Future Consideration (v2+)

Features to defer until product-market fit is established:

- [ ] **Calendar write-back** -- push work blocks to Google/Outlook (already in PROJECT.md Future)
- [ ] **Energy-level optimization** -- schedule hard tasks during productive hours based on learned patterns
- [ ] **Drag-to-reschedule on calendar** -- DnD time blocks in calendar view (nice but not essential for chat-first UX)
- [ ] **Calendar MCP tools for bot-initiated time blocking** -- bot directly manipulates calendar blocks beyond simple scheduling

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Depends On Existing |
|---------|------------|---------------------|----------|---------------------|
| Calendar sync fix | HIGH | HIGH | P1 | Calendar plugin (v1.0), OAuth infrastructure |
| Hub calendar day view | HIGH | MEDIUM | P1 | Scheduled blocks table, calendar events table |
| Daily planning skill | HIGH | MEDIUM | P1 | Hub chat (v1.4), greedy scheduler, action registry |
| Due date UI + bot skill | HIGH | LOW | P1 | Task model (already has due_date column) |
| Backlog exemption | MEDIUM | LOW | P1 | Roadmap parser (already skips 999.x) |
| Schedule negotiation | HIGH | MEDIUM | P2 | Daily planning skill, hub chat |
| Heartbeat monitoring | HIGH | HIGH | P2 | Due dates populated, calendar sync, notification system (v1.3) |
| AI-suggested due dates | MEDIUM | MEDIUM | P2 | Due date enforcement, project/phase hierarchy |
| Week calendar view | MEDIUM | MEDIUM | P2 | Day view implemented |
| Phase-level due dates | MEDIUM | LOW | P2 | Phase model (needs new column) |
| Drag-to-reschedule | MEDIUM | MEDIUM | P3 | Calendar view with blocks rendered |
| Calendar write-back | MEDIUM | HIGH | P3 | Calendar sync fully working |

**Priority key:**
- P1: Must have for v1.5 launch -- delivers the "daily scheduling assistant" headline
- P2: Should have, adds depth to the planning loop
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Motion | Reclaim.ai | Morgen | Trevor AI | Element (Our Approach) |
|---------|--------|-----------|--------|-----------|----------------------|
| Daily planning | Auto-schedules silently | Auto-schedules with habits | AI suggests, user drags | Chat-based proposals | **Chat-based: bot proposes, user confirms** |
| Calendar gap detection | Automatic, continuous | Automatic, continuous | Semi-automatic | Manual + suggestions | **Automatic detection, conversational presentation** |
| Rescheduling | Auto-reshuffles dozens of times/day | Auto-reshuffles on conflict | Manual drag | Chat commands | **On-demand via conversation or heartbeat suggestion** |
| Deadline risk | Flags at-risk tasks days in advance | Basic overdue alerts | Capacity warnings | None | **Heartbeat: periodic cross-project risk analysis** |
| Due date suggestion | None (user sets) | None (user sets) | None (user sets) | None (user sets) | **AI suggests based on project scope and capacity** |
| Multi-project awareness | Per-workspace | Per-calendar | Per-calendar | Single list | **Full hierarchy: themes > projects > phases > tasks** |
| Backlog handling | No concept | No concept | No concept | No concept | **Explicit backlog exemption from scheduling pressure** |
| Local-first | Cloud only | Cloud only | Cloud + local | Cloud only | **Fully local, user owns data** |

## Sources

- [Morgen AI Planning Assistants Review](https://www.morgen.so/blog-posts/best-ai-planning-assistants)
- [Lindy AI Scheduling Assistant Review](https://www.lindy.ai/blog/ai-scheduling-assistant)
- [Reclaim.ai](https://reclaim.ai/) -- auto-scheduling and planner features
- [Motion](https://www.usemotion.com/) -- auto-scheduling with deadline risk detection
- [Trevor AI](https://www.trevorai.com/) -- chat-based daily planning
- [Reclaim How Auto-Scheduling Works](https://help.reclaim.ai/en/articles/6207587-how-reclaim-manages-your-schedule-automatically)
- [Motion vs Reclaim Comparison](https://www.morgen.so/blog-posts/motion-vs-reclaim)
- [AI in Backlog Management](https://thedigitalprojectmanager.com/productivity/ai-in-backlog-management/)
- [ClickUp AI Calendar Apps](https://clickup.com/blog/ai-calendars/)
- [SelfManager AI Task Categories 2026](https://selfmanager.ai/articles/ai-task-manager-categories-2026)
- Element codebase: `src-tauri/src/scheduling/` (greedy scheduler, time blocks, assignment scoring)
- Element codebase: `src-tauri/src/plugins/core/calendar.rs` (OAuth, calendar account model)
- Element codebase: `src/lib/actionRegistry.ts` (bot skill definitions)

---
*Feature research for: AI scheduling assistant, calendar-aware task management, heartbeat monitoring*
*Researched: 2026-04-02*
