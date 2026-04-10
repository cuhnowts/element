import { ArrowLeft, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DatePickerPopover } from "@/components/shared/DatePickerPopover";
import { DurationChips } from "@/components/shared/DurationChips";
import { SchedulingBadges } from "@/components/shared/SchedulingBadges";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { isBacklogPhase } from "@/lib/date-utils";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import { useStore } from "@/stores";
import { useTaskStore } from "@/stores/useTaskStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { ExecutionDiagram } from "./ExecutionDiagram";
import { PromoteButton } from "./PromoteButton";

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
  const phases = useStore((s) => s.phases);
  const projects = useStore((s) => s.projects);
  const selectProject = useStore((s) => s.selectProject);
  const setTaskPhase = useStore((s) => s.setTaskPhase);
  const loadTaskDetail = useStore((s) => s.loadTaskDetail);
  const selectWorkspaceTask = useWorkspaceStore((s) => s.selectTask);

  const executionHistory = useTaskStore((s) => s.executionHistory);
  const fetchExecutionHistory = useTaskStore((s) => s.fetchExecutionHistory);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [tagInput, setTagInput] = useState("");
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load task when selected (without clearing project context)
  useEffect(() => {
    if (selectedTaskId) {
      loadTaskDetail(selectedTaskId).catch(() => {
        selectWorkspaceTask(null);
      });
      fetchExecutionHistory(selectedTaskId).catch(() => {
        // Non-critical, silently ignore
      });
    }
  }, [selectedTaskId, loadTaskDetail, fetchExecutionHistory, selectWorkspaceTask]);

  // Sync local state when task loads
  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
      setDescription(selectedTask.description ?? "");
      setContext(selectedTask.context ?? "");
    }
  }, [selectedTask?.id, selectedTask?.context, selectedTask?.description, selectedTask]); // Only reset on task change, not every update

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
    try {
      await deleteTask(selectedTask.id);
      selectWorkspaceTask(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // Get steps from latest execution record
  const latestExecution = executionHistory[0];
  const steps = latestExecution?.steps ?? [];

  const taskProject = selectedTask.projectId
    ? projects.find((p) => p.id === selectedTask.projectId)
    : null;

  const handleBackToProject = () => {
    if (taskProject) {
      selectWorkspaceTask(null);
      selectProject(taskProject.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to project */}
      {taskProject && (
        <button
          type="button"
          onClick={handleBackToProject}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3" />
          {taskProject.name}
        </button>
      )}

      {/* Title + Automate */}
      <div className="flex items-center gap-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0 bg-transparent flex-1"
          placeholder="Task title"
        />
        <PromoteButton taskId={selectedTask.id} variant="button" />
      </div>

      {/* Status & Priority row (primary field) */}
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

      {/* Description (primary field) */}
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

      {/* Secondary fields in accordion sections */}
      <Accordion multiple className="border-t border-border">
        <AccordionItem value="context">
          <AccordionTrigger className="py-3 text-sm">Context</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <Textarea
              value={context}
              onChange={(e) => handleContextChange(e.target.value)}
              placeholder="Add context, notes, or references..."
              className="min-h-[60px] resize-none"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tags">
          <AccordionTrigger className="py-3 text-sm">Tags</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="flex flex-wrap items-center gap-1">
              {selectedTask.tags?.map((tag) => (
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag..."
                className="h-6 w-24 text-xs border-none shadow-none px-1 focus-visible:ring-0 bg-transparent"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="scheduling">
          <AccordionTrigger className="py-3 text-sm">Scheduling</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4 space-y-4">
            <DatePickerPopover
              value={selectedTask.dueDate}
              onChange={(date) => updateTask(selectedTask.id, { dueDate: date ?? "" })}
            />
            <SchedulingBadges
              dueDate={selectedTask.dueDate}
              scheduledDate={selectedTask.scheduledDate}
              scheduledTime={selectedTask.scheduledTime}
              durationMinutes={selectedTask.durationMinutes}
              recurrenceRule={selectedTask.recurrenceRule}
              isBacklog={
                selectedTask.phaseId
                  ? isBacklogPhase(
                      phases.find((p) => p.id === selectedTask.phaseId)?.sortOrder ?? 0,
                    )
                  : false
              }
            />
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
            {phases.length > 0 && (
              <div>
                <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
                  Phase
                </span>
                <Select
                  value={selectedTask.phaseId ?? "unassigned"}
                  onValueChange={(value) => {
                    const newPhaseId = value === "unassigned" ? null : value;
                    setTaskPhase(selectedTask.id, newPhaseId);
                  }}
                >
                  <SelectTrigger className="w-48 h-8 text-sm">
                    <span className="flex flex-1 text-left truncate">
                      {selectedTask.phaseId
                        ? (phases.find((p) => p.id === selectedTask.phaseId)?.name ?? "Unknown")
                        : "Unassigned"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {steps.length > 0 && (
          <AccordionItem value="execution">
            <AccordionTrigger className="py-3 text-sm">Execution History</AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <ExecutionDiagram steps={steps} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Delete */}
      <div className="pt-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          Delete Task
        </Button>
      </div>
    </div>
  );
}
