import { Terminal as TerminalIcon } from "lucide-react";
import { TerminalSession } from "@/components/output/TerminalSession";
import { useTerminalSessionStore } from "@/stores/useTerminalSessionStore";

const EMPTY_SESSIONS: import("@/stores/useTerminalSessionStore").TerminalSession[] = [];

interface TerminalPaneProps {
  projectId: string;
  directoryPath: string;
  isVisible: boolean;
}

export function TerminalPane({ projectId, directoryPath, isVisible }: TerminalPaneProps) {
  const sessions = useTerminalSessionStore((s) => s.sessions[projectId] ?? EMPTY_SESSIONS);
  const activeId = useTerminalSessionStore((s) => s.activeSessionId[projectId] ?? null);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <TerminalIcon className="size-8 text-muted-foreground" />
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-foreground">No terminal sessions</p>
          <p className="text-sm text-muted-foreground">Click + to start a new terminal session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {sessions.map((session) => (
        <div
          key={session.id}
          style={{ display: session.id === activeId ? "block" : "none" }}
          className="h-full w-full absolute inset-0"
        >
          <TerminalSession
            sessionId={session.id}
            projectId={projectId}
            cwd={directoryPath}
            isVisible={isVisible && session.id === activeId}
            initialCommand={session.initialCommand}
          />
        </div>
      ))}
    </div>
  );
}
