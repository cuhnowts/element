import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useBriefingStore } from "@/stores/useBriefingStore";

export function useBriefingStream() {
  const appendChunk = useBriefingStore((s) => s.appendChunk);
  const completeBriefing = useBriefingStore((s) => s.completeBriefing);
  const failBriefing = useBriefingStore((s) => s.failBriefing);

  useEffect(() => {
    const u1 = listen<string>("briefing-chunk", (e) => {
      appendChunk(e.payload);
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
  }, [appendChunk, completeBriefing, failBriefing]);
}
