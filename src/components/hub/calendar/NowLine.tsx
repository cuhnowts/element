import { WORK_BLOCK_COLOR } from "./calendarTypes";

interface NowLineProps {
  pixelOffset: number;
}

export function NowLine({ pixelOffset }: NowLineProps) {
  return (
    <div
      aria-hidden="true"
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top: pixelOffset }}
    >
      <div className="relative flex items-center">
        <div
          className="absolute rounded-full shrink-0"
          style={{
            width: 8,
            height: 8,
            left: -4,
            backgroundColor: WORK_BLOCK_COLOR,
          }}
        />
        <div
          className="w-full"
          style={{
            height: 2,
            backgroundColor: WORK_BLOCK_COLOR,
          }}
        />
      </div>
    </div>
  );
}
