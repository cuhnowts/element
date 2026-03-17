import type { Step } from "@/types/execution";
import { StatusDot } from "@/components/shared/StatusDot";
import { AgentChip } from "@/components/shared/AgentChip";
import { RetryButton } from "./RetryButton";
import { Loader2, Check, X } from "lucide-react";

const STEP_BORDER_STYLES: Record<string, string> = {
  pending: "border-muted-foreground",
  running: "border-primary animate-pulse",
  complete: "border-chart-2",
  completed: "border-chart-2",
  failed: "border-destructive",
  skipped: "border-muted-foreground/50",
};

interface StepItemProps {
  step: Step;
  index: number;
  isLast: boolean;
  executionStatus?: string;
  workflowId?: string;
  runId?: string;
  onRetry?: () => void;
}

function StepCircleContent({
  index,
  executionStatus,
}: {
  index: number;
  executionStatus?: string;
}) {
  if (executionStatus === "running") {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }
  if (executionStatus === "completed" || executionStatus === "complete") {
    return <Check className="h-4 w-4 text-chart-2" />;
  }
  if (executionStatus === "failed") {
    return <X className="h-4 w-4 text-destructive" />;
  }
  return <>{index + 1}</>;
}

export function StepItem({
  step,
  index,
  isLast,
  executionStatus,
  workflowId,
  runId,
  onRetry,
}: StepItemProps) {
  const borderStatus = executionStatus ?? step.status;

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${STEP_BORDER_STYLES[borderStatus] ?? "border-muted-foreground"}`}
        >
          <StepCircleContent index={index} executionStatus={executionStatus} />
        </div>
        {!isLast && <div className="w-0.5 h-8 bg-border" />}
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          <StatusDot status={step.status} />
          <span className="font-semibold">{step.name}</span>
          {step.duration && (
            <span className="text-muted-foreground text-sm">
              ({step.duration})
            </span>
          )}
        </div>
        {(step.agents?.length ||
          step.skills?.length ||
          step.tools?.length) ? (
          <div className="flex gap-1 mt-1">
            {step.agents?.map((a) => (
              <AgentChip key={a} label={a} type="agent" />
            ))}
            {step.skills?.map((s) => (
              <AgentChip key={s} label={s} type="skill" />
            ))}
            {step.tools?.map((t) => (
              <AgentChip key={t} label={t} type="tool" />
            ))}
          </div>
        ) : null}
        {executionStatus === "failed" && workflowId && runId && onRetry && (
          <div className="mt-2">
            <RetryButton
              workflowId={workflowId}
              runId={runId}
              stepIndex={index}
              onRetry={onRetry}
            />
          </div>
        )}
      </div>
    </div>
  );
}
