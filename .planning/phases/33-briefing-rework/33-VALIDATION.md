---
phase: 33
slug: briefing-rework
status: draft
nyquist_compliant: false
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
| 33-01-01 | 01 | 1 | BRIEF-01 | unit (React) | `npx vitest run src/components/hub/__tests__/HubCenterPanel.test.tsx -x` | ❌ W0 | ⬜ pending |
| 33-01-02 | 01 | 1 | BRIEF-02 | unit (React) | `npx vitest run src/components/hub/__tests__/BriefingProjectCard.test.tsx -x` | ❌ W0 | ⬜ pending |
| 33-01-03 | 01 | 1 | BRIEF-03 | unit (React) | `npx vitest run src/components/hub/__tests__/BriefingSummaryCard.test.tsx -x` | ❌ W0 | ⬜ pending |
| 33-01-04 | 01 | 1 | BRIEF-04 | unit (React) | `npx vitest run src/components/hub/__tests__/HubCenterPanel.test.tsx -x` | ❌ W0 | ⬜ pending |
| 33-01-05 | 01 | 1 | D-05 | unit (Rust) | `cd src-tauri && cargo test scoring` | ❌ W0 | ⬜ pending |
| 33-01-06 | 01 | 1 | D-12 | unit (Rust) | `cd src-tauri && cargo test briefing_json` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/hub/__tests__/HubCenterPanel.test.tsx` — stubs for BRIEF-01, BRIEF-04
- [ ] `src/components/hub/__tests__/BriefingProjectCard.test.tsx` — stubs for BRIEF-02, BRIEF-03
- [ ] `src/components/hub/__tests__/BriefingSummaryCard.test.tsx` — stubs for BRIEF-03
- [ ] `src/components/hub/__tests__/ActionChipBar.test.tsx` — stubs for BRIEF-01 chip behavior
- [ ] `src-tauri/src/models/scoring.rs` tests inline — stubs for D-05 tag computation
- [ ] `src-tauri/src/commands/manifest_commands.rs` tests for JSON parsing — stubs for D-12

*Existing infrastructure covers framework installation — vitest and cargo test already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual card hierarchy and spacing | BRIEF-03 | Visual layout verification | Open hub, trigger briefing, verify cards have distinct borders, spacing, and section headers |
| Greeting time-of-day variant | UI-SPEC | Time-dependent display text | Check greeting at morning/afternoon/evening times |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
