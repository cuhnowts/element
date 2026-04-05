import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { AiProvider, CreateProviderInput, TaskScaffold } from "../types/ai";
import type { AppStore } from "./index";

export interface AiSlice {
  providers: AiProvider[];
  isGenerating: boolean;
  currentRequestId: string | null;
  pendingSuggestions: TaskScaffold | null;
  acceptedFields: Partial<TaskScaffold>;
  aiError: string | null;
  loadProviders: () => Promise<void>;
  addProvider: (input: CreateProviderInput) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  setDefaultProvider: (id: string) => Promise<void>;
  requestAiAssist: (taskId: string) => void;
  setIsGenerating: (v: boolean) => void;
  setPendingSuggestions: (s: TaskScaffold | null) => void;
  setAiError: (e: string | null) => void;
  setCurrentRequestId: (id: string | null) => void;
  acceptSuggestionField: (field: keyof TaskScaffold) => void;
  dismissSuggestionField: (field: keyof TaskScaffold) => void;
  acceptAllSuggestions: () => void;
  dismissAllSuggestions: () => void;
  clearAcceptedFields: () => void;
  hasDefaultProvider: () => boolean;
}

export const createAiSlice: StateCreator<AppStore, [], [], AiSlice> = (set, get) => ({
  providers: [],
  isGenerating: false,
  currentRequestId: null,
  pendingSuggestions: null,
  acceptedFields: {},
  aiError: null,
  loadProviders: async () => {
    const providers = await api.listAiProviders();
    set({ providers });
  },
  addProvider: async (input) => {
    await api.addAiProvider(input);
    await get().loadProviders();
  },
  removeProvider: async (id) => {
    await api.removeAiProvider(id);
    await get().loadProviders();
  },
  setDefaultProvider: async (id) => {
    await api.setDefaultProvider(id);
    await get().loadProviders();
  },
  requestAiAssist: (taskId) => {
    const requestId = crypto.randomUUID();
    set({
      isGenerating: true,
      currentRequestId: requestId,
      pendingSuggestions: null,
      acceptedFields: {},
      aiError: null,
    });
    api.aiAssistTask(taskId).catch((e) => {
      set({ isGenerating: false, aiError: String(e) });
    });
  },
  setIsGenerating: (v) => set({ isGenerating: v }),
  setPendingSuggestions: (s) => set({ pendingSuggestions: s }),
  setAiError: (e) => set({ aiError: e, isGenerating: false }),
  setCurrentRequestId: (id) => set({ currentRequestId: id }),
  acceptSuggestionField: (field) => {
    // Move the accepted field's VALUE to acceptedFields so TaskDetail can read it,
    // then remove it from pendingSuggestions. This avoids the race condition where
    // the value is deleted before TaskDetail's useEffect can persist it.
    const current = get().pendingSuggestions;
    if (!current) return;
    const value = current[field];
    if (value === undefined) return;

    const nextAccepted = { ...get().acceptedFields, [field]: value };
    const nextPending = { ...current };
    delete nextPending[field];
    const hasFields = Object.values(nextPending).some((v) => v !== undefined);
    set({
      acceptedFields: nextAccepted,
      pendingSuggestions: hasFields ? nextPending : null,
    });
  },
  dismissSuggestionField: (field) => {
    const current = get().pendingSuggestions;
    if (!current) return;
    const next = { ...current };
    delete next[field];
    const hasFields = Object.values(next).some((v) => v !== undefined);
    set({ pendingSuggestions: hasFields ? next : null });
  },
  acceptAllSuggestions: () => {
    const current = get().pendingSuggestions;
    if (!current) return;
    set({
      acceptedFields: { ...get().acceptedFields, ...current },
      pendingSuggestions: null,
    });
  },
  dismissAllSuggestions: () => set({ pendingSuggestions: null }),
  clearAcceptedFields: () => set({ acceptedFields: {} }),
  hasDefaultProvider: () => get().providers.some((p) => p.isDefault),
});
