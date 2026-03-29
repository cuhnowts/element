---
phase: 20
slug: notification-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) |
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
| 20-01-01 | 01 | 1 | NOTIF-01 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 1 | NOTIF-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 20-01-03 | 01 | 1 | NOTIF-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/stores/__tests__/notificationSlice.test.ts` — stubs for NOTIF-02, NOTIF-03
- [ ] `src/components/__tests__/NotificationCenter.test.tsx` — stubs for NOTIF-02

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OS-native notification appears when app is not focused | NOTIF-01 | Requires OS notification API — cannot be tested in vitest | 1. Minimize app 2. Trigger critical notification via test command 3. Verify OS notification appears |
| Bell badge count updates in real-time | NOTIF-02 | Visual state in titlebar area | 1. Trigger notification 2. Verify badge shows count 3. Open popover 4. Verify badge clears on "mark all read" |
| Deep-link navigation from notification | NOTIF-02 | Route navigation requires rendered app | 1. Click notification in popover 2. Verify app navigates to correct project/phase |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
