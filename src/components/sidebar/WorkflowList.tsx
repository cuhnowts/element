import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkflowStore } from "@/stores/useWorkflowStore";
import { useStore } from "@/stores";
import { Plus } from "lucide-react";

export function WorkflowList() {
  const workflows = useWorkflowStore((s) => s.workflows);
  const selectedWorkflowId = useWorkflowStore((s) => s.selectedWorkflowId);
  const fetchWorkflows = useWorkflowStore((s) => s.fetchWorkflows);
  const selectWorkflow = useWorkflowStore((s) => s.selectWorkflow);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleCreate = async () => {
    const workflow = await createWorkflow("New Workflow", "", []);
    selectWorkflow(workflow.id);
    useStore.getState().setActiveView('workflow');
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          Workflows
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleCreate}
          aria-label="Create workflow"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {workflows.length === 0 ? (
          <EmptyState
            heading="No workflows"
            body="Create a workflow or convert a task to get started."
          />
        ) : (
          workflows.map((wf) => (
            <button
              key={wf.id}
              type="button"
              onClick={() => {
                selectWorkflow(wf.id);
                useStore.getState().setActiveView('workflow');
              }}
              className={`w-full text-left flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${
                selectedWorkflowId === wf.id ? "bg-accent/10" : ""
              }`}
            >
              <span className="flex-1 truncate">{wf.name}</span>
              <Badge variant="outline" className="text-xs shrink-0">
                {wf.steps.length}
              </Badge>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
