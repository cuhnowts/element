---
phase: 11
slug: workspace-integration-and-ai-context
status: draft
nyquist_compliant: true
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
| 11-00-01 | 00 | 0 | AIAS-02, AIAS-03 | stubs | `npx vitest run src/stores/useWorkspaceStore.test.ts src/stores/contextSlice.test.ts` | Created by W0 | pending |
| 11-00-02 | 00 | 0 | AIAS-02, AIAS-03 | stubs | `npx vitest run src/components/center/ContextSummaryCard.test.tsx src/components/center/AiSuggestionCard.test.tsx` | Created by W0 | pending |
| 11-01-01 | 01 | 1 | AIAS-02 | unit | `cargo check` | n/a (Rust) | pending |
| 11-01-02 | 01 | 1 | AIAS-02 | unit | `cargo check && npx tsc --noEmit && npx vitest run src/stores/contextSlice.test.ts` | W0 | pending |
| 11-02-01 | 02 | 1 | AIAS-02 | unit | `npx tsc --noEmit && npx vitest run src/stores/useWorkspaceStore.test.ts` | W0 | pending |
| 11-02-02 | 02 | 1 | AIAS-03 | unit | `npx tsc --noEmit && npx vitest run src/stores/contextSlice.test.ts` | W0 | pending |
| 11-03-01 | 03 | 2 | AIAS-02, AIAS-03 | unit | `npx tsc --noEmit && npx vitest run src/components/center/ContextSummaryCard.test.tsx src/components/center/AiSuggestionCard.test.tsx` | W0 | pending |
| 11-03-02 | 03 | 2 | AIAS-02, AIAS-03 | integration | `npx vitest run src/components/center/ContextSummaryCard.test.tsx src/components/center/AiSuggestionCard.test.tsx src/stores/contextSlice.test.ts src/stores/useWorkspaceStore.test.ts` | W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Wave 0 is addressed by `11-00-PLAN.md` which creates:

- [x] `src/stores/useWorkspaceStore.test.ts` -- per-project state map, idle threshold, shouldShowSummary logic
- [x] `src/stores/contextSlice.test.ts` -- summary/suggestion state, request lifecycle, race condition protection
- [x] `src/components/center/ContextSummaryCard.test.tsx` -- render, loading, error, fallback states
- [x] `src/components/center/AiSuggestionCard.test.tsx` -- render, action, dismiss, staggered animation

*Existing vitest and cargo test infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI summary card renders at top of project detail | AIAS-02 | Visual layout verification | Switch to a project after 30+ min idle, verify card appears above progress bar |
| Suggestion cards render below summary | AIAS-03 | Visual layout verification | Switch to project in Track+Suggest mode, verify suggestion cards below summary |
| Per-project tab/drawer state restores on switch | SC-3 | Stateful UI interaction | Open Files tab for Project A, switch to B (Detail), switch back to A -- verify Files tab restored |
| On-demand mode shows no AI cards | AIAS-03 | Visual absence verification | Set project to On-demand mode, switch to it, verify no AI cards appear |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (11-00-PLAN.md)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending (Wave 0 plan created, awaiting execution)
