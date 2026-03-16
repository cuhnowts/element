import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";

interface MiniCalendarProps {
  onDateSelect?: (date: Date | undefined) => void;
}

export function MiniCalendar({ onDateSelect }: MiniCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const handleSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  return (
    <div className="px-2">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleSelect}
        className="w-full"
      />
    </div>
  );
}
