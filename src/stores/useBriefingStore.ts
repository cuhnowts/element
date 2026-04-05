import { create } from "zustand";
import type { BriefingJSON, BriefingStatus } from "@/types/briefing";

// Module-level empty constant for selector stability (per project memory: never return new refs)
const EMPTY_BRIEFING: BriefingJSON | null = null;

interface BriefingState {
  briefingData: BriefingJSON | null; // replaces briefingContent: string
  briefingStatus: BriefingStatus;
  briefingError: string | null;
  contextSummary: string | null; // greeting summary from scoring engine
  lastRefreshedAt: number | null;

  requestBriefing: () => void;
  setBriefingData: (data: BriefingJSON) => void; // replaces appendChunk
  completeBriefing: () => void;
  failBriefing: (error: string) => void;
  setContextSummary: (summary: string) => void;
}

export const useBriefingStore = create<BriefingState>()((set, get) => ({
  briefingData: EMPTY_BRIEFING,
  briefingStatus: "idle",
  briefingError: null,
  contextSummary: null,
  lastRefreshedAt: null,

  requestBriefing: () => {
    // Guard against concurrent requests (per Research Pitfall 3)
    const current = get().briefingStatus;
    if (current === "streaming" || current === "loading") return;
    set({
      briefingData: EMPTY_BRIEFING,
      briefingStatus: "loading",
      briefingError: null,
    });
  },

  setBriefingData: (data: BriefingJSON) => set({ briefingData: data, briefingStatus: "streaming" }),

  completeBriefing: () => set({ briefingStatus: "complete", lastRefreshedAt: Date.now() }),

  failBriefing: (error: string) => set({ briefingStatus: "error", briefingError: error }),

  setContextSummary: (summary: string) => set({ contextSummary: summary }),
}));
