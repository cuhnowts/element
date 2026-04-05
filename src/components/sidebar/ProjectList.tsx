import { Plus } from "lucide-react";
import { useEffect } from "react";
import { SessionIndicator } from "@/components/sidebar/SessionIndicator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore } from "@/stores";

export function ProjectList() {
  const projects = useStore((s) => s.projects);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const loadProjects = useStore((s) => s.loadProjects);
  const selectProject = useStore((s) => s.selectProject);
  const tasks = useStore((s) => s.tasks);
  const loadTasks = useStore((s) => s.loadTasks);
  const openCreateProjectDialog = useStore((s) => s.openCreateProjectDialog);
  const openDeleteConfirm = useStore((s) => s.openDeleteConfirm);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSelectProject = (projectId: string) => {
    selectProject(projectId);
    loadTasks(projectId);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
          Projects
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => openCreateProjectDialog()}
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <ScrollArea className="max-h-[200px]">
        <div className="px-2">
          {projects.map((project) => (
            <DropdownMenu key={project.id}>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    onClick={() => handleSelectProject(project.id)}
                    className={`flex items-center w-full px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-muted text-left ${
                      selectedProjectId === project.id ? "text-primary font-medium" : ""
                    }`}
                  />
                }
              >
                {project.name}
                <SessionIndicator projectId={project.id} />
                {project.id === selectedProjectId && tasks.length > 0 && (
                  <span
                    className="ml-auto text-[11px] text-muted-foreground"
                    aria-label={`${tasks.filter((t) => t.status === "complete").length} of ${tasks.length} tasks complete`}
                  >
                    {tasks.filter((t) => t.status === "complete").length}/{tasks.length}
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={4}>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    openDeleteConfirm({
                      type: "project",
                      id: project.id,
                      name: project.name,
                    })
                  }
                >
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
