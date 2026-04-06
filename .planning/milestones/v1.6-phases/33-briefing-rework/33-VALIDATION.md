---
phase: 33
slug: briefing-rework
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-04
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react (frontend), cargo test (Rust) |
| **Config file** | vite.config.ts (test block) |
| **Quick run command** | `npm run test -- --reporter=verbose && cd src-tauri && cargo test` |
| **Full suite command** | `npm run test && cd src-tauri && cargo test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --reporter=verbose && cd src-tauri && cargo test`
- **After every plan wave:** Run `npm run test && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 33-00-01 | 00 | 0 | BRIEF-01..04 | stub (React) | `npx vitest run src/components/hub/__tests__/ --reporter=verbose` | Created by 33-00 | ⬜ pending |
| 33-00-02 | 00 | 0 | D-12 | stub (Rust) | `cd src-tauri && cargo test briefing_json` | Created by 33-00 | ⬜ pending |
| 33-01-01 | 01 | 1 | BRIEF-02, BRIEF-03 | unit (React) | `grep -c "export" src/types/briefing.ts` | N/A (type file) | ⬜ pending |
| 33-01-02 | 01 | 1 | D-05 | unit (Rust) | `cd src-tauri && cargo test scoring -- --nocapture` | Inline in scoring.rs | ⬜ pending |
| 33-02-01 | 02 | 2 | D-12 | unit (Rust) | `cd src-tauri && cargo build && cargo test briefing_json -- --nocapture` | In manifest_commands.rs | ⬜ pending |
| 33-02-02 | 02 | 2 | BRIEF-01, BRIEF-04 | unit (React) | `npx tsc --noEmit` | N/A (store/hook) | ⬜ pending |
| 33-03-01 | 03 | 3 | BRIEF-02, BRIEF-03 | unit (React) | `npx vitest run src/components/hub/__tests__/BriefingProjectCard.test.tsx src/components/hub/__tests__/BriefingSummaryCard.test.tsx src/components/hub/__tests__/ActionChipBar.test.tsx --reporter=verbose` | Created by 33-00 | ⬜ pending |
| 33-03-02a | 03 | 3 | BRIEF-01, BRIEF-04 | unit (React) | `npx vitest run src/components/hub/__tests__/HubCenterPanel.test.tsx --reporter=verbose` | Created by 33-00 | ⬜ pending |
| 33-03-02b | 03 | 3 | BRIEF-04 | type check | `npx tsc --noEmit` | N/A | ⬜ pending |
| 33-03-03 | 03 | 3 | ALL | manual | Human visual verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/hub/__tests__/HubCenterPanel.test.tsx` — stubs for BRIEF-01, BRIEF-04 (Plan 33-00, Task 1)
- [ ] `src/components/hub/__tests__/BriefingProjectCard.test.tsx` — stubs for BRIEF-02, BRIEF-03 (Plan 33-00, Task 1)
- [ ] `src/components/hub/__tests__/BriefingSummaryCard.test.tsx` — stubs for BRIEF-03 (Plan 33-00, Task 1)
- [ ] `src/components/hub/__tests__/ActionChipBar.test.tsx` — stubs for BRIEF-01 chip behavior (Plan 33-00, Task 1)
- [ ] `src-tauri/src/models/scoring.rs` tests inline — stubs for D-05 tag computation (Plan 33-01, Task 2 creates inline)
- [ ] `src-tauri/src/commands/manifest_commands.rs` tests for JSON parsing — stubs for D-12 (Plan 33-00, Task 2)

*All Wave 0 test stubs are created by Plan 33-00 (wave 0). Existing infrastructure covers framework installation — vitest and cargo test already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual card hierarchy and spacing | BRIEF-03 | Visual layout verification | Open hub, trigger briefing, verify cards have distinct borders, spacing, and section headers |
| Greeting time-of-day variant | UI-SPEC | Time-dependent display text | Check greeting at morning/afternoon/evening times |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
