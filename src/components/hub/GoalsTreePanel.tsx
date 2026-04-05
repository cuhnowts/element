import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/tauri";
import type { Phase, Task } from "@/lib/types";
import { useStore } from "@/stores";
import { ChoresSection } from "./ChoresSection";
import { GoalsTreeNode } from "./GoalsTreeNode";

export function GoalsTreePanel() {
  const projects = useStore((s) => s.projects);
  const [phaseMap, setPhaseMap] = useState<Map<string, Phase[]>>(new Map());
  const [taskMap, setTaskMap] = useState<Map<string, Task[]>>(new Map());
  const [loading, setLoading] = useState(true);

  // Stable project IDs string for dependency tracking
  const _projectIds = useMemo(() => projects.map((p) => p.id).join(","), [projects]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const phaseEntries = await Promise.all(
          projects.map(async (p) => {
            const phases = await api.listPhases(p.id);
            return [p.id, phases] as const;
          }),
        );
        const taskEntries = await Promise.all(
          projects.map(async (p) => {
            const tasks = await api.listTasks(p.id);
            return [p.id, tasks] as const;
          }),
        );
        setPhaseMap(new Map(phaseEntries));
        setTaskMap(new Map(taskEntries));
      } catch {
        // Silently handle errors -- tree shows empty state
      } finally {
        setLoading(false);
      }
    };

    if (projects.length > 0) {
      fetchAll();
    } else {
      setPhaseMap(new Map());
      setTaskMap(new Map());
      setLoading(false);
    }
  }, [projects.length, projects.map]); // Use stable string, not projects array ref

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <h2 className="text-base font-semibold leading-tight mb-3">Goals</h2>

        {loading ? (
          <div className="space-y-2">
            <div className="h-6 bg-secondary/50 rounded animate-pulse" />
            <div className="h-6 bg-secondary/50 rounded animate-pulse w-3/4" />
            <div className="h-6 bg-secondary/50 rounded animate-pulse w-1/2" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No projects yet. Create a project in the sidebar to get started.
          </p>
        ) : (
          <div role="tree" aria-label="Goals tree">
            {projects.map((project) => (
              <GoalsTreeNode
                key={project.id}
                project={project}
                phases={phaseMap.get(project.id) ?? []}
                tasks={taskMap.get(project.id) ?? []}
              />
            ))}
          </div>
        )}

        <Separator className="my-4" />
        <ChoresSection />
      </div>
    </ScrollArea>
  );
}
