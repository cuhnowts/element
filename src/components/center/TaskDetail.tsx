import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { TaskHeader } from "./TaskHeader";
import { TaskMetadata } from "./TaskMetadata";
import { ExecutionDiagram } from "./ExecutionDiagram";

export function TaskDetail() {
  const selectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);
  const selectedTaskDetail = useTaskStore((s) => s.selectedTaskDetail);
  const isLoadingDetail = useTaskStore((s) => s.isLoadingDetail);
  const error = useTaskStore((s) => s.error);
  const fetchTaskDetail = useTaskStore((s) => s.fetchTaskDetail);
  const fetchExecutionHistory = useTaskStore((s) => s.fetchExecutionHistory);

  useEffect(() => {
    if (selectedTaskId) {
      fetchTaskDetail(selectedTaskId);
      fetchExecutionHistory(selectedTaskId);
    }
  }, [selectedTaskId, fetchTaskDetail, fetchExecutionHistory]);

  if (error) {
    return (
      <EmptyState
        heading="Error"
        body="Couldn't load task details. The database may be unavailable. Restart Element to reconnect."
      />
    );
  }

  if (isLoadingDetail) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!selectedTaskDetail) {
    return null;
  }

  return (
    <div className="space-y-6">
      <TaskHeader task={selectedTaskDetail} />
      <TaskMetadata task={selectedTaskDetail} />
      {selectedTaskDetail.description && (
        <div>
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
            Description
          </span>
          <p className="text-sm leading-relaxed">{selectedTaskDetail.description}</p>
        </div>
      )}
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Execution
        </span>
        <ExecutionDiagram steps={selectedTaskDetail.steps} />
      </div>
    </div>
  );
}
