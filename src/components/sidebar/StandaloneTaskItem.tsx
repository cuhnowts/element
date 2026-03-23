import { useState } from "react";
import { Circle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/stores";
import { MoveToThemeMenu } from "./MoveToThemeMenu";
import type { Task } from "@/lib/types";

interface StandaloneTaskItemProps {
  task: Task;
}

export function StandaloneTaskItem({ task }: StandaloneTaskItemProps) {
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const selectTask = useStore((s) => s.selectTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const themes = useStore((s) => s.themes);
  const assignTaskToTheme = useStore((s) => s.assignTaskToTheme);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              selectTask(task.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuOpen(true);
            }}
            className={`flex items-center w-full px-1.5 py-0.5 text-xs rounded-md transition-colors hover:bg-muted text-left ${
              selectedTaskId === task.id ? "text-primary font-medium" : ""
            }`}
          />
        }
      >
        <Circle className="size-2.5 mr-1.5 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{task.title}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4}>
        <MoveToThemeMenu
          themes={themes}
          currentThemeId={task.themeId}
          onSelect={(themeId) => assignTaskToTheme(task.id, themeId)}
        />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => deleteTask(task.id)}
        >
          Delete Task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
