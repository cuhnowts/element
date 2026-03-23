# Requirements: Element

**Defined:** 2026-03-22
**Core Value:** The workflow engine must reliably define, organize, schedule, and monitor workflows -- everything else builds on top of it.

## v1.1 Requirements

Requirements for v1.1 Project Manager milestone. Each maps to roadmap phases.

### Themes

- [x] **THEME-01**: User can create, rename, and delete themes
- [x] **THEME-02**: User can assign projects and standalone tasks to themes
- [x] **THEME-03**: Sidebar groups items by theme with collapsible sections and an uncategorized bucket
- [x] **THEME-04**: User can create tasks that exist independently without a project

### Projects

- [x] **PROJ-01**: User can link a project to a filesystem directory via directory picker
- [x] **PROJ-02**: User can create ordered phases within a project
- [x] **PROJ-03**: User can assign tasks to phases within a project
- [x] **PROJ-04**: User can see phase-level progress (tasks complete / total)
- [ ] **PROJ-05**: Project detail view shows phase list, overall progress, and status overview

### File Explorer

- [ ] **FILE-01**: User can browse project files in a tree view within the workspace
- [ ] **FILE-02**: User can open files in their default external editor (VS Code, etc.)
- [ ] **FILE-03**: File tree respects .gitignore and hides common excludes (node_modules, .git, target)
- [ ] **FILE-04**: File tree updates live when files change on disk

### Terminal

- [ ] **TERM-01**: User can open an embedded terminal in the workspace panel
- [ ] **TERM-02**: Terminal automatically opens in the project's linked directory
- [ ] **TERM-03**: Terminal supports copy, paste, scroll, and standard terminal interaction

### AI Onboarding

- [ ] **AIOB-01**: User can enter project scope, goals, and constraints in a structured form
- [ ] **AIOB-02**: AI asks clarifying questions to refine project understanding
- [ ] **AIOB-03**: AI generates phases and tasks from the conversation
- [ ] **AIOB-04**: User can review, edit, and confirm AI-generated breakdown before it's saved

### AI Assistance

- [ ] **AIAS-01**: User can set AI mode per project (Track+Suggest, Track+Auto-execute, On-demand)
- [ ] **AIAS-02**: AI generates a "where was I?" context summary when user switches to a project
- [ ] **AIAS-03**: AI tracks project progress and surfaces relevant suggestions (in Track+Suggest mode)

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Terminal Enhancements

- **TERM-10**: User can manage multiple terminal sessions with tabs per project
- **TERM-11**: Terminal command history linked to tasks for context tracking

### AI Enhancements

- **AIAS-10**: AI generates weekly progress reports per project
- **AIAS-11**: Cross-project theme dashboards with aggregated progress

### Theme Enhancements

- **THEME-10**: User can customize theme colors and icons
- **THEME-11**: Phase drag-and-drop reordering within projects

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Built-in code editor | Element orchestrates, external tools edit -- multi-year effort for marginal value |
| Gantt chart / timeline view | Phases with progress bars convey the same info at 5% complexity |
| Kanban board per project | Task list with status grouping is equivalent for single-user |
| Nested sub-projects | Two levels (theme > project) sufficient -- recursion adds complexity |
| AI auto-creating tasks without review | Users lose trust when AI makes unreviewed changes |
| Template library for project types | AI onboarding replaces templates -- personalized and current |
| Real-time file content preview | Opens in external editor -- keep Element focused on orchestration |
| Calendar/scheduling improvements | Deferred to separate milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| THEME-01 | Phase 6 | Complete |
| THEME-02 | Phase 6 | Complete |
| THEME-03 | Phase 6 | Complete |
| THEME-04 | Phase 6 | Complete |
| PROJ-01 | Phase 7 | Complete |
| PROJ-02 | Phase 7 | Complete |
| PROJ-03 | Phase 7 | Complete |
| PROJ-04 | Phase 7 | Complete |
| PROJ-05 | Phase 7 | Pending |
| FILE-01 | Phase 8 | Pending |
| FILE-02 | Phase 8 | Pending |
| FILE-03 | Phase 8 | Pending |
| FILE-04 | Phase 8 | Pending |
| TERM-01 | Phase 9 | Pending |
| TERM-02 | Phase 9 | Pending |
| TERM-03 | Phase 9 | Pending |
| AIOB-01 | Phase 10 | Pending |
| AIOB-02 | Phase 10 | Pending |
| AIOB-03 | Phase 10 | Pending |
| AIOB-04 | Phase 10 | Pending |
| AIAS-01 | Phase 10 | Pending |
| AIAS-02 | Phase 11 | Pending |
| AIAS-03 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-03-22*
*Last updated: 2026-03-22 after roadmap creation*
