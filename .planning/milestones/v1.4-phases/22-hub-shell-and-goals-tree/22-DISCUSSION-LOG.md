# Phase 22: Hub Shell and Goals Tree - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 22-hub-shell-and-goals-tree
**Areas discussed:** Hub layout structure, CenterPanel routing, Goals tree design, Navigation flow

---

## Hub Layout Structure

### Where the 3-column hub lives

| Option | Description | Selected |
|--------|-------------|----------|
| Replace CenterPanel content | Hub renders inside existing CenterPanel slot. 3 columns subdivide CenterPanel's space. No AppLayout changes. | ✓ |
| Replace full AppLayout center | Hub takes over entire area between Sidebar and AgentPanel, including OutputDrawer space. | |

**User's choice:** Replace CenterPanel content
**Notes:** Simplest approach — no AppLayout restructuring needed.

### Column minimize/expand behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Collapse to icon strip | ~40px strip with icon and expand button. Like IDE sidebar panels. | ✓ |
| Collapse to zero + tab bar | Fully hides, small pill at edge to restore. | |

**User's choice:** Collapse to icon strip

### Default column proportions

| Option | Description | Selected |
|--------|-------------|----------|
| 25% / 50% / 25% | Equal side columns, generous center. | ✓ |
| 20% / 60% / 20% | Center-dominant. | |
| 30% / 50% / 20% | Goals tree gets more space. | |

**User's choice:** 25% / 50% / 25%

### Column resizing

| Option | Description | Selected |
|--------|-------------|----------|
| Resizable with drag handles | Users can drag column borders, uses ResizablePanelGroup nesting. | ✓ |
| Fixed proportions only | Only minimize/expand, no drag resize. | |

**User's choice:** Resizable with drag handles

---

## CenterPanel Routing

### How hub becomes default view

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit activeView state | Add activeView field to store ('hub' \| 'project' \| 'task' \| 'theme' \| 'workflow'). Switch on it. | ✓ |
| Keep cascade, swap fallback | Just replace TodayView with HubView at bottom of existing if/else. | |

**User's choice:** Explicit activeView state (Recommended)

### What happens to TodayView content

| Option | Description | Selected |
|--------|-------------|----------|
| Remove entirely | TodayView replaced by hub. AI briefing (Phase 23) handles "what to focus on." | |
| Embed in hub center column | Show TodayView-style groups in center as transitional content. | |
| Keep as separate view | TodayView remains accessible via separate activeView value. | |

**User's choice:** Other — User provided mockup showing the left column contains the goals tree (flat project list with phases + Chores section with standalone tasks). TodayView's time-grouped task content is replaced entirely by this goals tree. The AI briefing in the center handles daily priorities instead.

---

## Goals Tree Design

### Theme grouping in tree

| Option | Description | Selected |
|--------|-------------|----------|
| Flat project list | Projects listed directly under "Goals" header, no theme grouping. Matches user mockup. | ✓ |
| Grouped by theme | Themes as top-level nodes with projects nested under each. | |

**User's choice:** Flat project list

### Progress indicators

| Option | Description | Selected |
|--------|-------------|----------|
| Filled circles/dots | Small circles — filled = complete, hollow = in progress, empty = not started. | ✓ |
| Fraction or percentage | "2/5" or "40%" next to each item. | |
| Mini progress bar | Tiny inline bar next to project name. | |

**User's choice:** Filled circles/dots

### Click behavior on tree items

| Option | Description | Selected |
|--------|-------------|----------|
| Navigate to detail view | Clicking switches activeView to 'project', shows ProjectDetail. Leaves hub. | ✓ |
| Expand inline first | Single click expands children, double-click navigates. | |

**User's choice:** Navigate to detail view

### Chores section task interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Interactive checkboxes | Users can check off tasks directly from hub. | ✓ |
| Read-only list | Tasks listed but click navigates to TaskDetail. | |

**User's choice:** Interactive checkboxes

---

## Navigation Flow

### Home button placement

| Option | Description | Selected |
|--------|-------------|----------|
| Top of sidebar | Home icon at top of ThemeSidebar, above theme list. Discord-style. | ✓ |
| In top bar / header | Home button in global header bar above CenterPanel. | |

**User's choice:** Top of sidebar (Recommended)

### Back navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Home button only | Home always returns to hub. No back stack. Simple mental model. | ✓ |
| Home + browser-style back | Home returns to hub, back arrow for previous view. Needs view history stack. | |

**User's choice:** Home button only

### App launch view

| Option | Description | Selected |
|--------|-------------|----------|
| Always hub on launch | App always opens to hub. "Daily hub" concept — start here, get oriented. | ✓ |
| Restore previous view | Restore last project if one was open when user quit. | |

**User's choice:** Always hub on launch (Recommended)

---

## Claude's Discretion

- Hub center column placeholder content before Phase 23
- Calendar placeholder design and "coming soon" messaging
- Icon choices for minimized column strips and Home button
- Tree expand/collapse animation and indentation styling
- Store state cleanup when navigating back to hub

## Deferred Ideas

None — discussion stayed within phase scope
