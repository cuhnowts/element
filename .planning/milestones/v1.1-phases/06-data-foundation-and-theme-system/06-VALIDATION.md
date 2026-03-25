---
phase: 6
slug: data-foundation-and-theme-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) / cargo test (Rust backend) |
| **Config file** | `vitest.config.ts` / `src-tauri/Cargo.toml` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && cd src-tauri && cargo test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | THEME-01 | unit | `cargo test theme` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | THEME-03 | unit | `cargo test theme` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | THEME-02 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | THEME-04 | unit | `npm run test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/db/tests/theme_tests.rs` — stubs for THEME-01, THEME-03 (schema, CRUD)
- [ ] `src/stores/__tests__/themeSlice.test.ts` — stubs for THEME-02 (assignment)
- [ ] `src/components/sidebar/__tests__/ThemeSection.test.tsx` — stubs for THEME-04 (standalone tasks)

*Existing vitest and cargo test infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop theme reorder | THEME-01 | DnD requires pointer events | Drag theme in sidebar, verify sort_order persists after reload |
| Collapsible sidebar sections | THEME-02 | Visual accordion behavior | Click theme header, verify expand/collapse animation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
