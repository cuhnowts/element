import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { spawn } from "tauri-pty";
import "@xterm/xterm/css/xterm.css";

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  cwd: string | null,
  isVisible: boolean,
  initialCommand?: { command: string; args: string[] } | null
): { isReady: boolean; error: string | null } {
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const ptyRef = useRef<ReturnType<typeof spawn> | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Terminal creation effect
  useEffect(() => {
    if (!containerRef.current || !cwd) return;

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

    term.open(containerRef.current);

    // Load WebGL addon for GPU-accelerated rendering (falls back to canvas/DOM on failure)
    try {
      term.loadAddon(new WebglAddon());
    } catch {
      // Falls back to canvas/DOM renderer automatically
    }

    fitAddon.fit();

    // Spawn PTY with initial command or login shell
    // On macOS, use /bin/zsh as default. On Windows, would use powershell.exe (D-08).
    const shell = initialCommand?.command ?? "/bin/zsh";
    const shellArgs = initialCommand?.args ?? ["-l"];
    try {
      const pty = spawn(shell, shellArgs, {
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
      pty.onExit(({ exitCode }: { exitCode: number }) => {
        term.write(`\r\nProcess exited with code ${exitCode}\r\n`);
      });

      ptyRef.current = pty;

      // Resize observer
      const container = containerRef.current;
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
      setError(`Could not start ${shell}. Ensure $SHELL is set or restart the app. (${message})`);
      setIsReady(false);
    }

    termRef.current = term;
    fitRef.current = fitAddon;

    // Cleanup
    return () => {
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

  return { isReady, error };
}
