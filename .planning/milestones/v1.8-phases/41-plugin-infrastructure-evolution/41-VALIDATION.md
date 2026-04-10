---
phase: 41
slug: plugin-infrastructure-evolution
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Rust `#[cfg(test)]` + `cargo test` |
| **Config file** | `src-tauri/Cargo.toml` (existing) |
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
| 41-01-01 | 01 | 1 | PLUG-01 | unit | `cargo test manifest` | ✅ | ⬜ pending |
| 41-01-02 | 01 | 1 | PLUG-01 | unit | `cargo test manifest` | ✅ | ⬜ pending |
| 41-02-01 | 02 | 1 | PLUG-02 | unit | `cargo test directory` | ❌ W0 | ⬜ pending |
| 41-03-01 | 03 | 2 | PLUG-03 | unit | `cargo test dispatch` | ❌ W0 | ⬜ pending |
| 41-04-01 | 04 | 2 | PLUG-04 | unit | `cargo test namespace` | ❌ W0 | ⬜ pending |
| 41-05-01 | 05 | 3 | PLUG-05 | unit | `cargo test disable` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Extend existing test modules in `src-tauri/src/plugins/` for new manifest fields
- [ ] Test stubs for `DirectoryManager`, `SkillDispatcher`, namespace uniqueness
- [ ] Test stubs for plugin disable/cleanup lifecycle

*Existing test infrastructure (70+ tests) covers foundation; new tests extend existing modules.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MCP tool routing via agent-queue | PLUG-03 | Requires running MCP server | Start MCP server, invoke plugin tool, verify result in queue |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
