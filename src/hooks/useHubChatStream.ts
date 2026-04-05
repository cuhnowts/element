import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { useHubChatStore } from "@/stores/useHubChatStore";

export function useHubChatStream() {
  const appendChunk = useHubChatStore((s) => s.appendChunk);
  const finalizeAssistantMessage = useHubChatStore((s) => s.finalizeAssistantMessage);
  const setError = useHubChatStore((s) => s.setError);

  useEffect(() => {
    const unlisten1 = listen<string>("hub-chat-stream-chunk", (event) => {
      appendChunk(event.payload);
    });

    const unlisten2 = listen("hub-chat-stream-done", () => {
      finalizeAssistantMessage();
    });

    const unlisten3 = listen<string>("hub-chat-stream-error", (event) => {
      setError(event.payload);
    });

    return () => {
      unlisten1.then((f) => f());
      unlisten2.then((f) => f());
      unlisten3.then((f) => f());
    };
  }, [appendChunk, finalizeAssistantMessage, setError]);
}
