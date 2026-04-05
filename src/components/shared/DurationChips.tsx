import { useState } from "react";

interface DurationChipsProps {
  value: number | null;
  onChange: (minutes: number | null) => void;
}

const PRESETS = [
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
  { label: "4h", value: 240 },
];

export function DurationChips({ value, onChange }: DurationChipsProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const isCustomActive = value !== null && !PRESETS.some((p) => p.value === value);

  const handlePresetClick = (preset: number) => {
    if (value === preset) {
      onChange(null);
    } else {
      onChange(preset);
      setShowCustomInput(false);
    }
  };

  const handleCustomClick = () => {
    if (isCustomActive) {
      onChange(null);
      setShowCustomInput(false);
    } else {
      setShowCustomInput(true);
    }
  };

  const handleCustomSubmit = () => {
    const parsed = parseInt(customValue, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 480) {
      onChange(parsed);
    }
    setShowCustomInput(false);
  };

  const inactiveStyle =
    "bg-secondary border border-border text-foreground text-xs font-semibold min-w-[40px] h-8 px-2 rounded-md cursor-pointer transition-colors";
  const activeStyle =
    "bg-primary text-primary-foreground text-xs font-semibold min-w-[40px] h-8 px-2 rounded-md cursor-pointer transition-colors";

  return (
    <div role="radiogroup" aria-label="Duration estimate" className="flex gap-1">
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          role="radio"
          aria-checked={value === preset.value}
          onClick={() => handlePresetClick(preset.value)}
          className={value === preset.value ? activeStyle : inactiveStyle}
        >
          {preset.label}
        </button>
      ))}
      <button
        type="button"
        role="radio"
        aria-checked={isCustomActive}
        onClick={handleCustomClick}
        className={isCustomActive ? activeStyle : inactiveStyle}
      >
        {isCustomActive ? `${value}m` : "Custom"}
      </button>
      {showCustomInput && (
        <input
          type="number"
          min="1"
          max="480"
          placeholder="min"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCustomSubmit();
          }}
          onBlur={handleCustomSubmit}
          className="h-8 w-16 rounded-md border border-border bg-secondary px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}
    </div>
  );
}
