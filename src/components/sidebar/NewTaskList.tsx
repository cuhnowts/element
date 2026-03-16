import { useEffect } from "react";
import { Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores";
import { TaskRow } from "./TaskRow";

export function NewTaskList() {
  const tasks = useStore((s) => s.tasks);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const projects = useStore((s) => s.projects);
  const loadTasks = useStore((s) => s.loadTasks);
  const createTask = useStore((s) => s.createTask);
  const selectTask = useStore((s) => s.selectTask);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    if (selectedProjectId) {
      loadTasks(selectedProjectId);
    }
  }, [selectedProjectId, loadTasks]);

  const handleNewTask = async () => {
    if (!selectedProjectId) return;
    const task = await createTask(selectedProjectId, "Untitled Task");
    selectTask(task.id);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
          {selectedProject ? selectedProject.name : "Tasks"}
        </span>
        {selectedProjectId && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={handleNewTask}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {!selectedProjectId ? (
            <p className="text-sm text-muted-foreground px-2 py-4 text-center">
              Select a project to view tasks
            </p>
          ) : tasks.length === 0 ? (
            <div className="px-2 py-4 text-center">
              <p className="text-sm font-medium">No tasks yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a task to start tracking your work in this project.
              </p>
            </div>
          ) : (
            tasks.map((task) => <TaskRow key={task.id} task={task} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
