---
phase: 38
slug: error-logger
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 (TS) + cargo test (Rust) |
| **Config file** | None for Vitest (uses vite.config.ts defaults), Cargo.toml for Rust |
| **Quick run command** | `npx vitest run src/lib/errorLogger.test.ts` |
| **Full suite command** | `npx vitest run && cargo test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/errorLogger.test.ts`
- **After every plan wave:** Run `npx vitest run && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 1 | ELOG-01 | unit | `npx vitest run src/lib/errorLogger.test.ts -t "captures"` | ❌ W0 | ⬜ pending |
| 38-01-02 | 01 | 1 | ELOG-01 | unit | `cargo test -p element --lib error_log` | ❌ W0 | ⬜ pending |
| 38-01-03 | 01 | 1 | ELOG-02 | unit | `npx vitest run src/lib/errorLogger.test.ts -t "reentran"` | ❌ W0 | ⬜ pending |
| 38-01-04 | 01 | 1 | ELOG-02 | unit | `npx vitest run src/lib/errorLogger.test.ts -t "buffer"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/errorLogger.test.ts` — stubs for ELOG-01 (interceptor capture) and ELOG-02 (re-entrancy guard + buffer)
- [ ] Rust test in `error_log_commands.rs` — stubs for ELOG-01 (file write)
- [ ] Vitest config — create minimal config if absent (may already exist from Phase 37)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No observable UI lag during rapid error sequences | ELOG-02 | Performance perception requires visual observation | 1. Open app 2. Trigger 100 rapid console.error calls 3. Verify UI remains responsive |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
