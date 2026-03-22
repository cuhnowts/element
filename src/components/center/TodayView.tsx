import { useEffect, useMemo } from "react";
import type { Task } from "@/lib/types";
import { useTaskStore } from "@/stores/useTaskStore";
import { useStore } from "@/stores";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TodayViewHeader } from "@/components/center/TodayViewHeader";
import {
  TimeGroupSection,
  type TimeGroup,
} from "@/components/center/TimeGroupSection";

const TIME_GROUP_ORDER: TimeGroup[] = [
  "overdue",
  "morning",
  "afternoon",
  "evening",
  "unscheduled",
];

export function getTimeGroup(task: Task, today: string): TimeGroup {
  // Overdue: has due date before today AND not complete
  if (task.dueDate && task.dueDate < today && task.status !== "complete") {
    return "overdue";
  }
  // If task has scheduled time, use time-of-day buckets
  if (task.scheduledTime) {
    const hour = parseInt(task.scheduledTime.split(":")[0], 10);
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  }
  return "unscheduled";
}

export function TodayView() {
  const todaysTasks = useTaskStore((s) => s.todaysTasks);
  const fetchTodaysTasks = useTaskStore((s) => s.fetchTodaysTasks);
  const projects = useStore((s) => s.projects);

  useEffect(() => {
    fetchTodaysTasks();
  }, [fetchTodaysTasks]);

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) {
      map[p.id] = p.name;
    }
    return map;
  }, [projects]);

  const today = new Date().toISOString().slice(0, 10);

  const grouped = useMemo(() => {
    const groups = new Map<
      TimeGroup,
      Array<{ task: Task; projectName: string }>
    >();
    for (const group of TIME_GROUP_ORDER) {
      groups.set(group, []);
    }
    for (const task of todaysTasks) {
      const group = getTimeGroup(task, today);
      groups.get(group)!.push({
        task,
        projectName: (task.projectId ? projectMap[task.projectId] : null) ?? "Unknown",
      });
    }
    return groups;
  }, [todaysTasks, today, projectMap]);

  const completedCount = todaysTasks.filter(
    (t) => t.status === "complete"
  ).length;
  const totalCount = todaysTasks.length;
  const overdueCount = grouped.get("overdue")?.length ?? 0;
  const upcomingCount = todaysTasks.filter(
    (t) =>
      t.status !== "complete" &&
      getTimeGroup(t, today) !== "overdue"
  ).length;

  // Find next up: first incomplete, non-overdue task in scheduled time order
  const nextUpTaskId = useMemo(() => {
    const candidates = todaysTasks
      .filter(
        (t) =>
          t.status !== "complete" && getTimeGroup(t, today) !== "overdue"
      )
      .sort((a, b) => {
        // Tasks with scheduled time first, then by time
        if (a.scheduledTime && b.scheduledTime)
          return a.scheduledTime.localeCompare(b.scheduledTime);
        if (a.scheduledTime) return -1;
        if (b.scheduledTime) return 1;
        return 0;
      });
    return candidates[0]?.id ?? null;
  }, [todaysTasks, today]);

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <h2 className="text-lg font-semibold">No tasks for today</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Press Ctrl+Space to quickly capture a task, or create one from the
          sidebar.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <TodayViewHeader
        completedCount={completedCount}
        totalCount={totalCount}
        overdueCount={overdueCount}
        upcomingCount={upcomingCount}
      />
      <div className="space-y-6">
        {TIME_GROUP_ORDER.map((group) => (
          <TimeGroupSection
            key={group}
            group={group}
            tasks={grouped.get(group) ?? []}
            nextUpTaskId={nextUpTaskId}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
