import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Project, Task, TaskPriority } from "@/lib/types";
import { DurationChips } from "@/components/shared/DurationChips";

export function QuickCaptureWindow() {
  const [title, setTitle] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load projects on mount
  useEffect(() => {
    invoke<Project[]>("list_projects")
      .then((projectList) => {
        setProjects(projectList);
        if (projectList.length > 0) {
          setSelectedProjectId(projectList[0].id);
        }
      })
      .catch((err) => console.error("Failed to load projects:", err));
  }, []);

  // Auto-focus title input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !selectedProjectId) return;
    try {
      const task = await invoke<Task>("create_task", {
        projectId: selectedProjectId,
        title: title.trim(),
        priority,
        dueDate: dueDate || undefined,
        durationMinutes: durationMinutes || undefined,
      });
      // Notify main window to refresh.
      // The main window's useTauriEvents hook already listens for "task-created"
      // and calls fetchTodaysTasks() + loadTasks().
      await emit("task-created", task);
      // Close capture window
      await getCurrentWindow().close();
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }, [title, selectedProjectId, priority, dueDate, durationMinutes]);

  // Global keyboard handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        getCurrentWindow().close();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit]);

  const selectStyle =
    "h-8 rounded-md border border-border bg-secondary px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div
      className="h-screen w-screen overflow-hidden"
      style={{ borderRadius: "12px" }}
    >
      <div className="bg-card border border-border rounded-xl p-8 shadow-lg h-full flex flex-col gap-4">
        {/* Title input */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none border-b border-border pb-2"
        />

        {/* Selectors row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Project selector */}
          <select
            value={selectedProjectId ?? ""}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className={selectStyle}
          >
            <option value="" disabled>
              Project
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Priority selector */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className={selectStyle}
          >
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Due date */}
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={selectStyle}
          />
        </div>

        {/* Duration chips + submit */}
        <div className="flex items-center justify-between mt-auto">
          <DurationChips value={durationMinutes} onChange={setDurationMinutes} />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || !selectedProjectId}
            className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
