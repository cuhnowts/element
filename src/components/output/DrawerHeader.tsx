import { Button } from "@/components/ui/button";
import { useWorkspaceStore, type DrawerTab } from "@/stores/useWorkspaceStore";
import { useTaskStore } from "@/stores/useTaskStore";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNotificationEvents } from "@/hooks/useNotificationEvents";

interface DrawerHeaderProps {
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
}

export function DrawerHeader({ activeTab, onTabChange }: DrawerHeaderProps) {
  const drawerOpen = useWorkspaceStore((s) => s.drawerOpen);
  const toggleDrawer = useWorkspaceStore((s) => s.toggleDrawer);
  const clearLogs = useTaskStore((s) => s.clearLogs);
  const executionLogs = useTaskStore((s) => s.executionLogs);

  useNotificationEvents();

  const tabClass = (tab: DrawerTab) =>
    `text-xs font-semibold tracking-wide uppercase px-2 py-1 rounded transition-colors ${
      activeTab === tab
        ? "text-foreground bg-muted"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onTabChange("terminal")}
          className={tabClass("terminal")}
        >
          Terminal
        </button>
        <button
          type="button"
          onClick={() => onTabChange("logs")}
          className={tabClass("logs")}
        >
          Logs
        </button>
        <button
          type="button"
          onClick={() => onTabChange("history")}
          className={tabClass("history")}
        >
          History
        </button>
      </div>
      <div className="flex items-center gap-2">
        {activeTab === "logs" && executionLogs.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={clearLogs}>
            Clear Logs
          </Button>
        )}
        <NotificationBell />
        <Button variant="ghost" size="sm" className="text-xs" onClick={toggleDrawer}>
          {drawerOpen ? "Hide Output" : "Show Output"}
        </Button>
      </div>
    </div>
  );
}
