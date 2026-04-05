import cronstrue from "cronstrue";
import { useEffect, useMemo, useState } from "react";
import { getNextRunTimes } from "@/lib/tauri-commands";

interface CronPreviewProps {
  cronExpression: string;
}

export function CronPreview({ cronExpression }: CronPreviewProps) {
  const [nextTimes, setNextTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const description = useMemo(() => {
    if (!cronExpression) return null;
    try {
      return cronstrue.toString(cronExpression);
    } catch {
      return null;
    }
  }, [cronExpression]);

  useEffect(() => {
    if (!cronExpression) {
      setNextTimes([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getNextRunTimes(cronExpression, 3)
      .then((times) => {
        if (!cancelled) {
          setNextTimes(times);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setNextTimes([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cronExpression]);

  if (!cronExpression) {
    return (
      <div className="text-sm text-muted-foreground">
        <p className="font-medium">No schedule set</p>
        <p className="text-xs mt-1">Toggle Recurring to schedule automatic runs.</p>
      </div>
    );
  }

  if (error || (!loading && !description)) {
    return (
      <div className="text-sm text-destructive">
        Invalid cron expression. Use format: minute hour day month weekday.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Next runs:</p>
        {loading ? (
          <p>Calculating...</p>
        ) : (
          <ul className="space-y-0.5">
            {nextTimes.map((time) => (
              <li key={time}>{new Date(time).toLocaleString()}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
