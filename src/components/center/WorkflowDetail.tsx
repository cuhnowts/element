import { useState, useEffect, useCallback } from "react";
import { useWorkflowStore } from "@/stores/useWorkflowStore";
import { useStore } from "@/stores";
import { WorkflowBuilder } from "./WorkflowBuilder";
import { ExecutionDiagram } from "./ExecutionDiagram";
import { CronScheduler } from "./CronScheduler";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Play, Trash2, Loader2, ArrowLeft } from "lucide-react";
import type { StepDefinition } from "@/types/workflow";
import type { Step } from "@/types/execution";

export function WorkflowDetail() {
  const workflow = useWorkflowStore((s) => s.selectedWorkflow);
  const schedule = useWorkflowStore((s) => s.schedule);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const isLoading = useWorkflowStore((s) => s.isLoading);
  const stepStatuses = useWorkflowStore((s) => s.stepStatuses);
  const runs = useWorkflowStore((s) => s.runs);
  const updateWorkflow = useWorkflowStore((s) => s.updateWorkflow);
  const runWorkflow = useWorkflowStore((s) => s.runWorkflow);
  const deleteWorkflow = useWorkflowStore((s) => s.deleteWorkflow);
  const selectWorkflow = useWorkflowStore((s) => s.selectWorkflow);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSaveSteps = useCallback(
    (steps: StepDefinition[]) => {
      if (workflow) {
        updateWorkflow(workflow.id, undefined, undefined, steps);
      }
    },
    [workflow, updateWorkflow],
  );

  const handleRunNow = useCallback(() => {
    if (workflow) {
      runWorkflow(workflow.id);
    }
  }, [workflow, runWorkflow]);

  const handleDelete = useCallback(async () => {
    if (workflow) {
      await deleteWorkflow(workflow.id);
      setShowDeleteDialog(false);
      useStore.getState().navigateToHub();
    }
  }, [workflow, deleteWorkflow]);

  const handleBack = useCallback(() => {
    selectWorkflow(null);
    useStore.getState().navigateToHub();
  }, [selectWorkflow]);

  // Cmd+Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isRunning && workflow) {
        e.preventDefault();
        handleRunNow();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, workflow, handleRunNow]);

  // Loading state
  if (isLoading && !workflow) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!workflow) return null;

  // Map StepDefinition[] to Step[] for ExecutionDiagram
  const executionSteps: Step[] = workflow.steps.map((step, index) => ({
    id: `${workflow.id}-step-${index}`,
    name: step.name,
    status: (stepStatuses[index] as Step["status"]) ?? "pending",
    order: index,
  }));

  const currentRunId = runs.find((r) => r.status === "running")?.id;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{workflow.name}</h2>
          {workflow.description && (
            <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleRunNow}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Run Now
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Steps section */}
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-3">
          Steps
        </span>
        <WorkflowBuilder workflow={workflow} onSave={handleSaveSteps} />
      </div>

      {/* Schedule section */}
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-3">
          Schedule
        </span>
        <CronScheduler workflowId={workflow.id} schedule={schedule} />
      </div>

      {/* Execution section */}
      {executionSteps.length > 0 && (
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground block mb-3">
            Execution
          </span>
          <ExecutionDiagram
            steps={executionSteps}
            stepStatuses={stepStatuses}
            workflowId={workflow.id}
            runId={currentRunId}
          />
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete workflow</DialogTitle>
            <DialogDescription>
              This will permanently delete this workflow and all its run history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
