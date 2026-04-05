# Phase 30: Heartbeat & Schedule Negotiation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 30-heartbeat-schedule-negotiation
**Areas discussed:** Heartbeat timing & triggers, Risk summary presentation, Schedule negotiation flow, Ollama vs CLI fallback strategy

---

## Heartbeat Timing & Triggers

### How often should the heartbeat background check run?

| Option | Description | Selected |
|--------|-------------|----------|
| Every 30 minutes | Frequent enough to catch risks same-day without being noisy. Lightweight query against SQLite. | |
| Every hour | Less frequent, still catches risks within the workday. Lower resource usage if Ollama summary is involved. | |
| On schedule change only | Runs when tasks/due dates/calendar events change rather than on a timer. Event-driven. | |

**User's choice:** 30 minutes by default, but configurable by user in settings
**Notes:** User wants the interval to be a user-facing setting, not hardcoded.

### What should trigger a deadline risk warning?

| Option | Description | Selected |
|--------|-------------|----------|
| Remaining work > remaining capacity | Compare estimated_minutes of pending tasks against available calendar gaps before the due date. Pure math. | ✓ |
| Percentage-based (<20% buffer) | Warn when buffer time drops below a threshold percentage. | |
| You decide | Claude picks the approach. | |

**User's choice:** Remaining work > remaining capacity
**Notes:** None

### Should the heartbeat check all projects at once or only the active project?

| Option | Description | Selected |
|--------|-------------|----------|
| All projects | Deadlines don't care which project is open. Cross-project awareness. | ✓ |
| Active project only | Simpler, less noisy. | |

**User's choice:** All projects
**Notes:** None

### Should the heartbeat flag tasks approaching deadlines with no time estimate?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, flag missing estimates | Helps the system give better risk assessments. | ✓ |
| No, only assess estimated tasks | Avoids nagging but creates blind spots. | |
| You decide | Claude picks. | |

**User's choice:** Yes, flag missing estimates
**Notes:** None

---

## Risk Summary Presentation

### How should deadline risk alerts reach the user?

| Option | Description | Selected |
|--------|-------------|----------|
| Notification + briefing update | Two channels: immediate awareness + next-session context. | ✓ |
| Notification only | Quick and non-intrusive. | |
| Briefing update only | Quieter but could miss urgent risks. | |

**User's choice:** Notification + briefing update
**Notes:** None

### Should the LLM summary be conversational or structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Structured with narrative | Data-first with actionable suggestion. | ✓ |
| Pure conversational | Natural but less actionable. | |
| You decide | Claude picks. | |

**User's choice:** Structured with narrative
**Notes:** None

### Should risk notifications repeat if the user doesn't act?

| Option | Description | Selected |
|--------|-------------|----------|
| Once per risk event | Fire when first detected, don't repeat. Worsening conditions = new event. | ✓ |
| Daily reminder until resolved | Re-notify each day. More aggressive. | |
| You decide | Claude picks. | |

**User's choice:** Once per risk event
**Notes:** None

### Should clicking a risk notification do anything specific?

| Option | Description | Selected |
|--------|-------------|----------|
| Open hub chat with risk context | Connects directly to schedule negotiation flow. | ✓ |
| Navigate to the at-risk task | Jump to task detail view. | |
| Open notification panel | Show full risk detail, no navigation. | |

**User's choice:** Open hub chat with risk context
**Notes:** None

---

## Schedule Negotiation Flow

### How should the user initiate schedule negotiation?

| Option | Description | Selected |
|--------|-------------|----------|
| Natural language in hub chat | Builds on Phase 24 (Hub Chat) and Phase 28 (Daily Planning). | ✓ |
| Dedicated reschedule button | A "Reschedule" action on tasks or work blocks. | |
| Both chat and button | Two entry points. | |

**User's choice:** Natural language in hub chat
**Notes:** None

### When the bot proposes a reschedule, how should it present the change?

| Option | Description | Selected |
|--------|-------------|----------|
| Before/after summary in chat | Shows what moves and downstream impact. User approves in chat. | ✓ |
| Visual diff on calendar view | Ghost blocks with accept/reject. Requires Phase 27 calendar view. | |
| You decide | Claude picks. | |

**User's choice:** Before/after summary in chat
**Notes:** None

### Should the heartbeat risk notification trigger a negotiation prompt?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include suggestion | Notification includes a suggested fix with "Want me to do that?" | ✓ |
| No, just inform | Notification only shows the risk. | |
| You decide | Claude picks. | |

**User's choice:** Yes, include suggestion
**Notes:** None

### What scope of rescheduling should the bot handle?

| Option | Description | Selected |
|--------|-------------|----------|
| Single task moves | One task at a time. Simple, predictable. | ✓ |
| Full day replan | Regenerates schedule for affected window. | |
| Both single and bulk | Both granularities. | |

**User's choice:** Single task moves
**Notes:** None

---

## Ollama vs CLI Fallback Strategy

### When should Ollama availability be checked?

| Option | Description | Selected |
|--------|-------------|----------|
| At heartbeat run time | Each tick calls test_connection() (2s timeout). Handles Ollama start/stop. | ✓ |
| At app startup + cache | Check once at launch, cache result. | |
| You decide | Claude picks. | |

**User's choice:** At heartbeat run time
**Notes:** None

### What should the CLI fallback experience look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Same structured summary via CLI tool | Identical output format. Slightly slower. | ✓ |
| Deterministic summary (no LLM) | Template-based. Fast, free, but less natural. | |
| Both: CLI if configured, else deterministic | Three-tier cascade. | |

**User's choice:** Same structured summary via CLI tool
**Notes:** None

### If neither Ollama nor CLI is configured, should heartbeat still run?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with deterministic output | Risk detection is math. Skip narrative, show raw data. | ✓ |
| No, disable heartbeat | Require AI provider first. | |
| You decide | Claude picks. | |

**User's choice:** Yes, with deterministic output
**Notes:** None

### Should the user pick which Ollama model for heartbeat?

| Option | Description | Selected |
|--------|-------------|----------|
| Use configured Ollama model | Whatever's in ai_providers table. | |
| Separate heartbeat model setting | Dedicated lightweight model. | |
| You decide | Claude picks. | |

**User's choice:** Let the user decide the heartbeat model -- could be Ollama, a lightweight API key, or a CLI tool
**Notes:** User wants a dedicated heartbeat AI provider setting, independent from the main AI model. Supports any provider type.

---

## Claude's Discretion

- Background timer implementation (tokio interval, Tauri background task, etc.)
- Exact format of deterministic fallback template
- Natural language reschedule intent parsing approach
- Notification priority levels for different risk severities

## Deferred Ideas

- Full day replan ("replan my afternoon") -- broader scope rescheduling
- Visual diff on calendar view showing proposed changes as ghost blocks
- Phase-level due dates propagating to heartbeat risk calculations
