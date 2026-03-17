import type { Task } from "@/types/task";
import { StatusDot } from "@/components/shared/StatusDot";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useWorkflowStore } from "@/stores/useWorkflowStore";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskListItemProps {
  task: Task;
}

export function TaskListItem({ task }: TaskListItemProps) {
  const selectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);
  const selectTask = useWorkspaceStore((s) => s.selectTask);
  const promoteTask = useWorkflowStore((s) => s.promoteTask);
  const selectWorkflow = useWorkflowStore((s) => s.selectWorkflow);
  const isSelected = selectedTaskId === task.id;

  const handleConvertToWorkflow = async () => {
    const workflow = await promoteTask(task.id);
    selectWorkflow(workflow.id);
  };

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors duration-100 group
        ${isSelected ? "bg-accent/10 border-l-2 border-primary" : "border-l-2 border-transparent hover:bg-muted"}`}
    >
      <button
        type="button"
        onClick={() => selectTask(task.id)}
        className="flex-1 flex items-center gap-2 text-left min-w-0"
      >
        <StatusDot status={task.status} />
        <span className="flex-1 truncate">{task.title}</span>
        {task.scheduledTime && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {task.scheduledTime}
          </span>
        )}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            />
          }
        >
          <MoreHorizontal className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={handleConvertToWorkflow}>
            <Workflow className="h-4 w-4 mr-2" />
            Convert to Workflow
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
