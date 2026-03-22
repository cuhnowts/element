import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores";
import { api } from "@/lib/tauri";
import { ThemeSection } from "./ThemeSection";
import { UncategorizedSection } from "./UncategorizedSection";
import { CreateThemeDialog } from "./CreateThemeDialog";
import type { Theme, Task } from "@/lib/types";

function SortableThemeItem({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: theme.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function ThemeSidebar() {
  const themes = useStore((s) => s.themes);
  const projects = useStore((s) => s.projects);
  const loadThemes = useStore((s) => s.loadThemes);
  const loadProjects = useStore((s) => s.loadProjects);
  const reorderThemes = useStore((s) => s.reorderThemes);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [standaloneTasks, setStandaloneTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadThemes();
    loadProjects();
    api.listStandaloneTasks().then(setStandaloneTasks).catch(() => {});
  }, [loadThemes, loadProjects]);

  const themedProjects = useMemo(() => {
    const map = new Map<string, typeof projects>();
    for (const project of projects) {
      if (project.themeId) {
        const existing = map.get(project.themeId) ?? [];
        existing.push(project);
        map.set(project.themeId, existing);
      }
    }
    return map;
  }, [projects]);

  const themedTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of standaloneTasks) {
      if (task.themeId) {
        const existing = map.get(task.themeId) ?? [];
        existing.push(task);
        map.set(task.themeId, existing);
      }
    }
    return map;
  }, [standaloneTasks]);

  const uncategorizedProjects = useMemo(
    () => projects.filter((p) => p.themeId === null),
    [projects]
  );

  const uncategorizedTasks = useMemo(
    () => standaloneTasks.filter((t) => t.themeId === null),
    [standaloneTasks]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = themes.findIndex((t) => t.id === active.id);
    const newIndex = themes.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(themes, oldIndex, newIndex);
    reorderThemes(newOrder.map((t) => t.id));
  };

  const hasContent =
    themes.length > 0 ||
    uncategorizedProjects.length > 0 ||
    uncategorizedTasks.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          THEMES
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {!hasContent ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm font-medium">Organize with themes</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create a theme to group your projects and tasks. Click + above to
            get started.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={themes.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {themes.map((theme) => (
                <SortableThemeItem key={theme.id} theme={theme}>
                  <ThemeSection
                    theme={theme}
                    projects={themedProjects.get(theme.id) ?? []}
                    tasks={themedTasks.get(theme.id) ?? []}
                  />
                </SortableThemeItem>
              ))}
            </SortableContext>
          </DndContext>
          <UncategorizedSection
            projects={uncategorizedProjects}
            tasks={uncategorizedTasks}
          />
        </ScrollArea>
      )}

      <CreateThemeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
