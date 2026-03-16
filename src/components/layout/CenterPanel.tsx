import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { WelcomeDashboard } from "@/components/center/WelcomeDashboard";
import { TaskDetail } from "@/components/center/TaskDetail";

export function CenterPanel() {
  const selectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);

  return (
    <div className="h-full overflow-auto p-6">
      {selectedTaskId ? <TaskDetail /> : <WelcomeDashboard />}
    </div>
  );
}
