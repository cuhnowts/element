import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/EmptyState";

export function WorkflowList() {
  // Workflow scheduling is Phase 3 -- this is a placeholder
  const workflows: { id: string; name: string; nextRun: string }[] = [];

  return (
    <div className="flex flex-col">
      <span className="px-4 py-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        Workflows
      </span>
      <ScrollArea className="flex-1">
        {workflows.length === 0 ? (
          <EmptyState
            heading="No scheduled workflows"
            body="Workflows will appear here once scheduled."
          />
        ) : (
          workflows.map((wf) => (
            <div key={wf.id} className="flex items-center gap-2 px-4 py-2 text-sm">
              <span className="flex-1 truncate">{wf.name}</span>
              <span className="text-xs text-muted-foreground">{wf.nextRun}</span>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
