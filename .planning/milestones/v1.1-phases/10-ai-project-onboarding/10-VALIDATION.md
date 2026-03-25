---
phase: 10
slug: ai-project-onboarding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) / cargo test (backend) |
| **Config file** | `vitest.config.ts` / `Cargo.toml` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run && cd src-tauri && cargo test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | AIAS-01 | unit | `cargo test ai_mode` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | AIOB-01 | unit | `npx vitest run --grep "scope form"` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | AIOB-02 | integration | `cargo test skill_file` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | AIOB-03 | integration | `cargo test plan_output` | ❌ W0 | ⬜ pending |
| 10-02-03 | 02 | 2 | AIOB-04 | unit | `npx vitest run --grep "review"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/tests/ai_onboarding_tests.rs` — stubs for AIOB-02, AIOB-03, AIAS-01
- [ ] `src/components/center/__tests__/OnboardingFlow.test.tsx` — stubs for AIOB-01, AIOB-04
- [ ] Existing vitest and cargo test infrastructure covers framework needs

*Existing infrastructure covers framework installation — only test file stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Terminal auto-opens to CLI tool | AIOB-02 | Requires embedded terminal + PTY | Click "Plan with AI", verify Terminal tab opens and CLI tool starts |
| File watcher detects plan output | AIOB-03 | Requires filesystem event + Tauri window | Complete CLI conversation, verify center panel auto-transitions to review |
| Drag-and-drop phase reorder in review | AIOB-04 | Requires visual interaction | Drag a phase row up/down, verify order updates |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
