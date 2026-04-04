# Phase 18: UI Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 18-ui-polish
**Areas discussed:** Project click behavior, Sidebar collapse/expand, Task detail simplification, AI button & Link Directory layout

---

## Project Click Behavior

### What should single-clicking a project name do?

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to ProjectDetail | Single-click always opens ProjectDetail. Chevron separately expands inline task list. | |
| Expand inline + select | Single-click both expands task tree AND selects project in center panel. | |
| Navigate only, no inline expand | Remove inline task expansion entirely. Sidebar stays clean with just project names. | |

**User's choice:** Navigate only. Use a caret to expand inline.
**Notes:** User wants single-click to navigate only, with an independent chevron/caret for expanding the inline task tree. These are separate actions.

### How should the context menu work on projects?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep right-click menu | Right-click opens DropdownMenu with Move to Theme, Delete, etc. Left-click always navigates. | ✓ |
| Remove context menu entirely | No right-click menu. Actions only inside ProjectDetail. | |
| Three-dot icon on hover | Show ⋮ icon on hover that opens the menu. More discoverable. | |

**User's choice:** Keep right-click menu (Recommended)
**Notes:** None

---

## Sidebar Collapse/Expand

### What expand/collapse indicator style?

| Option | Description | Selected |
|--------|-------------|----------|
| Chevron (keep current) | ChevronRight/ChevronDown — standard pattern in file trees, VS Code, Discord. Already implemented. | ✓ |
| +/− icons | Plus when collapsed, minus when expanded. More explicit but less common. | |
| Disclosure triangle | macOS-native triangle style. Consistent with Finder/Xcode. | |

**User's choice:** Chevron (keep current)
**Notes:** None

### Should expand/collapse state persist across sessions?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, persist per theme | Store expanded/collapsed state in workspace store with persistence. | ✓ |
| No, always start expanded | All themes start expanded on launch. Simpler. | |
| You decide | Claude picks based on existing patterns. | |

**User's choice:** Yes, persist per theme
**Notes:** None

---

## Task Detail Simplification

### What should be immediately visible vs. collapsed?

| Option | Description | Selected |
|--------|-------------|----------|
| Title + status + description visible | Show title, status, priority, description upfront. Collapse context, tags, scheduling, execution into expandable sections. | ✓ |
| Minimal — title + status only | Only title and status visible. Everything else behind expand/click. | |
| Keep current, tighten spacing | Don't hide anything — reduce padding and font sizes. Same info, less weight. | |

**User's choice:** Title + status + description visible
**Notes:** None

### How should collapsed fields be organized?

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible accordion sections | Each group is a collapsible section with header. Similar to GitHub issue sidebar. | ✓ |
| Tabs below description | Tab bar below description with Details, Scheduling, History tabs. | |
| Inline compact chips | Tags, priority, scheduling as chip row below title. Click to edit. | |

**User's choice:** Collapsible accordion sections
**Notes:** None

---

## AI Button & Link Directory Layout

### How should AI button and Link Directory be arranged?

| Option | Description | Selected |
|--------|-------------|----------|
| Single row: [AI Button] [Link Directory] | AI button left, directory link/path right, same horizontal line. Compact. | ✓ |
| AI button with directory as subtitle | AI button primary, directory path as small text below. | |
| You decide | Claude picks layout. | |

**User's choice:** Single row layout
**Notes:** None

### What label for each AI button state?

| Option | Description | Selected |
|--------|-------------|----------|
| Roadmap labels | No dir: "Link Directory" (disabled). No tier: "Plan Project". Has plan: "Check Progress". Executing/Complete/Fallback: "Open AI". | ✓ |
| Simpler: Plan / Open AI only | "Plan Project" when no plan. "Open AI" for everything else. | |
| Action-based labels | "Set Up Project", "Choose Strategy", "Start Planning", "Continue", "Review". | |

**User's choice:** Roadmap labels
**Notes:** None

### Should AI button be disabled or hidden when no directory?

| Option | Description | Selected |
|--------|-------------|----------|
| Disabled with tooltip | Button visible but greyed out. Tooltip: "Link a directory first." | ✓ |
| Hidden, show only Link Directory | Don't show AI button until directory linked. | |
| Show but redirect to link | Button clickable but triggers directory picker. Label: "Link Directory". | |

**User's choice:** Disabled with tooltip
**Notes:** None

---

## Claude's Discretion

- Accordion component choice (shadcn Accordion vs custom collapsible)
- Exact spacing in AI button + directory row
- How to determine project plan states from existing data

## Deferred Ideas

None — discussion stayed within phase scope
