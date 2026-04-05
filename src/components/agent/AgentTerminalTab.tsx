import { useRef, useState, useEffect } from "react";
import { useTerminal } from "@/hooks/useTerminal";
import { useAgentStore } from "@/stores/useAgentStore";
import { homeDir } from "@tauri-apps/api/path";

export function AgentTerminalTab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTab = useAgentStore((s) => s.activeTab);
  const agentCommand = useAgentStore((s) => s.agentCommand);
  const agentArgs = useAgentStore((s) => s.agentArgs);
  const [cwd, setCwd] = useState<string | null>(null);

  useEffect(() => {
    homeDir().then(setCwd).catch(() => setCwd("/tmp"));
  }, []);

  const initialCommand =
    agentCommand != null ? { command: agentCommand, args: agentArgs ?? [] } : null;

  const { isReady } = useTerminal(
    containerRef,
    cwd,
    activeTab === "terminal",
    initialCommand,
  );

  // Handle PTY exit through the onExit callback in useTerminal
  // The lifecycle hook manages restart logic via handleAgentExit

  if (!agentCommand && !isReady) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h3 className="text-sm font-semibold">Agent starting</h3>
        <p className="text-sm text-muted-foreground mt-1">
          The agent terminal will appear once the agent process is ready.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
