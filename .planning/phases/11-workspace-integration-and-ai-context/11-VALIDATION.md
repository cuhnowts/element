---
phase: 11
slug: workspace-integration-and-ai-context
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) + cargo test (backend) |
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
| 11-01-01 | 01 | 1 | AIAS-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | AIAS-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | AIAS-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 1 | AIAS-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | AIAS-02, AIAS-03 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for AI context summary generation (AIAS-02)
- [ ] Test stubs for AI suggestion generation (AIAS-03)
- [ ] Test stubs for per-project workspace state management
- [ ] Test stubs for idle detection and summary trigger logic

*Existing vitest and cargo test infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI summary card renders at top of project detail | AIAS-02 | Visual layout verification | Switch to a project after 30+ min idle, verify card appears above progress bar |
| Suggestion cards render below summary | AIAS-03 | Visual layout verification | Switch to project in Track+Suggest mode, verify suggestion cards below summary |
| Per-project tab/drawer state restores on switch | SC-3 | Stateful UI interaction | Open Files tab for Project A, switch to B (Detail), switch back to A — verify Files tab restored |
| On-demand mode shows no AI cards | AIAS-03 | Visual absence verification | Set project to On-demand mode, switch to it, verify no AI cards appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
