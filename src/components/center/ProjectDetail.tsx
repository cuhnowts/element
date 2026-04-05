import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { listen } from "@tauri-apps/api/event";
import { Bot, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/tauri";
import type { Task, TaskStatus } from "@/lib/types";
import { useStore } from "@/stores";
import { useTerminalSessionStore } from "@/stores/useTerminalSessionStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { PlanOutput } from "@/types/onboarding";
import { AiPlanReview } from "./AiPlanReview";
import { GoalHeroCard } from "./GoalHeroCard";
import { PhaseRow } from "./PhaseRow";
import { type PlanningTier, TierSelectionDialog } from "./TierSelectionDialog";
import { UnassignedBucket } from "./UnassignedBucket";
import { WorkspaceButton } from "./WorkspaceButton";

// --- Exported helpers for testing ---

export function computeProgress(tasks: Task[]): { complete: number; total: number } {
  const complete = tasks.filter((t) => t.status === "complete").length;
  return { complete, total: tasks.length };
}

export function tasksForPhase(tasks: Task[], phaseId: string | null): Task[] {
  return tasks.filter((t) => (phaseId === null ? t.phaseId === null : t.phaseId === phaseId));
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

  // Onboarding state (retained for AiPlanReview flow)
  const onboardingStep = useStore((s) => s.onboardingStep);
  const setOnboardingStep = useStore((s) => s.setOnboardingStep);
  const pendingPlan = useStore((s) => s.pendingPlan);
  const setPendingPlan = useStore((s) => s.setPendingPlan);
  const loadProjects = useStore((s) => s.loadProjects);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [isChangingTier, setIsChangingTier] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStepRef = useRef(onboardingStep);

  const project = projects.find((p) => p.id === selectedProjectId);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Load phases when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadPhases(selectedProjectId);
    }
  }, [selectedProjectId, loadPhases]);

  // Planning sync: auto-import and watcher lifecycle (per D-05, D-11)
  useEffect(() => {
    if (!project) return;

    const isGsdTier = project.planningTier === "full";
    const hasDirectory = !!project.directoryPath;

    if (!isGsdTier || !hasDirectory) {
      // Stop any existing watcher when switching to non-GSD project
      api.stopPlanningWatcher().catch(() => {});
      return;
    }

    let cancelled = false;

    const initSync = async () => {
      try {
        // Auto-import: trigger sync on project open (per D-11)
        await api.syncPlanningRoadmap(project.id, project.directoryPath!);
      } catch {
        // Errors emitted as planning-sync-error event, handled by useTauriEvents
      }

      if (cancelled) return;

      try {
        // Start watcher after initial sync to avoid race condition (per Pitfall 2)
        await api.startPlanningWatcher(project.id, project.directoryPath!);
      } catch {
        // Watcher start failure is non-fatal
      }
    };

    initSync();

    return () => {
      cancelled = true;
      api.stopPlanningWatcher().catch(() => {});
    };
  }, [project?.id, project?.planningTier, project?.directoryPath, project]);

  // Sync local state when project loads
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
    }
  }, [project?.id, project.description, project]); // eslint-disable-line react-hooks/exhaustive-deps

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
    return () => {
      unlisteners.then((fns) => fns.forEach((fn) => fn()));
    };
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

  const openTerminal = useWorkspaceStore((s) => s.openTerminal);

  if (!project) return null;

  const handleTierDialogOpen = () => {
    setIsChangingTier(false);
    setShowTierDialog(true);
  };

  const handleChangePlan = () => {
    setIsChangingTier(hasContent);
    setShowTierDialog(true);
  };

  const handleTierSubmit = async (tier: PlanningTier, description: string) => {
    try {
      // 1. Save description to project if changed
      if (description && description !== project.description) {
        await apiUpdateProject(project.id, project.name, description);
      }

      // 2. Save tier -- MUST succeed for D-02 skip-dialog guarantee
      await api.setPlanningTier(project.id, tier);

      // 3. Generate context file with tier-specific templates
      if (!project.directoryPath) {
        toast.error("Link a project directory first.");
        return;
      }
      const contextPath = await api.generateContextFile(project.id, tier, description);

      // 4. Read CLI settings
      const command = await api.getAppSetting("cli_command");
      const args = await api.getAppSetting("cli_args");
      if (!command) {
        toast.error("No AI tool configured. Set one up in Settings > AI.");
        return;
      }

      // 5. Start plan watcher for Quick and Medium tiers (D-09: skip for GSD)
      if (tier !== "full") {
        await api.startPlanWatcher(project.directoryPath);
      }

      // 6. Launch terminal with context file via session store
      const fullArgs: string[] = [];
      if (args) fullArgs.push(args.trim());
      fullArgs.push("--");
      fullArgs.push(contextPath);
      useTerminalSessionStore
        .getState()
        .createSession(project.id, "AI Planning", "ai", { command, args: fullArgs });
      openTerminal();

      // 7. Close dialog
      setShowTierDialog(false);

      // 8. Reload project to pick up saved tier
      await loadProjects();
    } catch (e) {
      toast.error(`Failed to start planning: ${e}`);
    }
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

  // Sorted phases
  const sortedPhases = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);

  // Unassigned tasks
  const unassignedTasks = tasksForPhase(tasks, null);

  // Is the current drag a task drag?
  const isDraggingTask = activeDragId?.startsWith("task:");
  const draggedTask = isDraggingTask ? tasks.find((t) => t.id === activeDragId?.slice(5)) : null;

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
    reorderPhases(
      project.id,
      reordered.map((p) => p.id),
    );
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
      {/* 1. Name Row: Input + Tier Badge + Compact Progress (D-07, D-09, D-10) */}
      <div className="flex items-center gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="flex-1 text-2xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 bg-transparent"
          placeholder="Project name"
        />
        {project.planningTier && (
          <Badge
            variant={project.planningTier === "full" ? "outline" : "secondary"}
            className="text-xs cursor-pointer"
            role="button"
            aria-label="Change planning tier"
            onClick={handleTierDialogOpen}
          >
            {project.planningTier === "full"
              ? "GSD"
              : project.planningTier === "medium"
                ? "Medium"
                : "Quick"}
          </Badge>
        )}
        {total > 0 && (
          <span
            className="text-sm text-muted-foreground"
            aria-label={`${complete} of ${total} tasks complete`}
          >
            {complete}/{total}
          </span>
        )}
      </div>

      {/* 2. Goal Hero Card (D-03, D-04, PROJ-01, PROJ-02) */}
      <GoalHeroCard projectId={project.id} goal={project.goal} />

      {/* 3. Workspace Button Row (D-05, D-06, PROJ-03) */}
      <WorkspaceButton
        projectId={project.id}
        directoryPath={project.directoryPath}
        onLink={(path) => linkDirectory(project.id, path)}
      />

      {/* 4. Phases Section (same DnD logic, updated empty state) */}
      {onboardingStep === "review" && pendingPlan ? (
        <AiPlanReview projectId={project.id} />
      ) : (
        <div>
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
            Phases
          </span>

          {!hasContent && !phasesLoading ? (
            <div className="bg-card rounded-lg p-8 text-center max-w-md mx-auto mt-12">
              <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base font-semibold mb-2">No phases yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Set a goal above, then use AI to plan your project or add phases manually.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingPhase(true);
                  setNewPhaseName("");
                }}
                className="text-sm"
              >
                + Add phase manually
              </Button>
            </div>
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

      {/* 5. Details Accordion (D-08, D-09) */}
      <Accordion>
        <AccordionItem>
          <AccordionTrigger className="text-sm font-medium">Details</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {/* Description (moved from standalone section per D-08) */}
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

              {/* Metadata (moved per D-09) */}
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

              {/* Tier change (moved per D-10) */}
              {project.planningTier && (
                <Button variant="ghost" size="sm" onClick={handleChangePlan} className="text-xs">
                  Change planning tier
                </Button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <TierSelectionDialog
        open={showTierDialog}
        onOpenChange={setShowTierDialog}
        onSubmit={handleTierSubmit}
        defaultTier={project.planningTier as PlanningTier | undefined}
        defaultDescription={project.description}
        isChangingTier={isChangingTier}
      />
    </div>
  );
}
