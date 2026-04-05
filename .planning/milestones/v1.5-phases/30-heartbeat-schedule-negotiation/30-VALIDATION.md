---
phase: 30
slug: heartbeat-schedule-negotiation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend), cargo test (backend) |
| **Config file** | `vitest.config.ts`, `src-tauri/Cargo.toml` |
| **Quick run command** | `cd src-tauri && cargo test heartbeat && cd .. && npx vitest run --reporter=verbose src/test/heartbeat` |
| **Full suite command** | `cd src-tauri && cargo test && cd .. && npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command (heartbeat-scoped tests)
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | BEAT-01 | unit | `cargo test heartbeat_interval` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BEAT-01 | unit | `cargo test risk_calculation` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BEAT-02 | integration | `cargo test heartbeat_notification` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BEAT-03 | unit | `cargo test heartbeat_llm_fallback` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BEAT-04 | unit | `cargo test heartbeat_backlog_filter` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BEAT-02 | component | `npx vitest run src/test/heartbeat/ScheduleChangeCard` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | BEAT-02 | component | `npx vitest run src/test/heartbeat/HeartbeatSettings` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/heartbeat/tests.rs` — stubs for BEAT-01 through BEAT-04 backend tests
- [ ] `src/test/heartbeat/` — directory for frontend component tests
- [ ] Existing test infrastructure covers framework install (vitest + cargo test already configured)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Notification appears in system tray | BEAT-02 | Requires Tauri webview + notification subsystem interaction | 1. Enable heartbeat in settings 2. Create task due tomorrow with 8h estimate 3. Wait for heartbeat interval 4. Verify notification appears |
| Briefing includes risk section | BEAT-02 | LLM-generated content varies | 1. Trigger heartbeat with risks present 2. Open daily briefing 3. Verify "Deadline Risks" H3 section appears |
| Ollama fallback behavior | BEAT-03 | Requires Ollama running/stopped states | 1. With Ollama running: verify LLM summary 2. Stop Ollama 3. Trigger heartbeat 4. Verify template fallback |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
