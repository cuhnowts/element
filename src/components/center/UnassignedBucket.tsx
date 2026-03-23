import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronRight, Plus } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskRow } from "./TaskRow";
import type { Task, TaskStatus, Phase } from "@/lib/types";

interface UnassignedBucketProps {
  tasks: Task[];
  phases: Phase[];
  onCreateTask: (title: string) => void;
  onSelectTask: (taskId: string) => void;
  onToggleTaskStatus: (taskId: string, currentStatus: TaskStatus) => void;
  onSetTaskPhase: (taskId: string, phaseId: string | null) => void;
  isDropTarget: boolean;
}

export function UnassignedBucket({
  tasks,
  phases,
  onCreateTask,
  onSelectTask,
  onToggleTaskStatus,
  onSetTaskPhase,
  isDropTarget,
}: UnassignedBucketProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const { setNodeRef } = useDroppable({ id: "unassigned-drop" });

  const complete = tasks.filter((t) => t.status === "complete").length;
  const total = tasks.length;
  const progressPct = total > 0 ? (complete / total) * 100 : 0;

  // Always render when drop target (so user can drop tasks here even when empty)
  if (total === 0 && !isDropTarget) return null;

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
    <div ref={setNodeRef}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={`flex items-center gap-2 min-h-[40px] px-2 rounded-md transition-colors ${
            isDropTarget
              ? "bg-primary/10 ring-1 ring-primary/30"
              : "hover:bg-card"
          }`}
        >
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
              <TaskRow
                key={task.id}
                task={task}
                phases={phases}
                onSelectTask={onSelectTask}
                onToggleTaskStatus={onToggleTaskStatus}
                onSetTaskPhase={onSetTaskPhase}
              />
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
    </div>
  );
}
