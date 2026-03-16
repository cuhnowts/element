# Phase 4: Plugin System - Research

**Researched:** 2026-03-15
**Domain:** Plugin architecture, secure credential storage, OS keychain integration, OAuth calendar integration, filesystem watching
**Confidence:** MEDIUM-HIGH

## Summary

Phase 4 adds four major capabilities to Element: a file-drop plugin system with manifest-based discovery and hot-reload, a credential vault backed by the OS keychain, core plugins (shell, HTTP, file system) that ship as built-in workflow steps, and Google/Outlook calendar integration via OAuth. The phase builds on the existing Rust backend (Mutex<Connection> SQLite, Tauri IPC commands, serde_json models) and React frontend (Zustand stores, shadcn/ui components).

The key technical challenges are: (1) designing a plugin manifest schema and Plugin Host that watches a directory and validates/loads plugins without destabilizing the app, (2) integrating the `keyring` crate for OS-native credential storage since Tauri's Stronghold plugin is deprecated and being removed in v3, (3) implementing OAuth PKCE flows for Google and Microsoft calendar APIs in a desktop app where redirect URIs require a temporary localhost server, and (4) adding new SQLite tables for plugin metadata and calendar event caching while maintaining the existing migration pattern.

**Primary recommendation:** Use the `keyring` crate (v3.6.x) directly for credential storage, `notify` crate (v8.x) for plugin directory watching, `reqwest` (v0.12.x) for HTTP requests (both core plugin and calendar API calls), and `tauri-plugin-oauth` (v2) for OAuth redirect handling. Core plugins should be implemented as Rust modules that follow the same manifest/API pattern as user plugins but are compiled into the binary.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Plugins are single folders with a manifest file + plugin code files -- simple, inspectable, version-controllable
- Plugin Host uses FS watcher for hot-reload -- detects changes and auto-reloads plugins (great for development)
- Failed plugins show in the plugin list with an error badge and details -- app continues normally, user can fix and reload
- Capability-based permission model: manifest declares needed capabilities (e.g., 'network', 'fs:read', 'credentials'). Plugin Host enforces boundaries at runtime
- Aligns with ARCHITECTURE.md: plugins cannot access raw IPC or DB, only the defined Plugin API surface
- Dedicated 'Credentials' section in app settings -- vault-style UI for adding/editing/deleting named credentials
- Secrets stored in OS keychain (macOS Keychain / Windows Credential Manager) via Tauri's secure storage
- Named credential model: user creates credentials (e.g., 'Google API Key'), plugin manifest declares which credential names it requires, Plugin Host provides only declared credentials
- Vault UI supports reveal (temporary unmask) and copy-to-clipboard buttons -- standard 1Password/Bitwarden pattern
- Shell command plugin: unrestricted command execution with warning icon on shell steps
- Data passing between workflow steps: structured JSON documents
- HTTP request plugin: full HTTP client -- method, URL, headers, body, auth, timeout
- File system plugin: read, write, list, and watch capabilities. Scoped to user-configured paths for safety
- OAuth flow via in-app browser popup (Tauri webview) -- capture token, store in credential vault
- Full event details displayed in the existing Phase 2 calendar panel: title, time, location, attendees, description. Events are read-only
- Background poll every 5 minutes for sync, plus manual refresh button
- Multiple calendar accounts supported, each color-coded in the calendar panel

### Claude's Discretion
- Plugin manifest schema specifics (exact fields, validation rules)
- Plugin API surface design (trait definitions, method signatures)
- Sandbox implementation approach (process isolation vs capability restriction)
- Calendar event caching strategy in SQLite
- Credential vault UI layout details
- Core plugin step configuration UI

### Deferred Ideas (OUT OF SCOPE)
- Plugin marketplace with paid workflows -- PLAT-02 in v2 requirements
- Pulse signal ingestion (email, Slack, GitHub) -- INTEL-01 in v2
- Plugin auto-update mechanism -- future enhancement
- Calendar event editing from within Element -- read-only for now
- Plugin dependency management (plugin A depends on plugin B) -- complexity not needed for v1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PLUG-01 | User can add plugins by dropping files into a directory | `notify` v8.x for FS watching, manifest.json schema validation via serde, Plugin Host module that scans/loads/validates plugins on startup and change events |
| PLUG-02 | App securely stores credentials (API keys, tokens, secrets) | `keyring` v3.6.x for OS keychain (macOS Keychain, Windows Credential Manager), SQLite for credential metadata (name, type, notes), Tauri IPC commands for CRUD |
| PLUG-03 | Core plugins: shell command, HTTP request, file system operations | `tokio::process::Command` for shell (already in deps), `reqwest` v0.12.x for HTTP, `std::fs`/`tokio::fs` for file ops, all following the same Plugin trait interface as user plugins |
| PLUG-04 | Calendar integration plugin reads Google/Outlook events | `tauri-plugin-oauth` v2 for OAuth PKCE localhost redirect, `reqwest` for API calls, Google Calendar API v3 REST + Microsoft Graph Calendar API, SQLite cache for events |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| keyring | 3.6.x | OS keychain credential storage | De facto Rust crate for cross-platform keychain access (6M+ downloads). Stronghold is deprecated/removed in Tauri v3. Features: `apple-native` (macOS), `windows-native`, `sync-secret-service` (Linux) |
| notify | 8.2.x | Filesystem watching for plugin directory | Standard Rust FS watcher (62M+ downloads). Used by rust-analyzer, deno, alacritty. Supports macOS FSEvents, Windows ReadDirectoryChanges, Linux inotify |
| reqwest | 0.12.x | HTTP client for HTTP plugin + calendar APIs | Standard Rust HTTP client (300M+ downloads). Async, supports JSON, headers, auth, timeouts. Already compatible with tokio in the project |
| tauri-plugin-oauth | 2 | OAuth redirect handling for calendar auth | Tauri 2 compatible. Spawns temporary localhost server to capture OAuth redirects. Solves the desktop app redirect URI problem |
| serde_json | 1.x | Plugin manifest parsing, Document data | Already in project. JSON schema validation for manifests |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsonschema | 0.28.x | JSON Schema validation for plugin manifests | Validate plugin.json against the manifest schema at load time. Prevents malformed plugins from crashing the host |
| chrono | 0.4.x | Calendar event timestamps, sync timing | Already in project. RFC3339 parsing for Google/Microsoft calendar event times |
| uuid | 1.x | Plugin instance IDs, credential IDs | Already in project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| keyring | tauri-plugin-stronghold | Stronghold deprecated in Tauri v3. Requires password entry. keyring uses OS-native keychain transparently |
| keyring | tauri-plugin-keyring (community) | Thin wrapper over the same keyring crate. Using keyring directly gives more control and fewer dependencies |
| notify | manual polling | Polling wastes CPU and introduces latency. notify uses OS-native events (FSEvents, inotify) |
| reqwest | ureq | ureq is sync-only. Element uses tokio throughout; reqwest's async API is the natural fit |
| JSON manifest | TOML manifest | ARCHITECTURE.md mentions TOML but STACK.md specifies JSON. JSON aligns with existing serde_json usage and JSON Schema validation tooling. CONTEXT.md references plugin.json |

**Installation (Cargo.toml additions):**
```toml
keyring = { version = "3.6", features = ["apple-native", "windows-native", "sync-secret-service"] }
notify = { version = "8", features = ["macos_fsevent"] }
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }
tauri-plugin-oauth = "2"
jsonschema = "0.28"
```

**Installation (package.json additions):**
```bash
npm install @anthropic/tauri-plugin-oauth-api  # if JS bindings needed
```

## Architecture Patterns

### Recommended Project Structure

```
src-tauri/src/
  plugins/
    mod.rs           # Plugin Host: load, validate, watch, lifecycle
    manifest.rs      # PluginManifest struct + JSON schema validation
    registry.rs      # Plugin registry: track loaded plugins, status, errors
    api.rs           # Plugin API trait: what plugins can call
    core/
      mod.rs         # Core plugin registrations
      shell.rs       # Shell command step implementation
      http.rs        # HTTP request step implementation
      filesystem.rs  # File system operations step implementation
      calendar.rs    # Calendar integration plugin
  credentials/
    mod.rs           # Credential manager: CRUD + keychain bridge
    keychain.rs      # OS keychain operations via keyring crate
  commands/
    plugin_commands.rs    # Tauri IPC commands for plugin management
    credential_commands.rs # Tauri IPC commands for credential vault
    calendar_commands.rs   # Tauri IPC commands for calendar sync
  db/
    sql/
      002_plugins_credentials_calendar.sql  # New migration

src/
  stores/
    pluginSlice.ts       # Plugin state (list, status, errors)
    credentialSlice.ts   # Credential vault state
    calendarSlice.ts     # Calendar events, sync status, accounts
  components/
    settings/
      SettingsPage.tsx       # Settings shell with nav tabs
      SettingsNav.tsx        # Left nav: Plugins, Credentials, Calendars
      PluginList.tsx         # Plugin management panel
      PluginCard.tsx         # Individual plugin card with status
      CredentialVault.tsx    # Vault-style credential list
      CredentialDialog.tsx   # Add/edit credential dialog
      CalendarAccounts.tsx   # Connected accounts, connect buttons
    center/
      steps/
        ShellStepConfig.tsx    # Shell command step configuration
        HttpStepConfig.tsx     # HTTP request step configuration
        FileStepConfig.tsx     # File system step configuration
```

### Pattern 1: Plugin Manifest Schema

**What:** Every plugin is a directory containing a `plugin.json` manifest and associated files.
**When to use:** Plugin discovery, validation, capability enforcement.

```json
{
  "$schema": "https://element.app/schemas/plugin-manifest-v1.json",
  "name": "example-plugin",
  "version": "1.0.0",
  "display_name": "Example Plugin",
  "description": "Does something useful",
  "author": "Author Name",
  "capabilities": ["network", "credentials"],
  "credentials": ["example-api-key"],
  "entry": "plugin.js",
  "step_types": [
    {
      "id": "example-step",
      "name": "Example Step",
      "description": "Performs an example action",
      "input_schema": {},
      "output_schema": {}
    }
  ]
}
```

**Rust struct:**
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub display_name: String,
    pub description: String,
    pub author: Option<String>,
    pub capabilities: Vec<PluginCapability>,
    pub credentials: Vec<String>,       // named credentials this plugin needs
    pub entry: Option<String>,          // entry file (None for core plugins)
    pub step_types: Vec<StepTypeDefinition>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PluginCapability {
    Network,
    #[serde(rename = "fs:read")]
    FsRead,
    #[serde(rename = "fs:write")]
    FsWrite,
    Credentials,
    Shell,
}
```

### Pattern 2: Plugin Host Lifecycle

**What:** The Plugin Host manages plugin discovery, loading, validation, and hot-reload.
**When to use:** App startup and ongoing plugin directory monitoring.

```rust
pub struct PluginHost {
    plugins_dir: PathBuf,
    registry: Arc<RwLock<PluginRegistry>>,
    watcher: Option<notify::RecommendedWatcher>,
}

impl PluginHost {
    /// Scan plugins directory, validate manifests, register valid plugins
    pub fn scan_and_load(&self) -> Vec<PluginLoadResult> { ... }

    /// Start FS watcher for hot-reload
    pub fn start_watching(&mut self) -> Result<(), notify::Error> {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut watcher = notify::recommended_watcher(tx)?;
        watcher.watch(&self.plugins_dir, RecursiveMode::Recursive)?;
        // Process events: reload changed plugins, add new, remove deleted
        ...
    }

    /// Get plugin by name
    pub fn get_plugin(&self, name: &str) -> Option<LoadedPlugin> { ... }

    /// Enable/disable a plugin
    pub fn set_enabled(&self, name: &str, enabled: bool) -> Result<(), PluginError> { ... }
}
```

### Pattern 3: Credential Manager with Keychain Bridge

**What:** Credentials stored as metadata in SQLite (name, type, notes) with secrets in OS keychain.
**When to use:** Any credential CRUD operation.

```rust
pub struct CredentialManager {
    // SQLite stores: id, name, credential_type, notes, created_at, updated_at
    // Keychain stores: actual secret value, keyed by "element:{credential_id}"
}

impl CredentialManager {
    pub fn create(&self, name: &str, cred_type: &str, value: &str, notes: &str) -> Result<Credential> {
        // 1. Insert metadata row into SQLite
        // 2. Store secret in keychain via keyring::Entry::new("element", &id).set_password(value)
        // 3. Return metadata (never return the secret value in metadata)
    }

    pub fn get_secret(&self, id: &str) -> Result<String> {
        // Retrieve from keychain: keyring::Entry::new("element", id).get_password()
    }

    pub fn delete(&self, id: &str) -> Result<()> {
        // 1. Delete from keychain
        // 2. Delete metadata from SQLite
    }
}
```

### Pattern 4: OAuth PKCE Flow for Calendar

**What:** OAuth authorization code flow with PKCE using a temporary localhost server for redirect capture.
**When to use:** Connecting Google Calendar or Outlook Calendar accounts.

```
1. User clicks "Connect Google Calendar"
2. Backend generates PKCE code_verifier + code_challenge
3. Backend starts tauri-plugin-oauth localhost server on random port
4. Frontend opens OAuth URL in system browser (or Tauri webview)
   - URL includes: client_id, redirect_uri=http://localhost:{port}/callback,
     scope, code_challenge, code_challenge_method=S256
5. User authorizes in browser
6. Provider redirects to localhost:{port}/callback?code=XXX
7. tauri-plugin-oauth captures the code
8. Backend exchanges code + code_verifier for access_token + refresh_token
9. Store refresh_token in credential vault (keychain)
10. Store access_token in memory (short-lived)
11. Shut down localhost server
```

### Anti-Patterns to Avoid

- **Plugin code in main process without isolation:** Even though full WASM sandboxing is deferred, plugins must not have direct access to the Database struct or raw Tauri IPC. All interaction goes through the Plugin API trait.
- **Storing secrets in SQLite:** Secrets MUST go in the OS keychain via `keyring`. SQLite stores only non-sensitive metadata (name, type, creation date). This was called out in PITFALLS.md.
- **Blocking the main thread during plugin load:** Plugin scanning, manifest validation, and FS watching must be async or run on a background thread. A slow/malformed plugin must never freeze the app.
- **Full calendar re-sync on every poll:** Use incremental sync (Google's `syncToken`, Microsoft's `deltaLink`) to minimize API calls and respect rate limits.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OS keychain access | Custom encryption/storage | `keyring` crate v3.6.x | Cross-platform keychain abstraction. Handles macOS Keychain, Windows Credential Manager, Linux Secret Service. Encryption is OS-managed |
| Filesystem watching | Manual polling loop | `notify` crate v8.x | OS-native events (FSEvents, inotify, ReadDirectoryChanges). Battle-tested in rust-analyzer, deno. Handles debouncing, recursive watching |
| OAuth redirect capture | Custom HTTP server | `tauri-plugin-oauth` v2 | Handles random port selection, temporary server lifecycle, redirect capture. Solves the desktop OAuth redirect problem cleanly |
| HTTP client | Raw TCP/custom client | `reqwest` v0.12.x | Async, TLS, JSON, auth headers, timeouts. Standard Rust HTTP client |
| JSON Schema validation | Custom validation logic | `jsonschema` crate | Validates plugin manifests against a schema. Catches structural errors before plugin code runs |
| PKCE code generation | Manual crypto | `rand` + `sha2` + `base64` | Standard PKCE implementation using existing crypto crates. code_verifier is 43-128 char random string, code_challenge is BASE64URL(SHA256(code_verifier)) |

**Key insight:** This phase has many integration points (OS keychain, filesystem events, OAuth flows, calendar APIs) where the edge cases far outweigh the happy path. Each library listed above handles dozens of platform-specific quirks that would take weeks to hand-roll.

## Common Pitfalls

### Pitfall 1: Keychain Access Requires Code Signing on macOS
**What goes wrong:** macOS Keychain requires the app to be code-signed for persistent keychain access. Unsigned dev builds may prompt the user every time or fail silently.
**Why it happens:** macOS security model ties keychain access to the app's code signature. In development, the signature changes on every build.
**How to avoid:** During development, use a local-only keychain item with the `kSecAttrAccessible` set appropriately. For production, ensure the Tauri bundle is properly code-signed. Document this as a known dev-mode behavior: "You may see keychain access prompts during development."
**Warning signs:** Tests pass locally but fail in CI. Users report repeated keychain prompts.

### Pitfall 2: FS Watcher Event Storms
**What goes wrong:** Saving a plugin file triggers multiple FS events (create temp, write, rename). Without debouncing, the Plugin Host reloads the same plugin 3-5 times in rapid succession.
**Why it happens:** OS-level filesystem events are granular. A single "save" operation produces multiple events.
**How to avoid:** Debounce FS events with a 500ms-1s window. Only reload a plugin when events for its directory have settled. The `notify` crate's `debouncer` module handles this.
**Warning signs:** Console logs show "Plugin reloaded" multiple times for a single file save.

### Pitfall 3: OAuth Token Refresh Race Condition
**What goes wrong:** Two calendar sync operations run concurrently, both detect an expired token, both try to refresh. One succeeds, the other gets an "invalid grant" because the refresh token was already consumed.
**Why it happens:** OAuth refresh tokens are often single-use. Google and Microsoft both invalidate the old refresh token when a new one is issued.
**How to avoid:** Serialize token refresh through a single-writer lock. When a refresh is in progress, other callers wait for the result rather than initiating their own refresh.
**Warning signs:** Intermittent "invalid_grant" errors in logs. Calendar sync works sometimes but not always.

### Pitfall 4: Google Calendar API Quota Exhaustion
**What goes wrong:** Polling every 5 minutes across multiple calendars burns through API quota, especially with full re-syncs.
**Why it happens:** Google Calendar API has per-user per-minute rate limits. Full sync requests are expensive.
**How to avoid:** Use incremental sync with `syncToken`. First call does a full sync and returns a `syncToken`. Subsequent calls pass the `syncToken` and only receive changes. Store the `syncToken` in SQLite alongside the calendar account record.
**Warning signs:** 403 responses with `rateLimitExceeded` or `userRateLimitExceeded`.

### Pitfall 5: Plugin Manifest Validation Too Strict or Too Loose
**What goes wrong:** Too strict: minor schema version bumps break all plugins. Too loose: malformed manifests cause runtime crashes.
**Why it happens:** Schema validation is a balance. The manifest schema will evolve as the plugin system matures.
**How to avoid:** Validate required fields strictly (name, version, step_types). Treat unknown fields as warnings, not errors (forward compatibility). Version the manifest schema (`"schema_version": 1`) so future changes can be handled gracefully.
**Warning signs:** Users report "valid" plugins failing to load. Or: plugins load but crash at runtime due to missing fields.

## Code Examples

### Plugin Manifest Validation (Rust)

```rust
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub display_name: String,
    pub description: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub capabilities: Vec<String>,
    #[serde(default)]
    pub credentials: Vec<String>,
    pub entry: Option<String>,
    #[serde(default)]
    pub step_types: Vec<StepTypeDefinition>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StepTypeDefinition {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub input_schema: serde_json::Value,
    #[serde(default)]
    pub output_schema: serde_json::Value,
}

pub fn load_plugin_manifest(plugin_dir: &Path) -> Result<PluginManifest, PluginError> {
    let manifest_path = plugin_dir.join("plugin.json");
    if !manifest_path.exists() {
        return Err(PluginError::ManifestNotFound(plugin_dir.to_path_buf()));
    }
    let content = std::fs::read_to_string(&manifest_path)?;
    let manifest: PluginManifest = serde_json::from_str(&content)
        .map_err(|e| PluginError::InvalidManifest(e.to_string()))?;
    validate_manifest(&manifest)?;
    Ok(manifest)
}
```

### Credential Storage with Keyring (Rust)

```rust
use keyring::Entry;

const SERVICE_NAME: &str = "com.element.app";

pub fn store_credential(credential_id: &str, secret: &str) -> Result<(), keyring::Error> {
    let entry = Entry::new(SERVICE_NAME, credential_id)?;
    entry.set_password(secret)?;
    Ok(())
}

pub fn retrieve_credential(credential_id: &str) -> Result<String, keyring::Error> {
    let entry = Entry::new(SERVICE_NAME, credential_id)?;
    entry.get_password()
}

pub fn delete_credential(credential_id: &str) -> Result<(), keyring::Error> {
    let entry = Entry::new(SERVICE_NAME, credential_id)?;
    entry.delete_credential()?;
    Ok(())
}
```

### FS Watcher with Debouncing (Rust)

```rust
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use notify_debouncer_mini::{new_debouncer, DebouncedEvent};
use std::path::Path;
use std::time::Duration;

pub fn watch_plugins_dir(
    plugins_dir: &Path,
    on_change: impl Fn(Vec<DebouncedEvent>) + Send + 'static,
) -> Result<impl Watcher, notify::Error> {
    let (tx, rx) = std::sync::mpsc::channel();
    let mut debouncer = new_debouncer(Duration::from_millis(500), tx)?;
    debouncer.watcher().watch(plugins_dir, RecursiveMode::Recursive)?;

    std::thread::spawn(move || {
        while let Ok(Ok(events)) = rx.recv() {
            on_change(events);
        }
    });

    Ok(debouncer)
}
```

### Google Calendar Incremental Sync (Rust pseudocode)

```rust
pub async fn sync_google_calendar(
    client: &reqwest::Client,
    access_token: &str,
    calendar_id: &str,
    sync_token: Option<&str>,
) -> Result<CalendarSyncResult, CalendarError> {
    let mut url = format!(
        "https://www.googleapis.com/calendar/v3/calendars/{}/events",
        calendar_id
    );

    let mut params = vec![
        ("singleEvents", "true"),
        ("orderBy", "startTime"),
    ];

    if let Some(token) = sync_token {
        params.push(("syncToken", token));
    } else {
        // Full sync: fetch events from now to 30 days ahead
        let time_min = chrono::Utc::now().to_rfc3339();
        let time_max = (chrono::Utc::now() + chrono::Duration::days(30)).to_rfc3339();
        params.push(("timeMin", &time_min));
        params.push(("timeMax", &time_max));
    }

    let response = client
        .get(&url)
        .bearer_auth(access_token)
        .query(&params)
        .send()
        .await?;

    // Parse response, extract events + next syncToken
    // Store syncToken for next incremental sync
    ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tauri-plugin-stronghold for secrets | `keyring` crate directly | Stronghold deprecated for Tauri v3 | Must use keyring for forward compatibility |
| notify v6/v7 with manual debounce | notify v8 with notify-debouncer-mini | 2024-2025 | Cleaner API, built-in debouncer companion crate |
| Google Calendar API v2 | Google Calendar API v3 | Stable since 2015 | v3 supports incremental sync via syncToken |
| Outlook REST API (deprecated) | Microsoft Graph API | 2020+ | All Outlook calendar access goes through Microsoft Graph now |
| OAuth implicit flow for desktop | OAuth PKCE flow | Industry standard since ~2020 | PKCE is required for public clients (desktop apps). No client_secret needed |

**Deprecated/outdated:**
- **tauri-plugin-stronghold:** Deprecated, being removed in Tauri v3. Do not use for new development.
- **Outlook REST API (v2):** Deprecated by Microsoft. Use Microsoft Graph API (`https://graph.microsoft.com/v1.0/me/calendarView`).
- **OAuth implicit flow:** Insecure for desktop apps. Use Authorization Code + PKCE.

## Open Questions

1. **Plugin code execution model for user plugins**
   - What we know: Core plugins are compiled Rust. User plugins need a manifest + "entry" file.
   - What's unclear: For v1, do user plugins only contribute workflow definitions (JSON data), or do they also execute custom code? If code execution, what runtime?
   - Recommendation: For v1, user plugins are data-only (workflow definitions + manifest). They contribute new step types that compose existing capabilities (shell, HTTP, FS). Code execution plugins can be added in v2 with a JS/WASM runtime. This keeps v1 simple and secure.

2. **notify-debouncer-mini vs notify-debouncer-full**
   - What we know: `notify` has two companion debouncer crates.
   - What's unclear: Whether the mini debouncer is sufficient or if the full debouncer's event merging is needed.
   - Recommendation: Start with `notify-debouncer-mini` (simpler, fewer dependencies). Upgrade to full only if event storm issues arise.

3. **Google/Microsoft OAuth client_id registration**
   - What we know: OAuth requires registered client IDs with the providers.
   - What's unclear: How to distribute client IDs. Embedding them in the binary is standard for desktop apps (Google explicitly supports this), but they're technically "public."
   - Recommendation: Embed client IDs in the binary (standard practice for desktop OAuth). Use PKCE which eliminates the need for a client_secret. Document that users can optionally bring their own client IDs via settings.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (Rust) | cargo test (built-in) |
| Framework (Frontend) | vitest 4.1.x |
| Config file (Frontend) | vite.config.ts (test section) |
| Quick run command (Rust) | `cd src-tauri && cargo test` |
| Quick run command (Frontend) | `npm run test` |
| Full suite command | `cd src-tauri && cargo test && cd .. && npm run test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLUG-01 | Plugin manifest parsing + validation | unit (Rust) | `cd src-tauri && cargo test plugins::manifest -x` | No -- Wave 0 |
| PLUG-01 | Plugin Host scans directory and loads valid plugins | unit (Rust) | `cd src-tauri && cargo test plugins::host -x` | No -- Wave 0 |
| PLUG-01 | Plugin list UI displays plugins with status | unit (Frontend) | `npx vitest run src/components/settings/PluginList.test.tsx` | No -- Wave 0 |
| PLUG-02 | Credential CRUD (create, read, delete) via keychain bridge | unit (Rust) | `cd src-tauri && cargo test credentials -x` | No -- Wave 0 |
| PLUG-02 | Credential vault UI: add, reveal, copy, delete | unit (Frontend) | `npx vitest run src/components/settings/CredentialVault.test.tsx` | No -- Wave 0 |
| PLUG-03 | Shell step executes command and captures output | unit (Rust) | `cd src-tauri && cargo test plugins::core::shell -x` | No -- Wave 0 |
| PLUG-03 | HTTP step makes request with configured method/headers | unit (Rust) | `cd src-tauri && cargo test plugins::core::http -x` | No -- Wave 0 |
| PLUG-03 | File system step reads/writes/lists files | unit (Rust) | `cd src-tauri && cargo test plugins::core::filesystem -x` | No -- Wave 0 |
| PLUG-04 | Calendar events cached in SQLite and returned via IPC | unit (Rust) | `cd src-tauri && cargo test commands::calendar -x` | No -- Wave 0 |
| PLUG-04 | Calendar account list displays connected accounts | unit (Frontend) | `npx vitest run src/components/settings/CalendarAccounts.test.tsx` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `cd src-tauri && cargo test && npm run test`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src-tauri/src/plugins/mod.rs` -- Plugin Host module structure
- [ ] `src-tauri/src/plugins/manifest.rs` -- Manifest parsing tests with valid/invalid fixtures
- [ ] `src-tauri/src/credentials/mod.rs` -- Credential manager with mock keychain for tests
- [ ] `src-tauri/src/db/sql/002_plugins_credentials_calendar.sql` -- Migration for new tables
- [ ] `src/components/settings/PluginList.test.tsx` -- Plugin list rendering tests
- [ ] `src/components/settings/CredentialVault.test.tsx` -- Vault CRUD tests
- [ ] `src/components/settings/CalendarAccounts.test.tsx` -- Calendar account tests
- [ ] Test fixtures: valid plugin manifest JSON, invalid manifests, sample calendar API responses

**Note on credential tests:** The `keyring` crate accesses real OS keychain in tests. For unit tests, create a mock/trait-based abstraction (`trait SecretStore`) so tests can use an in-memory implementation. Only integration tests should hit the real keychain.

## SQLite Migration Design

New migration `002_plugins_credentials_calendar.sql`:

```sql
-- Plugin metadata (loaded plugins and their state)
CREATE TABLE IF NOT EXISTS plugins (
    name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    author TEXT,
    capabilities TEXT NOT NULL DEFAULT '[]',  -- JSON array
    enabled INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active', 'error', 'disabled', 'loading')),
    error_message TEXT,
    loaded_at TEXT NOT NULL,
    plugin_path TEXT NOT NULL
);

-- Credential metadata (secrets stored in OS keychain, not here)
CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    credential_type TEXT NOT NULL DEFAULT 'api_key'
        CHECK(credential_type IN ('api_key', 'token', 'secret', 'oauth_token')),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Calendar accounts
CREATE TABLE IF NOT EXISTS calendar_accounts (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK(provider IN ('google', 'outlook')),
    email TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    credential_id TEXT NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
    sync_token TEXT,            -- Google syncToken or Microsoft deltaLink
    last_synced_at TEXT,
    color_index INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

-- Cached calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,              -- provider's event ID
    account_id TEXT NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    location TEXT,
    start_time TEXT NOT NULL,          -- RFC3339
    end_time TEXT NOT NULL,            -- RFC3339
    all_day INTEGER NOT NULL DEFAULT 0,
    attendees TEXT NOT NULL DEFAULT '[]',  -- JSON array
    status TEXT NOT NULL DEFAULT 'confirmed',
    updated_at TEXT NOT NULL            -- provider's last-modified time
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_account ON calendar_events(account_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_credentials_name ON credentials(name);
```

## Sources

### Primary (HIGH confidence)
- [keyring crate (crates.io)](https://crates.io/crates/keyring) - v3.6.3, OS keychain abstraction
- [notify crate (crates.io)](https://crates.io/crates/notify) - v8.2.0, filesystem watching
- [reqwest crate (crates.io)](https://crates.io/crates/reqwest) - v0.12.24, HTTP client
- [Tauri Stronghold Plugin (deprecated notice)](https://v2.tauri.app/plugin/stronghold/) - Deprecated for v3
- [Google Calendar API Auth](https://developers.google.com/calendar/api/guides/auth) - OAuth scopes and flow
- [Google OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app) - PKCE flow for native apps
- [Microsoft Graph Calendar API](https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview) - Calendar API overview

### Secondary (MEDIUM confidence)
- [tauri-plugin-oauth (GitHub)](https://github.com/FabianLars/tauri-plugin-oauth) - v2 for Tauri 2, localhost redirect server
- [tauri-plugin-keyring (GitHub)](https://github.com/HuakunShen/tauri-plugin-keyring) - Community wrapper over keyring crate
- [Tauri OAuth Discussion #8554](https://github.com/tauri-apps/tauri/discussions/8554) - Community patterns for OAuth in Tauri

### Tertiary (LOW confidence)
- Plugin manifest schema design is based on architectural patterns from ARCHITECTURE.md and common plugin systems (VSCode, Obsidian, Tauri's own plugin system). No single authoritative source; this is a custom design.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All crates are well-established with millions of downloads. Versions verified on crates.io.
- Architecture: MEDIUM-HIGH - Plugin Host pattern is well-understood. Specific trait design is custom and will need iteration.
- Pitfalls: HIGH - OAuth, keychain, and FS watcher pitfalls are well-documented across the Tauri and Rust ecosystems.
- Calendar API integration: MEDIUM - Google Calendar v3 is stable and well-documented. Microsoft Graph is more complex. OAuth flow in desktop apps has known challenges with redirect URIs.

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (30 days - stable ecosystem, no fast-moving dependencies)
