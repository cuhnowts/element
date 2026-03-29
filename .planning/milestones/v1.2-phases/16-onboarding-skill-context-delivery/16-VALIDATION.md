---
phase: 16
slug: onboarding-skill-context-delivery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust built-in `#[cfg(test)]` + `cargo test` |
| **Config file** | `src-tauri/Cargo.toml` (existing) |
| **Quick run command** | `cd src-tauri && cargo test --lib models::onboarding` |
| **Full suite command** | `cd src-tauri && cargo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd src-tauri && cargo test --lib models::onboarding`
- **After every plan wave:** Run `cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | TBD | unit | `cd src-tauri && cargo test --lib models::onboarding::tests::test_build_skill_section` | ✅ | ⬜ pending |
| 16-01-02 | 01 | 1 | TBD | unit | `cd src-tauri && cargo test --lib models::onboarding::tests::test_skill_section_in_context` | ❌ W0 | ⬜ pending |
| 16-01-03 | 01 | 1 | TBD | integration | `cd src-tauri && cargo test --lib models::onboarding` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skill section appears at top of context.md | TBD | Requires full app flow (DB + file write) | 1. Open project in Element 2. Click "Open AI" 3. Verify `.element/context.md` starts with `## About Element` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
