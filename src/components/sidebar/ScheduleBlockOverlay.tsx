import { ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ScheduleBlock } from "@/types/scheduling";

const PRIORITY_VARIANTS: Record<string, "destructive" | "secondary" | "outline"> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

function formatTime(time: string): string {
  return time;
}

function durationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

interface ScheduleBlockOverlayProps {
  block: ScheduleBlock;
}

export function ScheduleBlockOverlay({ block }: ScheduleBlockOverlayProps) {
  const minutes = durationMinutes(block.startTime, block.endTime);
  // 2px per minute, min 20px; buffer blocks min 4px
  const height =
    block.blockType === "buffer" ? Math.max(4, minutes * 2) : Math.max(20, minutes * 2);

  // Buffer blocks: thin muted separator
  if (block.blockType === "buffer") {
    return <div className="w-full rounded-sm bg-muted" style={{ height: `${height}px` }} />;
  }

  // Meeting blocks
  if (block.blockType === "meeting") {
    return (
      <div
        className="flex w-full items-start gap-2 rounded-md px-2 py-1"
        style={{
          height: `${height}px`,
          backgroundColor: "oklch(0.6 0.118 184.714 / 0.4)",
          borderLeft: "3px solid oklch(0.6 0.118 184.714)",
        }}
      >
        <span className="text-xs font-semibold text-foreground">{formatTime(block.startTime)}</span>
        <span className="truncate text-sm text-foreground">{block.eventTitle}</span>
      </div>
    );
  }

  // Work blocks (suggested or confirmed)
  const isSuggested = !block.isConfirmed;

  return (
    <div
      className="flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1"
      style={{
        height: `${height}px`,
        backgroundColor: isSuggested
          ? "oklch(0.6 0.118 184.714 / 0.1)"
          : "oklch(0.6 0.118 184.714 / 0.2)",
        border: isSuggested
          ? "1px dashed oklch(0.6 0.118 184.714)"
          : "1px solid oklch(0.6 0.118 184.714)",
      }}
    >
      {block.isContinuation && (
        <div className="flex items-center gap-0.5 text-muted-foreground">
          <ArrowDown className="size-3" />
          <span className="text-[10px]">(continued)</span>
        </div>
      )}
      <span className="text-xs font-semibold text-foreground">{formatTime(block.startTime)}</span>
      <span className="flex-1 truncate text-sm text-foreground">{block.taskTitle}</span>
      {block.taskPriority && (
        <Badge
          variant={PRIORITY_VARIANTS[block.taskPriority] ?? "outline"}
          className="ml-auto text-[10px]"
        >
          {block.taskPriority}
        </Badge>
      )}
    </div>
  );
}
