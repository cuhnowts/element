import { FolderOpen, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/tauri";
import { useStore } from "@/stores";
import { PluginCard } from "./PluginCard";

export function PluginList() {
  const plugins = useStore((s) => s.plugins);
  const pluginsLoading = useStore((s) => s.pluginsLoading);
  const fetchPlugins = useStore((s) => s.fetchPlugins);
  const scanPlugins = useStore((s) => s.scanPlugins);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  if (pluginsLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-semibold">No plugins installed</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Drop a plugin folder into the plugins directory, or use the button below to open it.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => api.openPluginsDirectory()}>
          <FolderOpen className="size-4" data-icon="inline-start" />
          Open Plugins Folder
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => scanPlugins()}>
          <RefreshCw className="size-3.5" data-icon="inline-start" />
          Scan Plugins
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="flex flex-col gap-2">
          {plugins.map((plugin) => (
            <PluginCard key={plugin.name} plugin={plugin} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
