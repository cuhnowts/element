import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAgentStore } from "@/stores/useAgentStore";
import { AgentActivityEntry } from "@/components/agent/AgentActivityEntry";
import { ApprovalRequest } from "@/components/agent/ApprovalRequest";

export function AgentActivityTab() {
  const entries = useAgentStore((s) => s.entries);

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h3 className="text-sm font-semibold">No activity yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          The agent will log actions here as it works across your projects.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col">
        {entries.map((entry, index) => (
          <div key={entry.id}>
            {entry.type === "approval_request" ? (
              <ApprovalRequest entry={entry} />
            ) : (
              <AgentActivityEntry entry={entry} />
            )}
            {index < entries.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
