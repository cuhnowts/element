import type { Step } from "@/types/execution";
import { EmptyState } from "@/components/shared/EmptyState";
import { StepItem } from "./StepItem";

interface ExecutionDiagramProps {
  steps: Step[];
  isExecuting?: boolean;
  stepStatuses?: Record<number, string>;
  workflowId?: string;
  runId?: string;
}

export function ExecutionDiagram({
  steps,
  stepStatuses,
  workflowId,
  runId,
}: ExecutionDiagramProps) {
  if (steps.length === 0) {
    return (
      <EmptyState
        heading="No execution steps defined"
        body="Run a task or workflow to see output here."
      />
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, index) => (
        <StepItem
          key={step.id}
          step={step}
          index={index}
          isLast={index === steps.length - 1}
          executionStatus={stepStatuses?.[index]}
          workflowId={workflowId}
          runId={runId}
          onRetry={() => {
            /* refresh handled by store event listeners */
          }}
        />
      ))}
    </div>
  );
}
