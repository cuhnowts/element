import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { PluginInfo } from "@/lib/types";
import { useStore } from "@/stores";

interface PluginCardProps {
  plugin: PluginInfo;
}

const statusDotClass: Record<string, string> = {
  active: "bg-chart-2",
  error: "bg-destructive",
  disabled: "bg-muted-foreground",
  loading: "bg-primary animate-pulse",
};

export function PluginCard({ plugin }: PluginCardProps) {
  const [errorExpanded, setErrorExpanded] = useState(false);
  const enablePlugin = useStore((s) => s.enablePlugin);
  const disablePlugin = useStore((s) => s.disablePlugin);
  const reloadPlugin = useStore((s) => s.reloadPlugin);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      enablePlugin(plugin.name);
    } else {
      disablePlugin(plugin.name);
    }
  };

  return (
    <div className="rounded-lg bg-card p-4 transition-colors duration-100 hover:bg-muted">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-block size-2 shrink-0 rounded-full ${statusDotClass[plugin.status] ?? "bg-muted-foreground"}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{plugin.displayName}</span>
            <Badge variant="secondary" className="text-xs">
              v{plugin.version}
            </Badge>
            {plugin.status === "error" && (
              <Badge
                variant="destructive"
                className="cursor-pointer text-xs"
                onClick={() => setErrorExpanded((prev) => !prev)}
              >
                Error
              </Badge>
            )}
          </div>
        </div>
        <Switch checked={plugin.enabled} onCheckedChange={handleToggle} />
      </div>

      {/* Description */}
      {plugin.description && (
        <p className="mt-2 text-sm text-muted-foreground">{plugin.description}</p>
      )}

      {/* Capability badges */}
      {plugin.capabilities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {plugin.capabilities.map((cap) => (
            <Badge key={cap} variant="secondary" className="text-xs">
              {cap}
            </Badge>
          ))}
        </div>
      )}

      {/* Error detail expandable */}
      {plugin.status === "error" && errorExpanded && plugin.errorMessage && (
        <div className="mt-3 rounded-md bg-background p-3">
          <p className="text-xs font-mono text-destructive-foreground">
            Plugin failed to load: {plugin.errorMessage}. Check the manifest file and try reloading.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => reloadPlugin(plugin.name)}
          >
            Reload Plugin
          </Button>
        </div>
      )}
    </div>
  );
}
