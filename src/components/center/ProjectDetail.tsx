import { useEffect, useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
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
import { PlanWithAiButton } from "./PlanWithAiButton";
import { ScopeInputForm } from "./ScopeInputForm";
import { OnboardingWaitingCard } from "./OnboardingWaitingCard";
import { AiPlanReview } from "./AiPlanReview";
import { api } from "@/lib/tauri";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import type { Task, TaskStatus } from "@/lib/types";
import type { PlanOutput } from "@/types/onboarding";

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
  const updateTaskStatus = useStore((s) => s.updateTaskStatus);
  const setTaskPhase = useStore((s) => s.setTaskPhase);
  const loadTasks = useStore((s) => s.loadTasks);
  const selectTask = useWorkspaceStore((s) => s.selectTask);
  const openDrawerToTab = useWorkspaceStore((s) => s.openDrawerToTab);

  // Onboarding state
  const onboardingStep = useStore((s) => s.onboardingStep);
  const setOnboardingStep = useStore((s) => s.setOnboardingStep);
  const onboardingScope = useStore((s) => s.onboardingScope);
  const setOnboardingScope = useStore((s) => s.setOnboardingScope);
  const setOnboardingGoals = useStore((s) => s.setOnboardingGoals);
  const pendingPlan = useStore((s) => s.pendingPlan);
  const setPendingPlan = useStore((s) => s.setPendingPlan);
  const loadProjects = useStore((s) => s.loadProjects);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStepRef = useRef(onboardingStep);

  const project = projects.find((p) => p.id === selectedProjectId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  // Listen for plan-output events from Tauri backend
  useEffect(() => {
    const unlisteners = Promise.all([
      listen<PlanOutput>("plan-output-detected", (event) => {
        setPendingPlan(event.payload);
        setTimeout(() => setOnboardingStep("review"), 500);
      }),
      listen<string>("plan-output-error", (event) => {
        toast.error(event.payload);
      }),
    ]);
    return () => { unlisteners.then((fns) => fns.forEach((fn) => fn())); };
  }, [setPendingPlan, setOnboardingStep]);

  // When review completes and returns to idle, reload phases
  useEffect(() => {
    if (prevStepRef.current === "review" && onboardingStep === "idle") {
      loadProjects();
      if (selectedProjectId) {
        loadPhases(selectedProjectId);
        loadTasks(selectedProjectId);
      }
    }
    prevStepRef.current = onboardingStep;
  }, [onboardingStep, loadProjects, loadPhases, loadTasks, selectedProjectId]);

  if (!project) return null;

  const handleStartPlanning = async (scope: string, goals: string) => {
    if (!project) return;

    // Guard: project must have a linked directory
    if (!project.directoryPath) {
      toast.error("Link a project directory first. The AI planning tool needs a directory to store its files.");
      return;
    }

    setOnboardingScope(scope);
    setOnboardingGoals(goals);

    try {
      // Get CLI tool path from settings
      const cliTool = await api.getAppSetting("cli_tool_path");
      if (!cliTool) {
        toast.error("Configure a CLI tool in Settings > AI first.");
        return;
      }

      // Write skill file
      await api.generateSkillFile(
        project.directoryPath,
        project.name,
        scope,
        goals
      );

      // Start file watcher
      await api.startPlanWatcher(project.directoryPath);

      // Open terminal tab and ensure drawer is visible
      openDrawerToTab("terminal");

      // Launch CLI tool in terminal
      const skillPath = `${project.directoryPath}/.element/onboard.md`;
      await api.runCliTool(cliTool, [skillPath], project.directoryPath);

      setOnboardingStep("waiting");
    } catch (e) {
      toast.error(`Failed to start AI planning: ${e}`);
    }
  };

  const handleCancelOnboarding = async () => {
    await api.stopPlanWatcher().catch(() => {});
    setOnboardingStep("idle");
  };

  const apiUpdateProject = async (projectId: string, newName: string, newDesc: string) => {
    const { api } = await import("@/lib/tauri");
    await api.updateProject(projectId, newName, newDesc);
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

  // Is the current drag a task drag?
  const isDraggingTask = activeDragId?.startsWith("task:");
  const draggedTask = isDraggingTask
    ? tasks.find((t) => t.id === activeDragId!.slice(5))
    : null;

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!isDraggingTask && !String(event.active?.id).startsWith("task:")) {
      setOverDropId(null);
      return;
    }
    setOverDropId(event.over ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);

    setActiveDragId(null);
    setOverDropId(null);

    if (!over) return;
    const overId = String(over.id);

    // Task drag → phase assignment
    if (activeId.startsWith("task:")) {
      const taskId = activeId.slice(5);
      if (overId === "unassigned-drop") {
        setTaskPhase(taskId, null);
      } else {
        const targetPhase = phases.find((p) => p.id === overId);
        if (targetPhase) {
          setTaskPhase(taskId, targetPhase.id);
        }
      }
      return;
    }

    // Phase reorder
    if (active.id === over.id) return;
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

  const handleToggleTaskStatus = (taskId: string, currentStatus: TaskStatus) => {
    const newStatus = currentStatus === "complete" ? "pending" : "complete";
    updateTaskStatus(taskId, newStatus);
  };

  const handleDeletePhase = async (phaseId: string) => {
    await deletePhase(phaseId);
    if (selectedProjectId) {
      await loadTasks(selectedProjectId);
    }
  };

  const handleSetTaskPhase = (taskId: string, phaseId: string | null) => {
    setTaskPhase(taskId, phaseId);
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

      {/* Phases Section / Onboarding Flow */}
      {onboardingStep === "scope-input" ? (
        <ScopeInputForm
          projectName={project.name}
          onSubmit={handleStartPlanning}
          onCancel={() => setOnboardingStep("idle")}
        />
      ) : onboardingStep === "waiting" ? (
        <OnboardingWaitingCard
          scope={onboardingScope}
          planDetected={pendingPlan !== null}
          onCancel={handleCancelOnboarding}
        />
      ) : onboardingStep === "review" && pendingPlan ? (
        <AiPlanReview projectId={project.id} />
      ) : (
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Phases
        </span>

        {!hasContent && !phasesLoading ? (
          <PlanWithAiButton
            onPlanWithAi={() => setOnboardingStep("scope-input")}
            onAddPhaseManually={() => {
              setIsAddingPhase(true);
              setNewPhaseName("");
            }}
          />
        ) : (
          <div className="space-y-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedPhases.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedPhases.map((phase) => (
                  <PhaseRow
                    key={phase.id}
                    phase={phase}
                    tasks={tasksForPhase(tasks, phase.id)}
                    allPhases={sortedPhases}
                    onUpdatePhase={updatePhase}
                    onDeletePhase={handleDeletePhase}
                    onCreateTask={handleCreateTaskInPhase}
                    onSelectTask={handleSelectTask}
                    onToggleTaskStatus={handleToggleTaskStatus}
                    onSetTaskPhase={handleSetTaskPhase}
                    isDropTarget={isDraggingTask === true && overDropId === phase.id}
                  />
                ))}
              </SortableContext>

              <UnassignedBucket
                tasks={unassignedTasks}
                phases={sortedPhases}
                onCreateTask={handleCreateUnassignedTask}
                onSelectTask={handleSelectTask}
                onToggleTaskStatus={handleToggleTaskStatus}
                onSetTaskPhase={handleSetTaskPhase}
                isDropTarget={isDraggingTask === true && overDropId === "unassigned-drop"}
              />

              <DragOverlay>
                {draggedTask ? (
                  <div className="flex items-center gap-2 py-1 px-3 text-sm bg-popover rounded-md shadow-lg ring-1 ring-primary/20">
                    {draggedTask.title}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
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
      )}
    </div>
  );
}
