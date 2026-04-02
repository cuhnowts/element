import { create } from "zustand";

type BriefingStatus = "idle" | "loading" | "streaming" | "complete" | "error";

interface BriefingState {
  briefingContent: string;
  briefingStatus: BriefingStatus;
  briefingError: string | null;
  lastRefreshedAt: number | null;
  requestBriefing: () => void;
  appendChunk: (chunk: string) => void;
  completeBriefing: () => void;
  failBriefing: (error: string) => void;
}

export const useBriefingStore = create<BriefingState>()((set) => ({
  briefingContent: "",
  briefingStatus: "idle",
  briefingError: null,
  lastRefreshedAt: null,

  requestBriefing: () =>
    set({ briefingContent: "", briefingStatus: "loading", briefingError: null }),

  appendChunk: (chunk: string) =>
    set((s) => ({
      briefingContent: s.briefingContent + chunk,
      briefingStatus: "streaming",
    })),

  completeBriefing: () =>
    set({ briefingStatus: "complete", lastRefreshedAt: Date.now() }),

  failBriefing: (error: string) =>
    set({ briefingStatus: "error", briefingError: error }),
}));
