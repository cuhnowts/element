import { cn } from "@/lib/utils";

export type ProgressStatus = "complete" | "in-progress" | "not-started" | "overdue";

interface ProgressDotProps {
  status: ProgressStatus;
}

export function ProgressDot({ status }: ProgressDotProps) {
  return (
    <span
      className={cn("inline-block w-2 h-2 rounded-full shrink-0", {
        "bg-primary": status === "complete",
        "border border-primary bg-transparent": status === "in-progress",
        "border border-muted-foreground/40 bg-transparent": status === "not-started",
        "bg-destructive": status === "overdue",
      })}
      role="img"
      aria-label={status}
    />
  );
}
