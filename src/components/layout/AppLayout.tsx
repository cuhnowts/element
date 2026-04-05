import { GripHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { usePanelRef } from "react-resizable-panels";
import { CenterPanel } from "@/components/layout/CenterPanel";
import { OutputDrawer } from "@/components/layout/OutputDrawer";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import { useAgentLifecycle } from "@/hooks/useAgentLifecycle";
import { useAgentQueue } from "@/hooks/useAgentQueue";
import { useGlobalShortcut } from "@/hooks/useGlobalShortcut";
import { useNotificationEvents } from "@/hooks/useNotificationEvents";
import { useTerminalCleanup } from "@/hooks/useTerminalCleanup";
import { useStore } from "@/stores";
import { useAgentStore } from "@/stores/useAgentStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { type DrawerTab, useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function AppLayout() {
  useGlobalShortcut();
  useTerminalCleanup();
  useAgentQueue();
  useNotificationEvents();
  const { startAgent } = useAgentLifecycle();

  useEffect(() => {
    startAgent();
  }, [startAgent]);

  const settingsOpen = useStore((s) => s.settingsOpen);
  const pendingApprovalCount = useAgentStore((s) => s.pendingApprovalCount);
  const drawerOpen = useWorkspaceStore((s) => s.drawerOpen);
  const drawerHeight = useWorkspaceStore((s) => s.drawerHeight);
  const activeDrawerTab = useWorkspaceStore((s) => s.activeDrawerTab);
  const setActiveDrawerTab = useWorkspaceStore((s) => s.setActiveDrawerTab);
  const openDrawerToTab = useWorkspaceStore((s) => s.openDrawerToTab);
  const toggleDrawer = useWorkspaceStore((s) => s.toggleDrawer);
  const setProjectDrawerState = useWorkspaceStore((s) => s.setProjectDrawerState);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const clearLogs = useTaskStore((s) => s.clearLogs);
  const executionLogs = useTaskStore((s) => s.executionLogs);
  const drawerPanelRef = usePanelRef();

  const handleTabClick = (tab: DrawerTab) => {
    if (!drawerOpen) {
      openDrawerToTab(tab);
    } else if (activeDrawerTab === tab) {
      toggleDrawer();
    } else {
      setActiveDrawerTab(tab);
    }
    if (selectedProjectId) {
      setProjectDrawerState(selectedProjectId, !drawerOpen || activeDrawerTab !== tab, tab);
    }
  };

  const handleBarClick = (e: React.MouseEvent) => {
    // Only collapse if clicking the bar background itself (not a tab button or other control)
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a"))
      return;
    if (drawerOpen) {
      toggleDrawer();
    }
  };

  const tabClass = (tab: DrawerTab) =>
    `text-xs font-semibold tracking-wide uppercase px-2 py-1 rounded transition-colors ${
      activeDrawerTab === tab
        ? "text-foreground bg-muted"
        : "text-muted-foreground hover:text-foreground"
    }`;

  useEffect(() => {
    const panel = drawerPanelRef.current;
    if (!panel) return;
    if (drawerOpen) {
      // expand() first to exit collapsed state, then resize to desired height
      panel.expand();
      panel.resize(Math.max(drawerHeight, 40));
    } else {
      panel.collapse();
    }
  }, [drawerOpen, drawerPanelRef, drawerHeight]);

  // Create Project Dialog
  const createProjectDialogOpen = useStore((s) => s.createProjectDialogOpen);
  const closeCreateProjectDialog = useStore((s) => s.closeCreateProjectDialog);
  const createProject = useStore((s) => s.createProject);
  const selectProject = useStore((s) => s.selectProject);
  const loadTasks = useStore((s) => s.loadTasks);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  // Delete Confirmation Dialog
  const deleteConfirmOpen = useStore((s) => s.deleteConfirmOpen);
  const deleteTarget = useStore((s) => s.deleteTarget);
  const closeDeleteConfirm = useStore((s) => s.closeDeleteConfirm);
  const deleteProject = useStore((s) => s.deleteProject);
  const deleteTask = useStore((s) => s.deleteTask);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const project = await createProject(
      newProjectName.trim(),
      newProjectDescription.trim() || undefined,
    );
    selectProject(project.id);
    loadTasks(project.id);
    setNewProjectName("");
    setNewProjectDescription("");
    closeCreateProjectDialog();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "project") {
      await deleteProject(deleteTarget.id);
    } else {
      await deleteTask(deleteTarget.id);
    }
    closeDeleteConfirm();
  };

  return (
    <>
      <div className="flex h-screen bg-background text-foreground">
        {/* Fixed sidebar */}
        <aside className="w-[280px] border-r border-border flex-shrink-0 overflow-hidden">
          <Sidebar />
        </aside>

        {/* Center + Drawer split (or Settings page) */}
        {settingsOpen ? (
          <div className="flex-1 overflow-hidden">
            <SettingsPage />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ResizablePanelGroup direction="vertical" className="flex-1">
              <ResizablePanel defaultSize={drawerOpen ? 100 - drawerHeight : 100} minSize={30}>
                <CenterPanel />
              </ResizablePanel>

              <ResizableHandle className="border-t border-border bg-card cursor-row-resize">
                <div
                  className="flex items-center justify-between w-full px-4 py-1.5 [&_button]:cursor-pointer"
                  onClick={handleBarClick}
                >
                  <div className="flex items-center gap-1">
                    <GripHorizontal className="size-3 text-muted-foreground mr-1 flex-shrink-0" />
                    {(["elementai", "terminal", "logs", "history"] as DrawerTab[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => handleTabClick(tab)}
                        className={`relative ${tabClass(tab)}`}
                      >
                        {tab === "elementai"
                          ? "Element AI"
                          : tab === "terminal"
                            ? "Terminal"
                            : tab === "logs"
                              ? "Logs"
                              : "History"}
                        {tab === "elementai" && pendingApprovalCount() > 0 && (
                          <Badge
                            variant="destructive"
                            className="size-4 p-0 text-[10px] justify-center absolute -top-1 -right-1"
                          >
                            {pendingApprovalCount() > 9 ? "9+" : pendingApprovalCount()}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {drawerOpen && activeDrawerTab === "logs" && executionLogs.length > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs h-6" onClick={clearLogs}>
                        Clear Logs
                      </Button>
                    )}
                    <NotificationBell />
                  </div>
                </div>
              </ResizableHandle>

              <ResizablePanel
                defaultSize={drawerOpen ? drawerHeight : 0}
                minSize={0}
                maxSize={80}
                collapsible
                panelRef={drawerPanelRef}
                onResize={(size) => {
                  const collapsed = size.asPercentage === 0;
                  if (collapsed && drawerOpen) toggleDrawer();
                  if (!collapsed && !drawerOpen) toggleDrawer();
                }}
              >
                <OutputDrawer />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog
        open={createProjectDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeCreateProjectDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Give your project a name and optional description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateProject();
              }}
              autoFocus
            />
            <Textarea
              placeholder="Description (optional)"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) closeDeleteConfirm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTarget?.type === "project" ? "Project" : "Task"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "project"
                ? "This will permanently delete the project and all its tasks. This cannot be undone."
                : "This task and its context will be permanently removed. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteConfirm}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete {deleteTarget?.type === "project" ? "Project" : "Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
