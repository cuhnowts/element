import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useStore } from "@/stores";
import { TaskDetail } from "@/components/center/TaskDetail";
import { ProjectDetail } from "@/components/center/ProjectDetail";
import { ThemeDetail } from "@/components/center/ThemeDetail";
import { WorkflowDetail } from "@/components/center/WorkflowDetail";
import { ProjectTabBar } from "@/components/center/ProjectTabBar";
import { FileExplorer } from "@/components/center/FileExplorer";

export function CenterPanel() {
  const activeView = useStore((s) => s.activeView);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const projects = useStore((s) => s.projects);
  const activeProjectTab = useStore((s) => s.activeProjectTab);
  const setActiveProjectTab = useStore((s) => s.setActiveProjectTab);

  const getProjectState = useWorkspaceStore((s) => s.getProjectState);
  const setProjectCenterTab = useWorkspaceStore((s) => s.setProjectCenterTab);
  const saveCurrentProjectState = useWorkspaceStore((s) => s.saveCurrentProjectState);
  const restoreProjectState = useWorkspaceStore((s) => s.restoreProjectState);

  const prevProjectRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) return;

    if (prevProjectRef.current && prevProjectRef.current !== selectedProjectId) {
      saveCurrentProjectState(prevProjectRef.current);
    }

    restoreProjectState(selectedProjectId);
    const projectState = getProjectState(selectedProjectId);
    setActiveProjectTab(projectState.centerTab);

    prevProjectRef.current = selectedProjectId;
  }, [selectedProjectId]);

  const handleTabChange = (tab: "detail" | "files") => {
    setActiveProjectTab(tab);
    if (selectedProjectId) {
      setProjectCenterTab(selectedProjectId, tab);
    }
  };

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;
  const hasDirectory = !!selectedProject?.directoryPath;

  switch (activeView) {
    case 'hub':
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-lg">Hub view loading...</p>
        </div>
      );
    case 'workflow':
      return (
        <div className="h-full overflow-auto p-6">
          <WorkflowDetail />
        </div>
      );
    case 'task':
      return (
        <div className="h-full overflow-auto p-6">
          <TaskDetail />
        </div>
      );
    case 'project':
      if (selectedProjectId && hasDirectory) {
        return (
          <div className="h-full flex flex-col">
            <ProjectTabBar
              activeTab={activeProjectTab}
              onTabChange={handleTabChange}
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
      return (
        <div className="h-full overflow-auto p-6">
          <ProjectDetail />
        </div>
      );
    case 'theme':
      return (
        <div className="h-full overflow-auto p-6">
          <ThemeDetail />
        </div>
      );
    default:
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-lg">Hub view loading...</p>
        </div>
      );
  }
}
