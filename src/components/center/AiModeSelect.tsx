import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface AiModeSelectProps {
  value: string;
  onChange: (mode: string) => void;
}

const AI_MODES = [
  { value: "on-demand", label: "On-demand" },
  { value: "track-suggest", label: "Track + Suggest" },
  { value: "track-auto-execute", label: "Track + Auto-execute" },
] as const;

export function AiModeSelect({ value, onChange }: AiModeSelectProps) {
  return (
    <Select value={value} onValueChange={(val) => { if (val !== null) onChange(val); }}>
      <SelectTrigger className="w-[180px]" aria-label="AI assistance mode">
        <SelectValue placeholder="AI Mode" />
      </SelectTrigger>
      <SelectContent>
        {AI_MODES.map((mode) => (
          <SelectItem key={mode.value} value={mode.value}>
            {mode.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
