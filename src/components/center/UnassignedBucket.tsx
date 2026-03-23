import { useState } from "react";
import { ChevronRight, Plus, Circle, CheckCircle2, Clock, Ban } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Task, TaskStatus } from "@/lib/types";

interface UnassignedBucketProps {
  tasks: Task[];
  onCreateTask: (title: string) => void;
  onSelectTask: (taskId: string) => void;
}

function StatusIcon({ status }: { status: TaskStatus }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="size-3.5 text-primary" />;
    case "in-progress":
      return <Clock className="size-3.5 text-muted-foreground" />;
    case "blocked":
      return <Ban className="size-3.5 text-destructive" />;
    default:
      return <Circle className="size-3.5 text-muted-foreground" />;
  }
}

export function UnassignedBucket({ tasks, onCreateTask, onSelectTask }: UnassignedBucketProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const complete = tasks.filter((t) => t.status === "complete").length;
  const total = tasks.length;
  const progressPct = total > 0 ? (complete / total) * 100 : 0;

  // Only render if there are unassigned tasks
  if (total === 0) return null;

  const handleAddTask = () => {
    const trimmed = newTaskTitle.trim();
    if (trimmed) {
      onCreateTask(trimmed);
      setNewTaskTitle("");
      setIsAddingTask(false);
    } else {
      setIsAddingTask(false);
      setNewTaskTitle("");
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-2 min-h-[40px] px-2 rounded-md hover:bg-card transition-colors">
        <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0">
          <ChevronRight
            className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
          <span className="text-sm flex-1 text-left">Unassigned</span>
        </CollapsibleTrigger>
        <div className="w-20 h-1 bg-secondary rounded-full flex-shrink-0">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">
          {complete}/{total}
        </span>
      </div>
      <CollapsibleContent>
        <div className="py-1">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelectTask(task.id)}
              className="flex items-center gap-2 py-1 pl-10 pr-2 w-full text-left text-sm hover:bg-card rounded-md transition-colors"
            >
              <StatusIcon status={task.status} />
              <span className={task.status === "complete" ? "line-through text-muted-foreground" : ""}>
                {task.title}
              </span>
            </button>
          ))}
          {isAddingTask ? (
            <div className="pl-10 pr-2 py-1">
              <Input
                autoFocus
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTask();
                  if (e.key === "Escape") {
                    setIsAddingTask(false);
                    setNewTaskTitle("");
                  }
                }}
                onBlur={handleAddTask}
                placeholder="Task name..."
                className="h-7 text-sm"
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground pl-10"
              onClick={() => {
                setIsAddingTask(true);
                setNewTaskTitle("");
              }}
            >
              <Plus className="size-3 mr-1" />
              Add task
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
