import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores";

interface AiAssistButtonProps {
  taskId: string;
}

export function AiAssistButton({ taskId }: AiAssistButtonProps) {
  const hasDefaultProvider = useStore((s) => s.hasDefaultProvider);
  const isGenerating = useStore((s) => s.isGenerating);
  const requestAiAssist = useStore((s) => s.requestAiAssist);

  if (!hasDefaultProvider()) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="min-h-8 min-w-8"
      aria-label="AI Assist"
      onClick={() => requestAiAssist(taskId)}
      disabled={isGenerating}
    >
      <Sparkles
        className={`size-4 ${isGenerating ? "animate-spin" : ""}`}
      />
    </Button>
  );
}
