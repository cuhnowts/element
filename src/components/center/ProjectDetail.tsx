import { useEffect, useState, useRef } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/stores";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { DirectoryLink } from "./DirectoryLink";
import { PhaseRow } from "./PhaseRow";
import { UnassignedBucket } from "./UnassignedBucket";
import type { Task } from "@/lib/types";

// --- Exported helpers for testing ---

export function computeProgress(tasks: Task[]): { complete: number; total: number } {
  const complete = tasks.filter((t) => t.status === "complete").length;
  return { complete, total: tasks.length };
}

export function tasksForPhase(tasks: Task[], phaseId: string | null): Task[] {
  return tasks.filter((t) =>
    phaseId === null ? t.phaseId === null : t.phaseId === phaseId
  );
}

// --- Component ---

export function ProjectDetail() {
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const phases = useStore((s) => s.phases);
  const phasesLoading = useStore((s) => s.phasesLoading);
  const loadPhases = useStore((s) => s.loadPhases);
  const createPhase = useStore((s) => s.createPhase);
  const updatePhase = useStore((s) => s.updatePhase);
  const deletePhase = useStore((s) => s.deletePhase);
  const reorderPhases = useStore((s) => s.reorderPhases);
  const linkDirectory = useStore((s) => s.linkDirectory);
  const createTask = useStore((s) => s.createTask);
  const selectTask = useWorkspaceStore((s) => s.selectTask);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const project = projects.find((p) => p.id === selectedProjectId);

  // Load phases when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadPhases(selectedProjectId);
    }
  }, [selectedProjectId, loadPhases]);

  // Sync local state when project loads
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return null;

  const apiUpdateProject = async (projectId: string, newName: string, newDesc: string) => {
    const { api } = await import("@/lib/tauri");
    await api.updateProject(projectId, newName, newDesc);
    // Refresh projects list
    await useStore.getState().loadProjects();
  };

  const handleNameBlur = () => {
    if (name.trim() && name !== project.name) {
      apiUpdateProject(project.id, name.trim(), project.description);
    }
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (descTimer.current) clearTimeout(descTimer.current);
    descTimer.current = setTimeout(() => {
      apiUpdateProject(project.id, project.name, value);
    }, 800);
  };

  // Progress
  const { complete, total } = computeProgress(tasks);
  const progressPct = total > 0 ? (complete / total) * 100 : 0;

  // Sorted phases
  const sortedPhases = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);

  // Unassigned tasks
  const unassignedTasks = tasksForPhase(tasks, null);

  // DnD handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedPhases.findIndex((p) => p.id === active.id);
    const newIndex = sortedPhases.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedPhases, oldIndex, newIndex);
    reorderPhases(project.id, reordered.map((p) => p.id));
  };

  // Phase creation
  const handleAddPhase = () => {
    const trimmed = newPhaseName.trim();
    if (trimmed) {
      createPhase(project.id, trimmed);
      setNewPhaseName("");
      setIsAddingPhase(false);
    } else {
      setIsAddingPhase(false);
      setNewPhaseName("");
    }
  };

  // Task creation within a phase
  const handleCreateTaskInPhase = (phaseId: string, title: string) => {
    createTask(title, project.id, project.themeId ?? undefined, phaseId);
  };

  // Task creation unassigned
  const handleCreateUnassignedTask = (title: string) => {
    createTask(title, project.id, project.themeId ?? undefined);
  };

  const handleSelectTask = (taskId: string) => {
    selectTask(taskId);
  };

  const createdDate = new Date(project.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const hasContent = sortedPhases.length > 0 || tasks.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Project Name */}
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleNameBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="text-2xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 bg-transparent"
        placeholder="Project name"
      />

      {/* Directory Section */}
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Directory
        </span>
        <DirectoryLink
          directoryPath={project.directoryPath}
          onLink={(path) => linkDirectory(project.id, path)}
        />
      </div>

      {/* Progress Section */}
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Progress
        </span>
        <Progress value={progressPct} className="h-2" />
        <span className="text-xs text-muted-foreground mt-1 block">
          {complete} of {total} tasks complete
        </span>
      </div>

      {/* Description Section */}
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

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mr-2">
            Created
          </span>
          <span className="text-muted-foreground">{createdDate}</span>
        </div>
        <div>
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mr-2">
            Tasks
          </span>
          <span className="text-muted-foreground">{total}</span>
        </div>
      </div>

      {/* Phases Section */}
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Phases
        </span>

        {!hasContent && !phasesLoading ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">No phases yet</p>
            <p className="text-xs text-muted-foreground">
              Break this project into phases to track progress. Click &quot;+ Add phase&quot; below to start.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={sortedPhases.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedPhases.map((phase) => (
                  <PhaseRow
                    key={phase.id}
                    phase={phase}
                    tasks={tasksForPhase(tasks, phase.id)}
                    onUpdatePhase={updatePhase}
                    onDeletePhase={deletePhase}
                    onCreateTask={handleCreateTaskInPhase}
                    onSelectTask={handleSelectTask}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <UnassignedBucket
              tasks={unassignedTasks}
              onCreateTask={handleCreateUnassignedTask}
              onSelectTask={handleSelectTask}
            />
          </div>
        )}

        {/* Add Phase */}
        {isAddingPhase ? (
          <div className="mt-2">
            <Input
              autoFocus
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddPhase();
                if (e.key === "Escape") {
                  setIsAddingPhase(false);
                  setNewPhaseName("");
                }
              }}
              onBlur={handleAddPhase}
              placeholder="Phase name..."
              className="h-8 text-sm"
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground mt-2"
            onClick={() => {
              setIsAddingPhase(true);
              setNewPhaseName("");
            }}
          >
            <Plus className="size-3 mr-1" />
            Add phase
          </Button>
        )}
      </div>
    </div>
  );
}
