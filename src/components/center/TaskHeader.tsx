import { Badge } from "@/components/ui/badge";
import type { TaskDetail } from "@/types/task";
import { StatusDot } from "@/components/shared/StatusDot";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  "in-progress": "default",
  complete: "secondary",
  blocked: "destructive",
};

interface TaskHeaderProps {
  task: TaskDetail;
}

export function TaskHeader({ task }: TaskHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <StatusDot status={task.status} className="mt-1.5" />
        <h2 className="text-lg font-semibold leading-snug">{task.title}</h2>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={STATUS_BADGE_VARIANT[task.status] ?? "outline"}>
          {task.status}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {task.priority}
        </Badge>
      </div>
    </div>
  );
}
