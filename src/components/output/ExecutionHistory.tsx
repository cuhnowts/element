import type { ExecutionRecord } from "@/types/execution";
import { EmptyState } from "@/components/shared/EmptyState";

const STATUS_STYLES: Record<string, string> = {
  complete: "bg-green-500",
  running: "bg-blue-500 animate-pulse",
  failed: "bg-destructive",
  pending: "bg-muted-foreground",
  skipped: "bg-muted-foreground/50",
};

const STATUS_LABELS: Record<string, string> = {
  complete: "Complete",
  running: "Running",
  failed: "Failed",
  pending: "Pending",
  skipped: "Skipped",
};

interface ExecutionHistoryProps {
  records: ExecutionRecord[];
  onSelectExecution: (executionId: string) => void;
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
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
  if (!completedAt) return "—";
  try {
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}m ${remaining}s`;
  } catch {
    return "—";
  }
}

export function ExecutionHistory({ records, onSelectExecution }: ExecutionHistoryProps) {
  if (records.length === 0) {
    return (
      <EmptyState
        heading="No execution history"
        body="Run a task or workflow to see past executions here."
      />
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="text-left text-xs font-semibold uppercase text-muted-foreground">
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Started</th>
            <th className="px-3 py-2">Duration</th>
            <th className="px-3 py-2">Steps</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.id}
              onClick={() => onSelectExecution(record.id)}
              className="hover:bg-muted/50 cursor-pointer border-t border-border"
            >
              <td className="px-3 py-2">
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${STATUS_STYLES[record.status] ?? "bg-muted-foreground"}`}
                  />
                  <span>{STATUS_LABELS[record.status] ?? record.status}</span>
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {formatTimestamp(record.startedAt)}
              </td>
              <td className="px-3 py-2 text-muted-foreground font-mono">
                {formatDuration(record.startedAt, record.completedAt)}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {record.steps.length > 0
                  ? `${record.steps.filter((s) => s.status === "complete").length}/${record.steps.length}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
