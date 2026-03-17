import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusDot } from "@/components/shared/StatusDot";
import { Badge } from "@/components/ui/badge";
import type { WorkflowRun } from "@/types/execution";
import type { StepStatus } from "@/types/execution";

interface RunHistoryListProps {
  runs: WorkflowRun[];
  selectedRunId?: string;
  onSelectRun: (run: WorkflowRun) => void;
}

const RUN_STATUS_MAP: Record<string, StepStatus> = {
  completed: "complete",
  failed: "failed",
  running: "running",
  cancelled: "skipped",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  failed: "Failed",
  running: "Running",
  cancelled: "Cancelled",
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  scheduled: "Scheduled",
  "catch-up": "Catch-up",
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

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

export function RunHistoryList({
  runs,
  selectedRunId,
  onSelectRun,
}: RunHistoryListProps) {
  if (runs.length === 0) {
    return (
      <EmptyState
        heading="No runs yet"
        body="Run this workflow to see execution history here."
      />
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            onClick={() => onSelectRun(run)}
            className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
              selectedRunId === run.id ? "bg-accent/10" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <StatusDot status={RUN_STATUS_MAP[run.status] ?? "pending"} />
              <Badge variant="outline" className="text-xs">
                {TRIGGER_LABELS[run.triggerType] ?? run.triggerType}
              </Badge>
              <span className="flex-1 text-xs text-muted-foreground">
                {formatTimestamp(run.startedAt)}
              </span>
              {run.completedAt && (
                <span className="text-xs text-muted-foreground font-mono">
                  {formatDuration(run.startedAt, run.completedAt)}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {STATUS_LABELS[run.status] ?? run.status}
              {run.errorMessage && (
                <span className="text-destructive ml-2">
                  {run.errorMessage}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
