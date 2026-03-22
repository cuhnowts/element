import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores";
import { api } from "@/lib/tauri";
import { CreateThemeDialog } from "./CreateThemeDialog";
import type { Theme } from "@/lib/types";

interface ThemeHeaderProps {
  theme: Theme;
  expanded: boolean;
  onToggle: () => void;
}

export function ThemeHeader({ theme, expanded, onToggle }: ThemeHeaderProps) {
  const deleteTheme = useStore((s) => s.deleteTheme);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  const handleDelete = async () => {
    try {
      const [projectCount, taskCount] = await api.getThemeItemCounts(theme.id);
      if (projectCount > 0 || taskCount > 0) {
        setDeleteMessage(
          `Delete '${theme.name}'? ${projectCount} projects and ${taskCount} tasks will become uncategorized.`
        );
        setShowDeleteConfirm(true);
      } else {
        await deleteTheme(theme.id);
      }
    } catch {
      await deleteTheme(theme.id);
    }
  };

  const confirmDelete = async () => {
    await deleteTheme(theme.id);
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <div className="flex items-center gap-1 px-2 py-1.5 group cursor-pointer w-full" />
          }
        >
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1.5 flex-1 min-w-0"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: theme.color }}
            />
            <span className="text-sm font-medium truncate">{theme.name}</span>
            {expanded ? (
              <ChevronDown className="size-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="size-4 flex-shrink-0" />
            )}
          </button>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={(e) => {
                e.stopPropagation();
                setShowEditDialog(true);
              }}
              aria-label="Edit theme"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              aria-label="Delete theme"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={4}>
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            Change Color
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Delete Theme
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateThemeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        editTheme={theme}
      />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Theme</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{deleteMessage}</p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Keep Theme
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
