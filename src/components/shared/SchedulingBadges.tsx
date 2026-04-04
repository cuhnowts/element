import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Timer } from "lucide-react";
import { RecurrenceIndicator } from "./RecurrenceIndicator";
import { isOverdue, isDueSoon } from "@/lib/date-utils";

interface SchedulingBadgesProps {
  dueDate: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  durationMinutes: number | null;
  recurrenceRule: string | null;
  isBacklog?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getUrgencyVariant(dueDate: string, isBacklog: boolean): "destructive" | "warning" | "outline" {
  if (isBacklog) return "outline";
  if (isOverdue(dueDate)) return "destructive";
  if (isDueSoon(dueDate)) return "warning";
  return "outline";
}

function getDueDateLabel(dueDate: string, isBacklog: boolean): string {
  if (isBacklog) return formatDate(dueDate);
  if (isOverdue(dueDate)) return `Overdue - ${formatDate(dueDate)}`;
  if (isDueSoon(dueDate)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + "T00:00:00");
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `Due ${new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(due)}`;
  }
  return formatDate(dueDate);
}

function formatScheduled(
  scheduledDate: string | null,
  scheduledTime: string | null,
): string {
  const parts: string[] = [];

  if (scheduledDate) {
    const date = new Date(scheduledDate + "T00:00:00");
    parts.push(
      new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
    );
  }

  if (scheduledTime) {
    // Convert 24h "HH:MM" to 12h format
    const [h, m] = scheduledTime.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    parts.push(`${hour12}:${m.toString().padStart(2, "0")} ${period}`);
  }

  return parts.join(" ");
}

function formatDuration(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  return `${minutes}m`;
}

export function SchedulingBadges({
  dueDate,
  scheduledDate,
  scheduledTime,
  durationMinutes,
  recurrenceRule,
  isBacklog = false,
}: SchedulingBadgesProps) {
  if (!dueDate && !scheduledDate && !scheduledTime && !durationMinutes && !recurrenceRule) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {dueDate && (
        <Badge variant={getUrgencyVariant(dueDate, isBacklog)}>
          <CalendarDays className="size-4 mr-1" />
          {getDueDateLabel(dueDate, isBacklog)}
        </Badge>
      )}

      {(scheduledDate || scheduledTime) && (
        <Badge variant="outline">
          <Clock className="size-4 mr-1" />
          {formatScheduled(scheduledDate, scheduledTime)}
        </Badge>
      )}

      {durationMinutes && (
        <Badge variant="secondary">
          <Timer className="size-4 mr-1" />
          {formatDuration(durationMinutes)}
        </Badge>
      )}

      {recurrenceRule && (
        <Badge variant="secondary">
          <RecurrenceIndicator rule={recurrenceRule} />
        </Badge>
      )}
    </div>
  );
}
