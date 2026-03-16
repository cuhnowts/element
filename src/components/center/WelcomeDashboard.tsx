import { Button } from "@/components/ui/button";
import { useTaskStore } from "@/stores/useTaskStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { StatusDot } from "@/components/shared/StatusDot";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function WelcomeDashboard() {
  const todaysTasks = useTaskStore((s) => s.todaysTasks);
  const selectTask = useWorkspaceStore((s) => s.selectTask);
  const recentTasks = todaysTasks.slice(0, 5);

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
      <h1 className="text-2xl font-semibold leading-tight mb-2">
        {getGreeting()}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Here's what's on your plate today.
      </p>
      <Button className="mb-8">New Task</Button>

      {recentTasks.length > 0 && (
        <div className="w-full text-left">
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-2 block">
            Today's Tasks
          </span>
          <div className="space-y-1">
            {recentTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => selectTask(task.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-muted transition-colors"
              >
                <StatusDot status={task.status} />
                <span className="flex-1 truncate text-left">{task.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
