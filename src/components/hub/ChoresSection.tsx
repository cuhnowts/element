import { useStore } from "@/stores";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/tauri";
import type { Task, TaskStatus } from "@/lib/types";

export function ChoresSection() {
  const standaloneTasks = useStore((s) => s.standaloneTasks);
  const loadStandaloneTasks = useStore((s) => s.loadStandaloneTasks);

  const handleToggle = async (task: Task) => {
    const newStatus: TaskStatus =
      task.status === "complete" ? "pending" : "complete";
    await api.updateTaskStatus(task.id, newStatus);
    await loadStandaloneTasks();
  };

  if (standaloneTasks.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Chores
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          No standalone tasks. Tasks without a project appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Chores
      </h3>
      <p className="text-xs text-muted-foreground mt-1 mb-2">To-Do's</p>
      <div className="space-y-1">
        {standaloneTasks.map((task) => (
          <label
            key={task.id}
            className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-secondary cursor-pointer"
          >
            <Checkbox
              checked={task.status === "complete"}
              onCheckedChange={() => handleToggle(task)}
              aria-label={task.title}
            />
            <span
              className={
                task.status === "complete"
                  ? "text-sm text-muted-foreground line-through"
                  : "text-sm text-foreground"
              }
            >
              {task.title}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
