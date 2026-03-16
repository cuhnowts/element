import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function OutputDrawer() {
  const toggleDrawer = useWorkspaceStore((s) => s.toggleDrawer);
  const drawerOpen = useWorkspaceStore((s) => s.drawerOpen);

  return (
    <div className="flex flex-col h-full bg-card border-t border-border">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          Output
        </span>
        <Button variant="ghost" size="sm" onClick={toggleDrawer}>
          {drawerOpen ? "Hide Output" : "Show Output"}
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {/* LogViewer goes here (Plan 03) */}
      </div>
    </div>
  );
}
