import { Button } from "@/components/ui/button";
import { useAgentLifecycle } from "@/hooks/useAgentLifecycle";
import { useAgentStore } from "@/stores/useAgentStore";
import type { AgentStatus } from "@/types/agent";

const statusDotColor: Record<AgentStatus, string> = {
  running: "bg-green-500",
  idle: "bg-muted-foreground",
  error: "bg-destructive",
  stopped: "bg-destructive",
  starting: "bg-amber-500",
};

const statusLabel: Record<AgentStatus, string> = {
  starting: "Starting...",
  running: "Running",
  idle: "Idle",
  error: "Error",
  stopped: "Stopped",
};

export function AgentPanelHeader() {
  const status = useAgentStore((s) => s.status);
  const activeTab = useAgentStore((s) => s.activeTab);
  const setActiveTab = useAgentStore((s) => s.setActiveTab);
  const { restartAgent } = useAgentLifecycle();

  const tabClass = (tab: "activity" | "terminal") =>
    `text-xs font-semibold tracking-wide uppercase px-2 py-1 rounded transition-colors ${
      activeTab === tab ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="h-10 px-4 py-2 flex items-center justify-between border-b border-border flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={tabClass("activity")}
          >
            Activity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("terminal")}
            className={tabClass("terminal")}
          >
            Terminal
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className={`size-2 rounded-full ${statusDotColor[status]}`} />
          <span className="text-xs text-muted-foreground">{statusLabel[status]}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {status === "stopped" && (
          <Button variant="ghost" size="sm" className="text-xs h-6" onClick={restartAgent}>
            Restart Agent
          </Button>
        )}
      </div>
    </div>
  );
}
