import { useRef } from "react";
import { ActionButtons } from "@/components/hub/ActionButtons";
import { BriefingGreeting } from "@/components/hub/BriefingGreeting";
import { DayPulse } from "@/components/hub/DayPulse";
import { HubChat } from "@/components/hub/HubChat";
import { JumpToTop } from "@/components/hub/JumpToTop";

export function CommandHub() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <BriefingGreeting />
        <DayPulse />
        <ActionButtons />
        {/* Sentinel for jump-to-top visibility */}
        <div ref={sentinelRef} className="h-0" />
        <div className="mt-12">
          <HubChat />
        </div>
      </div>
      <JumpToTop scrollRef={scrollRef} sentinelRef={sentinelRef} />
    </div>
  );
}
