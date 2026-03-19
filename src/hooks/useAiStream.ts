import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useStore } from "../stores";
import type { TaskScaffold } from "../types/ai";

export function useAiStream() {
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const setPendingSuggestions = useStore((s) => s.setPendingSuggestions);
  const setAiError = useStore((s) => s.setAiError);

  useEffect(() => {
    const unlisten1 = listen<TaskScaffold>("ai-stream-complete", (event) => {
      setPendingSuggestions(event.payload);
      setIsGenerating(false);
    });
    const unlisten2 = listen<string>("ai-stream-error", (event) => {
      setAiError(event.payload);
    });
    return () => {
      unlisten1.then((f) => f());
      unlisten2.then((f) => f());
    };
  }, [setIsGenerating, setPendingSuggestions, setAiError]);
}
