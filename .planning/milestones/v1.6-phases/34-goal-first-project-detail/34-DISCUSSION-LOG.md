# Phase 34: Goal-First Project Detail - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 34-goal-first-project-detail
**Areas discussed:** Goal data model, Hero card presentation, Workspace entry flow, Layout restructure

---

## Goal Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| Repurpose description | Rename existing 'description' field to 'goal' in UI. No migration needed. | |
| New 'goal' column | Add dedicated goal TEXT column via migration. Keep description separate. | |
| Both fields | Keep description AND add goal. Goal is short aspirational statement, description is longer context. | ✓ |

**User's choice:** Both fields
**Notes:** Goal is the short aspirational statement displayed prominently; description remains for longer project notes/context.

---

## Hero Card Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Bordered card with icon | Card with subtle border, Target/Flag icon, goal text, inline edit pencil. Sits above phases. | ✓ |
| Full-width banner | Tinted background banner spanning full width with goal as large text. | |
| Inline editable heading | Goal as large subtitle under project name, no card chrome. | |

**User's choice:** Bordered card with icon
**Notes:** None

---

## Workspace Entry Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Single 'Open Workspace' button | One button opens directory in file tree AND focuses terminal drawer tab. Replaces OpenAiButton + DirectoryLink row. | ✓ |
| Hero card action area | 'Start Working' button inside the goal hero card itself. | |
| Keep separate, consolidate row | Keep both buttons but merge into compact toolbar. | |

**User's choice:** Single 'Open Workspace' button (Recommended)
**Notes:** Achieves 2-click requirement: open project → click button.

---

## Layout Restructure

| Option | Description | Selected |
|--------|-------------|----------|
| Name → Goal card → Workspace btn → Phases | Goal card right under name as hero. Workspace button below. Progress compact on name row. Description textarea removed from top. | ✓ |
| Name + Goal inline → Workspace → Phases | Goal as subtitle under name. More compact, less emphasis. | |
| Goal card with workspace inside | Goal hero card contains both goal text AND workspace button. | |

**User's choice:** Name → Goal card → Workspace btn → Phases (Recommended)
**Notes:** User selected the ASCII wireframe preview showing this layout.

---

## Removed Items (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Description moves to accordion | Description textarea moves to collapsible 'Details' accordion below phases. Progress becomes compact inline indicator. | ✓ |
| Description removed entirely | Goal replaces description, textarea deleted. | |
| You decide | Claude chooses best approach. | |

**User's choice:** Description moves to accordion
**Notes:** Follows existing accordion pattern from TaskDetail.

---

## Claude's Discretion

- Goal card border styling, icon choice, edit interaction details
- Compact progress indicator format
- Accordion implementation details

## Deferred Ideas

None — discussion stayed within phase scope
