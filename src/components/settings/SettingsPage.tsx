import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores";
import { SettingsNav } from "./SettingsNav";
import { PluginList } from "./PluginList";
import { CredentialVault } from "./CredentialVault";
import { CalendarAccounts } from "./CalendarAccounts";
import { ScheduleSettings } from "./ScheduleSettings";
import { AiSettings } from "./AiSettings";

const tabHeadings: Record<string, string> = {
  plugins: "Plugins",
  credentials: "Credentials",
  calendars: "Calendars",
  schedule: "Schedule",
  ai: "AI",
};

export function SettingsPage() {
  const settingsTab = useStore((s) => s.settingsTab);
  const closeSettings = useStore((s) => s.closeSettings);
  const openSettings = useStore((s) => s.openSettings);

  // Escape key closes settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSettings();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSettings]);

  // Cmd+, opens settings (for global use)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === ",") {
        e.preventDefault();
        openSettings();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSettings]);

  const handleTabChange = (tab: typeof settingsTab) => {
    openSettings(tab);
  };

  const renderContent = () => {
    switch (settingsTab) {
      case "plugins":
        return <PluginList />;
      case "credentials":
        return <CredentialVault />;
      case "calendars":
        return <CalendarAccounts />;
      case "schedule":
        return <ScheduleSettings />;
      case "ai":
        return <AiSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full">
      <SettingsNav activeTab={settingsTab} onTabChange={handleTabChange} />
      <div className="flex-1 overflow-auto p-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={closeSettings}
        >
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Back to Tasks
        </Button>
        <h1 className="mb-6 text-lg font-semibold">
          {tabHeadings[settingsTab]}
        </h1>
        {renderContent()}
      </div>
    </div>
  );
}
