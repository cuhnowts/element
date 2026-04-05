# Phase 31: Drawer Consolidation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 31-drawer-consolidation
**Areas discussed:** Drawer toggle behavior, AI tab content & layout, Tab bar design, Agent lifecycle on hide

---

## Drawer Toggle Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Click-to-toggle only | Remove drag-to-resize. Click toggles between collapsed and expanded (~450px fixed). Matches REQUIREMENTS.md exclusion of drag-to-resize. | |
| Keep resizable + click toggle | Keep drag handle for power users. Click tab bar still toggles open/closed. ResizablePanelGroup stays. | ✓ |
| You decide | Claude picks based on requirements and codebase patterns. | |

**User's choice:** Keep resizable + click toggle
**Notes:** User wants both mechanisms — drag for power users, click for quick toggle.

### Follow-up: Expand height on click

| Option | Description | Selected |
|--------|-------------|----------|
| Last-used height | Remembers height from last drag resize. Already stored in useWorkspaceStore as drawerHeight. | ✓ |
| Fixed default height | Always expands to 40% regardless of prior drag state. | |
| You decide | Claude picks based on existing store patterns. | |

**User's choice:** Last-used height
**Notes:** None — straightforward preference.

---

## AI Tab Content & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Single combined view | Activity feed and terminal output in one scrollable pane. No sub-tabs. | |
| Keep sub-tabs inside AI tab | AI drawer tab has its own Activity/Terminal toggle inside. Mirrors current AgentPanel. | ✓ |
| Promote to top-level tabs | Split Activity and Terminal into two separate drawer tabs. | |

**User's choice:** Sub-tabs (Activity / Terminal), each taking full drawer height when selected
**Notes:** User initially saw "Single combined view" option selected but clarified they want sub-tabs with full-space content — essentially the current AgentPanel layout relocated.

### Follow-up: Space split

**User's choice:** Sub-tabs, not a split view. Each sub-tab takes full height.
**Notes:** User typed "They should be sub tabs, and take up the full space when clicked on" — overriding the combined view option.

---

## Tab Bar Design

### Tab naming

| Option | Description | Selected |
|--------|-------------|----------|
| Element AI | Matches DRAW-02 requirement name. Clear branding. | ✓ |
| AI | Short and simple. | |
| Agent | Technical but accurate. | |

**User's choice:** Element AI
**Notes:** None.

### Tab order and toggle button

| Option | Description | Selected |
|--------|-------------|----------|
| Last tab, remove toggle button | Tab order: Terminal, Logs, History, Element AI. AgentToggleButton removed. | |
| Last tab, keep toggle as status indicator | AgentToggleButton becomes status dot. | |
| First tab | Tab order: Element AI, Terminal, Logs, History. AI is primary. Toggle removed. | ✓ |

**User's choice:** First tab — Element AI as the primary/first drawer tab
**Notes:** None.

---

## Agent Lifecycle on Hide

| Option | Description | Selected |
|--------|-------------|----------|
| Start at app boot, always on | Move startAgent() to AppLayout mount. Agent runs regardless of drawer tab. Queue watcher stays active. | ✓ |
| Start on first AI tab visit | Lazy start on first tab click. Stays running after. | |
| You decide | Claude picks based on lifecycle patterns. | |

**User's choice:** Start at app boot, always on
**Notes:** None.

---

## Claude's Discretion

- Sub-tab layout within AI drawer tab (reuse AgentPanelHeader or simplify)
- Whether to keep "runs" tab or fold into "history"
- CSS transition approach for drawer animation

## Deferred Ideas

None — discussion stayed within phase scope
