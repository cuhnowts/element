import { useEffect, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useStore } from "@/stores";
import { useTaskStore } from "@/stores/useTaskStore";
import { ExecutionDiagram } from "./ExecutionDiagram";
import { PromoteButton } from "./PromoteButton";
import { SchedulingBadges } from "@/components/shared/SchedulingBadges";
import { DurationChips } from "@/components/shared/DurationChips";
import type { TaskStatus, TaskPriority } from "@/lib/types";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
  { value: "blocked", label: "Blocked" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function TaskDetail() {
  const selectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);
  const selectedTask = useStore((s) => s.selectedTask);
  const updateTask = useStore((s) => s.updateTask);
  const updateTaskStatus = useStore((s) => s.updateTaskStatus);
  const addTagToTask = useStore((s) => s.addTagToTask);
  const removeTagFromTask = useStore((s) => s.removeTagFromTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const selectTask = useStore((s) => s.selectTask);
  const selectWorkspaceTask = useWorkspaceStore((s) => s.selectTask);

  const executionHistory = useTaskStore((s) => s.executionHistory);
  const fetchExecutionHistory = useTaskStore((s) => s.fetchExecutionHistory);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [tagInput, setTagInput] = useState("");
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load task when selected
  useEffect(() => {
    if (selectedTaskId) {
      selectTask(selectedTaskId);
      fetchExecutionHistory(selectedTaskId);
    }
  }, [selectedTaskId, selectTask, fetchExecutionHistory]);

  // Sync local state when task loads
  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
      setDescription(selectedTask.description);
      setContext(selectedTask.context);
    }
  }, [selectedTask?.id]); // Only reset on task change, not every update

  if (!selectedTaskId) return null;

  if (!selectedTask) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const handleTitleBlur = () => {
    if (title !== selectedTask.title && title.trim()) {
      updateTask(selectedTask.id, { title: title.trim() });
    }
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (descTimer.current) clearTimeout(descTimer.current);
    descTimer.current = setTimeout(() => {
      updateTask(selectedTask.id, { description: value });
    }, 800);
  };

  const handleContextChange = (value: string) => {
    setContext(value);
    if (contextTimer.current) clearTimeout(contextTimer.current);
    contextTimer.current = setTimeout(() => {
      updateTask(selectedTask.id, { context: value });
    }, 800);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag) {
      addTagToTask(selectedTask.id, tag);
      setTagInput("");
    }
  };

  const handleDelete = async () => {
    await deleteTask(selectedTask.id);
    selectWorkspaceTask(null);
  };

  // Get steps from latest execution record
  const latestExecution = executionHistory[0];
  const steps = latestExecution?.steps ?? [];

  return (
    <div className="space-y-6">
      {/* Title + Automate */}
      <div className="flex items-center gap-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0 bg-transparent flex-1"
          placeholder="Task title"
        />
        <PromoteButton taskId={selectedTask.id} variant="button" />
      </div>

      {/* Scheduling Badges - read-only display */}
      <SchedulingBadges
        dueDate={selectedTask.dueDate}
        scheduledDate={selectedTask.scheduledDate}
        scheduledTime={selectedTask.scheduledTime}
        durationMinutes={selectedTask.durationMinutes}
        recurrenceRule={selectedTask.recurrenceRule}
      />

      {/* Status & Priority row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            Status
          </span>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateTaskStatus(selectedTask.id, opt.value)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  selectedTask.status === opt.value
                    ? "bg-foreground text-background font-medium"
                    : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            Priority
          </span>
          <div className="flex gap-1">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateTask(selectedTask.id, { priority: opt.value })}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  selectedTask.priority === opt.value
                    ? `bg-foreground text-background font-medium`
                    : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Tags
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {selectedTask.tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="gap-1 pr-1">
              {tag.name}
              <button
                type="button"
                onClick={() => removeTagFromTask(selectedTask.id, tag.id)}
                className="hover:text-destructive transition-colors"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
            placeholder="Add tag..."
            className="h-6 w-24 text-xs border-none shadow-none px-1 focus-visible:ring-0 bg-transparent"
          />
        </div>
      </div>

      {/* Duration Estimate */}
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Duration
        </span>
        <DurationChips
          value={selectedTask.durationMinutes}
          onChange={(minutes) => {
            if (minutes !== null) {
              updateTask(selectedTask.id, { durationMinutes: minutes });
            }
          }}
        />
      </div>

      {/* Description */}
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Description
        </span>
        <Textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Add a description..."
          className="min-h-[80px] resize-none"
        />
      </div>

      {/* Context */}
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Context
        </span>
        <Textarea
          value={context}
          onChange={(e) => handleContextChange(e.target.value)}
          placeholder="Add context, notes, or references..."
          className="min-h-[60px] resize-none"
        />
      </div>

      {/* Execution */}
      {steps.length > 0 && (
        <div>
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
            Execution
          </span>
          <ExecutionDiagram steps={steps} />
        </div>
      )}

      {/* Delete */}
      <div className="pt-4 border-t border-border">
        <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={handleDelete}>
          Delete Task
        </Button>
      </div>
    </div>
  );
}
