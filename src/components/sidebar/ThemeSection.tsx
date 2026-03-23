import { useState } from "react";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/stores";
import { ThemeHeader } from "./ThemeHeader";
import { StandaloneTaskItem } from "./StandaloneTaskItem";
import { MoveToThemeMenu } from "./MoveToThemeMenu";
import type { Theme, Project, Task } from "@/lib/types";

interface ThemeSectionProps {
  theme: Theme;
  projects: Project[];
  tasks: Task[];
  onProjectCreated?: () => void;
}

export function ThemeSection({ theme, projects, tasks, onProjectCreated }: ThemeSectionProps) {
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
  const createProject = useStore((s) => s.createProject);
  const createTask = useStore((s) => s.createTask);

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

  const handleCreateProject = async () => {
    const project = await createProject("New project");
    await assignProjectToTheme(project.id, theme.id);
    onProjectCreated?.();
  };

  const handleCreateTaskInProject = async (projectId: string) => {
    await createTask("New task", projectId);
    loadTasks(projectId);
    setExpandedProjects((prev) => new Set(prev).add(projectId));
  };

  return (
    <div>
      <ThemeHeader
        theme={theme}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        onCreateProject={handleCreateProject}
      />
      {expanded && (
        <div className="ml-5 pl-4 -mt-1 border-l-2" style={{ borderColor: `${theme.color}40` }}>
          {projects.map((project) => (
            <div key={project.id}>
              <ProjectRow
                project={project}
                isSelected={selectedProjectId === project.id}
                isExpanded={expandedProjects.has(project.id)}
                onToggle={() => toggleProject(project.id)}
                onSelect={() => handleSelectProject(project.id)}
                onAddTask={() => handleCreateTaskInProject(project.id)}
                themes={themes}
                currentThemeId={project.themeId}
                onMoveToTheme={(themeId) => assignProjectToTheme(project.id, themeId)}
                onDelete={() => openDeleteConfirm({ type: "project", id: project.id, name: project.name })}
              />
              {expandedProjects.has(project.id) && (
                <div className="ml-5 pl-4 -mt-0.5 border-l border-border/40">
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

function ProjectRow({
  project,
  isSelected,
  isExpanded,
  onToggle,
  onSelect,
  onAddTask,
  themes,
  currentThemeId,
  onMoveToTheme,
  onDelete,
}: {
  project: Project;
  isSelected: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onAddTask: () => void;
  themes: Theme[];
  currentThemeId: string | null;
  onMoveToTheme: (themeId: string | null) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="group/project flex items-center w-full">
      <button
        type="button"
        className="flex-shrink-0 p-0.5"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
      </button>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={`flex-1 min-w-0 px-1 py-0.5 text-xs rounded-md transition-colors hover:bg-muted text-left truncate ${
                isSelected ? "text-primary font-medium" : ""
              }`}
              onClick={(e) => {
                // Left click selects, right click opens menu
                e.preventDefault();
                onSelect();
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuOpen(true);
              }}
            />
          }
        >
          {project.name}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={4}>
          <MoveToThemeMenu
            themes={themes}
            currentThemeId={currentThemeId}
            onSelect={onMoveToTheme}
          />
          <DropdownMenuItem
            variant="destructive"
            onClick={onDelete}
          >
            Delete Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        type="button"
        className="flex-shrink-0 inline-flex items-center justify-center rounded-md size-5 hover:bg-accent hover:text-accent-foreground opacity-0 group-hover/project:opacity-100 transition-opacity"
        onClick={onAddTask}
        aria-label="Add task to project"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}
