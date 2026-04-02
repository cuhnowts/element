import { BriefingPanel } from "@/components/hub/BriefingPanel";
import { HubChat } from "@/components/hub/HubChat";

export function HubCenterPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0">
        <BriefingPanel />
      </div>
      <div className="min-h-0 flex-1">
        <HubChat />
      </div>
    </div>
  );
}
