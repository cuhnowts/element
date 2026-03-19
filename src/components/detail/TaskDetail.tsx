import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useStore } from "@/stores";
import { api } from "@/lib/tauri";
import type { TaskStatus, TaskPriority } from "@/lib/types";
import { AiAssistButton } from "./AiAssistButton";
import { AiSuggestionPanel } from "./AiSuggestionPanel";
import { useAiStream } from "@/hooks/useAiStream";

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
  const selectedTask = useStore((s) => s.selectedTask);
  const updateTask = useStore((s) => s.updateTask);
  const updateTaskStatus = useStore((s) => s.updateTaskStatus);
  const addTagToTask = useStore((s) => s.addTagToTask);
  const removeTagFromTask = useStore((s) => s.removeTagFromTask);
  const acceptedFields = useStore((s) => s.acceptedFields);
  const clearAcceptedFields = useStore((s) => s.clearAcceptedFields);

  useAiStream();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState("");
  const [tagInput, setTagInput] = useState("");

  const descDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when selected task changes
  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
      setDescription(selectedTask.description);
      setContext(selectedTask.context);
    }
  }, [selectedTask?.id, selectedTask?.title, selectedTask?.description, selectedTask?.context]);

  const handleTitleBlur = useCallback(async () => {
    if (!selectedTask || title === selectedTask.title) return;
    try {
      await updateTask(selectedTask.id, { title });
    } catch {
      toast.error("Changes could not be saved. Please try again.");
    }
  }, [selectedTask, title, updateTask]);

  const handleStatusChange = useCallback(
    async (status: TaskStatus) => {
      if (!selectedTask) return;
      try {
        await updateTaskStatus(selectedTask.id, status);
      } catch {
        toast.error("Changes could not be saved. Please try again.");
      }
    },
    [selectedTask, updateTaskStatus],
  );

  const handlePriorityChange = useCallback(
    async (priority: TaskPriority) => {
      if (!selectedTask) return;
      try {
        await updateTask(selectedTask.id, { priority });
      } catch {
        toast.error("Changes could not be saved. Please try again.");
      }
    },
    [selectedTask, updateTask],
  );

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescription(value);
      if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
      descDebounceRef.current = setTimeout(async () => {
        if (!selectedTask) return;
        try {
          await updateTask(selectedTask.id, { description: value });
        } catch {
          toast.error("Changes could not be saved. Please try again.");
        }
      }, 1000);
    },
    [selectedTask, updateTask],
  );

  const handleContextChange = useCallback(
    (value: string) => {
      setContext(value);
      if (contextDebounceRef.current) clearTimeout(contextDebounceRef.current);
      contextDebounceRef.current = setTimeout(async () => {
        if (!selectedTask) return;
        try {
          await updateTask(selectedTask.id, { context: value });
        } catch {
          toast.error("Changes could not be saved. Please try again.");
        }
      }, 1000);
    },
    [selectedTask, updateTask],
  );

  const handleAddTag = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter" || !tagInput.trim() || !selectedTask) return;
      try {
        await addTagToTask(selectedTask.id, tagInput.trim());
        setTagInput("");
      } catch {
        toast.error("Changes could not be saved. Please try again.");
      }
    },
    [selectedTask, tagInput, addTagToTask],
  );

  const handleRemoveTag = useCallback(
    async (tagId: string) => {
      if (!selectedTask) return;
      try {
        await removeTagFromTask(selectedTask.id, tagId);
      } catch {
        toast.error("Changes could not be saved. Please try again.");
      }
    },
    [selectedTask, removeTagFromTask],
  );

  // Clean up debounce timers
  useEffect(() => {
    return () => {
      if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
      if (contextDebounceRef.current) clearTimeout(contextDebounceRef.current);
    };
  }, []);

  // Persist accepted AI suggestion fields
  useEffect(() => {
    if (!selectedTask || Object.keys(acceptedFields).length === 0) return;

    const update: Record<string, unknown> = {};
    if (acceptedFields.description !== undefined)
      update.description = acceptedFields.description;
    if (acceptedFields.priority !== undefined)
      update.priority = acceptedFields.priority;
    if (acceptedFields.estimatedMinutes !== undefined)
      update.durationMinutes = acceptedFields.estimatedMinutes;

    if (Object.keys(update).length > 0) {
      api.updateTask(selectedTask.id, update).then(() => {
        clearAcceptedFields();
      });
    } else {
      // Fields like steps, tags, relatedTasks need separate handling
      clearAcceptedFields();
    }
  }, [acceptedFields, selectedTask, clearAcceptedFields]);

  if (!selectedTask) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a task to view details</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Title + AI Assist */}
        <div className="flex items-start gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="flex-1 text-[20px] font-semibold leading-[1.2] border-none shadow-none bg-transparent px-0 h-auto focus-visible:ring-0"
            placeholder="Task title"
          />
          <AiAssistButton taskId={selectedTask.id} />
        </div>

        {/* AI Suggestion Panel */}
        <AiSuggestionPanel />

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select
            value={selectedTask.status}
            onValueChange={(val) => handleStatusChange(val as TaskStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Priority</label>
          <Select
            value={selectedTask.priority}
            onValueChange={(val) => handlePriorityChange(val as TaskPriority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Tags</label>
          <div className="flex flex-wrap gap-1.5 items-center">
            {selectedTask.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="gap-1">
                {tag.name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-4 p-0"
                  onClick={() => handleRemoveTag(tag.id)}
                >
                  <X className="size-3" />
                </Button>
              </Badge>
            ))}
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag..."
              className="w-24 h-6 text-xs border-none shadow-none bg-transparent px-1 focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Description</label>
          <Textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Add a description..."
            className="min-h-[100px] resize-y"
          />
        </div>

        {/* Context */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Context</label>
          <Textarea
            value={context}
            onChange={(e) => handleContextChange(e.target.value)}
            placeholder="Add context notes..."
            className="min-h-[100px] resize-y"
          />
        </div>
      </div>
    </div>
  );
}
