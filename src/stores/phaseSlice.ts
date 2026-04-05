import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { Phase } from "../lib/types";
import type { AppStore } from "./index";

export interface PhaseSlice {
  phases: Phase[];
  phasesLoading: boolean;
  loadPhases: (projectId: string) => Promise<void>;
  createPhase: (projectId: string, name: string) => Promise<Phase>;
  updatePhase: (phaseId: string, name: string) => Promise<void>;
  deletePhase: (phaseId: string) => Promise<void>;
  reorderPhases: (projectId: string, orderedIds: string[]) => Promise<void>;
}

export const createPhaseSlice: StateCreator<AppStore, [], [], PhaseSlice> = (set, _get) => ({
  phases: [],
  phasesLoading: false,
  loadPhases: async (projectId) => {
    set({ phasesLoading: true });
    const phases = await api.listPhases(projectId);
    set({ phases, phasesLoading: false });
  },
  createPhase: async (projectId, name) => {
    const phase = await api.createPhase(projectId, name);
    set((s) => ({ phases: [...s.phases, phase] }));
    return phase;
  },
  updatePhase: async (phaseId, name) => {
    const phase = await api.updatePhase(phaseId, name);
    set((s) => ({
      phases: s.phases.map((p) => (p.id === phaseId ? phase : p)),
    }));
  },
  deletePhase: async (phaseId) => {
    await api.deletePhase(phaseId);
    set((s) => ({
      phases: s.phases.filter((p) => p.id !== phaseId),
    }));
  },
  reorderPhases: async (projectId, orderedIds) => {
    // Optimistic update
    set((s) => ({
      phases: orderedIds
        .map((id, index) => {
          const phase = s.phases.find((p) => p.id === id);
          return phase ? { ...phase, sortOrder: index } : null;
        })
        .filter((p): p is Phase => p !== null),
    }));
    try {
      await api.reorderPhases(projectId, orderedIds);
    } catch {
      // Revert on failure
      const phases = await api.listPhases(projectId);
      set({ phases });
    }
  },
});
