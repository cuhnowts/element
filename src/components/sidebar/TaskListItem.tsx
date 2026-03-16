import type { Task } from "@/types/task";
import { StatusDot } from "@/components/shared/StatusDot";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

interface TaskListItemProps {
  task: Task;
}

export function TaskListItem({ task }: TaskListItemProps) {
  const selectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);
  const selectTask = useWorkspaceStore((s) => s.selectTask);
  const isSelected = selectedTaskId === task.id;

  return (
    <button
      type="button"
      onClick={() => selectTask(task.id)}
      className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors duration-100
        ${isSelected ? "bg-accent/10 border-l-2 border-primary" : "border-l-2 border-transparent hover:bg-muted"}`}
    >
      <StatusDot status={task.status} />
      <span className="flex-1 truncate">{task.title}</span>
      {task.scheduledTime && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {task.scheduledTime}
        </span>
      )}
    </button>
  );
}
