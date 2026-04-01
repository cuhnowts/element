---
phase: 25
slug: bot-skills-and-mcp-write-tools
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | SKILL-01 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SKILL-02 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SKILL-03 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SKILL-04 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for action registry dispatch (SKILL-01)
- [ ] Test stubs for MCP write tool handlers (SKILL-02)
- [ ] Test stubs for shell allowlist enforcement (SKILL-03)
- [ ] Test stubs for destructive action confirmation flow (SKILL-04)

*Existing test infrastructure (vitest) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inline chat confirmation renders correctly | SKILL-04 | Visual UI interaction | Type destructive command in hub chat, verify Approve/Cancel buttons appear inline |
| Shell output collapsible block UX | SKILL-03 | Visual rendering behavior | Run allowed shell command via chat, verify collapsible output with expand/collapse |
| MCP write triggers UI refresh | SKILL-02 | Cross-process coordination | Background agent creates task via MCP, verify task appears in UI without manual refresh |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
