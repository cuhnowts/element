import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DirectoryLinkProps {
  directoryPath: string | null;
  onLink: (path: string) => void;
}

export function DirectoryLink({ directoryPath, onLink }: DirectoryLinkProps) {
  const handleClick = async () => {
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
    <div className="flex items-center gap-2">
      {directoryPath ? (
        <>
          <span
            className="text-xs text-muted-foreground truncate max-w-[300px]"
            title={directoryPath}
          >
            {directoryPath}
          </span>
          <Button variant="ghost" size="sm" className="text-xs h-6" onClick={handleClick}>
            Change
          </Button>
        </>
      ) : (
        <Button variant="ghost" size="sm" className="text-xs" onClick={handleClick}>
          <FolderOpen className="size-3 mr-1" />
          Link Directory
        </Button>
      )}
    </div>
  );
}
