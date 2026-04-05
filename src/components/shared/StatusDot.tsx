import type { StepStatus } from "@/types/execution";
import type { TaskStatus } from "@/types/task";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted-foreground",
  "in-progress": "bg-primary animate-pulse",
  running: "bg-primary animate-pulse",
  complete: "bg-chart-2",
  failed: "bg-destructive",
  blocked: "bg-destructive",
  skipped: "bg-muted-foreground/50",
};

interface StatusDotProps {
  status: TaskStatus | StepStatus;
  className?: string;
}

export function StatusDot({ status, className = "" }: StatusDotProps) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${STATUS_STYLES[status] ?? "bg-muted-foreground"} ${className}`}
      aria-label={`Status: ${status}`}
    />
  );
}
