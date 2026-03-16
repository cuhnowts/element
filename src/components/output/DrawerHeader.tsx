import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { useTaskStore } from "@/stores/useTaskStore";

export function DrawerHeader() {
  const drawerOpen = useWorkspaceStore((s) => s.drawerOpen);
  const toggleDrawer = useWorkspaceStore((s) => s.toggleDrawer);
  const clearLogs = useTaskStore((s) => s.clearLogs);
  const executionLogs = useTaskStore((s) => s.executionLogs);

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border">
      <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        Output
      </span>
      <div className="flex items-center gap-2">
        {executionLogs.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={clearLogs}>
            Clear Logs
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-xs" onClick={toggleDrawer}>
          {drawerOpen ? "Hide Output" : "Show Output"}
        </Button>
      </div>
    </div>
  );
}
