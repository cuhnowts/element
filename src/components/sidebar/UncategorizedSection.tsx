import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/stores";
import { StandaloneTaskItem } from "./StandaloneTaskItem";
import { MoveToThemeMenu } from "./MoveToThemeMenu";
import type { Project, Task } from "@/lib/types";

interface UncategorizedSectionProps {
  projects: Project[];
  tasks: Task[];
}

export function UncategorizedSection({
  projects,
  tasks,
}: UncategorizedSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  );

  const selectProject = useStore((s) => s.selectProject);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const loadTasks = useStore((s) => s.loadTasks);
  const storeTasks = useStore((s) => s.tasks);
  const openDeleteConfirm = useStore((s) => s.openDeleteConfirm);
  const themes = useStore((s) => s.themes);
  const assignProjectToTheme = useStore((s) => s.assignProjectToTheme);

  if (projects.length === 0 && tasks.length === 0) {
    return null;
  }

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
        loadTasks(projectId);
      }
      return next;
    });
  };

  const handleSelectProject = (projectId: string) => {
    selectProject(projectId);
    loadTasks(projectId);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 px-2 py-1.5 w-full"
      >
        {expanded ? (
          <ChevronDown className="size-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="size-4 flex-shrink-0" />
        )}
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          UNCATEGORIZED
        </span>
      </button>
      {expanded && (
        <div className="pl-2">
          {projects.map((project) => (
            <div key={project.id}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className={`flex items-center w-full px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-muted text-left ${
                        selectedProjectId === project.id
                          ? "text-primary font-medium"
                          : ""
                      }`}
                    />
                  }
                >
                  <button
                    type="button"
                    className="flex-shrink-0 p-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProject(project.id);
                    }}
                  >
                    {expandedProjects.has(project.id) ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                  </button>
                  <span
                    className="truncate ml-1"
                    onClick={() => handleSelectProject(project.id)}
                  >
                    {project.name}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={4}>
                  <MoveToThemeMenu
                    themes={themes}
                    currentThemeId={null}
                    onSelect={(themeId) =>
                      assignProjectToTheme(project.id, themeId)
                    }
                  />
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
              {expandedProjects.has(project.id) && (
                <div className="pl-4">
                  {storeTasks
                    .filter((t) => t.projectId === project.id)
                    .map((t) => (
                      <StandaloneTaskItem key={t.id} task={t} />
                    ))}
                </div>
              )}
            </div>
          ))}
          {tasks.map((task) => (
            <StandaloneTaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
