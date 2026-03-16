---
phase: 4
slug: plugin-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Rust)** | cargo test (built-in) |
| **Framework (Frontend)** | vitest 4.1.x |
| **Config file (Frontend)** | vite.config.ts (test section) |
| **Quick run command (Rust)** | `cd src-tauri && cargo test` |
| **Quick run command (Frontend)** | `npm run test` |
| **Full suite command** | `cd src-tauri && cargo test && cd .. && npm run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd src-tauri && cargo test && npm run test`
- **After every plan wave:** Run `cd src-tauri && cargo test && cd .. && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | PLUG-01 | unit (Rust) | `cd src-tauri && cargo test plugins::manifest` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | PLUG-01 | unit (Rust) | `cd src-tauri && cargo test plugins::host` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 0 | PLUG-01 | unit (Frontend) | `npx vitest run src/components/settings/PluginList.test.tsx` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 0 | PLUG-02 | unit (Rust) | `cd src-tauri && cargo test credentials` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 0 | PLUG-02 | unit (Frontend) | `npx vitest run src/components/settings/CredentialVault.test.tsx` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 0 | PLUG-03 | unit (Rust) | `cd src-tauri && cargo test plugins::core::shell` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 0 | PLUG-03 | unit (Rust) | `cd src-tauri && cargo test plugins::core::http` | ❌ W0 | ⬜ pending |
| 04-03-03 | 03 | 0 | PLUG-03 | unit (Rust) | `cd src-tauri && cargo test plugins::core::filesystem` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 0 | PLUG-04 | unit (Rust) | `cd src-tauri && cargo test commands::calendar` | ❌ W0 | ⬜ pending |
| 04-04-02 | 04 | 0 | PLUG-04 | unit (Frontend) | `npx vitest run src/components/settings/CalendarAccounts.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/plugins/mod.rs` — Plugin Host module structure
- [ ] `src-tauri/src/plugins/manifest.rs` — Manifest parsing tests with valid/invalid fixtures
- [ ] `src-tauri/src/credentials/mod.rs` — Credential manager with mock keychain for tests
- [ ] `src-tauri/src/db/sql/002_plugins_credentials_calendar.sql` — Migration for new tables
- [ ] `src/components/settings/PluginList.test.tsx` — Plugin list rendering tests
- [ ] `src/components/settings/CredentialVault.test.tsx` — Vault CRUD tests
- [ ] `src/components/settings/CalendarAccounts.test.tsx` — Calendar account tests
- [ ] Test fixtures: valid plugin manifest JSON, invalid manifests, sample calendar API responses
- [ ] `trait SecretStore` abstraction — mock keychain for unit tests (real keychain for integration only)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OAuth popup flow (Google) | PLUG-04 | Requires real Google OAuth consent screen interaction | 1. Click "Connect Google Calendar" 2. OAuth popup opens 3. Sign in 4. Consent 5. Token stored 6. Events sync |
| OAuth popup flow (Outlook) | PLUG-04 | Requires real Microsoft OAuth consent screen interaction | 1. Click "Connect Outlook Calendar" 2. OAuth popup opens 3. Sign in 4. Consent 5. Token stored 6. Events sync |
| OS keychain reveal/copy | PLUG-02 | Requires OS-level keychain access confirmation | 1. Add credential 2. Click reveal (Eye) 3. Value shown 4. Click copy 5. Paste elsewhere to verify |
| Plugin hot-reload on file change | PLUG-01 | Requires FS watcher event timing | 1. Drop plugin folder into plugins dir 2. App detects within seconds 3. Plugin appears in list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
