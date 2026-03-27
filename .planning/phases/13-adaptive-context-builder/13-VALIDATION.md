---
phase: 13
slug: adaptive-context-builder
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust built-in `#[cfg(test)]` with `cargo test` |
| **Config file** | `src-tauri/Cargo.toml` |
| **Quick run command** | `cargo test -p element --lib models::onboarding` |
| **Full suite command** | `cargo test -p element` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo test -p element --lib models::onboarding`
- **After every plan wave:** Run `cargo test -p element`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | CTX-01 | unit | `cargo test -p element --lib models::onboarding::tests::test_state_no_plan` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | CTX-01 | unit | `cargo test -p element --lib models::onboarding::tests::test_state_planned` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | CTX-01 | unit | `cargo test -p element --lib models::onboarding::tests::test_state_in_progress` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 1 | CTX-01 | unit | `cargo test -p element --lib models::onboarding::tests::test_state_complete` | ❌ W0 | ⬜ pending |
| 13-01-05 | 01 | 1 | CTX-01 | unit | `cargo test -p element --lib models::onboarding::tests::test_content_varies_by_state` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 1 | CTX-02 | unit | `cargo test -p element --lib models::onboarding::tests::test_token_budget_large_project` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 1 | CTX-02 | unit | `cargo test -p element --lib models::onboarding::tests::test_progressive_collapse` | ❌ W0 | ⬜ pending |
| 13-03-01 | 03 | 1 | CTX-04 | unit | `cargo test -p element --lib models::onboarding::tests::test_instructions_quick_no_plan` | ❌ W0 | ⬜ pending |
| 13-03-02 | 03 | 1 | CTX-04 | unit | `cargo test -p element --lib models::onboarding::tests::test_instructions_gsd` | ❌ W0 | ⬜ pending |
| 13-03-03 | 03 | 1 | CTX-04 | unit | `cargo test -p element --lib models::onboarding::tests::test_output_contract_gsd_excluded` | ❌ W0 | ⬜ pending |
| 13-03-04 | 03 | 1 | CTX-04 | unit | `cargo test -p element --lib models::onboarding::tests::test_output_contract_quick_included` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/models/onboarding.rs` — add 11 unit tests in existing `#[cfg(test)]` module
- [ ] Helper function for building test `ProjectContextData` with various state/tier configurations

*Existing `#[cfg(test)]` module in `onboarding.rs` is the right location. No new test infrastructure needed.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
