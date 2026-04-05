---
phase: 36
slug: linting-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Shell commands (biome, clippy, rustfmt) |
| **Config file** | `biome.json`, `Cargo.toml` |
| **Quick run command** | `npx biome check src/ --no-errors-on-unmatched && cd src-tauri && cargo clippy -- -D warnings` |
| **Full suite command** | `npm run check:all` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command for the relevant tool (biome or clippy/fmt)
- **After every plan wave:** Run `npm run check:all`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 36-01-01 | 01 | 1 | LINT-01 | lint | `npx biome migrate --dry-run` | ✅ | ⬜ pending |
| 36-01-02 | 01 | 1 | LINT-01 | lint | `npx biome check src/` | ✅ | ⬜ pending |
| 36-02-01 | 02 | 1 | LINT-02 | lint | `cd src-tauri && cargo clippy -- -D warnings` | ✅ | ⬜ pending |
| 36-02-02 | 02 | 1 | LINT-03 | fmt | `cd src-tauri && cargo fmt --check` | ✅ | ⬜ pending |
| 36-03-01 | 03 | 2 | LINT-04 | script | `npm run check:all` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `package.json` — add `check:all` script combining biome + clippy + rustfmt checks

*Existing linter infrastructure (biome, clippy, rustfmt) already installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `await_holding_lock` fix correctness | LINT-02 | Concurrency fix needs logic review | Verify calendar.rs uses `tokio::sync::Mutex` and lock is not held across await |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
