import { useState, useEffect } from "react";
import { timeToPixelOffset } from "./calendarLayout";

export function useNowLine(gridStartMinutes: number): {
  nowMinutes: number;
  nowPixelOffset: number;
  isVisible: boolean;
} {
  const [nowMinutes, setNowMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  const nowPixelOffset = timeToPixelOffset(nowMinutes, gridStartMinutes);
  const isVisible = nowMinutes >= gridStartMinutes;

  return { nowMinutes, nowPixelOffset, isVisible };
}
