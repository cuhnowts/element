import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useBriefingStore } from "@/stores/useBriefingStore";
import type { BriefingJSON } from "@/types/briefing";

export function useBriefingStream() {
  const setBriefingData = useBriefingStore((s) => s.setBriefingData);
  const completeBriefing = useBriefingStore((s) => s.completeBriefing);
  const failBriefing = useBriefingStore((s) => s.failBriefing);

  useEffect(() => {
    const u1 = listen<string>("briefing-data", (e) => {
      try {
        const parsed: BriefingJSON = JSON.parse(e.payload);
        setBriefingData(parsed);
      } catch {
        failBriefing(
          "Briefing could not be generated. Check your AI provider settings and try again.",
        );
      }
    });
    const u2 = listen("briefing-complete", () => {
      completeBriefing();
    });
    const u3 = listen<string>("briefing-error", (e) => {
      failBriefing(e.payload);
    });

    return () => {
      u1.then((f) => f());
      u2.then((f) => f());
      u3.then((f) => f());
    };
  }, [setBriefingData, completeBriefing, failBriefing]);
}
