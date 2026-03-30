import {
  Play,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
  XCircle,
} from "lucide-react";
import type { AgentActivityEntry as EntryType, AgentEntryType } from "@/types/agent";

const iconMap: Record<AgentEntryType, React.ElementType> = {
  execution_start: Play,
  execution_complete: CheckCircle2,
  planning_complete: CheckCircle2,
  context_seeded: MessageSquare,
  human_needed: AlertCircle,
  error: XCircle,
  approval_request: AlertCircle,
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface AgentActivityEntryProps {
  entry: EntryType;
}

export function AgentActivityEntry({ entry }: AgentActivityEntryProps) {
  const Icon = iconMap[entry.type] ?? AlertCircle;

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
      <Icon className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{entry.title}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {formatRelativeTime(entry.timestamp)}
      </span>
    </div>
  );
}
