---
phase: 04-plugin-system
verified: 2026-03-18T00:00:00Z
status: gaps_found
score: 11/12 must-haves verified
re_verification: false
gaps:
  - truth: "User can connect a Google Calendar account via OAuth PKCE flow"
    status: failed
    reason: "OAuth client IDs are compile-time placeholders. Without GOOGLE_CLIENT_ID set as an env var at build time, the OAuth URL sent to Google contains 'placeholder-google-client-id.apps.googleusercontent.com', causing Google to reject the OAuth request with invalid_client. No .env file, build.rs documentation, or runtime fallback exists to guide users to supply their own client IDs."
    artifacts:
      - path: "src-tauri/src/plugins/core/calendar.rs"
        issue: "Lines 9-12: GOOGLE_CLIENT_ID_STR falls back to 'placeholder-google-client-id.apps.googleusercontent.com' when GOOGLE_CLIENT_ID env var is not set at compile time"
      - path: "src-tauri/src/plugins/core/calendar.rs"
        issue: "Lines 14-17: MICROSOFT_CLIENT_ID_STR falls back to 'placeholder-microsoft-client-id' when MICROSOFT_CLIENT_ID env var is not set at compile time"
    missing:
      - "Either: ship a build.rs that validates GOOGLE_CLIENT_ID/MICROSOFT_CLIENT_ID are set (hard error on missing), OR document that users must set these env vars before building, OR add a runtime check in connect_google_calendar/connect_outlook_calendar that returns a descriptive error when placeholder values are detected"
      - "A .env.example or SETUP.md explaining how to register OAuth apps for Google and Microsoft and supply client IDs"
  - truth: "User can connect an Outlook Calendar account via OAuth PKCE flow"
    status: failed
    reason: "Same root cause as Google: MICROSOFT_CLIENT_ID_STR is 'placeholder-microsoft-client-id' at runtime without env var at compile time. Microsoft identity platform will reject the OAuth request."
    artifacts:
      - path: "src-tauri/src/plugins/core/calendar.rs"
        issue: "Lines 14-17: placeholder Microsoft client ID used when env var not set"
    missing:
      - "Same fix as Google Calendar: runtime guard or build-time validation for client ID presence"
human_verification:
  - test: "Verify calendar OAuth works end-to-end with real client IDs"
    expected: "After setting GOOGLE_CLIENT_ID/MICROSOFT_CLIENT_ID env vars and rebuilding, clicking Connect Google Calendar opens a browser OAuth consent screen, user signs in, tokens are stored, and events appear in the mini calendar"
    why_human: "Requires real Google/Microsoft OAuth app registration, browser interaction, and network access to external APIs"
  - test: "Verify 5-minute background poll syncs new events"
    expected: "After connecting a calendar, new events added to Google/Outlook Calendar within the next 5 minutes appear in Element without manual refresh"
    why_human: "Requires real credentials, timing observation, and external calendar mutations"
  - test: "Verify plugin hot-reload on file drop"
    expected: "Dropping a valid plugin folder into the plugins directory causes the plugin to appear in the Plugin List within seconds, without restarting the app"
    why_human: "Requires FS watcher timing observation at runtime; cannot verify statically"
  - test: "Verify OS keychain credential reveal"
    expected: "Adding a credential stores it in the OS keychain. Clicking the Eye icon retrieves and displays the value. After 10 seconds the value is masked again."
    why_human: "Requires OS-level keychain interaction; confirmed working by user in UAT but warrants re-check after any credential store changes"
---

# Phase 4: Plugin System Verification Report

**Phase Goal:** User can extend Element with file-drop plugins, securely store credentials, and use core connectors for shell, HTTP, file system, and calendar
**Verified:** 2026-03-18
**Status:** gaps_found — 1 blocker (PLUG-04 OAuth placeholder client IDs)
**Re-verification:** No — initial verification

---

## Context: UAT Results

Per the user acceptance testing context provided:
- PLUG-01 (plugin management): verified working by user
- PLUG-02 (credential vault): verified working by user
- PLUG-03 (core plugins): verified working by user
- PLUG-04 (calendar): built but "the calendars plugin didn't work" — confirmed as runtime issue

This verification identifies the specific root cause of the PLUG-04 failure.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Plugin manifest JSON files are parsed and validated | VERIFIED | `plugins/manifest.rs` 228 lines, exports `PluginManifest`, `PluginCapability`, `load_plugin_manifest`; tests present |
| 2 | Plugin Host scans plugins directory on startup | VERIFIED | `plugins/mod.rs` 344 lines, `scan_and_load` at line 36, unit tests at lines 281-295 |
| 3 | Plugin Host watches directory and hot-reloads | VERIFIED | `start_watching` at line 123 in `plugins/mod.rs` using `notify` crate |
| 4 | Credentials stored in SQLite + OS keychain | VERIFIED | `credentials/mod.rs` 275 lines, `SecretStore` trait + `KeychainStore` + `InMemoryStore` in `keychain.rs` |
| 5 | Credential CRUD available via Tauri IPC | VERIFIED | `commands/credential_commands.rs` exports `list_credentials`, `create_credential`, `delete_credential` |
| 6 | Plugin list/status available via Tauri IPC | VERIFIED | `commands/plugin_commands.rs` exports `list_plugins`, `enable_plugin`, `disable_plugin`, `execute_step` |
| 7 | User can open Settings, see Plugins/Credentials/Calendars tabs | VERIFIED | `SettingsPage.tsx` wired in `AppLayout.tsx`; sidebar button in `Sidebar.tsx` calls `openSettings()`; Escape key closes |
| 8 | User can see installed plugins with status and toggle | VERIFIED | `PluginList.tsx` 67 lines using `useStore((s) => s.plugins)`, renders `PluginCard` per plugin |
| 9 | User can manage credentials (add/reveal/copy/delete) | VERIFIED | `CredentialVault.tsx` 227 lines; auto-mask at 10s via `setTimeout` in `credentialSlice.ts` line 74 |
| 10 | Shell/HTTP/FS core plugins execute as workflow steps | VERIFIED | `plugins/core/shell.rs`, `http.rs`, `filesystem.rs` all substantive (135-203 lines each); `register_core_plugins` registers 4 built-ins; `execute_step` command dispatches by type |
| 11 | Calendar code exists with full OAuth + sync implementation | VERIFIED | `plugins/core/calendar.rs` 1432 lines; `commands/calendar_commands.rs` 500+ lines; all 6 commands registered in `lib.rs`; `CalendarAccounts.tsx` 272 lines; `MiniCalendar.tsx` reads from calendar store |
| 12 | Calendar OAuth flows succeed with valid client IDs | FAILED | `GOOGLE_CLIENT_ID_STR` and `MICROSOFT_CLIENT_ID_STR` fall back to hardcoded placeholders when env vars are absent at compile time — OAuth requests will be rejected by Google/Microsoft |

**Score: 11/12 truths verified**

---

## Required Artifacts

### Plan 00 (Test Infrastructure)

| Artifact | Min Lines | Actual | Status | Details |
|----------|-----------|--------|--------|---------|
| `src/components/settings/PluginList.test.tsx` | 20 | 45 | VERIFIED | Contains `describe("PluginList"`, `it.todo` stubs |
| `src/components/settings/CredentialVault.test.tsx` | 20 | 50 | VERIFIED | Contains `describe("CredentialVault"`, `No credentials stored` |
| `src/components/settings/CalendarAccounts.test.tsx` | 20 | 45 | VERIFIED | Contains `describe("CalendarAccounts"`, `No calendars connected` |
| `src-tauri/src/test_fixtures/manifests.rs` | — | present | VERIFIED | Contains `VALID_MANIFEST`, `INVALID_MISSING_NAME`, `VALID_WITH_EXTRAS`, `VALID_ALL_CAPABILITIES` |
| `src-tauri/src/test_fixtures/calendar_responses.rs` | — | present | VERIFIED | Contains `GOOGLE_EVENTS_RESPONSE`, `OUTLOOK_EVENTS_RESPONSE`, `nextSyncToken`, `deltaLink` |

### Plan 01 (Backend Foundation)

| Artifact | Min Lines | Actual | Status | Details |
|----------|-----------|--------|--------|---------|
| `src-tauri/src/plugins/manifest.rs` | — | 228 | VERIFIED | Exports `PluginManifest`, `PluginCapability`, `StepTypeDefinition`, `load_plugin_manifest` |
| `src-tauri/src/plugins/registry.rs` | — | 141 | VERIFIED | Exports `PluginRegistry`, `LoadedPlugin`, `PluginStatus` |
| `src-tauri/src/plugins/mod.rs` | — | 344 | VERIFIED | Exports `PluginHost` with `scan_and_load`, `start_watching` |
| `src-tauri/src/plugins/api.rs` | — | present | VERIFIED | `PluginApi` trait defined |
| `src-tauri/src/credentials/mod.rs` | — | 275 | VERIFIED | Exports `CredentialManager`, `Credential` with CRUD |
| `src-tauri/src/credentials/keychain.rs` | — | 111 | VERIFIED | Exports `SecretStore`, `KeychainStore`, `InMemoryStore` |
| `src-tauri/src/db/sql/005_plugins_credentials_calendar.sql` | — | present | VERIFIED | Tables: plugins, credentials, calendar_accounts, calendar_events (file renamed 005_ vs plan's 002_, but correctly referenced in migrations.rs) |

### Plan 02 (Settings UI)

| Artifact | Min Lines | Actual | Status | Details |
|----------|-----------|--------|--------|---------|
| `src/components/settings/SettingsPage.tsx` | 30 | 81 | VERIFIED | Settings shell with nav, Escape-to-close |
| `src/components/settings/PluginList.tsx` | 40 | 67 | VERIFIED | Renders `PluginCard` per plugin from store |
| `src/components/settings/CredentialVault.tsx` | 50 | 227 | VERIFIED | Reveal/copy/delete with 10s auto-mask |
| `src/components/settings/CredentialDialog.tsx` | 40 | 183 | VERIFIED | Add/edit credential form |
| `src/stores/pluginSlice.ts` | — | 78 | VERIFIED | Exports `createPluginSlice`, `PluginSlice` |
| `src/stores/credentialSlice.ts` | — | 110 | VERIFIED | Exports `createCredentialSlice`, `CredentialSlice` |

### Plan 03 (Core Plugins)

| Artifact | Min Lines | Actual | Status | Details |
|----------|-----------|--------|--------|---------|
| `src-tauri/src/plugins/core/shell.rs` | — | 135 | VERIFIED | Exports `ShellPlugin`, `ShellStepInput`, `ShellStepOutput`; uses `tokio::process::Command` |
| `src-tauri/src/plugins/core/http.rs` | — | 186 | VERIFIED | Exports `HttpPlugin`, `HttpStepInput`, `HttpStepOutput`; uses `reqwest::Client` |
| `src-tauri/src/plugins/core/filesystem.rs` | — | 203 | VERIFIED | Exports `FilesystemPlugin`, `FsStepInput`, `FsStepOutput` |
| `src-tauri/src/plugins/core/mod.rs` | — | 258 | VERIFIED | Exports `register_core_plugins`; registers 4 built-ins |
| `src/components/settings/steps/ShellStepConfig.tsx` | 30 | 84 | VERIFIED | Shell step configuration UI |
| `src/components/settings/steps/HttpStepConfig.tsx` | 50 | 223 | VERIFIED | HTTP step config with method/headers/body/auth |
| `src/components/settings/steps/FileStepConfig.tsx` | 30 | 80 | VERIFIED | File step configuration UI |

### Plan 04 (Calendar)

| Artifact | Min Lines | Actual | Status | Details |
|----------|-----------|--------|--------|---------|
| `src-tauri/src/plugins/core/calendar.rs` | — | 1432 | VERIFIED (code exists) | Full OAuth PKCE + API sync + SQLite caching implementation; runtime blocked by placeholder client IDs |
| `src-tauri/src/commands/calendar_commands.rs` | — | 500+ | VERIFIED (code exists) | All 6 commands present and registered in lib.rs |
| `src/stores/calendarSlice.ts` | — | 127 | VERIFIED | Exports `createCalendarSlice`, `CalendarSlice`; wired in store index |
| `src/components/settings/CalendarAccounts.tsx` | 50 | 272 | VERIFIED | Connect/disconnect/sync UI fully implemented |

---

## Key Link Verification

### Plan 01 Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `plugins/mod.rs` | `plugins/manifest.rs` | `load_plugin_manifest` call | WIRED | `manifest::load_plugin_manifest` present in mod.rs |
| `plugins/mod.rs` | `plugins/registry.rs` | `registry.register` | WIRED | `registry.register` at multiple call sites |
| `credentials/mod.rs` | `credentials/keychain.rs` | `self.secret_store` | WIRED | `self.secret_store.set_secret`, `.get_secret`, `.delete_secret` at lines 49, 87, 148 |
| `commands/plugin_commands.rs` | `plugins/mod.rs` | `plugin_host.lock` | WIRED | `State<'_, std::sync::Mutex<PluginHost>>` with `.lock()` calls |
| `commands/credential_commands.rs` | `credentials/mod.rs` | `credential_manager.lock` | WIRED | `State<'_, Mutex<CredentialManager>>` with `.lock()` calls |

### Plan 02 Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `PluginList.tsx` | `pluginSlice.ts` | `useStore.*plugins` | WIRED | `useStore((s) => s.plugins)` line 11 |
| `CredentialVault.tsx` | `credentialSlice.ts` | `useStore.*credentials` | WIRED | `useStore((s) => s.credentials)` line 28 |
| `pluginSlice.ts` | `tauri.ts` | `api.listPlugins` | WIRED | `api.listPlugins()` in `fetchPlugins`, `api.enablePlugin(name)` in `enablePlugin` |
| `credentialSlice.ts` | `tauri.ts` | `api.listCredentials` | WIRED | `api.listCredentials()` in `fetchCredentials`, `api.createCredential(...)` in `createCredential` |

### Plan 03 Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `plugins/core/mod.rs` | `plugins/registry.rs` | `registry.register` | WIRED | `registry.register(LoadedPlugin { ... })` at lines 120, 128, 136, 164 |
| `plugins/core/http.rs` | `reqwest` | `reqwest::Client` | WIRED | `reqwest::Client::builder()` at line 38 |
| `plugins/core/shell.rs` | `tokio::process::Command` | process spawn | WIRED | `tokio::process::Command::new(...)` at lines 28 and 32 |
| `commands/plugin_commands.rs` | `plugins/core/mod.rs` | `execute_step` dispatch | WIRED | `execute_step` async command at line 175; dispatches by `step_type_id` |

### Plan 04 Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `plugins/core/calendar.rs` | `reqwest` | `reqwest::Client` | WIRED | `reqwest::Client` used in `sync_google_events`, `sync_outlook_events` |
| `plugins/core/calendar.rs` | `credentials/mod.rs` | `SecretStore` trait | WIRED | `use crate::credentials::keychain::SecretStore` at line 4; `secret_store: &dyn SecretStore` in `CalendarPlugin::sync` at line 684 |
| `commands/calendar_commands.rs` | `plugins/core/calendar.rs` | `calendar_plugin` delegation | WIRED | All commands import `crate::plugins::core::calendar` and call module functions |
| `MiniCalendar.tsx` | `calendarSlice.ts` | `useStore.*calendarEvents` | WIRED | `useStore((s) => s.calendarEvents)` at line 25; events rendered in calendar dots at lines 81, 106 |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PLUG-01 | 04-01, 04-02 | User can add plugins by dropping files into a directory | SATISFIED | `PluginHost.scan_and_load` + `start_watching`; Settings UI with PluginList; IPC commands for list/enable/disable; confirmed working in UAT |
| PLUG-02 | 04-01, 04-02 | App securely stores credentials (API keys, tokens, secrets) | SATISFIED | `CredentialManager` + `KeychainStore` (OS keychain via keyring crate); full CRUD IPC; `CredentialVault.tsx` with reveal/copy/delete; confirmed working in UAT |
| PLUG-03 | 04-03 | Core plugins: shell command, HTTP request, file system operations | SATISFIED | `ShellPlugin`, `HttpPlugin`, `FilesystemPlugin` all implemented and registered; `execute_step` dispatches correctly; confirmed working in UAT |
| PLUG-04 | 04-04 | Calendar integration plugin reads Google/Outlook events | PARTIAL | Full implementation exists (1432-line calendar.rs, 500+ line commands); code compiles and structure is correct; OAuth PKCE flow, incremental sync, SQLite caching, MiniCalendar rendering all implemented. Runtime blocked: placeholder OAuth client IDs cause OAuth requests to fail at Google/Microsoft authorization servers |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src-tauri/src/plugins/core/calendar.rs` | 11 | `"placeholder-google-client-id.apps.googleusercontent.com"` fallback value | BLOCKER | OAuth requests to Google will fail with `invalid_client` — confirmed root cause of user-reported calendar failure |
| `src-tauri/src/plugins/core/calendar.rs` | 16 | `"placeholder-microsoft-client-id"` fallback value | BLOCKER | OAuth requests to Microsoft will fail with `invalid_client` |
| No `.env.example` or `SETUP.md` exists | — | Missing user-setup documentation for OAuth app registration | WARNING | Users have no guidance on how to set `GOOGLE_CLIENT_ID`/`MICROSOFT_CLIENT_ID`; plan 04's `user_setup` section documents the requirement but no file was created |

---

## Human Verification Required

### 1. Calendar OAuth end-to-end (after gap fix)

**Test:** Set `GOOGLE_CLIENT_ID` env var to a real Google OAuth Desktop app client ID, rebuild, click "Connect Google Calendar" in Settings > Calendars tab.
**Expected:** System browser opens Google OAuth consent screen; after sign-in and consent, a new calendar account appears in the list; events sync and appear as dots in the sidebar mini calendar.
**Why human:** Requires real Google OAuth app registration, browser interaction, network access to Google APIs.

### 2. Outlook Calendar OAuth end-to-end (after gap fix)

**Test:** Set `MICROSOFT_CLIENT_ID` env var to a real Azure app registration client ID, rebuild, click "Connect Outlook Calendar".
**Expected:** System browser opens Microsoft identity OAuth consent screen; after sign-in, Outlook calendar account appears with events.
**Why human:** Requires Azure portal app registration and browser interaction.

### 3. 5-minute background poll syncs new events

**Test:** Connect a calendar account. Create a new event in Google/Outlook Calendar directly. Wait up to 5 minutes without manually refreshing.
**Expected:** The new event appears in Element's mini calendar automatically via background incremental sync.
**Why human:** Requires real credentials, timing observation, external calendar mutations.

### 4. Plugin hot-reload on file drop

**Test:** Find the plugins directory for the running Element instance. Copy a folder containing a valid `manifest.json` into it.
**Expected:** Within a few seconds, the plugin appears in Settings > Plugins list without restarting the app.
**Why human:** Requires FS watcher event timing observation at runtime.

---

## Gaps Summary

One gap is blocking PLUG-04 goal achievement. The calendar implementation is complete and well-structured — 1432 lines of Rust covering OAuth PKCE flows, incremental sync tokens, SQLite event caching, and background polling. The frontend is fully wired. The single failure point is that `GOOGLE_CLIENT_ID_STR` and `MICROSOFT_CLIENT_ID_STR` are compile-time constants that fall back to placeholder strings when the `GOOGLE_CLIENT_ID`/`MICROSOFT_CLIENT_ID` env vars are not set at build time.

This is a design choice (users supply their own OAuth app credentials) that is documented in the plan's `user_setup` section but was never surfaced to the user as an explicit setup step, and no runtime guard was added to give a clear error message. The result is that clicking "Connect Google Calendar" opens a browser to an OAuth URL with an invalid client_id, which Google immediately rejects.

**Fix path:** Add a runtime check in `connect_google_calendar` and `connect_outlook_calendar` that detects the placeholder values and returns an actionable error message instructing the user to set up their OAuth app credentials, plus a `SETUP.md` or `.env.example` with the required steps.

PLUG-01, PLUG-02, and PLUG-03 are fully verified and confirmed working. PLUG-04 code is complete and will work once OAuth client IDs are configured.

---

_Verified: 2026-03-18_
_Verifier: Claude (gsd-verifier)_
