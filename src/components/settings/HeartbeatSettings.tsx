import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/stores";

const INTERVAL_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
];

const INTERVAL_LABELS: Record<number, string> = {
  15: "15 minutes",
  30: "30 minutes",
  60: "1 hour",
  120: "2 hours",
};

export function HeartbeatSettings() {
  const heartbeatEnabled = useStore((s) => s.heartbeatEnabled);
  const heartbeatInterval = useStore((s) => s.heartbeatInterval);
  const heartbeatProviderId = useStore((s) => s.heartbeatProviderId);
  const heartbeatRunning = useStore((s) => s.heartbeatRunning);
  const fetchHeartbeatConfig = useStore((s) => s.fetchHeartbeatConfig);
  const fetchHeartbeatStatus = useStore((s) => s.fetchHeartbeatStatus);
  const setHeartbeatEnabled = useStore((s) => s.setHeartbeatEnabled);
  const setHeartbeatInterval = useStore((s) => s.setHeartbeatInterval);
  const setHeartbeatProviderId = useStore((s) => s.setHeartbeatProviderId);
  const providers = useStore((s) => s.providers);

  useEffect(() => {
    fetchHeartbeatConfig();
    fetchHeartbeatStatus();
  }, [fetchHeartbeatConfig, fetchHeartbeatStatus]);

  const intervalLabel = INTERVAL_LABELS[heartbeatInterval] ?? `${heartbeatInterval} minutes`;

  return (
    <div className="space-y-4">
      {/* Section heading with status dot */}
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold">Heartbeat</h2>
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            heartbeatRunning ? "bg-chart-2 animate-pulse" : "bg-muted-foreground"
          }`}
          aria-label={heartbeatRunning ? "Heartbeat is running" : "Heartbeat is stopped"}
        />
      </div>

      {/* Enable switch */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Background deadline monitoring</label>
          <p className="text-xs text-muted-foreground">
            Check for deadline risks every {intervalLabel}
          </p>
        </div>
        <Switch checked={heartbeatEnabled} onCheckedChange={setHeartbeatEnabled} />
      </div>

      {/* Check interval */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Check interval</label>
        <Select
          value={String(heartbeatInterval)}
          onValueChange={(v) => setHeartbeatInterval(Number(v))}
          disabled={!heartbeatEnabled}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERVAL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* AI provider for summaries */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">AI provider for summaries</label>
        <p className="text-xs text-muted-foreground">
          Used for risk summaries. Falls back to template when unavailable.
        </p>
        <Select
          value={heartbeatProviderId ?? ""}
          onValueChange={(v) => setHeartbeatProviderId(v || null)}
          disabled={!heartbeatEnabled}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="None (template only)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">None (template only)</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
