import { useState, useRef, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Circle, CheckCircle2, Clock, Ban, ArrowRightLeft } from "lucide-react";
import type { Task, TaskStatus, Phase } from "@/lib/types";

interface TaskRowProps {
  task: Task;
  phases: Phase[];
  onSelectTask: (taskId: string) => void;
  onToggleTaskStatus: (taskId: string, currentStatus: TaskStatus) => void;
  onSetTaskPhase: (taskId: string, phaseId: string | null) => void;
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

export function TaskRow({
  task,
  phases,
  onSelectTask,
  onToggleTaskStatus,
  onSetTaskPhase,
}: TaskRowProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `task:${task.id}` });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.4 : 1,
      }
    : undefined;

  // Close menu on outside click
  useEffect(() => {
    if (!showMoveMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMoveMenu]);

  const moveOptions = [
    ...(task.phaseId !== null
      ? [{ id: null as string | null, name: "Unassigned" }]
      : []),
    ...phases
      .filter((p) => p.id !== task.phaseId)
      .map((p) => ({ id: p.id as string | null, name: p.name })),
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 py-1 pl-10 pr-2 w-full text-sm hover:bg-card rounded-md transition-colors relative"
    >
      <div
        className="cursor-grab touch-none flex-shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3 text-muted-foreground/50" />
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleTaskStatus(task.id, task.status);
        }}
        className="flex-shrink-0 hover:scale-110 transition-transform"
      >
        <StatusIcon status={task.status} />
      </button>
      <button
        type="button"
        onClick={() => onSelectTask(task.id)}
        className="flex-1 text-left"
      >
        <span
          className={
            task.status === "complete"
              ? "line-through text-muted-foreground"
              : ""
          }
        >
          {task.title}
        </span>
      </button>

      {/* Move to phase button — visible on hover */}
      {moveOptions.length > 0 && (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveMenu(!showMoveMenu);
            }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
            title="Move to phase"
          >
            <ArrowRightLeft className="size-3 text-muted-foreground" />
          </button>

          {showMoveMenu && (
            <div className="absolute right-0 top-6 z-50 min-w-36 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
              <div className="px-1.5 py-1 text-xs text-muted-foreground">
                Move to
              </div>
              {moveOptions.map((opt) => (
                <button
                  key={opt.id ?? "unassigned"}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetTaskPhase(task.id, opt.id);
                    setShowMoveMenu(false);
                  }}
                  className="flex w-full cursor-default items-center rounded-md px-1.5 py-1 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground"
                >
                  {opt.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
