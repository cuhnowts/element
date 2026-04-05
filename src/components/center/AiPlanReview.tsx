import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/tauri";
import { useStore } from "@/stores";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";

interface AiPlanReviewProps {
  projectId: string;
}

function SortablePhaseItem({
  id,
  children,
}: {
  id: string;
  children: (listeners: Record<string, unknown> | undefined) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners as Record<string, unknown> | undefined)}
    </div>
  );
}

export function AiPlanReview({ projectId }: AiPlanReviewProps) {
  const {
    pendingPlan,
    onboardingSaving,
    updatePendingPhase,
    removePendingPhase,
    addPendingPhase,
    reorderPendingPhases,
    updatePendingTask,
    removePendingTask,
    addPendingTask,
    confirmAndSavePlan,
    confirmAndSaveQuickPlan,
    discardPlan,
  } = useStore();

  const [showDiscard, setShowDiscard] = useState(false);
  const [editingPhase, setEditingPhase] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<{ phase: number; task: number } | null>(null);

  if (!pendingPlan) return null;

  const phases = pendingPlan.phases;
  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0);
  const totalPhases = phases.length;
  const isQuickTier = phases.length === 1 && phases[0].name.trim() === "";

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = phases.findIndex((_, i) => `phase-${i}` === active.id);
      const newIndex = phases.findIndex((_, i) => `phase-${i}` === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderPendingPhases(oldIndex, newIndex);
      }
    }
  };

  const handleConfirm = async () => {
    await api.stopPlanWatcher().catch(() => {});

    if (isQuickTier) {
      await confirmAndSaveQuickPlan(projectId);
    } else {
      await confirmAndSavePlan(projectId);
    }
  };

  const handlePhaseNameBlur = (index: number, value: string) => {
    if (value.trim() === "") {
      removePendingPhase(index);
    } else {
      updatePendingPhase(index, { name: value.trim() });
    }
    setEditingPhase(null);
  };

  const handleTaskNameBlur = (phaseIndex: number, taskIndex: number, value: string) => {
    if (value.trim() === "") {
      removePendingTask(phaseIndex, taskIndex);
    } else {
      updatePendingTask(phaseIndex, taskIndex, { title: value.trim() });
    }
    setEditingTask(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Review AI Plan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isQuickTier
              ? `${totalTasks} tasks generated`
              : `${totalPhases} phases, ${totalTasks} tasks generated`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-destructive" onClick={() => setShowDiscard(true)}>
            Discard plan
          </Button>
          <Button onClick={handleConfirm} disabled={onboardingSaving}>
            {onboardingSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Confirm & Save"
            )}
          </Button>
        </div>
      </div>

      {/* Phase Accordion with DnD */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={phases.map((_, i) => `phase-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <Accordion>
            {phases.map((phase, phaseIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static list, never reordered
              <SortablePhaseItem key={`phase-${phaseIndex}`} id={`phase-${phaseIndex}`}>
                {(listeners) => (
                  <AccordionItem value={`phase-${phaseIndex}`}>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="cursor-grab touch-none p-1"
                        {...(listeners || {})}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <AccordionTrigger className="flex-1">
                        {editingPhase === phaseIndex ? (
                          <Input
                            autoFocus
                            defaultValue={phase.name}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handlePhaseNameBlur(phaseIndex, e.currentTarget.value);
                              }
                              if (e.key === "Escape") {
                                setEditingPhase(null);
                              }
                            }}
                            onBlur={(e) => handlePhaseNameBlur(phaseIndex, e.target.value)}
                            className="h-7 text-sm"
                          />
                        ) : (
                          // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: interactive element with click handler
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPhase(phaseIndex);
                            }}
                            className="cursor-text"
                          >
                            {phase.name || (isQuickTier ? "Quick Tasks" : "Untitled phase")}
                          </span>
                        )}
                      </AccordionTrigger>
                      <button
                        type="button"
                        onClick={() => removePendingPhase(phaseIndex)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <AccordionContent>
                      <div className="space-y-1 pl-6">
                        {phase.tasks.map((task, taskIndex) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: static list, never reordered
                          <div key={taskIndex} className="flex items-center gap-2 py-1">
                            {editingTask?.phase === phaseIndex &&
                            editingTask?.task === taskIndex ? (
                              <Input
                                autoFocus
                                defaultValue={task.title}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleTaskNameBlur(
                                      phaseIndex,
                                      taskIndex,
                                      e.currentTarget.value,
                                    );
                                  }
                                  if (e.key === "Escape") {
                                    setEditingTask(null);
                                  }
                                }}
                                onBlur={(e) =>
                                  handleTaskNameBlur(phaseIndex, taskIndex, e.target.value)
                                }
                                className="h-7 text-sm flex-1"
                              />
                            ) : (
                              // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: interactive element with click handler
                              <span
                                onClick={() =>
                                  setEditingTask({ phase: phaseIndex, task: taskIndex })
                                }
                                className="text-sm flex-1 cursor-text"
                              >
                                {task.title || "Untitled task"}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removePendingTask(phaseIndex, taskIndex)}
                              className="p-1 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground"
                          onClick={() => {
                            addPendingTask(phaseIndex);
                            setEditingTask({ phase: phaseIndex, task: phase.tasks.length });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />+ Add task
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </SortablePhaseItem>
            ))}
          </Accordion>
        </SortableContext>
      </DndContext>

      {/* Add Phase */}
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground mt-2"
        onClick={() => {
          addPendingPhase();
          setEditingPhase(phases.length);
        }}
      >
        <Plus className="h-3 w-3 mr-1" />+ Add phase
      </Button>

      {/* Discard Confirmation Dialog */}
      <Dialog open={showDiscard} onOpenChange={setShowDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard this plan?</DialogTitle>
            <DialogDescription>
              The AI-generated phases and tasks will not be saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDiscard(false)}>
              Keep reviewing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                discardPlan();
                setShowDiscard(false);
              }}
            >
              Discard plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
