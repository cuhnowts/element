import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useStore } from "@/stores";
import { THEME_COLORS } from "@/lib/types";

export function ThemeDetail() {
  const selectedThemeId = useStore((s) => s.selectedThemeId);
  const themes = useStore((s) => s.themes);
  const projects = useStore((s) => s.projects);
  const updateTheme = useStore((s) => s.updateTheme);

  const theme = themes.find((t) => t.id === selectedThemeId);

  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  useEffect(() => {
    if (theme) {
      setName(theme.name);
      setColor(theme.color);
    }
  }, [theme?.id, theme?.name, theme?.color]);

  if (!theme) return null;

  const handleNameBlur = async () => {
    if (name !== theme.name && name.trim()) {
      await updateTheme(theme.id, name.trim(), undefined);
    }
  };

  const handleColorChange = async (newColor: string) => {
    setColor(newColor);
    await updateTheme(theme.id, undefined, newColor);
  };

  const themeProjects = projects.filter((p) => p.themeId === theme.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
          Theme
        </span>
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="text-2xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 bg-transparent"
            placeholder="Theme name"
          />
        </div>
      </div>

      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-2">
          Color
        </span>
        <div className="flex flex-wrap gap-2">
          {THEME_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-colors ${
                color === hex ? "border-primary" : "border-transparent"
              }`}
              style={{ backgroundColor: hex }}
              onClick={() => handleColorChange(hex)}
              aria-label={`Select color ${hex}`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
            Projects
          </span>
          <span>{themeProjects.length}</span>
        </div>
        <div>
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
            Created
          </span>
          <span>
            {new Date(theme.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
