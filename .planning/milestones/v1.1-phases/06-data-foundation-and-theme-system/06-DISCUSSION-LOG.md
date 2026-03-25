# Phase 6: Data Foundation and Theme System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 06-data-foundation-and-theme-system
**Areas discussed:** Theme management UX, Sidebar restructure, Standalone tasks, Migration strategy

---

## Theme Management UX

### Theme Creation

| Option | Description | Selected |
|--------|-------------|----------|
| Inline sidebar | Click "+" in sidebar header, type name inline | |
| Dialog/modal | Opens dialog with name field and optional extras | |
| Both | Inline for quick creation, dialog for editing details | ✓ |

**User's choice:** Both — inline + for quick creation, dialog accessible for editing details after.

### Theme Rename/Delete

| Option | Description | Selected |
|--------|-------------|----------|
| Right-click context menu | Right-click theme header → Rename / Delete | |
| Inline actions on hover | Show edit/trash icons on hover | |
| Both context menu + hover icons | Context menu for full options, subtle hover icon for quick actions | ✓ |

**User's choice:** Both context menu + hover icons.

### Theme Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| Color dot/accent | Small color indicator, preset palette of 8-10 colors | ✓ |
| Icon + color | Lucide icon and color accent per theme | |
| Name only for now | No visual customization in Phase 6 | |

**User's choice:** Color dot/accent (recommended).

### Delete Confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with item count | Shows count of affected items before delete | ✓ |
| Always confirm | Confirmation for every delete | |
| No confirmation | Delete immediately | |

**User's choice:** Yes, with item count (recommended).

---

## Sidebar Restructure

### Sidebar Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Themes as accordions | Collapsible theme sections with projects and tasks inside | ✓ |
| Themes as tabs/pills | Horizontal theme selector filtering lists below | |
| Tree view | Single tree with themes at root, projects as children | |

**User's choice:** Themes as accordions (recommended).

### Theme Ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Manual drag-and-drop | User drags themes to reorder, sort_order column | ✓ |
| Alphabetical | Auto-sorted A-Z | |
| You decide | Claude's discretion | |

**User's choice:** Manual drag-and-drop (recommended).

### Calendar Position

| Option | Description | Selected |
|--------|-------------|----------|
| Stay at the top | Calendar above themes, same as now | ✓ |
| Collapsible section | Calendar becomes its own collapsible section | |
| Remove from sidebar | Calendar moves elsewhere | |

**User's choice:** Stay at the top (recommended).

### Theme Reassignment

| Option | Description | Selected |
|--------|-------------|----------|
| Drag to reassign | Drag items between theme sections | |
| Context menu only | Right-click → "Move to theme" submenu | ✓ |
| Both | Drag-and-drop plus context menu | |

**User's choice:** Context menu only.

### Project Click Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to detail view | Click → center panel shows project detail | |
| Expand inline | Click → expands in sidebar to show tasks | |
| Both (expand + detail) | Arrow expands in sidebar, click name navigates to detail | ✓ |

**User's choice:** Both — arrow to expand, click name to navigate.

---

## Standalone Tasks

### Task Creation

| Option | Description | Selected |
|--------|-------------|----------|
| Same flow, project optional | Existing flow stays, project becomes optional | ✓ |
| Separate 'quick task' action | Distinct button for standalone tasks | |
| You decide | Claude's discretion | |

**User's choice:** Same flow, project optional (recommended).

### Task Display in Sidebar

| Option | Description | Selected |
|--------|-------------|----------|
| Under theme, after projects | Listed below projects with ○ icon | ✓ |
| Separate 'Tasks' subsection | Each theme has Projects and Tasks sub-headers | |
| You decide | Claude's discretion | |

**User's choice:** Under theme, after projects (recommended).

### Today View Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same as project tasks | No distinction in Today View | ✓ |
| Yes, with visual indicator | Subtle 'standalone' badge | |
| You decide | Claude's discretion | |

**User's choice:** Yes, same as project tasks (recommended).

### Existing Tasks Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as-is | Existing tasks stay linked to projects | ✓ |
| Offer to detach | Allow converting project tasks to standalone | |

**User's choice:** Keep as-is (recommended).

---

## Migration Strategy

### Migration Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single migration file | One 007_themes.sql with all changes | ✓ |
| Split migrations | Separate files for themes table and linking | |
| You decide | Claude's discretion | |

**User's choice:** Single migration file (recommended).

### Default Theme Assignment

| Option | Description | Selected |
|--------|-------------|----------|
| NULL theme_id | Existing items start with no theme, UI shows uncategorized bucket | ✓ |
| Create default theme | Migration creates 'Uncategorized' theme | |
| You decide | Claude's discretion | |

**User's choice:** NULL theme_id (recommended).

### Theme Schema Columns

| Option | Description | Selected |
|--------|-------------|----------|
| Include color now | themes(id, name, color, sort_order, created_at, updated_at) | ✓ |
| Name only, add color later | Minimal schema, add color in follow-up | |
| You decide | Claude's discretion | |

**User's choice:** Include color now (recommended).

### Nullable FK Approach

| Option | Description | Selected |
|--------|-------------|----------|
| ALTER to nullable | SQLite table recreation pattern | ✓ |
| You decide | Claude's discretion | |

**User's choice:** ALTER to nullable via table recreation (recommended).

---

## Claude's Discretion

- Drag-and-drop library choice and implementation details
- Exact preset color palette selection
- Internal Zustand store structure for themes
- Rust command naming and API design patterns

## Deferred Ideas

None — discussion stayed within phase scope.
