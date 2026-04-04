import { Puzzle, KeyRound, Calendar, Clock, Sparkles, HeartPulse } from "lucide-react";
import type { SettingsTab } from "@/lib/types";

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "plugins", label: "Plugins", icon: <Puzzle className="size-4" /> },
  {
    id: "credentials",
    label: "Credentials",
    icon: <KeyRound className="size-4" />,
  },
  {
    id: "calendars",
    label: "Calendars",
    icon: <Calendar className="size-4" />,
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: <Clock className="size-4" />,
  },
  {
    id: "ai",
    label: "AI",
    icon: <Sparkles className="size-4" />,
  },
  {
    id: "heartbeat",
    label: "Heartbeat",
    icon: <HeartPulse className="size-4" />,
  },
];

interface SettingsNavProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export function SettingsNav({ activeTab, onTabChange }: SettingsNavProps) {
  return (
    <nav className="w-[200px] flex-shrink-0 border-r border-border p-4">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        SETTINGS
      </h2>
      <div className="flex flex-col gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-100 ${
              activeTab === tab.id
                ? "border-l-2 border-primary bg-muted font-medium text-foreground"
                : "border-l-2 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
