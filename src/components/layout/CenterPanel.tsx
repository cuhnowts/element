import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useWorkflowStore } from "@/stores/useWorkflowStore";
import { useStore } from "@/stores";
import { TodayView } from "@/components/center/TodayView";
import { TaskDetail } from "@/components/center/TaskDetail";
import { ProjectDetail } from "@/components/center/ProjectDetail";
import { ThemeDetail } from "@/components/center/ThemeDetail";
import { WorkflowDetail } from "@/components/center/WorkflowDetail";
import { ProjectTabBar } from "@/components/center/ProjectTabBar";
import { FileExplorer } from "@/components/center/FileExplorer";

export function CenterPanel() {
  const selectedTaskId = useWorkspaceStore((s) => s.selectedTaskId);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const selectedThemeId = useStore((s) => s.selectedThemeId);
  const selectedWorkflowId = useWorkflowStore((s) => s.selectedWorkflowId);
  const projects = useStore((s) => s.projects);
  const activeProjectTab = useStore((s) => s.activeProjectTab);
  const setActiveProjectTab = useStore((s) => s.setActiveProjectTab);

  // Determine if selected project has a linked directory
  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;
  const hasDirectory = !!selectedProject?.directoryPath;

  if (selectedWorkflowId) {
    return (
      <div className="h-full overflow-auto p-6">
        <WorkflowDetail />
      </div>
    );
  }

  if (selectedTaskId) {
    return (
      <div className="h-full overflow-auto p-6">
        <TaskDetail />
      </div>
    );
  }

  if (selectedProjectId && hasDirectory) {
    return (
      <div className="h-full flex flex-col">
        <ProjectTabBar
          activeTab={activeProjectTab}
          onTabChange={setActiveProjectTab}
        />
        <div className="flex-1 overflow-auto p-6">
          {activeProjectTab === "detail" ? (
            <ProjectDetail />
          ) : (
            <FileExplorer
              projectId={selectedProjectId}
              directoryPath={selectedProject!.directoryPath!}
            />
          )}
        </div>
      </div>
    );
  }

  if (selectedProjectId) {
    return (
      <div className="h-full overflow-auto p-6">
        <ProjectDetail />
      </div>
    );
  }

  if (selectedThemeId) {
    return (
      <div className="h-full overflow-auto p-6">
        <ThemeDetail />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <TodayView />
    </div>
  );
}
