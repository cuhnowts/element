import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PlanningTier = "quick" | "medium" | "full";

const TIERS = [
  {
    value: "quick" as const,
    label: "Quick",
    description: "A simple task list. Best for small projects or quick todos.",
  },
  {
    value: "medium" as const,
    label: "Medium",
    description: "AI asks a few questions, then builds phases and tasks for your review.",
  },
  {
    value: "full" as const,
    label: "GSD",
    description: "Full GSD workflow with phases, plans, and .planning/ directory.",
  },
];

interface TierSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tier: PlanningTier, description: string) => Promise<void>;
  defaultTier?: PlanningTier;
  defaultDescription?: string;
  isChangingTier?: boolean;
}

export function TierSelectionDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultTier,
  defaultDescription,
  isChangingTier,
}: TierSelectionDialogProps) {
  const [selectedTier, setSelectedTier] = useState<PlanningTier | null>(defaultTier ?? null);
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showWarning, setShowWarning] = useState(!!isChangingTier);

  // Reset state when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedTier(defaultTier ?? null);
      setDescription(defaultDescription ?? "");
      setIsSubmitting(false);
      setShowValidation(false);
      setShowWarning(!!isChangingTier);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!selectedTier) return;

    if (selectedTier === "quick" && !description.trim()) {
      setShowValidation(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(selectedTier, description);
    } catch {
      setIsSubmitting(false);
    }
  };

  // Change plan warning dialog
  if (open && showWarning) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change planning approach?</DialogTitle>
            <DialogDescription>
              This project already has tasks. Changing the tier will not delete existing work, but
              new AI sessions will use the new approach.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Keep Current Plan
            </Button>
            <Button onClick={() => setShowWarning(false)}>Change Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How should we plan this?</DialogTitle>
          <DialogDescription>Choose a planning approach for this project.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {/* Tier radio group */}
          <div className="flex flex-col gap-4">
            {TIERS.map((tier) => {
              const isSelected = selectedTier === tier.value;
              return (
                <label
                  key={tier.value}
                  className={`flex items-start gap-2 rounded-lg p-3 cursor-pointer border ${
                    isSelected ? "border-primary bg-card" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="planning-tier"
                    value={tier.value}
                    checked={isSelected}
                    onChange={() => {
                      setSelectedTier(tier.value);
                      setShowValidation(false);
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                    }`}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{tier.label}</span>
                    <span className="text-sm text-muted-foreground">{tier.description}</span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Description textarea */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-description">What are you building?</Label>
            <Textarea
              id="project-description"
              rows={3}
              placeholder="Describe your project briefly..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (showValidation && e.target.value.trim()) setShowValidation(false);
              }}
            />
            {showValidation && (
              <p className="text-sm text-destructive">
                Describe what you're building so AI can create tasks.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!selectedTier || isSubmitting}>
            {isSubmitting ? "Starting..." : "Start Planning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
