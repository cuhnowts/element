# Phase 11: Workspace Integration and AI Context - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-24
**Phase:** 11-workspace-integration-and-ai-context
**Areas discussed:** Context seeding, Button & trigger, Context content, Workspace state

---

## Context Seeding

| Option | Description | Selected |
|--------|-------------|----------|
| Write command to PTY | Programmatically type a command into the terminal. User sees exactly what runs. | |
| Skill file + launch | Write .element/context.md with project state, then launch the CLI tool pointed at it. Reuses Phase 10's pattern. | ✓ |
| Clipboard + prompt | Copy context to clipboard and open terminal. User pastes into their AI tool. | |

**User's choice:** Skill file + launch
**Notes:** "I might end up using tools that don't support command" — tool-agnostic approach preferred.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Always fresh session | Kill existing PTY, spawn new one with CLI tool + context file. Clean slate. | ✓ |
| Inject if running | Write context command into existing terminal session if one is running. | |
| Separate AI terminal | Open second terminal instance alongside the manual one. | |

**User's choice:** Always fresh session

---

| Option | Description | Selected |
|--------|-------------|----------|
| Global only | One CLI tool path in Element settings. Same as Phase 10's D-06. | ✓ |
| Per-project override | Global default + optional per-project override. | |

**User's choice:** Global only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Open settings | Toast: "No AI tool configured" with button to Settings. | ✓ |
| Prompt inline | Inline input field asking for CLI tool path. | |
| Just open terminal | Write context file, open plain terminal. | |

**User's choice:** Open settings

---

## Button & Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Header area | Next to project name/directory link at top of ProjectDetail. | ✓ |
| Floating action button | Fixed-position button in bottom-right corner. | |
| Phase section actions | Within each phase section — contextual per-phase button. | |

**User's choice:** Header area

---

| Option | Description | Selected |
|--------|-------------|----------|
| Replace it | "Open AI" replaces "Plan with AI" entirely. Context file adapts based on project state. | ✓ |
| Coexist | "Plan with AI" for empty projects, "Open AI" for populated ones. Two separate flows. | |
| Merge with mode | One button always shown, context adapts. | |

**User's choice:** Replace it

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-switch to Terminal | Drawer opens, switches to Terminal tab, CLI session visible immediately. | ✓ |
| Background launch | Terminal spawns but drawer stays on current tab. | |

**User's choice:** Auto-switch to Terminal

---

## Context Content

| Option | Description | Selected |
|--------|-------------|----------|
| Full structured dump | All phases with tasks, progress stats, current focus, what's next. | ✓ |
| Summary only | Phase names + completion percentages, task counts, current focus. | |
| You decide | Claude's discretion on depth and format. | |

**User's choice:** "Basically the same as GSD" — full structured dump modeled after GSD project context.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, onboarding prompt | Context file includes project info + AI instructions for project setup. | ✓ |
| Just project info | Only project name and description, no onboarding guidance. | |

**User's choice:** Yes, onboarding prompt

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, keep output contract | Include plan-output.json schema. File watcher + AiPlanReview screen reused. | ✓ |
| No contract | Context file is read-only. No structured output, no auto-import. | |
| Optional contract | Schema mentioned but not required. | |

**User's choice:** Yes, keep output contract

---

## Workspace State

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both | Per-project tab memory and drawer state. Restore view on project switch. | ✓ |
| Drop them | Not essential for "Open AI". Keep workspace state global. | |
| Just tab memory | Remember center panel tab per project, skip drawer state. | |

**User's choice:** Keep both

---

| Option | Description | Selected |
|--------|-------------|----------|
| Session-only | In-memory Zustand map, resets on app restart. No migration. | ✓ |
| Persist to localStorage | Survives restarts via Zustand persist middleware. | |
| You decide | Claude picks persistence strategy. | |

**User's choice:** Session-only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, keep auto-switch | Selecting project in sidebar switches center panel to project detail. | ✓ |
| No auto-switch | Selecting project just highlights in sidebar, center stays. | |

**User's choice:** Yes, keep auto-switch

---

## Claude's Discretion

- Context file format and template design
- Onboarding prompt wording for empty projects
- CLI tool path validation and error handling
- Per-project workspace state map structure in Zustand
- `.element/` file naming convention (onboard.md vs context.md)
- Loading state while CLI tool spawns

## Deferred Ideas

- Per-project CLI tool override
- Re-trigger AI planning for existing projects
- GSD `.planning/` directory sync
- AI assistance modes (simpler form)
- "Where was I?" summary cards
- AI suggestion cards
