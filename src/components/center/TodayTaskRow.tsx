import type { Task } from "@/lib/types";
import { StatusDot } from "@/components/shared/StatusDot";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

interface TodayTaskRowProps {
  task: Task;
  projectName: string;
  isNextUp: boolean;
  isOverdueSection: boolean;
}

function formatDueDate(dueDate: string): string {
  const due = new Date(dueDate + "T00:00:00");
  const now = new Date();
  const diffDays = Math.round(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays >= 0 && diffDays < 7) {
    return `Due ${due.toLocaleDateString(undefined, { weekday: "short" })}`;
  }
  return `Due ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "complete") return false;
  const today = new Date().toISOString().slice(0, 10);
  return task.dueDate < today;
}

export function TodayTaskRow({
  task,
  projectName,
  isNextUp,
  isOverdueSection,
}: TodayTaskRowProps) {
  const selectTask = useWorkspaceStore((s) => s.selectTask);
  const isComplete = task.status === "complete";
  const showOverdueBadge = isOverdue(task) && !isOverdueSection;

  return (
    <button
      type="button"
      onClick={() => selectTask(task.id)}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-muted transition-colors cursor-pointer min-h-[36px] ${
        isComplete ? "opacity-40" : ""
      } ${isNextUp ? "border-l-[3px] border-primary/60" : ""}`}
    >
      <StatusDot status={task.status} />
      <span
        className={`flex-1 truncate text-left text-sm ${
          isComplete ? "line-through" : ""
        }`}
      >
        {task.title}
      </span>
      <span className="text-xs text-muted-foreground max-w-[120px] truncate">
        {projectName}
      </span>
      {showOverdueBadge ? (
        <Badge variant="destructive">Overdue</Badge>
      ) : (
        task.dueDate && (
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            {formatDueDate(task.dueDate)}
          </span>
        )
      )}
    </button>
  );
}
