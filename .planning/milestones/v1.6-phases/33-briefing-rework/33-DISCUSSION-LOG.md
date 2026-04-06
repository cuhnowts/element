# Phase 33: Briefing Rework - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 33-briefing-rework
**Areas discussed:** Trigger & generation flow, Card sections & visual hierarchy, Chat/Briefing consolidation, LLM output parsing strategy

---

## Trigger & Generation Flow

### Hub Center Vision (user-initiated clarification)

User described the hub center as a command-driven interface:
1. Top: Greeting + brief contextual text about the day
2. Action chips: "Run Daily Briefing", "Organize Calendar", "Organize Goals" (like /commands)
3. Output drops into chat below when clicked
4. "Back to top" button for navigation

**User's choice:** This is the foundational architecture — not a selection from options but a user-stated vision.
**Notes:** "Organize Calendar" and "Organize Goals" are future milestone work. UI accommodates them now.

### Contextual Summary Source

| Option | Description | Selected |
|--------|-------------|----------|
| Lightweight LLM summary | Quick LLM call for 1-2 sentences | |
| Computed data only | Stats from DB, no LLM | |
| You decide | Claude picks | |

**User's choice:** Hybrid — computed scoring engine provides mathematical analysis (busy score, % planned, meetings vs flow time, due dates). LLM only adds narrative flavor. "It's like a data science way of looking at it, compiling everything in the app to generate a busy score."
**Notes:** The scoring data is hidden from the user — purely backend intelligence that powers the greeting text and briefing structure.

### Scoring Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| New Rust scoring module | Separate `scoring.rs`, clean separation | ✓ |
| Extend existing manifest builder | Add scoring into `build_manifest_string` | |
| You decide | Claude picks | |

**User's choice:** New Rust scoring module
**Notes:** Clean separation between data collection and intelligence layer.

---

## Card Sections & Visual Hierarchy

### Card Organization (user-initiated clarification)

| Option | Description | Selected |
|--------|-------------|----------|
| By tag/urgency | Cards for Blockers, Deadlines, Wins across all projects | |
| By project | One card per project with subsections | ✓ |
| Hybrid | Summary card + project cards | |

**User's choice:** Project cards ranked by priority, each containing blockers/deadlines/wins subsections. Priority determined by deadlines, adjustable via Element AI chat.
**Notes:** User specifically wanted projects ranked by priority with deadline-driven ordering.

### Summary Card

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, brief summary on top | LLM-narrated overview above project cards | ✓ |
| No, project cards enough | Jump straight to ranked project cards | |
| You decide | Claude picks | |

**User's choice:** Yes, brief summary card on top
**Notes:** None

---

## Chat/Briefing Consolidation

### Briefing Regeneration

| Option | Description | Selected |
|--------|-------------|----------|
| Replace in-place | Old briefing replaced, chat preserved | ✓ |
| Append new below old | Both visible, old dimmed | |
| You decide | Claude picks | |

**User's choice:** Replace in-place
**Notes:** None

### Card Interactivity

| Option | Description | Selected |
|--------|-------------|----------|
| Clickable cards | Navigate to project, collapsible sections | ✓ |
| Static display | Read-only cards | |
| You decide | Claude picks | |

**User's choice:** Clickable cards
**Notes:** None

---

## LLM Output Parsing Strategy

### Output Format

| Option | Description | Selected |
|--------|-------------|----------|
| JSON schema output | Structured JSON, frontend renders cards | ✓ |
| Markdown with heading conventions | Split markdown on headings | |
| Hybrid JSON + markdown | JSON skeleton with markdown fields | |
| You decide | Claude picks | |

**User's choice:** JSON schema output
**Notes:** Scoring module produces ranked data; LLM adds narrative within JSON structure.

---

## Claude's Discretion

- Scoring module internals (queries, tag computation)
- JSON schema field names and nesting
- Card component design (reuse vs new)
- "Back to top" button implementation
- Action chip UI structure

## Deferred Ideas

- "Organize Calendar" action chip — future milestone
- "Organize Goals" action chip — future milestone
- Additional hub action chips — extensible pattern
- Chat-driven priority adjustment — full implementation may extend into bot skills
