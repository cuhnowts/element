import { ChevronDown, ChevronRight, FolderPlus, GripVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/tauri";
import type { Theme } from "@/lib/types";
import { useStore } from "@/stores";
import { CreateThemeDialog } from "./CreateThemeDialog";
import { useDragHandle } from "./ThemeSidebar";

interface ThemeHeaderProps {
  theme: Theme;
  expanded: boolean;
  onToggle: () => void;
  onCreateProject?: () => void;
}

export function ThemeHeader({ theme, expanded, onToggle, onCreateProject }: ThemeHeaderProps) {
  const deleteTheme = useStore((s) => s.deleteTheme);
  const selectTheme = useStore((s) => s.selectTheme);
  const selectedThemeId = useStore((s) => s.selectedThemeId);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");

  const handleDelete = async () => {
    try {
      const [projectCount, taskCount] = await api.getThemeItemCounts(theme.id);
      if (projectCount > 0 || taskCount > 0) {
        setDeleteMessage(
          `Delete '${theme.name}'? ${projectCount} projects and ${taskCount} tasks will become uncategorized.`,
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

  const dragHandle = useDragHandle();

  return (
    <>
      <div className="flex items-center gap-1 px-2 py-1.5 group w-full">
        <div
          className="cursor-grab opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0"
          {...(dragHandle?.attributes ?? {})}
          {...(dragHandle?.listeners ?? {})}
        >
          <GripVertical className="size-3.5" />
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex-shrink-0 p-0.5"
          aria-label={expanded ? "Collapse theme" : "Expand theme"}
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => selectTheme(theme.id)}
          className={`flex items-center gap-1.5 flex-1 min-w-0 ${
            selectedThemeId === theme.id ? "text-primary" : ""
          }`}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: theme.color }}
          />
          <span className="text-xs font-semibold truncate">{theme.name}</span>
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md size-6 hover:bg-accent hover:text-accent-foreground"
            onClick={onCreateProject}
            aria-label="New project in theme"
          >
            <FolderPlus className="size-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md size-6 hover:bg-accent hover:text-accent-foreground"
            onClick={() => setShowEditDialog(true)}
            aria-label="Edit theme"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md size-6 hover:bg-accent hover:text-accent-foreground"
            onClick={handleDelete}
            aria-label="Delete theme"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      <CreateThemeDialog open={showEditDialog} onOpenChange={setShowEditDialog} editTheme={theme} />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Theme</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{deleteMessage}</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
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
