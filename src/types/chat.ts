export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

/** Shape sent to the Rust hub_chat_send command (matches Rust ChatMessage struct) */
export interface ChatMessagePayload {
  role: string;
  content: string;
}

export interface HubChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  lastUserMessage: string | null;

  // Actions
  addUserMessage: (content: string) => void;
  startStreaming: () => void;
  appendChunk: (chunk: string) => void;
  finalizeAssistantMessage: () => void;
  stopGenerating: () => void;
  setError: (error: string | null) => void;
  clearChat: () => void;
}
