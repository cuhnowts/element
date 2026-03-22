import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores";
import { THEME_COLORS } from "@/lib/types";
import type { Theme } from "@/lib/types";

interface CreateThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTheme?: Theme | null;
}

export function CreateThemeDialog({
  open,
  onOpenChange,
  editTheme,
}: CreateThemeDialogProps) {
  const createTheme = useStore((s) => s.createTheme);
  const updateTheme = useStore((s) => s.updateTheme);

  const [name, setName] = useState(editTheme?.name ?? "");
  const [color, setColor] = useState(editTheme?.color ?? THEME_COLORS[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(editTheme?.name ?? "");
      setColor(editTheme?.color ?? THEME_COLORS[0]);
      setError("");
    }
  }, [open, editTheme]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Theme name is required");
      return;
    }
    if (editTheme) {
      await updateTheme(editTheme.id, trimmed, color);
    } else {
      await createTheme(trimmed, color);
    }
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editTheme ? "Edit Theme" : "Create Theme"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Theme name</span>
            <Input
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Work, Personal, Side Projects"
            />
            {error && (
              <p className="text-sm text-destructive-foreground">{error}</p>
            )}
          </div>
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Color</span>
            <div className="flex flex-wrap gap-2">
              {THEME_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-colors ${
                    color === hex ? "border-primary" : "border-transparent"
                  }`}
                  style={{ backgroundColor: hex }}
                  onClick={() => setColor(hex)}
                  aria-label={`Select color ${hex}`}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editTheme ? "Update Theme" : "Create Theme"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
