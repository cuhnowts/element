import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronRight, Plus, Circle, CheckCircle2, Clock, Ban } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Phase, Task, TaskStatus } from "@/lib/types";

interface PhaseRowProps {
  phase: Phase;
  tasks: Task[];
  onUpdatePhase: (id: string, name: string) => void;
  onDeletePhase: (id: string) => void;
  onCreateTask: (phaseId: string, title: string) => void;
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

export function PhaseRow({
  phase,
  tasks,
  onUpdatePhase,
  onDeletePhase,
  onCreateTask,
  onSelectTask,
}: PhaseRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(phase.name);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const complete = tasks.filter((t) => t.status === "complete").length;
  const total = tasks.length;
  const progressPct = total > 0 ? (complete / total) * 100 : 0;

  const handleStartRename = () => {
    setRenameName(phase.name);
    setIsRenaming(true);
  };

  const handleFinishRename = () => {
    const trimmed = renameName.trim();
    if (trimmed && trimmed !== phase.name) {
      onUpdatePhase(phase.id, trimmed);
    } else {
      setRenameName(phase.name);
    }
    setIsRenaming(false);
  };

  const handleConfirmDelete = () => {
    onDeletePhase(phase.id);
    setShowDeleteConfirm(false);
  };

  const handleAddTask = () => {
    const trimmed = newTaskTitle.trim();
    if (trimmed) {
      onCreateTask(phase.id, trimmed);
      setNewTaskTitle("");
      setIsAddingTask(false);
    } else {
      setIsAddingTask(false);
      setNewTaskTitle("");
    }
  };

  return (
    <>
      <div ref={setNodeRef} style={style}>
        <ContextMenu>
          <ContextMenuTrigger>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <div className="flex items-center gap-2 min-h-[40px] px-2 rounded-md hover:bg-card transition-colors">
                <div
                  className="cursor-grab touch-none"
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="size-4 text-muted-foreground" />
                </div>
                <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0">
                  <ChevronRight
                    className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                  />
                  {isRenaming ? (
                    <Input
                      ref={renameInputRef}
                      autoFocus
                      value={renameName}
                      onChange={(e) => setRenameName(e.target.value)}
                      onBlur={handleFinishRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFinishRename();
                        if (e.key === "Escape") {
                          setRenameName(phase.name);
                          setIsRenaming(false);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-sm border-none shadow-none px-1 focus-visible:ring-0 bg-transparent flex-1"
                    />
                  ) : (
                    <span className="text-sm flex-1 text-left">{phase.name}</span>
                  )}
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
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={handleStartRename}>Rename</ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-popover rounded-lg p-6 max-w-sm shadow-lg space-y-4">
            <h3 className="text-sm font-semibold">Delete Phase</h3>
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? `Delete "${phase.name}"? This cannot be undone.`
                : `Delete "${phase.name}"? Its ${total} task${total === 1 ? "" : "s"} will be moved to Unassigned.`}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
