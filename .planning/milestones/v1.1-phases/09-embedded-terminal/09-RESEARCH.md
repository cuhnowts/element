# Phase 9: Embedded Terminal - Research

**Researched:** 2026-03-22
**Domain:** PTY management (Rust) + terminal emulation (xterm.js) in Tauri 2
**Confidence:** HIGH

## Summary

Phase 9 embeds a fully interactive terminal into Element's existing output drawer as a third tab. The architecture is: `xterm.js` (frontend renderer) communicates with a Rust PTY backend via Tauri's IPC. The `tauri-plugin-pty` crate (v0.2.1) provides a turnkey solution wrapping `portable-pty` with Tauri 2 commands for spawn/read/write/resize/kill, and its companion npm package `tauri-pty` (v0.2.1) provides a JavaScript API that manages the read polling loop internally.

The frontend uses `@xterm/xterm` v6.0.0 (the current major version) with the `@xterm/addon-fit` addon for automatic resize and `@xterm/addon-webgl` for GPU-accelerated rendering. The xterm.js Terminal instance lives inside a React component in the output drawer. Data flows bidirectionally: user keystrokes go from xterm -> `pty.write()` -> Rust PTY -> shell, and shell output goes from Rust PTY -> polling read loop -> `pty.onData` -> `term.write()`.

Key dependency: Phase 7 (project directory linking) must be completed first. The `directory_path` field on the Project model does not yet exist in code -- it is planned in Phase 7. Phase 9 reads this field to set the terminal's CWD.

**Primary recommendation:** Use `tauri-plugin-pty` + `tauri-pty` as the PTY layer (avoid hand-rolling portable-pty integration), `@xterm/xterm` v6 with fit and webgl addons for rendering, and extend the existing `OutputDrawer.tsx` tab system with a new "Terminal" tab.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Terminal lives as a third tab ("Terminal") in the existing output drawer, alongside Logs and History
- D-02: User opens/closes terminal via keyboard shortcut (Ctrl+`) which toggles the drawer open to the Terminal tab. Manual tab click also works.
- D-03: On first project select (project with a linked directory) in a session, the drawer auto-opens to the Terminal tab. After that, manual only.
- D-04: PTY session spawns lazily -- only when the Terminal tab first receives focus (tab click or keyboard shortcut)
- D-05: Switching projects kills the current PTY session. Next time the terminal tab is focused, a new session starts in the new project's directory. No background/zombie sessions.
- D-06: Multi-session support deferred to TERM-10.
- D-07: For projects without a linked directory, the Terminal tab shows "Link a directory to enable terminal" with a button to open the directory picker.
- D-08: Terminal spawns the user's default login shell (read from $SHELL on macOS/Linux, system default on Windows)
- D-09: Shell spawns as a login shell (-l flag) so .zshrc/.bashrc and full PATH are loaded.
- D-10: Terminal theme matches Element's dark UI -- background, foreground, and ANSI colors derived from Element's existing design tokens.
- D-11: Good default monospace font (system monospace or bundled), no font settings UI.

### Claude's Discretion
- PTY library choice for Rust backend (portable-pty, tokio-pty-process, or raw platform APIs)
- xterm.js addon selection (fit, webgl renderer, etc.)
- Exact keyboard shortcut binding mechanism
- Scrollback buffer size
- Terminal resize handling implementation
- Copy/paste implementation details

### Deferred Ideas (OUT OF SCOPE)
- Multi-session tabs (TERM-10)
- Session persistence across project switches
- Font customization
- Per-project shell override
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TERM-01 | User can open an embedded terminal in the workspace panel | tauri-plugin-pty for PTY backend, @xterm/xterm for rendering, OutputDrawer tab integration |
| TERM-02 | Terminal automatically opens in the project's linked directory | `spawn()` accepts `cwd` option; read `directory_path` from Project model (Phase 7 dependency) |
| TERM-03 | Terminal supports copy, paste, scroll, and standard terminal interaction | xterm.js handles copy/paste natively, @xterm/addon-fit for resize, scrollback buffer config, @xterm/addon-webgl for performance |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-pty | 0.2.1 | Rust PTY plugin for Tauri 2 | Wraps portable-pty with Tauri commands; handles spawn/read/write/resize/kill lifecycle |
| tauri-pty | 0.2.1 | JS API for tauri-plugin-pty | Provides `spawn()` with polling read loop, event emitters, resize/write/kill methods |
| @xterm/xterm | 6.0.0 | Terminal emulator UI | Industry standard (used by VS Code); GPU-rendered, full VT100+ support |
| @xterm/addon-fit | 0.11.0 | Auto-resize terminal to container | Handles terminal dimension calculation on container resize |
| @xterm/addon-webgl | 0.19.0 | WebGL renderer for xterm | GPU-accelerated rendering for smooth scrolling and output |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @xterm/addon-clipboard | 0.2.0 | Enhanced clipboard support | If native copy/paste needs improvement beyond xterm defaults |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tauri-plugin-pty | Custom portable-pty integration | More control but significant boilerplate; plugin handles session management, read loop, cleanup |
| @xterm/addon-webgl | DOM renderer (default) | WebGL is faster for high-throughput output; DOM renderer is simpler but slower |
| tauri-plugin-pty polling | Tauri Channels with custom PTY | Channels are more efficient for streaming, but requires building all session management from scratch |

**Installation:**
```bash
# Frontend
npm install @xterm/xterm @xterm/addon-fit @xterm/addon-webgl tauri-pty

# Backend (in src-tauri/)
cargo add tauri-plugin-pty
```

**Version verification:** All versions confirmed via npm registry and crates.io (2026-03-22). tauri-plugin-pty 0.2.1 released 2026-01-18, compatible with tauri ^2.

## Architecture Patterns

### Recommended Project Structure
```
src-tauri/
  src/
    lib.rs                          # Add .plugin(tauri_plugin_pty::init())
  Cargo.toml                        # Add tauri-plugin-pty dependency
  capabilities/default.json          # Add pty plugin permissions

src/
  components/
    output/
      OutputDrawer.tsx              # Extend tab type with "terminal"
      TerminalTab.tsx               # NEW: xterm.js wrapper component
      TerminalEmptyState.tsx        # NEW: "Link a directory" message
  hooks/
    useTerminal.ts                  # NEW: PTY lifecycle hook
  stores/
    useWorkspaceStore.ts            # Extend with activeDrawerTab state
```

### Pattern 1: Terminal React Component with xterm.js
**What:** A React component that manages the xterm.js Terminal instance lifecycle
**When to use:** Rendering the terminal in the drawer tab
**Example:**
```typescript
// Source: xterm.js official docs + tauri-pty API
import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { spawn } from "tauri-pty";
import "@xterm/xterm/css/xterm.css";

function useTerminal(containerRef: React.RefObject<HTMLDivElement>, cwd: string | null) {
  const termRef = useRef<Terminal | null>(null);
  const ptyRef = useRef<ReturnType<typeof spawn> | null>(null);

  useEffect(() => {
    if (!containerRef.current || !cwd) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      scrollback: 5000,
      theme: {
        background: "#09090b",    // bg-background
        foreground: "#fafafa",    // text-foreground
        cursor: "#fafafa",
        // ANSI colors mapped from design tokens
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);

    // Load WebGL after open()
    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // Falls back to canvas/DOM renderer automatically
    }

    fitAddon.fit();

    // Spawn PTY
    const shell = process.env.SHELL || "/bin/zsh";
    const pty = spawn(shell, ["-l"], {
      cols: term.cols,
      rows: term.rows,
      cwd,
    });

    // Bidirectional data flow
    pty.onData((data: Uint8Array) => {
      term.write(data);
    });
    term.onData((data: string) => {
      pty.write(data);
    });

    // Handle exit
    pty.onExit(({ exitCode }) => {
      term.write(`\r\nProcess exited with code ${exitCode}\r\n`);
    });

    termRef.current = term;
    ptyRef.current = pty;

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      pty.resize(term.cols, term.rows);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      pty.kill();
      term.dispose();
      termRef.current = null;
      ptyRef.current = null;
    };
  }, [cwd]);
}
```

### Pattern 2: Extending the Output Drawer Tab System
**What:** Add "Terminal" as a new tab type in the existing OutputDrawer
**When to use:** Integration with the current drawer UI
**Example:**
```typescript
// Extend the Tab type
type Tab = "logs" | "history" | "runs" | "terminal";

// In OutputDrawer.tsx, add the terminal tab button:
<button type="button" onClick={() => setActiveTab("terminal")} className={tabClass("terminal")}>
  Terminal
</button>

// And render conditionally:
{activeTab === "terminal" && (
  directoryPath ? (
    <TerminalTab cwd={directoryPath} />
  ) : (
    <TerminalEmptyState />
  )
)}
```

### Pattern 3: Workspace Store Extension for Tab State
**What:** Add `activeDrawerTab` to the workspace store for programmatic tab switching
**When to use:** Keyboard shortcut and auto-open behavior
**Example:**
```typescript
// Extend useWorkspaceStore
interface WorkspaceState {
  // ... existing fields
  activeDrawerTab: "logs" | "history" | "runs" | "terminal";
  setActiveDrawerTab: (tab: string) => void;
  openTerminal: () => void; // Sets drawerOpen=true, activeDrawerTab="terminal"
}
```

### Pattern 4: Keyboard Shortcut for Terminal Toggle
**What:** Ctrl+` (backtick) opens drawer to terminal tab
**When to use:** Quick terminal access
**Example:**
```typescript
// In useKeyboardShortcuts.ts
// Ctrl+` toggle terminal
if (e.ctrlKey && e.key === "`") {
  e.preventDefault();
  openTerminal(); // from workspace store
  return;
}
```
**Note:** The existing keyboard shortcut system uses `document.addEventListener("keydown")` -- Ctrl+` should be added there. Important: when the terminal tab is focused, most keyboard events should NOT be intercepted by the global handler -- they should flow to xterm.js. Guard existing shortcuts with a check like `if (terminalFocused) return;`.

### Anti-Patterns to Avoid
- **Creating a custom PTY read loop:** The `tauri-pty` JS package already implements the polling read loop internally. Do not duplicate this.
- **Using Tauri events for PTY output:** Events are JSON-serialized and not designed for high-throughput binary data. The plugin uses invoke-based polling which is adequate.
- **Mounting/unmounting xterm.js on tab switch:** Create the Terminal once and hide/show it with CSS (`display: none`). Recreating it loses scrollback and is expensive.
- **Spawning PTY eagerly:** Decision D-04 requires lazy spawn. Only create the PTY when the terminal tab receives focus for the first time.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PTY management | Custom portable-pty Tauri commands | tauri-plugin-pty | Handles session tracking, read buffering, cross-platform spawn, resize signals, cleanup |
| Terminal rendering | Custom ANSI parser + canvas | @xterm/xterm | Full VT100/VT220/xterm support, Unicode, GPU rendering, accessibility |
| Terminal resize calculation | Manual cols/rows math | @xterm/addon-fit | Correctly calculates dimensions including padding, scrollbars, character metrics |
| Shell environment setup | Manual env var injection | Login shell with -l flag | User's .zshrc/.bashrc/.profile handles PATH, aliases, functions correctly |

**Key insight:** Terminal emulation is one of the most deceptively complex domains in software. Even "simple" features like copy/paste, cursor positioning, and color rendering have edge cases across shells, programs (vim, htop, etc.), and platforms. Use battle-tested libraries.

## Common Pitfalls

### Pitfall 1: xterm.js CSS Not Imported
**What goes wrong:** Terminal renders but text is invisible or misaligned
**Why it happens:** `@xterm/xterm/css/xterm.css` must be explicitly imported; it is not auto-included
**How to avoid:** Import the CSS at the component level: `import "@xterm/xterm/css/xterm.css"`
**Warning signs:** Terminal container renders but appears empty or garbled

### Pitfall 2: FitAddon Called Before Terminal is Visible
**What goes wrong:** Terminal has 0 cols/rows or wrong dimensions
**Why it happens:** `fitAddon.fit()` calculates dimensions from the DOM element, which must be visible and have a non-zero size
**How to avoid:** Call `fit()` after the container is visible. Use a ResizeObserver to detect when the container becomes visible/changes size. When using CSS `display: none` to hide the tab, call `fit()` when switching back to the terminal tab.
**Warning signs:** PTY gets resize(0, 0) or terminal text wraps incorrectly

### Pitfall 3: Zombie PTY Processes on App Close
**What goes wrong:** Shell processes remain running after Element closes
**Why it happens:** PTY kill not called during app teardown
**How to avoid:** Call `pty.kill()` in the React cleanup function and also handle Tauri's window close event. The tauri-plugin-pty plugin should handle cleanup when the plugin is destroyed, but verify this.
**Warning signs:** `ps` shows orphaned shell processes after closing Element

### Pitfall 4: Keyboard Event Conflict
**What goes wrong:** Global shortcuts (Cmd+K, Cmd+B, etc.) fire when user is typing in terminal
**Why it happens:** Global keydown listener intercepts events before xterm.js processes them
**How to avoid:** Check if the terminal is focused before processing global shortcuts. xterm.js sets focus on its textarea element -- detect this with `document.activeElement` checks or a focus state flag.
**Warning signs:** Pressing 'k' in terminal opens command palette, or 'b' toggles drawer

### Pitfall 5: WebGL Addon Failure on Some Systems
**What goes wrong:** Terminal fails to render or throws errors
**Why it happens:** WebGL may not be available or may fail in some environments
**How to avoid:** Wrap WebGL addon loading in try/catch. xterm.js falls back to canvas/DOM renderer automatically when WebGL fails.
**Warning signs:** Console errors about WebGL context creation

### Pitfall 6: xterm.js v6 Breaking Changes
**What goes wrong:** Code examples from v5 don't work
**Why it happens:** v6 removed the canvas renderer addon, changed viewport/scrollbar behavior, and made other breaking changes
**How to avoid:** Use v6 APIs only. The canvas renderer is gone -- use WebGL or DOM renderer. Import from `@xterm/xterm` (scoped package), not the old `xterm` package.
**Warning signs:** Import errors, missing addons, scrollbar rendering issues

### Pitfall 7: $SHELL Not Available on Windows
**What goes wrong:** Shell spawn fails on Windows
**Why it happens:** `$SHELL` environment variable doesn't exist on Windows
**How to avoid:** Detect platform and use appropriate default: `$SHELL` on macOS/Linux, `powershell.exe` or `cmd.exe` on Windows. The Tauri `os` plugin or `navigator.platform` can detect the platform.
**Warning signs:** "Failed to spawn" errors on Windows

## Code Examples

### Tauri Plugin Registration
```rust
// Source: tauri-plugin-pty docs (docs.rs)
// In src-tauri/src/lib.rs
tauri::Builder::default()
    .plugin(tauri_plugin_pty::init())  // Add this line
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    // ... rest of setup
```

### Capabilities/Permissions
```json
// Source: Tauri 2 plugin permission pattern
// In src-tauri/capabilities/default.json, add to permissions array:
"pty:default"
```

### Spawning a Login Shell with CWD
```typescript
// Source: tauri-pty API (npm package source)
import { spawn } from "tauri-pty";

const shell = process.env.SHELL || "/bin/zsh";
const pty = spawn(shell, ["-l"], {
  cols: 80,
  rows: 24,
  cwd: "/path/to/project",
});
```

### Terminal Theme from Design Tokens
```typescript
// Source: xterm.js ITheme interface + Element's Tailwind tokens
const terminalTheme: ITheme = {
  background: "#09090b",       // --background (zinc-950)
  foreground: "#fafafa",       // --foreground (zinc-50)
  cursor: "#fafafa",
  cursorAccent: "#09090b",
  selectionBackground: "#27272a80", // --muted with opacity
  selectionForeground: "#fafafa",
  // Standard ANSI colors (dark theme palette)
  black: "#09090b",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
  magenta: "#a855f7",
  cyan: "#06b6d4",
  white: "#fafafa",
  brightBlack: "#52525b",
  brightRed: "#f87171",
  brightGreen: "#4ade80",
  brightYellow: "#facc15",
  brightBlue: "#60a5fa",
  brightMagenta: "#c084fc",
  brightCyan: "#22d3ee",
  brightWhite: "#ffffff",
};
```

### Detecting Shell on macOS
```typescript
// Source: Standard approach for Tauri desktop apps
// Note: process.env.SHELL works in Tauri's webview context
// because Tauri inherits the parent process environment
function getDefaultShell(): { cmd: string; args: string[] } {
  const shell = process.env.SHELL || "/bin/zsh";
  return { cmd: shell, args: ["-l"] };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| xterm (npm package) | @xterm/xterm (scoped) | v5.3+ (2024) | Must use scoped imports |
| xterm-addon-canvas | Removed in v6 | v6.0.0 (2025) | Use WebGL or DOM renderer |
| Custom PTY commands in Tauri | tauri-plugin-pty | 2025 | Plugin handles all PTY lifecycle |
| Tauri events for streaming | Tauri channels (or plugin polling) | Tauri 2 | Events not designed for high-throughput |

**Deprecated/outdated:**
- `xterm` (unscoped npm package): Deprecated, use `@xterm/xterm`
- `xterm-addon-fit`: Deprecated, use `@xterm/addon-fit`
- `@xterm/addon-canvas`: Removed in v6, use `@xterm/addon-webgl`

## Open Questions

1. **tauri-plugin-pty permission string**
   - What we know: Tauri 2 plugins require capability permissions. The plugin likely exposes `pty:default` or similar.
   - What's unclear: Exact permission identifier string (not documented clearly)
   - Recommendation: Try `"pty:default"` first; if that fails, check generated schema or use `"pty:allow-spawn"`, `"pty:allow-read"`, etc.

2. **$SHELL availability in Tauri webview**
   - What we know: Tauri inherits the parent process environment, so `process.env.SHELL` should work
   - What's unclear: Whether this works reliably when app is launched from Finder (not terminal)
   - Recommendation: Add a Tauri command to read $SHELL from the Rust side as fallback: `std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())`

3. **Phase 7 dependency (directory_path)**
   - What we know: Phase 7 adds `directory_path` to the Project model. It is NOT yet implemented.
   - What's unclear: Exact API shape for getting the directory path
   - Recommendation: Phase 9 planning must assume Phase 7 is complete. If directory_path is null/empty, show the empty state (D-07).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | Frontend package install | Assumed (Tauri dev) | -- | -- |
| Rust / Cargo | Backend build | Assumed (Tauri dev) | -- | -- |
| tauri-plugin-pty | PTY backend | Not yet installed | 0.2.1 (crates.io) | -- |
| tauri-pty | PTY JS API | Not yet installed | 0.2.1 (npm) | -- |
| @xterm/xterm | Terminal rendering | Not yet installed | 6.0.0 (npm) | -- |

**Missing dependencies with no fallback:**
- All dependencies are installable via npm/cargo -- no blocking issues.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 (frontend), Rust tests (backend) |
| Config file | vite.config.ts (`test` section) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test && cd src-tauri && cargo test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TERM-01 | Terminal tab renders in output drawer | unit | `npx vitest run src/components/output/TerminalTab.test.tsx` | Wave 0 |
| TERM-01 | PTY plugin registers and spawn command works | unit (rust) | `cd src-tauri && cargo test terminal` | Wave 0 |
| TERM-02 | Terminal CWD set from project directory_path | unit | `npx vitest run src/hooks/useTerminal.test.ts` | Wave 0 |
| TERM-03 | Terminal resize triggers PTY resize | unit | `npx vitest run src/components/output/TerminalTab.test.tsx` | Wave 0 |
| TERM-03 | Keyboard shortcut Ctrl+\` opens terminal | unit | `npx vitest run src/hooks/useKeyboardShortcuts.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test && cd src-tauri && cargo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/output/TerminalTab.test.tsx` -- covers TERM-01, TERM-03 (rendering, empty state)
- [ ] `src/hooks/useTerminal.test.ts` -- covers TERM-02 (CWD, lifecycle mocking)
- [ ] Mock for `tauri-pty` `spawn` function in test setup
- [ ] Note: Full PTY integration cannot be unit tested in jsdom; manual smoke test required for actual terminal interaction

## Sources

### Primary (HIGH confidence)
- tauri-pty npm package source (v0.2.1) -- directly inspected: spawn, write, resize, kill, read polling loop
- @xterm/xterm npm registry -- verified v6.0.0 current
- tauri-plugin-pty docs.rs -- API: spawn, write, read, resize, kill, exitstatus commands
- Tauri 2 official docs (v2.tauri.app/develop/calling-frontend/) -- Channels vs Events for streaming

### Secondary (MEDIUM confidence)
- portable-pty docs.rs (v0.9.0) -- PtySystem, PtyPair, MasterPty, SlavePty, Child, PtySize APIs
- xterm.js GitHub releases -- v6 breaking changes (canvas addon removed, viewport changes)
- Tnze/tauri-plugin-pty GitHub -- README, plugin architecture, 6 Tauri commands

### Tertiary (LOW confidence)
- $SHELL behavior when Tauri app launched from macOS Finder (not terminal) -- needs validation
- tauri-plugin-pty permission string format -- needs testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified on npm/crates.io with current versions
- Architecture: HIGH -- existing codebase patterns (OutputDrawer, useWorkspaceStore, useTauriEvent) directly inspected
- Pitfalls: HIGH -- xterm.js v6 changes verified, keyboard conflict pattern observed in existing code

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable libraries, monthly cadence)
