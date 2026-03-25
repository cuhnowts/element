# Phase 7: Project Phases and Directory Linking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 07-project-phases-and-directory-linking
**Areas discussed:** Project detail layout, Phase management UX, Task-to-phase assignment, Progress visualization

---

## Project Detail Layout

### View Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked sections | Directory link at top, expandable phase sections with tasks, vertical scroll | ✓ |
| Two-column layout | Left: phase list, Right: selected phase tasks | |
| Tab-based | Tabs for Overview, Phases, Tasks | |

**User's choice:** Stacked sections
**Notes:** None

### Directory Picker

| Option | Description | Selected |
|--------|-------------|----------|
| Native OS dialog | Tauri's native directory picker, "Link Directory" when unset, path + Change when linked | ✓ |
| Inline path input + browse | Text field with browse button, allows manual path entry | |

**User's choice:** Native OS dialog
**Notes:** None

### Header Metadata

| Option | Description | Selected |
|--------|-------------|----------|
| Directory path with change button | Shows linked directory path or prompt to link | ✓ |
| Overall progress bar | Aggregate progress across all phases | ✓ |
| Project description | Keep editable description | ✓ |
| Created date + task count | Keep existing stats | ✓ |

**User's choice:** All four options selected
**Notes:** None

---

## Phase Management UX

### Creating Phases

| Option | Description | Selected |
|--------|-------------|----------|
| Inline add button | "+ Add phase" at bottom, auto-focused name field, no modal | ✓ |
| Modal form | Dialog with name and description fields | |
| You decide | Let Claude pick | |

**User's choice:** Inline add button
**Notes:** None

### Reordering Phases

| Option | Description | Selected |
|--------|-------------|----------|
| Drag and drop | Drag handle on phase rows | ✓ |
| Up/down arrow buttons | Small buttons on each phase row | |
| You decide | Let Claude pick | |

**User's choice:** Drag and drop
**Notes:** None

### Rename/Delete Phases

| Option | Description | Selected |
|--------|-------------|----------|
| Right-click context menu | Rename/Delete on right-click, matches ProjectList pattern | ✓ |
| Inline edit + delete icon | Click name to edit, trash on hover | |
| Three-dot menu | ⋮ button per phase with dropdown | |

**User's choice:** Right-click context menu
**Notes:** None

---

## Task-to-Phase Assignment

### Assigning Tasks

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown on task detail | "Phase" dropdown in task detail view | ✓ |
| Drag tasks between phases | Drag tasks between expanded phase sections | |
| Both dropdown + drag | Two entry points | |

**User's choice:** Dropdown on task detail
**Notes:** None

### Creating Tasks in Project View

| Option | Description | Selected |
|--------|-------------|----------|
| Within a phase | "+ Add task" inside each expanded phase, auto-assigned | ✓ |
| Project-level, then assign | One button at project level, assign phase after | |
| Both options | Both phase-level and project-level creation | |

**User's choice:** Within a phase
**Notes:** None

### Unassigned Tasks

| Option | Description | Selected |
|--------|-------------|----------|
| "Unassigned" bucket at bottom | Collapsible section below all phases | ✓ |
| Hide from project view | Only show in general task list | |
| You decide | Let Claude pick | |

**User's choice:** "Unassigned" bucket at bottom
**Notes:** None

---

## Progress Visualization

### Phase-Level Progress

| Option | Description | Selected |
|--------|-------------|----------|
| Count + inline bar | "3/5" with small progress bar next to phase header | ✓ |
| Count only | Just "3/5 tasks" text | |
| Percentage badge | Colored badge showing percentage | |

**User's choice:** Count + inline bar
**Notes:** None

### Overall Project Progress

| Option | Description | Selected |
|--------|-------------|----------|
| Full-width bar + fraction | Prominent bar spanning header width with "3 of 12 tasks complete" | ✓ |
| Compact stats row | "12 tasks · 3 complete · 25%" without bar | |
| You decide | Let Claude pick | |

**User's choice:** Full-width bar + fraction
**Notes:** None

### Sidebar Progress

| Option | Description | Selected |
|--------|-------------|----------|
| Small progress indicator | Thin bar or fraction next to project names | ✓ |
| No sidebar progress | Keep sidebar clean, progress only in detail | |
| You decide | Let Claude pick | |

**User's choice:** Small progress indicator
**Notes:** None

---

## Claude's Discretion

- Schema design for phases table
- Drag-and-drop ordering persistence mechanism
- Progress bar component choice
- Data model for "Unassigned" bucket (null phase_id)

## Deferred Ideas

None — discussion stayed within phase scope
