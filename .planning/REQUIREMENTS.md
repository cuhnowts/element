# Requirements: Element

**Defined:** 2026-03-29
**Core Value:** The workflow engine must reliably define, organize, schedule, and monitor workflows -- everything else builds on top of it.

## v1.3 Requirements

Requirements for v1.3 Foundation & Execution milestone. Each maps to roadmap phases.

### Tech Debt

- [x] **DEBT-01**: Fix 3 pre-existing TypeScript errors in ThemeSidebar.tsx and UncategorizedSection.tsx
- [x] **DEBT-02**: Delete orphaned ScopeInputForm.tsx and OnboardingWaitingCard.tsx (zero importers)
- [x] **DEBT-03**: Fix "Open AI" navigation bug — clicking Open AI without proper state navigates to home screen instead of showing error toast

### UI Polish

- [x] **UI-01**: Clicking a project in the sidebar opens the project directly (no context menu gate)
- [x] **UI-02**: Sidebar sections have +/- click toggle for expand/collapse (no slider)
- [x] **UI-03**: Task detail view is simplified — less visual clutter, cleaner layout
- [x] **UI-04**: "Link Directory" control appears on the same line as the AI button
- [x] **UI-05**: AI button label changes based on project state: "Plan Project" (no plan), "Check Progress" (planned), "Open AI" (fallback)
- [x] **UI-06**: Terminal tab is first and selected by default in the output drawer
- [x] **UI-07**: Smart AI button state machine covers: no directory, no tier, planning, executing, complete states

### Multi-Terminal

- [ ] **TERM-01**: Each project has its own terminal session(s) isolated from other projects
- [ ] **TERM-02**: Terminal sessions are named (e.g., "AI Planning", "Dev Server") and shown as tabs
- [ ] **TERM-03**: Clicking "Open AI" spawns a new named session instead of killing the existing one
- [ ] **TERM-04**: PTY processes are properly cleaned up on session close (SIGKILL fallback for zombie prevention)
- [ ] **TERM-05**: Terminal drawer shows session tabs for switching between active sessions within a project

### Central AI Agent

- [ ] **AGENT-01**: A persistent central AI agent runs in its own terminal session, always available
- [ ] **AGENT-02**: The central agent has cross-project awareness — can read state of all projects
- [ ] **AGENT-03**: When user clicks "Open AI" on a project, the central agent feeds context to the project-specific AI session
- [ ] **AGENT-04**: The agent auto-executes low-risk actions (e.g., running phases with no human blockers) with configurable risk tiers
- [ ] **AGENT-05**: The agent notifies the user when human input is needed (verification, decisions, discussion)
- [ ] **AGENT-06**: The agent has its own skills/tools for reading project state, managing sessions, and orchestrating work

### Notifications

- [ ] **NOTIF-01**: OS-native desktop notifications for critical items (via tauri-plugin-notification)
- [ ] **NOTIF-02**: In-app notification center with history and priority tiers (critical / informational / silent)
- [ ] **NOTIF-03**: Notifications are driven by the central AI agent, not individual project actions

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Agent Enhancements

- **AGENT-10**: Agent learns user patterns and preferences over time (memory system)
- **AGENT-11**: Agent can proactively suggest work based on deadlines, dependencies, and priorities
- **AGENT-12**: Agent can orchestrate across external tools (GitHub, Jira, Slack) via plugins

### Terminal Enhancements

- **TERM-10**: Split pane terminals within a project
- **TERM-11**: Terminal session persistence across app restart
- **TERM-12**: Terminal session sharing between projects

### Bidirectional Sync

- **BSYNC-01**: App-side phase/task edits written back to .planning/ files
- **BSYNC-02**: Conflict resolution UI when app and disk edits diverge

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full autonomous AI without checkpoints | Safety — user must approve high-risk actions. Auto-execute only for low-risk. |
| In-app code editor or diff viewer | Element orchestrates, external tools edit |
| Split pane terminals | Tabs-only for v1.3, splits add complexity without proportional value |
| Push notifications (mobile/web) | Desktop-only app, OS notifications sufficient |
| Agent memory system | Deferred — needs design for what to remember and privacy implications |
| Cloud-based agent | Local-first — agent runs on device, no cloud dependency |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEBT-01 | Phase 17 | Complete |
| DEBT-02 | Phase 17 | Complete |
| DEBT-03 | Phase 17 | Complete |
| UI-01 | Phase 18 | Complete |
| UI-02 | Phase 18 | Complete |
| UI-03 | Phase 18 | Complete |
| UI-04 | Phase 18 | Complete |
| UI-05 | Phase 18 | Complete |
| UI-06 | Phase 18 | Complete |
| UI-07 | Phase 18 | Complete |
| TERM-01 | Phase 19 | Pending |
| TERM-02 | Phase 19 | Pending |
| TERM-03 | Phase 19 | Pending |
| TERM-04 | Phase 19 | Pending |
| TERM-05 | Phase 19 | Pending |
| NOTIF-01 | Phase 20 | Pending |
| NOTIF-02 | Phase 20 | Pending |
| NOTIF-03 | Phase 20 | Pending |
| AGENT-01 | Phase 21 | Pending |
| AGENT-02 | Phase 21 | Pending |
| AGENT-03 | Phase 21 | Pending |
| AGENT-04 | Phase 21 | Pending |
| AGENT-05 | Phase 21 | Pending |
| AGENT-06 | Phase 21 | Pending |

**Coverage:**
- v1.3 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after roadmap creation*
