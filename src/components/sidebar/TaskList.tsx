import { useEffect } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskStore } from "@/stores/useTaskStore";
import { TaskListItem } from "./TaskListItem";

export function TaskList() {
  const todaysTasks = useTaskStore((s) => s.todaysTasks);
  const isLoadingTasks = useTaskStore((s) => s.isLoadingTasks);
  const fetchTodaysTasks = useTaskStore((s) => s.fetchTodaysTasks);

  useEffect(() => {
    fetchTodaysTasks();
  }, [fetchTodaysTasks]);

  return (
    <div className="flex flex-col">
      <span className="px-4 py-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        Today's Tasks
      </span>
      <ScrollArea className="flex-1">
        {isLoadingTasks ? (
          <div className="space-y-2 px-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : todaysTasks.length === 0 ? (
          <EmptyState
            heading="No tasks for today"
            body="Create a task to get started, or check back when workflows are scheduled."
          />
        ) : (
          todaysTasks.map((task) => <TaskListItem key={task.id} task={task} />)
        )}
      </ScrollArea>
    </div>
  );
}
