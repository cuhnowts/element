import { Eye, EyeOff } from "lucide-react";
import { useEffect } from "react";
import { FileTreeNode } from "@/components/center/FileTreeNode";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/tauri";
import type { FileEntry } from "@/lib/types";
import { useStore } from "@/stores";

interface FileExplorerProps {
  projectId: string;
  directoryPath: string;
}

export function FileExplorer({ projectId, directoryPath }: FileExplorerProps) {
  const loadDirectory = useStore((s) => s.loadDirectory);
  const showHiddenFiles = useStore((s) => s.showHiddenFiles);
  const toggleShowHidden = useStore((s) => s.toggleShowHidden);
  const expandedPaths = useStore((s) => s.expandedPaths);

  // Load root directory and start file watcher on mount
  useEffect(() => {
    loadDirectory(directoryPath);
    api.startFileWatcher(directoryPath);

    return () => {
      api.stopFileWatcher();
    };
  }, [directoryPath, loadDirectory]);

  // Restore expanded paths on mount: hydrate tree for persisted expanded directories
  useEffect(() => {
    const persisted = expandedPaths[projectId] || [];
    for (const dir of persisted) {
      loadDirectory(dir);
    }
    // Only run on mount / project change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, expandedPaths, loadDirectory]);

  const dirName = directoryPath.split("/").filter(Boolean).pop() || "root";

  const rootEntry: FileEntry = {
    name: dirName,
    path: directoryPath,
    is_dir: true,
    is_hidden: false,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-semibold text-muted-foreground">{dirName}/</span>
        <Button
          variant="ghost"
          className="h-7 w-7"
          size="icon"
          onClick={toggleShowHidden}
          title={showHiddenFiles ? "Hide hidden files" : "Show hidden files"}
        >
          {showHiddenFiles ? (
            <Eye className="size-4 text-foreground" />
          ) : (
            <EyeOff className="size-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Tree area */}
      <ScrollArea className="flex-1">
        <FileTreeNode entry={rootEntry} level={0} projectId={projectId} />
      </ScrollArea>
    </div>
  );
}
