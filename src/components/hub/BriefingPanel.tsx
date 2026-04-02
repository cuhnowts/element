import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useBriefingStore } from "@/stores/useBriefingStore";
import { useBriefingStream } from "@/hooks/useBriefingStream";
import { BriefingGreeting } from "@/components/hub/BriefingGreeting";
import { BriefingSkeleton } from "@/components/hub/BriefingSkeleton";
import { BriefingContent } from "@/components/hub/BriefingContent";
import { BriefingRefreshButton } from "@/components/hub/BriefingRefreshButton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

function formatRelativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return "Updated just now";
  if (diff < 60) return `Updated ${diff} minute${diff === 1 ? "" : "s"} ago`;
  const hours = Math.floor(diff / 60);
  return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export function BriefingPanel() {
  useBriefingStream();

  const briefingStatus = useBriefingStore((s) => s.briefingStatus);
  const briefingError = useBriefingStore((s) => s.briefingError);
  const lastRefreshedAt = useBriefingStore((s) => s.lastRefreshedAt);
  const requestBriefing = useBriefingStore((s) => s.requestBriefing);

  // Only regenerate if stale (30+ minutes) or never generated
  useEffect(() => {
    const STALE_MS = 30 * 60 * 1000; // 30 minutes
    const isStale = !lastRefreshedAt || Date.now() - lastRefreshedAt > STALE_MS;

    if (isStale) {
      requestBriefing();
      invoke("build_context_manifest").then(() => invoke("generate_briefing"));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    requestBriefing();
    await invoke("build_context_manifest");
    await invoke("generate_briefing");
  };

  const isActive =
    briefingStatus === "loading" || briefingStatus === "streaming";

  let bodyContent: React.ReactNode;
  if (briefingStatus === "idle" || briefingStatus === "loading") {
    bodyContent = <BriefingSkeleton />;
  } else if (
    briefingStatus === "streaming" ||
    briefingStatus === "complete"
  ) {
    bodyContent = <BriefingContent />;
  } else {
    bodyContent = (
      <p className="text-sm text-muted-foreground">
        {briefingError ||
          "Briefing could not be generated. Check your AI provider settings and try again."}
      </p>
    );
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ padding: "48px 24px 24px" }}
    >
      <BriefingGreeting />
      <div className="mt-8 flex-1 min-h-0 flex flex-col">
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0">
            <span className="text-sm font-medium">Daily Briefing</span>
            <div className="flex items-center gap-2">
              {lastRefreshedAt && (
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(lastRefreshedAt)}
                </span>
              )}
              <BriefingRefreshButton
                disabled={isActive}
                spinning={isActive}
                onClick={handleRefresh}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-auto">
            <div role="region" aria-label="AI daily briefing">
              {bodyContent}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
