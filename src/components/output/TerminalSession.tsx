import { useEffect, useRef } from "react";
import { useTerminal } from "@/hooks/useTerminal";
import {
  useTerminalSessionStore,
  gracefulKillPty,
} from "@/stores/useTerminalSessionStore";

interface TerminalSessionProps {
  sessionId: string;
  projectId: string;
  cwd: string;
  isVisible: boolean;
  initialCommand?: { command: string; args: string[] } | null;
}

export function TerminalSession({
  sessionId,
  projectId,
  cwd,
  isVisible,
  initialCommand,
}: TerminalSessionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { error, ptyRef } = useTerminal(
    containerRef,
    cwd,
    isVisible,
    initialCommand
  );

  // Detect PTY exit and mark session as exited, then auto-remove after 3s
  useEffect(() => {
    const pty = ptyRef.current;
    if (!pty) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    pty.onExit(() => {
      useTerminalSessionStore.getState().markExited(projectId, sessionId);
      timer = setTimeout(() => {
        useTerminalSessionStore.getState().removeSession(projectId, sessionId);
      }, 3000);
    });

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [ptyRef.current, projectId, sessionId]);

  // Graceful PTY kill on unmount
  useEffect(() => {
    return () => {
      if (ptyRef.current) {
        gracefulKillPty(ptyRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      <div ref={containerRef} className="h-full w-full p-2" />
      {error && (
        <div className="text-sm text-destructive-foreground p-4">
          <p className="font-medium">
            Terminal failed to start -- check that your shell is configured
            correctly.
          </p>
          <p className="text-muted-foreground mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}
