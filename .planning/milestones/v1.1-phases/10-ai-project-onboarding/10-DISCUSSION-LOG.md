# Phase 10: AI Project Onboarding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 10-ai-project-onboarding
**Areas discussed:** Onboarding entry & flow, Conversation UX, Review & edit experience, AI mode selection

---

## Onboarding Entry & Flow

### Entry Point Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Two-step create | User creates project normally, then sees 'Plan with AI' button in empty project detail view | ✓ |
| Integrated wizard | Project creation becomes a multi-step wizard with AI steps built in | |
| Sidebar action | Dedicated '+ New AI Project' option in sidebar | |

**User's choice:** Two-step create
**Notes:** Keeps creation fast, AI onboarding is optional

### Onboarding Location

| Option | Description | Selected |
|--------|-------------|----------|
| In-place in center panel | Project detail view transforms into onboarding experience | ✓ |
| Modal / dialog overlay | Large modal opens over project detail | |
| Separate full-screen view | Navigates to dedicated onboarding screen | |

**User's choice:** In-place in center panel
**Notes:** Project stays selected in sidebar, smooth transition back to populated view

### Button Availability

| Option | Description | Selected |
|--------|-------------|----------|
| Empty projects only | Button only appears when project has zero phases | ✓ |
| Always available | Available even with existing phases | |
| Empty + re-trigger option | Primary for empty, secondary option for populated | |

**User's choice:** Empty projects only
**Notes:** User wants this to mirror the GSD approach — like plugging GSD in as a planning plugin. Architecture should support this. A default built-in approach plus extensibility for future CLI tool integrations.

### Input Form

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal form | Description/scope (free text) + optional goals | ✓ |
| Structured form | Separate fields for scope, goals, constraints, tech stack, timeline | |
| Single prompt | One big text area, AI extracts everything | |

**User's choice:** Minimal form
**Notes:** AI infers the rest and asks about gaps during conversation

### Escape Hatch

| Option | Description | Selected |
|--------|-------------|----------|
| Cancel button is enough | Standard X or Cancel returns to empty project detail | ✓ |
| Explicit skip link | Visible 'Skip — I'll add phases myself' link | |

**User's choice:** Cancel button is enough

### AI Conversation Mechanism (user-initiated pivot)

User clarified that clicking "Plan with AI" should open the embedded terminal, launch the user's preferred CLI tool (Claude Code, Cursor, etc.), and the conversation happens there — not in Element's own UI.

### CLI Tool Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Global setting | User configures CLI tool once in Element settings | ✓ |
| Per-project override | Global default + per-project override | |
| Auto-detect | Scan PATH for known CLI tools | |

**User's choice:** Global setting

### Data Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Skill file + output parsing | Element writes skill file, CLI reads it, writes JSON output | ✓ |
| CLI flags + stdin/stdout | Invoke CLI with flags, capture structured JSON from stdout | |
| Shared directory convention | Element creates .element/ dir, CLI reads/writes there | |

**User's choice:** Skill file + output parsing

### Completion Detection

| Option | Description | Selected |
|--------|-------------|----------|
| File watcher | Element watches for output file to appear | ✓ |
| Process exit detection | Monitor CLI process exit code | |
| Manual trigger | User clicks 'Load AI Plan' button after CLI finishes | |

**User's choice:** File watcher

---

## Conversation UX

### Center Panel During Conversation

| Option | Description | Selected |
|--------|-------------|----------|
| Waiting state with context | Status card showing project info + hint to check Terminal | ✓ |
| Terminal takes focus | Output drawer auto-expands, center panel stays as-is | |
| Split view | Top: project context, bottom: terminal mirror | |

**User's choice:** Waiting state with context

### Terminal Auto-Focus

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-open terminal | Element auto-opens drawer to Terminal tab when CLI launches | ✓ |
| Badge/indicator only | Terminal tab gets activity indicator, user clicks to open | |
| You decide | Claude's discretion | |

**User's choice:** Auto-open terminal

### Skill File Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Structured skill with output contract | Skill defines context, conversation guidance, and output JSON schema | ✓ |
| Minimal prompt only | Just project context + 'break into phases and tasks' | |
| Full conversation script | Exact questions to ask, in order | |

**User's choice:** Structured skill with output contract

---

## Review & Edit Experience

### Review Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Phase accordion with inline editing | Same layout as project detail view, with full editing | ✓ |
| Side-by-side diff | Raw AI output vs editable structure | |
| Checklist approval | Check to keep, uncheck to discard | |

**User's choice:** Phase accordion with inline editing

### Editing Capabilities (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Rename phases/tasks | Click to edit names inline | ✓ |
| Delete phases/tasks | Remove individual items | ✓ |
| Reorder phases | Drag-and-drop or arrow buttons | ✓ |
| Add new phases/tasks | Supplement AI output | ✓ |

**User's choice:** All four capabilities

### Save Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Save and show project detail | Batch-create, transition to populated detail view, toast confirmation | ✓ |
| Save with summary toast | Richer toast with phase names and per-phase task counts | |
| Save and prompt next step | After saving, suggest next action (link directory, start Phase 1) | |

**User's choice:** Save and show project detail

---

## AI Mode Selection

### Mode Location

| Option | Description | Selected |
|--------|-------------|----------|
| Project settings/detail header | Dropdown in project detail header, always visible | ✓ |
| End of onboarding | Last step of AI onboarding flow | |
| Both onboarding + header | Asked during onboarding, also in header | |

**User's choice:** Project settings/detail header

### Default Mode

| Option | Description | Selected |
|--------|-------------|----------|
| On-demand | AI does nothing unless explicitly asked | ✓ |
| Track+Suggest | AI passively tracks and suggests | |
| You decide | Claude's discretion | |

**User's choice:** On-demand

### Mode Implementation Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Store mode only | Phase 10: UI + persistence. Phase 11: actual behavior | ✓ |
| Basic behavior included | Simple Track+Suggest behavior in Phase 10 | |
| Full behavior | All three modes fully functional in Phase 10 | |

**User's choice:** Store mode only

---

## Claude's Discretion

- Skill file template content and output JSON schema design
- File watcher implementation approach
- CLI tool path validation and error handling
- Review screen component structure and state management
- Batch save transaction handling
- `.element/` directory creation and cleanup

## Deferred Ideas

- Re-trigger AI planning for existing projects
- Per-project CLI tool override
- Track+Suggest and Track+Auto-execute behavior (Phase 11)
- Skill marketplace for shareable project type templates
