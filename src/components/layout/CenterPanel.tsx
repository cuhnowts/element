import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useStore } from "@/stores";
import { TodayView } from "@/components/center/TodayView";
import { TaskDetail } from "@/components/center/TaskDetail";
import { ProjectDetail } from "@/components/center/ProjectDetail";

export function CenterPanel() {
  const selectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);
  const selectedProjectId = useStore((s) => s.selectedProjectId);

  return (
    <div className="h-full overflow-auto p-6">
      {selectedTaskId ? (
        <TaskDetail />
      ) : selectedProjectId ? (
        <ProjectDetail />
      ) : (
        <TodayView />
      )}
    </div>
  );
}
