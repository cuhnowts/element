import { Badge } from "@/components/ui/badge";

interface DailyPlanTaskRowProps {
  taskTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  priority: string;
  projectName?: string;
  faded?: boolean;
}

function formatDuration(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  return `${minutes}m`;
}

export function DailyPlanTaskRow({
  taskTitle,
  startTime,
  endTime,
  durationMinutes,
  priority,
  projectName,
  faded,
}: DailyPlanTaskRowProps) {
  return (
    <div className={`flex items-center gap-2${faded ? " opacity-60" : ""}`}>
      <span className="text-sm truncate flex-1">{taskTitle}</span>
      <Badge variant="secondary" className="text-xs shrink-0">
        {formatDuration(durationMinutes)}
      </Badge>
      <span className="text-xs text-muted-foreground shrink-0">
        {startTime} - {endTime}
      </span>
      <span className="text-xs text-muted-foreground capitalize shrink-0">{priority}</span>
      {projectName && <span className="text-xs text-muted-foreground shrink-0">{projectName}</span>}
    </div>
  );
}
