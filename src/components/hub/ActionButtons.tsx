import { CalendarDays, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  { label: "Run Daily Briefing", icon: Sparkles, id: "briefing" },
  { label: "Organize Calendar", icon: CalendarDays, id: "calendar" },
  { label: "Organize Goals", icon: Target, id: "goals" },
] as const;

export function ActionButtons() {
  const handleAction = (id: string) => {
    // Phase 32: placeholder -- future milestone wires to real skill commands
    console.log(`Action triggered: ${id}`);
  };

  return (
    <div className="flex flex-wrap gap-2 mt-6">
      {ACTIONS.map((action) => (
        <Button key={action.id} variant="outline" size="sm" onClick={() => handleAction(action.id)}>
          <action.icon className="mr-1.5 h-4 w-4" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
