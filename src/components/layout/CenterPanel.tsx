import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useWorkflowStore } from "@/stores/useWorkflowStore";
import { useStore } from "@/stores";
import { TodayView } from "@/components/center/TodayView";
import { TaskDetail } from "@/components/center/TaskDetail";
import { ProjectDetail } from "@/components/center/ProjectDetail";
import { WorkflowDetail } from "@/components/center/WorkflowDetail";

export function CenterPanel() {
  const selectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const selectedWorkflowId = useWorkflowStore((s) => s.selectedWorkflowId);

  return (
    <div className="h-full overflow-auto p-6">
      {selectedWorkflowId ? (
        <WorkflowDetail />
      ) : selectedTaskId ? (
        <TaskDetail />
      ) : selectedProjectId ? (
        <ProjectDetail />
      ) : (
        <TodayView />
      )}
    </div>
  );
}
