import { AgentChip } from "@/components/shared/AgentChip";
import type { TaskDetail } from "@/types/task";

interface TaskMetadataProps {
  task: TaskDetail;
}

export function TaskMetadata({ task }: TaskMetadataProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {task.projectId && (
        <div>
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
            Project
          </span>
          <span className="text-sm">{task.projectId}</span>
        </div>
      )}
      {task.tags.length > 0 && (
        <div>
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
            Tags
          </span>
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
          Created
        </span>
        <span className="text-sm">{task.createdAt}</span>
      </div>
      {task.dueDate && (
        <div>
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
            Due
          </span>
          <span className="text-sm">{task.dueDate}</span>
        </div>
      )}
      {(task.agents.length > 0 || task.skills.length > 0 || task.tools.length > 0) && (
        <div className="col-span-2">
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
            Assigned
          </span>
          <div className="flex flex-wrap gap-1">
            {task.agents.map((a) => (
              <AgentChip key={a} label={a} type="agent" />
            ))}
            {task.skills.map((s) => (
              <AgentChip key={s} label={s} type="skill" />
            ))}
            {task.tools.map((t) => (
              <AgentChip key={t} label={t} type="tool" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
