import { useWorkflowStore } from "@/stores/useWorkflowStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExecutionDiagram } from "./ExecutionDiagram";
import { CronScheduler } from "./CronScheduler";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import type { Step } from "@/types/execution";

export function WorkflowDetail() {
  const workflow = useWorkflowStore((s) => s.selectedWorkflow);
  const schedule = useWorkflowStore((s) => s.schedule);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const runWorkflow = useWorkflowStore((s) => s.runWorkflow);

  if (!workflow) {
    return (
      <EmptyState
        heading="No workflow selected"
        body="Select a workflow from the sidebar to view its details."
      />
    );
  }

  // Map StepDefinition[] to Step[] for ExecutionDiagram
  const workflowSteps: Step[] = workflow.steps.map((step, index) => ({
    id: `${workflow.id}-step-${index}`,
    name: step.name,
    status: "pending" as const,
    order: index,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{workflow.name}</h2>
          {workflow.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {workflow.description}
            </p>
          )}
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => runWorkflow(workflow.id)}
          disabled={isRunning}
        >
          <Play className="h-3 w-3 mr-1" />
          {isRunning ? "Running..." : "Run Workflow"}
        </Button>
      </div>

      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Schedule
        </span>
        <CronScheduler workflowId={workflow.id} schedule={schedule} />
      </div>

      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Steps
        </span>
        <ExecutionDiagram
          steps={workflowSteps}
        />
      </div>
    </div>
  );
}
