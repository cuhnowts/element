import { useState } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/stores";
import { ProjectList } from "@/components/sidebar/ProjectList";
import { NewTaskList } from "@/components/sidebar/NewTaskList";
import { TaskDetail } from "@/components/detail/TaskDetail";
import { EmptyState } from "@/components/detail/EmptyState";

export function AppLayout() {
  const projects = useStore((s) => s.projects);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const tasks = useStore((s) => s.tasks);

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

  // Determine empty state variant
  const getMainContent = () => {
    if (selectedTaskId) {
      return <TaskDetail />;
    }
    if (projects.length === 0) {
      return <EmptyState variant="no-projects" />;
    }
    if (selectedProjectId && tasks.length === 0) {
      return <EmptyState variant="no-tasks" />;
    }
    return <EmptyState variant="no-selection" />;
  };

  return (
    <div className="h-screen">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize="30%" minSize="20%" maxSize="40%">
          <div className="flex flex-col h-full bg-card">
            <ProjectList />
            <Separator />
            <NewTaskList />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize="70%">
          {getMainContent()}
        </ResizablePanel>
      </ResizablePanelGroup>

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
    </div>
  );
}
