import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAgentStore } from "@/stores/useAgentStore";
import { writeApprovalDecision } from "@/hooks/useAgentQueue";
import { toast } from "sonner";
import type { AgentActivityEntry } from "@/types/agent";

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

interface ApprovalRequestProps {
  entry: AgentActivityEntry;
}

export function ApprovalRequest({ entry }: ApprovalRequestProps) {
  const isPending = entry.approvalStatus === "pending";
  const isApproved = entry.approvalStatus === "approved";
  const isRejected = entry.approvalStatus === "rejected";

  const borderColor = isPending
    ? "border-amber-500"
    : isApproved
      ? "border-green-500"
      : "border-destructive";

  const handleApprove = () => {
    useAgentStore.getState().approveEntry(entry.id);
    // Write decision back to queue file for MCP server to read
    writeApprovalDecision(entry.id, "approved").catch(() => {
      // Queue write failure is non-fatal -- store update already applied
    });
    toast("Phase approved -- execution starting");
  };

  const handleReject = () => {
    useAgentStore.getState().rejectEntry(entry.id);
    // Write decision back to queue file for MCP server to read
    writeApprovalDecision(entry.id, "rejected").catch(() => {
      // Queue write failure is non-fatal -- store update already applied
    });
    toast("Phase rejected -- skipped");
  };

  return (
    <div
      className={`flex flex-col gap-2 px-4 py-3 border-l-2 ${borderColor} ${isPending ? "bg-muted/30" : ""} ${!isPending ? "opacity-60" : ""} hover:bg-muted/50 transition-colors`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{entry.title}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {formatRelativeTime(entry.timestamp)}
        </span>
      </div>
      <div className="flex items-center justify-end gap-2">
        {isPending ? (
          <>
            <Button variant="outline" size="sm" onClick={handleReject}>
              Reject
            </Button>
            <Button variant="default" size="sm" onClick={handleApprove}>
              Approve
            </Button>
          </>
        ) : isApproved ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3" /> Approved
          </span>
        ) : isRejected ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <XCircle className="size-3" /> Rejected
          </span>
        ) : null}
      </div>
    </div>
  );
}
