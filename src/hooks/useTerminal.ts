import { homeDir } from "@tauri-apps/api/path";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef, useState } from "react";
import { spawn } from "tauri-pty";
import "@xterm/xterm/css/xterm.css";

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  cwd: string | null,
  isVisible: boolean,
  initialCommand?: { command: string; args: string[] } | null,
): {
  isReady: boolean;
  error: string | null;
  ptyRef: React.RefObject<ReturnType<typeof spawn> | null>;
  termRef: React.RefObject<Terminal | null>;
} {
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const ptyRef = useRef<ReturnType<typeof spawn> | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Terminal creation effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !cwd) return;

    let cancelled = false;
    const initTerminal = async () => {
    const fallbackDir = await homeDir().catch(() => "/tmp");

    if (cancelled) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
      scrollback: 5000,
      theme: {
        background: "#09090b",
        foreground: "#fafafa",
        cursor: "#fafafa",
        cursorAccent: "#09090b",
        selectionBackground: "#27272a80",
        selectionForeground: "#fafafa",
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
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(container);

    // Load WebGL addon for GPU-accelerated rendering (falls back to canvas/DOM on failure)
    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // Falls back to canvas/DOM renderer automatically
    }

    fitAddon.fit();

    // Spawn PTY — always start a login shell, then write command if needed.
    // tauri-pty's spawn does not reliably pass args as process argv,
    // so we write the command to stdin after the shell is ready.
    const pendingCommand = initialCommand
      ? [initialCommand.command, ...initialCommand.args].join(" ")
      : null;

    // Try spawning with cwd, fall back to home directory if it fails (e.g. dir was deleted)
    const spawnWithCwd = (dir: string) =>
      spawn("/bin/zsh", ["-l"], { cols: term.cols, rows: term.rows, cwd: dir });

    try {
      let pty: ReturnType<typeof spawn>;
      try {
        pty = spawnWithCwd(cwd);
      } catch {
        pty = spawnWithCwd(fallbackDir);
        term.write(`\x1b[33mDirectory not found: ${cwd}\r\nFalling back to ${fallbackDir}\x1b[0m\r\n`);
      }

      // Bidirectional data flow
      let commandSent = false;
      pty.onData((data: Uint8Array) => {
        term.write(data);
      });
      term.onData((data: string) => {
        pty.write(data);
      });

      // Write pending command after shell has time to initialize
      if (pendingCommand) {
        setTimeout(() => {
          if (!commandSent) {
            commandSent = true;
            pty.write(`${pendingCommand}\r`);
          }
        }, 500);
      }

      // Handle exit — only show message for unexpected exits, not user-initiated ones
      pty.onExit(({ exitCode }: { exitCode: number }) => {
        if (exitCode !== 0) {
          term.write(`\r\nProcess exited with code ${exitCode}\r\n`);
        }
      });

      ptyRef.current = pty;

      // Resize observer
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        pty.resize(term.cols, term.rows);
      });
      resizeObserver.observe(container);
      observerRef.current = resizeObserver;

      setIsReady(true);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not start /bin/zsh. Ensure $SHELL is set or restart the app. (${message})`);
      setIsReady(false);
    }

    termRef.current = term;
    fitRef.current = fitAddon;
    }; // end initTerminal

    initTerminal();

    // Cleanup
    return () => {
      cancelled = true;
      observerRef.current?.disconnect();
      ptyRef.current?.kill();
      termRef.current?.dispose();
      observerRef.current = null;
      ptyRef.current = null;
      termRef.current = null;
      fitRef.current = null;
      setIsReady(false);
    };
  }, [containerRef, cwd, initialCommand]);

  // Visibility effect: re-fit when terminal becomes visible
  useEffect(() => {
    if (isVisible && fitRef.current) {
      fitRef.current.fit();
      if (ptyRef.current && termRef.current) {
        ptyRef.current.resize(termRef.current.cols, termRef.current.rows);
      }
    }
  }, [isVisible]);

  return { isReady, error, ptyRef, termRef };
}
