import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { useStore } from "@/stores";
import { ProgressDot, type ProgressStatus } from "./ProgressDot";
import type { Project, Phase, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isOverdue, isBacklogPhase } from "@/lib/date-utils";

interface GoalsTreeNodeProps {
  project: Project;
  phases: Phase[];
  tasks: Task[];
}

export function derivePhaseStatus(
  phaseId: string,
  tasks: Task[],
  phaseSortOrder?: number,
): ProgressStatus {
  const phaseTasks = tasks.filter((t) => t.phaseId === phaseId);
  if (phaseTasks.length === 0) return "not-started";
  if (phaseTasks.every((t) => t.status === "complete")) return "complete";

  // Check for overdue (skip backlog phases)
  if (
    phaseSortOrder !== undefined &&
    !isBacklogPhase(phaseSortOrder) &&
    phaseTasks.some(
      (t) => t.status !== "complete" && t.dueDate != null && isOverdue(t.dueDate),
    )
  ) {
    return "overdue";
  }

  if (
    phaseTasks.some(
      (t) => t.status === "in-progress" || t.status === "blocked",
    )
  )
    return "in-progress";
  // Mix of pending and complete
  if (phaseTasks.some((t) => t.status === "complete")) return "in-progress";
  return "not-started";
}

export function deriveProjectStatus(
  phases: Phase[],
  tasks: Task[],
): ProgressStatus {
  if (phases.length === 0) return "not-started";
  const statuses = phases.map((p) => derivePhaseStatus(p.id, tasks, p.sortOrder));
  if (statuses.every((s) => s === "complete")) return "complete";
  if (statuses.some((s) => s === "overdue")) return "overdue";
  if (statuses.some((s) => s === "in-progress" || s === "complete"))
    return "in-progress";
  return "not-started";
}

function countOverdueTasks(tasks: Task[], phaseId: string, phaseSortOrder: number): number {
  if (isBacklogPhase(phaseSortOrder)) return 0;
  return tasks.filter(
    (t) => t.phaseId === phaseId && t.status !== "complete" && t.dueDate != null && isOverdue(t.dueDate),
  ).length;
}

export function GoalsTreeNode({ project, phases, tasks }: GoalsTreeNodeProps) {
  const [open, setOpen] = useState(false);
  const selectProject = useStore((s) => s.selectProject);

  const projectStatus = deriveProjectStatus(phases, tasks);
  const sortedPhases = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);
  const projectOverdueCount = sortedPhases.reduce(
    (sum, p) => sum + countOverdueTasks(tasks, p.id, p.sortOrder),
    0,
  );

  const handleProjectClick = () => {
    selectProject(project.id);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        role="treeitem"
        aria-expanded={phases.length > 0 ? open : undefined}
        className="group"
      >
        <div className="flex items-center gap-1 pl-2 pr-2 py-1 hover:bg-secondary rounded-sm">
          {phases.length > 0 ? (
            <CollapsibleTrigger
              className="p-0.5 rounded hover:bg-secondary"
              aria-label={open ? "Collapse" : "Expand"}
            >
              <ChevronRight
                className={cn(
                  "size-4 text-muted-foreground transition-transform duration-200",
                  open && "rotate-90",
                )}
              />
            </CollapsibleTrigger>
          ) : (
            <span className="w-5" />
          )}
          <button
            type="button"
            onClick={handleProjectClick}
            className="flex-1 text-left text-sm font-semibold truncate hover:text-primary transition-colors"
          >
            {project.name}
          </button>
          <ProgressDot status={projectStatus} />
          {projectOverdueCount > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold px-1"
              aria-label={`${projectOverdueCount} overdue task${projectOverdueCount === 1 ? "" : "s"}`}
            >
              {projectOverdueCount}
            </span>
          )}
        </div>

        {phases.length > 0 && (
          <CollapsibleContent>
            <div className="ml-7 border-l border-border/50">
              {sortedPhases.map((phase) => {
                const phaseStatus = derivePhaseStatus(phase.id, tasks, phase.sortOrder);
                const overdueCount = countOverdueTasks(tasks, phase.id, phase.sortOrder);
                return (
                  <button
                    key={phase.id}
                    type="button"
                    role="treeitem"
                    onClick={handleProjectClick}
                    className="flex items-center gap-2 w-full pl-3 pr-2 py-1 text-left text-sm text-foreground hover:bg-secondary rounded-sm transition-colors"
                  >
                    <span className="flex-1 truncate">{phase.name}</span>
                    <ProgressDot status={phaseStatus} />
                    {overdueCount > 0 && (
                      <span
                        className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold px-1"
                        aria-label={`${overdueCount} overdue task${overdueCount === 1 ? "" : "s"}`}
                      >
                        {overdueCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
