# Roadmap: Element

## Overview

Element is a desktop task orchestration platform built with Tauri 2.x (Rust) + React 19. The roadmap moves through capability layers, each delivering a complete, usable feature set.

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-03-22) — [archive](milestones/v1.0-ROADMAP.md)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) — SHIPPED 2026-03-22</summary>

- [x] Phase 1: Desktop Shell and Task Foundation (3/3 plans) — completed 2026-03-16
- [x] Phase 2: Task UI and Execution History (6/6 plans) — completed 2026-03-16
- [x] Phase 2.1: Daily UX Foundation (4/4 plans, INSERTED) — completed 2026-03-16
- [x] Phase 3: Workflows and Automation (5/5 plans) — completed 2026-03-17
- [x] Phase 4: Plugin System (5/5 plans) — completed 2026-03-18
- [x] Phase 5: AI and Smart Scheduling (6/6 plans) — completed 2026-03-19

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Desktop Shell and Task Foundation | v1.0 | 3/3 | Complete | 2026-03-16 |
| 2. Task UI and Execution History | v1.0 | 6/6 | Complete | 2026-03-16 |
| 2.1 Daily UX Foundation | v1.0 | 4/4 | Complete | 2026-03-16 |
| 3. Workflows and Automation | v1.0 | 5/5 | Complete | 2026-03-17 |
| 4. Plugin System | v1.0 | 5/5 | Complete | 2026-03-18 |
| 5. AI and Smart Scheduling | v1.0 | 6/6 | Complete | 2026-03-19 |

## Backlog

### Phase 999.1: Windows Cross-Platform Compatibility Fixes (BACKLOG)

**Goal:** Fix platform-specific code that prevents Windows usage. Critical: `engine/shell.rs` hardcodes `sh -c` (needs `cmd /C` on Windows). Medium: `SettingsPage.tsx` shortcut only checks `metaKey` (needs `ctrlKey` fallback), `filesystem.rs` uses `/dev/null` (needs `NUL` on Windows). Low: several test files use Unix-specific paths/commands needing conditional compilation.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)
