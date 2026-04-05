import { useState } from "react";
import { StatusDot } from "@/components/shared/StatusDot";
import { Badge } from "@/components/ui/badge";
import type { StepStatus, WorkflowRun, WorkflowStepResult } from "@/types/execution";

interface RunHistoryDetailProps {
  run: WorkflowRun;
  steps: WorkflowStepResult[];
}

const STEP_STATUS_MAP: Record<string, StepStatus> = {
  completed: "complete",
  failed: "failed",
  running: "running",
  pending: "pending",
  skipped: "skipped",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
  running: "Running",
  pending: "Pending",
  skipped: "Skipped",
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  scheduled: "Scheduled",
  "catch-up": "Catch-up",
};

const TYPE_LABELS: Record<string, string> = {
  shell: "Shell",
  http: "HTTP",
  manual: "Manual",
};

function formatDuration(startedAt: string, completedAt?: string): string {
  if (!completedAt) return "";
  try {
    const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}m ${remaining}s`;
  } catch {
    return "";
  }
}

function formatMs(ms?: number): string {
  if (ms === undefined || ms === null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StepResultItem({ step }: { step: WorkflowStepResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center gap-2">
        <StatusDot status={STEP_STATUS_MAP[step.status] ?? "pending"} />
        <span className="font-medium text-sm">
          {step.stepIndex + 1}. {step.stepName}
        </span>
        <Badge variant="outline" className="text-xs">
          {TYPE_LABELS[step.stepType] ?? step.stepType}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {STATUS_LABELS[step.status] ?? step.status}
          {step.durationMs !== undefined && (
            <span className="ml-2 font-mono">{formatMs(step.durationMs)}</span>
          )}
        </span>
      </div>

      {step.outputPreview && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 w-full text-left"
        >
          <pre className="font-mono text-xs text-muted-foreground bg-muted/50 rounded p-2 overflow-hidden">
            {expanded
              ? (step.outputFull ?? step.outputPreview)
              : step.outputPreview.split("\n").slice(0, 3).join("\n")}
          </pre>
          {step.outputPreview.split("\n").length > 3 && (
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? "Show less" : "Show more..."}
            </span>
          )}
        </button>
      )}

      {step.errorMessage && (
        <p className="mt-2 text-xs text-destructive font-mono bg-destructive/5 rounded p-2">
          {step.errorMessage}
        </p>
      )}
    </div>
  );
}

export function RunHistoryDetail({ run, steps }: RunHistoryDetailProps) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <StatusDot status={STEP_STATUS_MAP[run.status] ?? "pending"} />
        <span className="text-sm font-medium">{STATUS_LABELS[run.status] ?? run.status}</span>
        <Badge variant="outline" className="text-xs">
          {TRIGGER_LABELS[run.triggerType] ?? run.triggerType}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono">{run.id.slice(0, 8)}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(run.startedAt).toLocaleString()}
          {run.completedAt && (
            <span className="ml-2 font-mono">
              ({formatDuration(run.startedAt, run.completedAt)})
            </span>
          )}
        </span>
      </div>

      {run.errorMessage && <p className="text-sm text-destructive">{run.errorMessage}</p>}

      <div className="space-y-2">
        {steps.map((step) => (
          <StepResultItem key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}
