import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function CenterPanel() {
  const selectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);

  return (
    <div className="h-full overflow-auto p-6">
      {selectedTaskId ? (
        <div className="text-sm text-muted-foreground">
          {/* TaskDetail goes here (Plan 03) */}
          Task: {selectedTaskId}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          {/* WelcomeDashboard goes here (Plan 03) */}
          Welcome Dashboard
        </div>
      )}
    </div>
  );
}
