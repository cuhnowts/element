import { Pencil, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/tauri";
import { useStore } from "@/stores";

interface GoalHeroCardProps {
  projectId: string;
  goal: string;
}

export function GoalHeroCard({ projectId, goal }: GoalHeroCardProps) {
  const [localGoal, setLocalGoal] = useState(goal);
  const [isEditing, setIsEditing] = useState(false);
  const goalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync localGoal from prop when projectId changes
  useEffect(() => {
    setLocalGoal(goal);
  }, [goal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (goalTimer.current) clearTimeout(goalTimer.current);
    };
  }, []);

  const handleGoalSave = (value: string) => {
    if (goalTimer.current) clearTimeout(goalTimer.current);
    goalTimer.current = setTimeout(async () => {
      await api.updateProjectGoal(projectId, value);
      await useStore.getState().loadProjects();
    }, 800);
  };

  const handleBlur = () => {
    setIsEditing(false);
    handleGoalSave(localGoal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setLocalGoal(goal);
      setIsEditing(false);
    }
  };

  const enterEditMode = () => {
    setIsEditing(true);
  };

  const isEmpty = !localGoal;

  return (
    <Card className="group p-4" role="region" aria-label="Project goal">
      <div className="flex items-center gap-3">
        <Target size={16} className="text-muted-foreground shrink-0" />

        {isEditing ? (
          <Input
            autoFocus
            value={localGoal}
            onChange={(e) => setLocalGoal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            aria-label="Project goal"
            className="flex-1 text-base border-none shadow-none px-0 focus-visible:ring-0 bg-transparent"
            placeholder="Set a project goal..."
          />
        ) : isEmpty ? (
          // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: interactive element with click handler
          <span
            className="flex-1 text-base text-muted-foreground cursor-pointer"
            onClick={enterEditMode}
          >
            Set a project goal...
          </span>
        ) : (
          <span className="flex-1 text-base text-foreground">{localGoal}</span>
        )}

        {!isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Edit goal"
            onClick={enterEditMode}
          >
            <Pencil size={14} />
          </Button>
        )}
      </div>
    </Card>
  );
}
