import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { api } from "@/lib/tauri";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";

interface WorkspaceButtonProps {
  projectId: string;
  directoryPath: string | null;
  onLink: (path: string) => void;
}

export function WorkspaceButton({ projectId, directoryPath, onLink }: WorkspaceButtonProps) {
  const handleOpenWorkspace = () => {
    if (!directoryPath) return;
    api.startFileWatcher(directoryPath).catch((e) => {
      toast.error(`Failed to open workspace: ${e}`);
    });
    useWorkspaceStore.getState().setProjectCenterTab(projectId, "files");
    useWorkspaceStore.getState().openTerminal();
  };

  const handleLinkDirectory = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select project directory",
    });
    if (typeof selected === "string") {
      onLink(selected);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {directoryPath ? (
        <>
          <Button
            variant="outline"
            size="default"
            onClick={handleOpenWorkspace}
          >
            <FolderOpen size={16} className="mr-2" />
            Open Workspace
          </Button>
          <span className="text-sm text-muted-foreground truncate max-w-[300px]">
            {directoryPath}
          </span>
        </>
      ) : (
        <Button
          variant="outline"
          size="default"
          onClick={handleLinkDirectory}
        >
          <FolderOpen size={16} className="mr-2" />
          Link Directory
        </Button>
      )}
    </div>
  );
}
