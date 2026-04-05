---
phase: 34
slug: goal-first-project-detail
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-04
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-00-01 | 00 | 0 | PROJ-01, PROJ-02, PROJ-03 | stub | `ls src/components/center/__tests__/GoalHeroCard.test.tsx src/components/center/__tests__/WorkspaceButton.test.tsx` | Created by W0 | pending |
| 34-01-01 | 01 | 1 | PROJ-02 | unit | `cargo test --manifest-path src-tauri/Cargo.toml -- project` | Yes (Rust) | pending |
| 34-01-02 | 01 | 1 | PROJ-02 | type-check | `npx tsc --noEmit` | Yes | pending |
| 34-02-01 | 02 | 2 | PROJ-01, PROJ-02 | unit | `npx vitest run src/components/center/__tests__/GoalHeroCard.test.tsx` | Created by W0 | pending |
| 34-02-01 | 02 | 2 | PROJ-03 | unit | `npx vitest run src/components/center/__tests__/WorkspaceButton.test.tsx` | Created by W0 | pending |
| 34-02-02 | 02 | 2 | PROJ-01, PROJ-02, PROJ-03 | unit | `npx vitest run src/components/center/__tests__/ProjectDetail.test.tsx` | Yes (needs update) | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Plan 34-00 creates these test stubs before feature implementation:

- [ ] `src/components/center/__tests__/GoalHeroCard.test.tsx` -- covers PROJ-01 (display, empty state, a11y) and PROJ-02 (edit mode, debounce save, escape revert)
- [ ] `src/components/center/__tests__/WorkspaceButton.test.tsx` -- covers PROJ-03 (dual mode, workspace open, directory link)

*Existing infrastructure covers test framework -- only stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Goal hero card visual prominence | PROJ-01 | Visual layout hierarchy | Open project detail, verify goal card appears above phase list with Target icon |
| Inline edit UX flow | PROJ-02 | Interaction timing (hover, focus, blur) | Hover goal card -> pencil appears -> click -> input focused -> type -> blur -> saved |
| Two-click workspace access | PROJ-03 | Click counting / navigation flow | From hub -> click project -> click "Open Workspace" -> verify terminal + file tree open |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
