---
phase: 39
slug: claude-code-hooks
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 39 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification + script exit code testing |
| **Config file** | `.claude/settings.json` (hooks config) |
| **Quick run command** | `bash .claude/hooks/pre-commit.sh` |
| **Full suite command** | N/A — hooks tested by triggering Claude Code actions |
| **Estimated runtime** | ~10 seconds (pre-commit script dry run) |

---

## Sampling Rate

- **After every task commit:** Run `bash .claude/hooks/pre-commit.sh` (dry run)
- **After every plan wave:** Verify all hook scripts are executable and settings.json is valid JSON
- **Before `/gsd:verify-work`:** Full scenario test — commit with lint error, edit TS file, edit RS file
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 39-01-01 | 01 | 1 | HOOK-01 | manual | Introduce lint error, `git commit` in Claude Code → exit 2 | N/A | ⬜ pending |
| 39-01-02 | 01 | 1 | HOOK-03 | manual | Stage unformatted TS, commit → verify formatted | N/A | ⬜ pending |
| 39-01-03 | 01 | 1 | HOOK-04 | script | `grep '"timeout": 300' .claude/settings.json` | N/A | ⬜ pending |
| 39-02-01 | 02 | 1 | HOOK-02 | manual | Edit TS file in Claude Code → verify test output appears | N/A | ⬜ pending |
| 39-02-02 | 02 | 1 | HOOK-04 | script | `grep '"timeout": 300' .claude/settings.json` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test frameworks or stubs needed — hooks are configuration files and shell scripts.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pre-commit blocks on lint failure | HOOK-01 | Requires Claude Code runtime to trigger PreToolUse event | 1. Introduce a `console.log(` with no semicolon in a TS file. 2. Stage and attempt `git commit` in Claude Code. 3. Verify commit is blocked with exit code 2 and error message appears. |
| Test-on-save shows results | HOOK-02 | Requires Claude Code runtime to trigger PostToolUse event | 1. Edit a TS file in Claude Code. 2. Verify vitest output appears in Claude Code output. |
| Auto-format at commit time | HOOK-03 | Requires Claude Code runtime to trigger PreToolUse event | 1. Stage an unformatted TS file. 2. Commit in Claude Code. 3. Verify the committed file is formatted by Biome. |
| Hooks respect 300s timeout | HOOK-04 | Timeout behavior only observable under load | 1. Verify `timeout: 300` in settings.json. 2. On cold cargo cache, verify hook completes without being killed. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
