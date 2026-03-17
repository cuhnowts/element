import type { StateCreator } from "zustand";
import { api } from "../lib/tauri";
import type { Credential, CreateCredentialInput } from "../lib/types";
import type { ProjectSlice } from "./projectSlice";
import type { TaskSlice } from "./taskSlice";
import type { UiSlice } from "./uiSlice";
import type { PluginSlice } from "./pluginSlice";

export interface CredentialSlice {
  credentials: Credential[];
  credentialsLoading: boolean;
  credentialsError: string | null;
  revealedCredentialId: string | null;
  revealedValue: string | null;
  fetchCredentials: () => Promise<void>;
  createCredential: (input: CreateCredentialInput) => Promise<void>;
  revealCredential: (id: string) => Promise<void>;
  hideCredential: () => void;
  deleteCredential: (id: string) => Promise<void>;
  updateCredential: (
    id: string,
    updates: Partial<CreateCredentialInput>,
  ) => Promise<void>;
}

export const createCredentialSlice: StateCreator<
  ProjectSlice & TaskSlice & UiSlice & PluginSlice & CredentialSlice,
  [],
  [],
  CredentialSlice
> = (set, get) => ({
  credentials: [],
  credentialsLoading: false,
  credentialsError: null,
  revealedCredentialId: null,
  revealedValue: null,
  fetchCredentials: async () => {
    set({ credentialsLoading: true, credentialsError: null });
    try {
      const credentials = await api.listCredentials();
      set({ credentials, credentialsLoading: false });
    } catch (e) {
      set({
        credentialsError: e instanceof Error ? e.message : String(e),
        credentialsLoading: false,
      });
    }
  },
  createCredential: async (input) => {
    try {
      await api.createCredential(
        input.name,
        input.credentialType,
        input.value,
        input.notes,
      );
      await get().fetchCredentials();
    } catch (e) {
      set({ credentialsError: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },
  revealCredential: async (id) => {
    try {
      const value = await api.getCredentialSecret(id);
      set({ revealedCredentialId: id, revealedValue: value });
      setTimeout(() => {
        // Only hide if this credential is still revealed
        const state = get();
        if (state.revealedCredentialId === id) {
          set({ revealedCredentialId: null, revealedValue: null });
        }
      }, 10_000);
    } catch (e) {
      set({ credentialsError: e instanceof Error ? e.message : String(e) });
    }
  },
  hideCredential: () => {
    set({ revealedCredentialId: null, revealedValue: null });
  },
  deleteCredential: async (id) => {
    try {
      await api.deleteCredential(id);
      set((s) => ({
        credentials: s.credentials.filter((c) => c.id !== id),
        revealedCredentialId:
          s.revealedCredentialId === id ? null : s.revealedCredentialId,
        revealedValue: s.revealedCredentialId === id ? null : s.revealedValue,
      }));
    } catch (e) {
      set({ credentialsError: e instanceof Error ? e.message : String(e) });
    }
  },
  updateCredential: async (id, updates) => {
    try {
      await api.updateCredential(
        id,
        updates.name,
        updates.credentialType,
        updates.notes,
        updates.value,
      );
      await get().fetchCredentials();
    } catch (e) {
      set({ credentialsError: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },
});
