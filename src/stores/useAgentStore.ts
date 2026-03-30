import { create } from "zustand";
import type { AgentActivityEntry, AgentState, AgentStatus } from "@/types/agent";

export const useAgentStore = create<AgentState>()((set, get) => ({
  // Panel
  panelOpen: false,
  activeTab: "activity" as const,

  // Agent lifecycle
  status: "starting" as AgentStatus,
  restartCount: 0,

  // Activity
  entries: [] as AgentActivityEntry[],

  // Computed
  pendingApprovalCount: () =>
    get().entries.filter(
      (e) => e.type === "approval_request" && e.approvalStatus === "pending"
    ).length,

  // Actions
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setStatus: (status) => set({ status }),

  addEntry: (entry) =>
    set((s) => ({
      entries: [
        { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
        ...s.entries,
      ],
    })),

  approveEntry: (entryId) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === entryId && e.approvalStatus === "pending"
          ? { ...e, approvalStatus: "approved" as const }
          : e
      ),
    })),

  rejectEntry: (entryId) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === entryId && e.approvalStatus === "pending"
          ? { ...e, approvalStatus: "rejected" as const }
          : e
      ),
    })),

  clearEntries: () => set({ entries: [] }),

  incrementRestart: () => set((s) => ({ restartCount: s.restartCount + 1 })),

  resetRestartCount: () => set({ restartCount: 0 }),
}));
