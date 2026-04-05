import { useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/stores";
import type { WorkHoursConfig } from "@/types/scheduling";

const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const DEFAULT_CONFIG: WorkHoursConfig = {
  startTime: "09:00",
  endTime: "17:00",
  workDays: ["mon", "tue", "wed", "thu", "fri"],
  bufferMinutes: 10,
  minBlockMinutes: 30,
};

function generateTimeOptions(
  startHour: number,
  endHour: number,
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (const m of [0, 30]) {
      if (h === endHour && m === 30) break;
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      options.push({ value, label: value });
    }
  }
  return options;
}

const START_TIME_OPTIONS = generateTimeOptions(5, 12);
const END_TIME_OPTIONS = generateTimeOptions(12, 23);

export function ScheduleSettings() {
  const workHours = useStore((s) => s.workHours);
  const loadWorkHours = useStore((s) => s.loadWorkHours);
  const saveWorkHoursAction = useStore((s) => s.saveWorkHours);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadWorkHours();
  }, [loadWorkHours]);

  const config = workHours ?? DEFAULT_CONFIG;

  const save = useCallback(
    (next: WorkHoursConfig) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveWorkHoursAction(next);
      }, 500);
    },
    [saveWorkHoursAction],
  );

  const toggleDay = (day: string) => {
    const next = config.workDays.includes(day)
      ? config.workDays.filter((d) => d !== day)
      : [...config.workDays, day];
    save({ ...config, workDays: next });
  };

  const setStartTime = (val: string | null) => {
    if (val) save({ ...config, startTime: val });
  };

  const setEndTime = (val: string | null) => {
    if (val) save({ ...config, endTime: val });
  };

  const setBuffer = (val: number) => {
    const clamped = Math.max(0, Math.min(30, val));
    save({ ...config, bufferMinutes: clamped });
  };

  const setMinBlock = (val: number) => {
    const clamped = Math.max(15, Math.min(120, val));
    save({ ...config, minBlockMinutes: clamped });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Work Hours</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set your working hours to help Element find open time blocks for focused work.
        </p>
      </div>

      {/* Work days */}
      <div className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Work Days
        </span>
        <div className="flex flex-wrap gap-4">
          {DAYS.map((day) => (
            <div key={day.key} className="flex items-center gap-2">
              <Switch
                checked={config.workDays.includes(day.key)}
                onCheckedChange={() => toggleDay(day.key)}
              />
              <span className="text-sm">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Start time */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Start time
        </span>
        <Select value={config.startTime} onValueChange={setStartTime}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {START_TIME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* End time */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          End time
        </span>
        <Select value={config.endTime} onValueChange={setEndTime}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {END_TIME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Buffer time */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Buffer between meetings and work blocks
        </span>
        <p className="text-xs text-muted-foreground">
          Minutes of breathing room between meetings and work blocks
        </p>
        <Input
          type="number"
          min={0}
          max={30}
          step={5}
          value={config.bufferMinutes}
          onChange={(e) => setBuffer(Number(e.target.value))}
          className="w-24"
        />
      </div>

      {/* Minimum block size */}
      <div className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Minimum useful block size
        </span>
        <Input
          type="number"
          min={15}
          max={120}
          step={15}
          value={config.minBlockMinutes}
          onChange={(e) => setMinBlock(Number(e.target.value))}
          className="w-24"
        />
      </div>
    </div>
  );
}
