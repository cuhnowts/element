import type { LogEntry as LogEntryType } from "@/types/execution";

const LOG_LEVEL_STYLES: Record<string, string> = {
  INFO: "text-foreground",
  WARN: "text-chart-5",
  ERROR: "text-destructive",
  DEBUG: "text-muted-foreground",
};

interface LogEntryProps {
  entry: LogEntryType;
}

export function LogEntry({ entry }: LogEntryProps) {
  return (
    <div className="flex gap-2 px-3 py-0.5 hover:bg-muted/50 font-mono text-sm">
      <span className="text-muted-foreground whitespace-nowrap">
        [{entry.timestamp}]
      </span>
      <span className={`font-semibold w-12 ${LOG_LEVEL_STYLES[entry.level] ?? "text-foreground"}`}>
        {entry.level}
      </span>
      <span className="flex-1">{entry.message}</span>
    </div>
  );
}
