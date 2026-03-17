import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Timer } from "lucide-react";
import { RecurrenceIndicator } from "./RecurrenceIndicator";

interface SchedulingBadgesProps {
  dueDate: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  durationMinutes: number | null;
  recurrenceRule: string | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function isOverdue(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  return due < today;
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
}: SchedulingBadgesProps) {
  if (!dueDate && !scheduledDate && !scheduledTime && !durationMinutes && !recurrenceRule) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {dueDate && (
        <Badge variant={isOverdue(dueDate) ? "destructive" : "outline"}>
          <CalendarDays className="size-4 mr-1" />
          {isOverdue(dueDate) ? `Overdue - ${formatDate(dueDate)}` : formatDate(dueDate)}
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
