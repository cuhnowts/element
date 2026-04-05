import { addDays, addMonths, format, nextMonday } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerPopoverProps {
  value: string | null;
  onChange: (date: string | null) => void;
}

function formatDisplay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function DatePickerPopover({ value, onChange }: DatePickerPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date) => {
    onChange(format(date, "yyyy-MM-dd"));
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
  };

  const shortcuts = [
    { label: "Today", date: () => new Date() },
    { label: "Tomorrow", date: () => addDays(new Date(), 1) },
    { label: "Next week", date: () => nextMonday(new Date()) },
    { label: "+1 month", date: () => addMonths(new Date(), 1) },
  ];

  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Popover open={open} onOpenChange={(o) => setOpen(o)}>
      <PopoverTrigger
        render={
          <Button variant="ghost" className="h-8 px-2 text-xs gap-1.5">
            <CalendarDays className="size-4" />
            {value ? formatDisplay(value) : "+ Add due date"}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex gap-2 mb-3">
          {shortcuts.map((s) => (
            <Button
              key={s.label}
              variant="outline"
              className="h-12 text-xs font-semibold"
              onClick={() => handleSelect(s.date())}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(day) => {
            if (day) handleSelect(day);
          }}
        />
        {value && (
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
