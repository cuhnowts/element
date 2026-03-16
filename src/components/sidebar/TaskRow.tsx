import {
  Circle,
  CircleDot,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/stores";
import type { Task, TaskStatus } from "@/lib/types";

const STATUS_ICONS: Record<TaskStatus, { icon: typeof Circle; className: string }> = {
  pending: { icon: Circle, className: "text-muted-foreground" },
  "in-progress": { icon: CircleDot, className: "text-primary" },
  complete: { icon: CheckCircle2, className: "text-[oklch(0.627_0.194_149.214)]" },
  blocked: { icon: XCircle, className: "text-destructive" },
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  complete: "Complete",
  blocked: "Blocked",
};

interface TaskRowProps {
  task: Task;
}

export function TaskRow({ task }: TaskRowProps) {
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const selectTask = useStore((s) => s.selectTask);
  const updateTaskStatus = useStore((s) => s.updateTaskStatus);
  const openDeleteConfirm = useStore((s) => s.openDeleteConfirm);

  const isSelected = selectedTaskId === task.id;
  const { icon: StatusIcon, className: statusClassName } = STATUS_ICONS[task.status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            onClick={() => selectTask(task.id)}
            className={`flex items-center gap-2 w-full px-2 py-1.5 text-left text-sm rounded-md transition-colors hover:bg-muted ${
              isSelected ? "bg-accent/10" : ""
            }`}
          />
        }
      >
        <StatusIcon className={`size-4 shrink-0 ${statusClassName}`} />
        <span className="flex-1 truncate text-sm">{task.title}</span>
        {task.priority === "urgent" && (
          <Badge variant="destructive" className="text-xs px-1 py-0 h-5 shrink-0">
            Urgent
          </Badge>
        )}
        {task.priority === "high" && (
          <Badge
            variant="outline"
            className="text-xs px-1 py-0 h-5 shrink-0 border-[oklch(0.705_0.213_47.604)] text-[oklch(0.705_0.213_47.604)]"
          >
            High
          </Badge>
        )}
        {task.priority === "medium" && (
          <Badge
            variant="outline"
            className="text-xs px-1 py-0 h-5 shrink-0 border-amber-400 text-amber-500 dark:border-amber-500 dark:text-amber-400"
          >
            Medium
          </Badge>
        )}
        {task.priority === "low" && (
          <Badge
            variant="outline"
            className="text-xs px-1 py-0 h-5 shrink-0 border-muted-foreground/30 text-muted-foreground/60"
          >
            Low
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4}>
        <DropdownMenuItem onClick={() => selectTask(task.id)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => updateTaskStatus(task.id, status)}
              >
                {STATUS_LABELS[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() =>
            openDeleteConfirm({ type: "task", id: task.id, name: task.title })
          }
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
