---
phase: 23
slug: context-manifest-and-ai-briefing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| *Populated after planning* | | | CTX-01 | unit | `npx vitest run` | ⬜ W0 | ⬜ pending |
| *Populated after planning* | | | CTX-02 | unit | `npx vitest run` | ⬜ W0 | ⬜ pending |
| *Populated after planning* | | | CTX-03 | unit | `npx vitest run` | ⬜ W0 | ⬜ pending |
| *Populated after planning* | | | BRIEF-01 | manual | N/A | N/A | ⬜ pending |
| *Populated after planning* | | | BRIEF-02 | manual | N/A | N/A | ⬜ pending |
| *Populated after planning* | | | BRIEF-03 | unit | `npx vitest run` | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for manifest builder (Rust unit tests)
- [ ] Test stubs for briefing store (vitest)
- [ ] Test stubs for briefing streaming hook (vitest)

*Existing infrastructure covers framework installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Personalized greeting displays on hub load | BRIEF-01 | Visual rendering + LLM output | Open hub, verify greeting appears with user name and time-of-day awareness |
| Briefing content reflects actual project state | BRIEF-02 | LLM output quality + data accuracy | Create projects with phases, verify briefing mentions them |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
