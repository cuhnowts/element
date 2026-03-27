# Phase 15: .planning/ Folder Sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 15-planning-folder-sync
**Areas discussed:** ROADMAP parsing depth, Watcher lifecycle, Sync conflict handling, Import UX

---

## ROADMAP Parsing Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Success criteria | Each numbered success criterion becomes a task. Phase goal becomes description. | ✓ |
| Plan entries | Each plan listed under a phase becomes a task. Coarser-grained. | |
| Both combined | Success criteria as tasks, plan entries as separate grouping. | |

**User's choice:** Success criteria
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| [x] = Complete, [ ] = Pending | Simple binary mapping | ✓ |
| Also detect "in progress" | Parse status text for nuanced states | |
| You decide | Claude's discretion | |

**User's choice:** [x] = Complete, [ ] = Pending
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, extract both | Phase goal -> description, criterion text -> task title | ✓ |
| Titles only | Just phase names and criterion text as task titles | |
| You decide | Claude's discretion | |

**User's choice:** Yes, extract both
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Skip backlog phases | Only parse active milestone phases | ✓ |
| Include as separate group | Parse backlog phases too, tagged differently | |
| You decide | Claude's discretion | |

**User's choice:** Skip backlog phases
**Notes:** None

---

## Watcher Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| File watcher | Reuse existing notify/debouncer pattern. Real-time, proven in codebase. | ✓ |
| Git-based detection | Use git diff/status. No new watcher, but requires polling. | |
| You decide | Claude's discretion | |

**User's choice:** File watcher
**Notes:** User initially explored idea of using git for general file tracking (code, Excel, Word docs). Acknowledged git handles text well but binary files are opaque. Deferred git-based tracking as a future phase idea.

| Option | Description | Selected |
|--------|-------------|----------|
| On project select | Start watching when user opens GSD-tier project with linked dir. Stop on switch. | ✓ |
| After first import | Only activate after manual import. | |
| Always on for linked dirs | Watch for all linked projects regardless of tier. | |

**User's choice:** On project select
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| ROADMAP.md only | Simpler, focused on Phase 15 requirements. | |
| Entire .planning/ directory | Watch all files for future extensibility. | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Entire .planning/ directory
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Separate watcher | New PlanningWatcherState alongside existing FileWatcherState. | ✓ |
| Unified watcher | Single watcher routing events by path. | |
| You decide | Claude's discretion | |

**User's choice:** Separate watcher
**Notes:** None

---

## Sync Conflict Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Content hash comparison | SHA-256 hash stored after sync. Skip if identical. | ✓ |
| Write flag / lock | Set flag during app writes, watcher ignores. | |
| You decide | Claude's discretion | |

**User's choice:** Content hash comparison
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Skip sync, log warning | Keep existing DB state, emit warning to frontend. | ✓ |
| Partial sync | Import whatever parsed successfully, skip broken sections. | |
| You decide | Claude's discretion | |

**User's choice:** Skip sync, log warning
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Replace all synced records | Delete source-tagged records, re-insert from parsed ROADMAP. | ✓ |
| Incremental merge | Match by name/order, update changed, add new, remove deleted. | |
| You decide | Claude's discretion | |

**User's choice:** Replace all synced records
**Notes:** None

---

## Import UX

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect on project open | Auto-import when GSD-tier project selected and ROADMAP.md exists. | ✓ |
| Button in project header | Explicit "Sync .planning/" button. | |
| Both — auto + manual refresh | Auto-detect plus manual re-sync button. | |

**User's choice:** Auto-detect on project open
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Silent update | Phases/tasks appear with toast notification. | ✓ |
| Confirmation dialog | Show parsed data, ask to confirm before importing. | |
| You decide | Claude's discretion | |

**User's choice:** Silent update
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle indicator | Small icon/badge on synced phases/tasks. | ✓ |
| No distinction | Synced and user-created look identical. | |
| You decide | Claude's discretion | |

**User's choice:** Subtle indicator
**Notes:** None

---

## Claude's Discretion

- Debounce interval for .planning/ watcher
- Hash storage mechanism (in-memory vs database)
- Toast notification styling and duration
- Regex patterns for ROADMAP.md parsing

## Deferred Ideas

- Git-based progress tracking across diverse file types (code, Excel, Word) as general-purpose change detection for linked directories
