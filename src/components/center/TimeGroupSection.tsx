import { TodayTaskRow } from "@/components/center/TodayTaskRow";
import type { Task } from "@/lib/types";

export type TimeGroup = "overdue" | "morning" | "afternoon" | "evening" | "unscheduled";

const GROUP_LABELS: Record<TimeGroup, string> = {
  overdue: "OVERDUE",
  morning: "MORNING",
  afternoon: "AFTERNOON",
  evening: "EVENING",
  unscheduled: "UNSCHEDULED",
};

interface TimeGroupSectionProps {
  group: TimeGroup;
  tasks: Array<{ task: Task; projectName: string }>;
  nextUpTaskId: string | null;
}

export function TimeGroupSection({ group, tasks, nextUpTaskId }: TimeGroupSectionProps) {
  if (tasks.length === 0) return null;

  const isOverdue = group === "overdue";

  return (
    <section>
      <h2
        className={`text-xs font-semibold tracking-wide uppercase mb-2 ${
          isOverdue ? "text-destructive-foreground" : "text-muted-foreground"
        }`}
      >
        {GROUP_LABELS[group]}
      </h2>
      <div className="space-y-1">
        {tasks.map(({ task, projectName }) => (
          <TodayTaskRow
            key={task.id}
            task={task}
            projectName={projectName}
            isNextUp={task.id === nextUpTaskId}
            isOverdueSection={isOverdue}
          />
        ))}
      </div>
    </section>
  );
}
