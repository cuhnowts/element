import { useEffect, useRef, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useBriefingStore } from "@/stores/useBriefingStore";
import { useBriefingStream } from "@/hooks/useBriefingStream";
import { useStore } from "@/stores";
import { BriefingGreeting } from "./BriefingGreeting";
import { ActionChipBar } from "./ActionChipBar";
import { BriefingSummaryCard } from "./BriefingSummaryCard";
import { BriefingProjectCard } from "./BriefingProjectCard";
import { HubChat } from "./HubChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

export function HubCenterPanel() {
  // Wire up briefing event listeners
  useBriefingStream();

  // Individual selectors for stability (never destructure objects from Zustand)
  const briefingData = useBriefingStore((s) => s.briefingData);
  const briefingStatus = useBriefingStore((s) => s.briefingStatus);
  const briefingError = useBriefingStore((s) => s.briefingError);
  const contextSummary = useBriefingStore((s) => s.contextSummary);
  const requestBriefing = useBriefingStore((s) => s.requestBriefing);
  const setContextSummary = useBriefingStore((s) => s.setContextSummary);

  const selectProject = useStore((s) => s.selectProject);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Fetch contextual summary on mount (template-based, no LLM call)
  useEffect(() => {
    invoke<string>("generate_context_summary")
      .then((summary) => setContextSummary(summary))
      .catch(() => {
        // Context summary is non-critical; fail silently
      });
  }, [setContextSummary]);

  // Scroll listener for back-to-top button
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const handleScroll = () => {
      setShowBackToTop(scrollEl.scrollTop > 200);
    };
    scrollEl.addEventListener("scroll", handleScroll);
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, []);

  const onRunBriefing = useCallback(() => {
    requestBriefing();
    invoke("build_context_manifest")
      .then(() => invoke("generate_briefing"))
      .catch(() => {
        useBriefingStore
          .getState()
          .failBriefing(
            "Briefing could not be generated. Check your AI provider settings and try again.",
          );
      });
  }, [requestBriefing]);

  const handleProjectNavigate = useCallback(
    (projectId: number) => {
      selectProject(String(projectId));
    },
    [selectProject],
  );

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isGenerating =
    briefingStatus === "loading" || briefingStatus === "streaming";

  return (
    <div className="flex h-full flex-col">
      {/* Fixed greeting area */}
      <div className="shrink-0 px-6 pt-12">
        <BriefingGreeting summary={contextSummary} />
        <div className="mt-6">
          <ActionChipBar
            onRunBriefing={onRunBriefing}
            isGenerating={isGenerating}
          />
        </div>
      </div>

      {/* Scrollable area */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {/* Briefing region */}
        <div
          role="region"
          aria-label="Daily briefing"
          aria-live="polite"
        >
          {/* Loading skeleton */}
          {briefingStatus === "loading" && (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-4/5 rounded bg-muted" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Briefing cards */}
          {briefingData && (
            <div className="flex flex-col gap-4">
              <BriefingSummaryCard summary={briefingData.summary} />
              {briefingData.projects.map((project, i) => (
                <BriefingProjectCard
                  key={project.projectId ?? i}
                  project={project}
                  onNavigate={handleProjectNavigate}
                />
              ))}
            </div>
          )}

          {/* Error state */}
          {briefingStatus === "error" && (
            <div className="rounded-lg border border-destructive bg-card px-3 py-2 text-sm text-destructive">
              {briefingError ||
                "Briefing could not be generated. Check your AI provider settings and try again."}
            </div>
          )}
        </div>

        {/* Chat below briefing */}
        <div className={briefingData ? "mt-6" : ""}>
          <HubChat />
        </div>
      </div>

      {/* Back-to-top button */}
      {showBackToTop && (
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full fixed bottom-20 right-6"
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
