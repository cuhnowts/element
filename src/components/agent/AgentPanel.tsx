import { useEffect } from "react";
import { useAgentStore } from "@/stores/useAgentStore";
import { useAgentLifecycle } from "@/hooks/useAgentLifecycle";
import { AgentPanelHeader } from "@/components/agent/AgentPanelHeader";
import { AgentActivityTab } from "@/components/agent/AgentActivityTab";
import { AgentTerminalTab } from "@/components/agent/AgentTerminalTab";

export function AgentPanel() {
  const activeTab = useAgentStore((s) => s.activeTab);
  const { startAgent } = useAgentLifecycle();

  // Auto-start agent on mount
  useEffect(() => {
    startAgent();
  }, [startAgent]);

  return (
    <div className="w-80 border-l border-border flex flex-col h-full bg-background flex-shrink-0">
      <AgentPanelHeader />
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "activity" ? <AgentActivityTab /> : <AgentTerminalTab />}
      </div>
    </div>
  );
}
