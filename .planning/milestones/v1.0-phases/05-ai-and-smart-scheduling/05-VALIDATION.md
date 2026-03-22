---
phase: 5
slug: ai-and-smart-scheduling
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (frontend)** | Vitest 4.1.x + Testing Library |
| **Framework (backend)** | cargo test (built-in) |
| **Config file** | `vite.config.ts` (test section) |
| **Quick run command** | `npm run test && cd src-tauri && cargo test` |
| **Full suite command** | `npm run test && cd src-tauri && cargo test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test && cd src-tauri && cargo test`
- **After every plan wave:** Run `npm run test && cd src-tauri && cargo test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | AI-01 | unit (Rust) | `cd src-tauri && cargo test ai::` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | AI-01 | unit (Rust) | `cd src-tauri && cargo test ai::` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | AI-01 | unit (TS) | `npx vitest run src/components/settings/AiSettings.test.tsx` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | AI-02 | unit (Rust) | `cd src-tauri && cargo test ai::prompts` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | AI-02 | unit (TS) | `npx vitest run src/components/detail/AiSuggestionPanel.test.tsx` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 1 | AI-02 | unit (TS) | `npx vitest run src/components/detail/AiAssistButton.test.tsx` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | SCHED-01 | unit (Rust) | `cd src-tauri && cargo test scheduling::time_blocks` | ❌ W0 | ⬜ pending |
| 05-03-02 | 03 | 2 | SCHED-01 | unit (Rust) | `cd src-tauri && cargo test scheduling::` | ❌ W0 | ⬜ pending |
| 05-04-01 | 04 | 2 | SCHED-02 | unit (Rust) | `cd src-tauri && cargo test scheduling::assignment` | ❌ W0 | ⬜ pending |
| 05-04-02 | 04 | 2 | SCHED-02 | unit (Rust) | `cd src-tauri && cargo test scheduling::assignment::split` | ❌ W0 | ⬜ pending |
| 05-04-03 | 04 | 2 | SCHED-02 | unit (TS) | `npx vitest run src/components/sidebar/ScheduleStrip.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/ai/` module — entire AI gateway module is new
- [ ] `src-tauri/src/scheduling/` module — entire scheduling module is new
- [ ] `src-tauri/src/db/sql/002_ai_scheduling.sql` — new migration for AI and scheduling tables
- [ ] `src-tauri/src/commands/ai_commands.rs` — new Tauri IPC commands
- [ ] `src-tauri/src/commands/scheduling_commands.rs` — new Tauri IPC commands
- [ ] `reqwest` dependency in Cargo.toml — not yet added
- [ ] `async-trait` dependency in Cargo.toml — needed for async trait methods
- [ ] Frontend test files for new components — none exist yet
- [ ] Rust test files for new modules — none exist yet
- [ ] `due_date` and `estimated_minutes` task columns — migration needed

*All test files are new — Wave 0 must create stubs before functional implementation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI streaming response renders progressively | AI-02 | Requires visual observation of streaming text | 1. Configure an AI provider 2. Click AI Assist on task 3. Verify text streams in, not appears all at once |
| Ollama auto-detection finds running instance | AI-01 | Requires Ollama running locally | 1. Start Ollama 2. Open AI provider settings 3. Verify Ollama detected with available models |
| Schedule strip visual layout matches calendar | SCHED-01 | Visual layout verification | 1. Add calendar events 2. View schedule strip 3. Verify open blocks shown correctly around events |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
