import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useBriefingStore } from "@/stores/useBriefingStore";

export function BriefingContent() {
  const content = useBriefingStore((s) => s.briefingContent);
  const status = useBriefingStore((s) => s.briefingStatus);

  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      {status === "streaming" && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-1"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
