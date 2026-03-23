import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  ExternalLink,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/stores";
import type { FileEntry } from "@/lib/types";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface FileTreeNodeProps {
  entry: FileEntry;
  level: number;
  projectId: string;
}

export function FileTreeNode({ entry, level, projectId }: FileTreeNodeProps) {
  const fileTree = useStore((s) => s.fileTree);
  const expandedPaths = useStore((s) => s.expandedPaths);
  const loadingPaths = useStore((s) => s.loadingPaths);
  const selectedFilePath = useStore((s) => s.selectedFilePath);
  const toggleExpand = useStore((s) => s.toggleExpand);
  const selectFile = useStore((s) => s.selectFile);
  const openFileInEditor = useStore((s) => s.openFileInEditor);
  const revealInFileManager = useStore((s) => s.revealInFileManager);

  const projectExpanded = expandedPaths[projectId] || [];
  const isExpanded = projectExpanded.includes(entry.path);
  const isLoading = loadingPaths.includes(entry.path);
  const isSelected = selectedFilePath === entry.path;
  const children = fileTree[entry.path] || [];

  const handleCopyPath = () => {
    navigator.clipboard.writeText(entry.path);
    toast("Path copied");
  };

  if (entry.is_dir) {
    return (
      <>
        <ContextMenu>
          <ContextMenuTrigger
            className={`flex items-center gap-1 h-7 px-2 w-full cursor-pointer select-none hover:bg-muted ${
              isSelected ? "bg-muted text-primary" : ""
            } ${entry.is_hidden ? "opacity-40" : ""}`}
            style={{ paddingLeft: `${level * 8 + 8}px` }}
            onClick={() => toggleExpand(entry.path, projectId)}
          >
            {isExpanded ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="size-4 shrink-0 text-foreground" />
            ) : (
              <Folder className="size-4 shrink-0 text-foreground" />
            )}
            <span className="truncate text-sm">{entry.name}</span>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={handleCopyPath}>
              <Copy className="size-4 text-muted-foreground" />
              Copy Path
            </ContextMenuItem>
            <ContextMenuItem onClick={() => revealInFileManager(entry.path)}>
              <FolderOpen className="size-4 text-muted-foreground" />
              Reveal in Finder
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {isExpanded && isLoading && (
          <div
            className="flex items-center h-7 px-2"
            style={{ paddingLeft: `${(level + 1) * 8 + 8}px` }}
          >
            <Skeleton className="h-4 w-[60%]" />
          </div>
        )}

        {isExpanded &&
          !isLoading &&
          children.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              level={level + 1}
              projectId={projectId}
            />
          ))}
      </>
    );
  }

  // File rendering
  return (
    <ContextMenu>
      <ContextMenuTrigger
        className={`flex items-center gap-1 h-7 px-2 w-full cursor-pointer select-none hover:bg-muted ${
          isSelected ? "bg-muted text-primary" : ""
        } ${entry.is_hidden ? "opacity-40" : ""}`}
        style={{ paddingLeft: `${level * 8 + 8}px` }}
        onClick={() => selectFile(entry.path)}
        onDoubleClick={() => openFileInEditor(entry.path)}
      >
        <span className="ml-4" />
        <File className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm">{entry.name}</span>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => openFileInEditor(entry.path)}>
          <ExternalLink className="size-4 text-muted-foreground" />
          Open in Editor
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyPath}>
          <Copy className="size-4 text-muted-foreground" />
          Copy Path
        </ContextMenuItem>
        <ContextMenuItem onClick={() => revealInFileManager(entry.path)}>
          <FolderOpen className="size-4 text-muted-foreground" />
          Reveal in Finder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
