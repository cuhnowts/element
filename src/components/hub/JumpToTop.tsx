import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface JumpToTopProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function JumpToTop({ scrollRef, sentinelRef }: JumpToTopProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting), {
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelRef]);

  if (!show) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      className="fixed bottom-20 right-6 z-40 rounded-full shadow-lg"
      onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
    >
      <ChevronUp className="h-4 w-4" />
    </Button>
  );
}
