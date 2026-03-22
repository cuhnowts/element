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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            onClick={() => selectTask(task.id)}
            className={`flex items-center w-full px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-muted text-left ${
              selectedTaskId === task.id ? "text-primary font-medium" : ""
            }`}
          />
        }
      >
        <Circle className="size-3.5 mr-1.5 text-muted-foreground flex-shrink-0" />
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
