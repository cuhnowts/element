# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-22
**Phases:** 6 | **Plans:** 29 | **Tasks:** 63

### What Was Built
- Full Tauri 2.x desktop app with SQLite persistence, task/project CRUD, and native menus/tray
- Multi-panel workspace: sidebar (calendar, task list, workflows), center (task detail, workflow builder, today view), output drawer (logs, run history)
- Time-aware today view with overdue/morning/afternoon/evening grouping and global-hotkey quick-capture
- Multi-step workflow engine with shell/HTTP execution, cron scheduling, missed-run catch-up, and task-to-workflow promotion
- Plugin system with FS watcher hot-reload, credential vault (OS keychain), and core plugins (shell, HTTP, filesystem, calendar)
- Model-agnostic AI assistance (Anthropic, OpenAI, Ollama, OpenAI-compatible) with streaming suggestions and field-by-field acceptance
- Intelligent time-block scheduling with priority scoring, greedy assignment, and calendar overlay

### What Worked
- **Phase layering:** Each phase delivered a complete, usable capability. No phase depended on future work to be functional.
- **Atomic plan commits:** Every plan committed its tasks individually, making rollback and debugging trivial.
- **Verification after each phase:** Catching the OAuth placeholder issue in Phase 4 verification prevented it from compounding in Phase 5.
- **Test-first scaffolding (Wave 0):** Creating todo test stubs before implementation gave a clear checklist for each component.
- **Migration chain discipline:** Numbering migrations sequentially (001→003→004→005→006) prevented conflicts despite parallel development.

### What Was Inefficient
- **Phase 2 regressions:** Phase 2 layout work required two gap-closure plans to fix the drawer toggle and New Task button. Better integration testing between phases would have caught this earlier.
- **ROADMAP.md progress table drift:** The progress table wasn't consistently updated as phases completed, requiring manual reconciliation at milestone end.
- **Calendar OAuth not testable:** Building the full OAuth flow without real client IDs meant the feature couldn't be validated until after Phase 4, creating a known gap that persists.

### Patterns Established
- **StateCreator slice pattern:** Zustand slices compose into a single AppStore type union. Each new feature adds a slice.
- **SecretStore trait:** OS keychain abstraction with InMemoryStore for tests. Used by both credentials and AI providers.
- **Core plugins as compiled structs:** Shell, HTTP, filesystem registered on every startup — not dynamically loaded.
- **Tauri event-driven updates:** Backend emits events, frontend listeners refresh stores. Module-level listeners for stores, useEffect for components.
- **Settings page as panel replacement:** Settings takes over the center+drawer area, Escape to return.

### Key Lessons
1. **Wire integrations immediately:** The calendar-to-scheduler gap (empty vec placeholder) persists because it was deferred. Cross-phase data wiring should be a first-class task, not a TODO comment.
2. **OAuth needs dev-time setup docs:** Any feature requiring external service registration should ship with a `.env.example` and setup guide in the same plan that builds the feature.
3. **Phase 2.1 insertion worked well:** When quick-capture was identified as urgent mid-milestone, inserting a decimal phase kept the roadmap clean and the work scoped.

### Cost Observations
- Timeline: 7 days (2026-03-15 → 2026-03-22)
- 155 commits, 310 files, 60K+ lines
- Average plan duration: ~5 minutes
- All work by single contributor (knautj17)

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 6 |
| Plans | 29 |
| Tasks | 63 |
| Duration | 7 days |
| Commits | 155 |
| Files | 310 |
| LOC | 60K+ |
| Verification score | 64/66 (97%) |
| Known gaps at ship | 2 |
