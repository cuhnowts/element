import { create } from "zustand";
import type { ChatMessage, HubChatState } from "@/types/chat";

const MAX_TURNS = 20; // D-09: cap at ~20 turns

export const useHubChatStore = create<HubChatState>()((set, get) => ({
  messages: [],
  isStreaming: false,
  streamingContent: "",
  error: null,
  lastUserMessage: null,

  addUserMessage: (content: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
    };
    set((s) => {
      const updated = [...s.messages, msg];
      // Trim oldest messages if over cap (each turn = user+assistant = 2 messages)
      const maxMessages = MAX_TURNS * 2;
      return {
        messages:
          updated.length > maxMessages ? updated.slice(updated.length - maxMessages) : updated,
        error: null,
        lastUserMessage: content,
      };
    });
  },

  startStreaming: () => set({ isStreaming: true, streamingContent: "", error: null }),

  appendChunk: (chunk: string) => set((s) => ({ streamingContent: s.streamingContent + chunk })),

  finalizeAssistantMessage: () => {
    const { streamingContent, messages } = get();
    if (!streamingContent) {
      set({ isStreaming: false, streamingContent: "" });
      return;
    }
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: streamingContent,
      timestamp: Date.now(),
    };
    const updated = [...messages, msg];
    const maxMessages = MAX_TURNS * 2;
    set({
      messages:
        updated.length > maxMessages ? updated.slice(updated.length - maxMessages) : updated,
      isStreaming: false,
      streamingContent: "",
    });
  },

  stopGenerating: () => {
    // Finalize whatever content we have so far
    const { streamingContent, messages } = get();
    if (streamingContent) {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: streamingContent,
        timestamp: Date.now(),
      };
      set({
        messages: [...messages, msg],
        isStreaming: false,
        streamingContent: "",
      });
    } else {
      set({ isStreaming: false, streamingContent: "" });
    }
  },

  setError: (error: string | null) => set({ error, isStreaming: false }),

  clearChat: () =>
    set({
      messages: [],
      isStreaming: false,
      streamingContent: "",
      error: null,
      lastUserMessage: null,
    }),
}));
