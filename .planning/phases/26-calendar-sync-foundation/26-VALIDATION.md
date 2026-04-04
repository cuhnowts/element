---
phase: 26
slug: calendar-sync-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | cargo test (Rust) |
| **Config file** | `src-tauri/Cargo.toml` |
| **Quick run command** | `cd src-tauri && cargo test --lib` |
| **Full suite command** | `cd src-tauri && cargo test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd src-tauri && cargo test --lib`
- **After every plan wave:** Run `cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | CAL-01 | unit | `cargo test google_sync` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | CAL-01 | unit | `cargo test google_410` | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 1 | CAL-02 | unit | `cargo test outlook_timezone` | ❌ W0 | ⬜ pending |
| 26-03-01 | 03 | 2 | CAL-03 | unit | `cargo test scheduler_busy` | ❌ W0 | ⬜ pending |
| 26-04-01 | 04 | 2 | CAL-04 | unit | `cargo test background_sync` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/tests/calendar_sync_tests.rs` — test stubs for CAL-01 through CAL-04
- [ ] Test fixtures for mock Google/Outlook API responses

*Existing cargo test infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OAuth token refresh flow | CAL-01 | Requires live Google OAuth | Connect Google account, wait for token expiry, verify re-sync |
| Outlook OAuth flow | CAL-02 | Requires live Microsoft OAuth | Connect Outlook account, verify events sync with correct timezone |
| Background sync timer fires | CAL-04 | Requires app running with timer | Launch app, wait for sync interval, check logs for sync execution |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
