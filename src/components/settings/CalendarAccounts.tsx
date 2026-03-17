import { useEffect, useState } from "react";
import { RefreshCw, Unlink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores";

const CALENDAR_COLORS = [
  "var(--chart-2)", // teal (Account 1)
  "var(--chart-4)", // amber (Account 2)
  "var(--chart-1)", // orange (Account 3)
  "var(--chart-5)", // gold (Account 4+)
];

function getCalendarColor(colorIndex: number): string {
  return CALENDAR_COLORS[Math.min(colorIndex, CALENDAR_COLORS.length - 1)];
}

function relativeTime(isoString: string | null): string {
  if (!isoString) return "Never synced";
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export function CalendarAccounts() {
  const calendarAccounts = useStore((s) => s.calendarAccounts);
  const calendarSyncing = useStore((s) => s.calendarSyncing);
  const calendarError = useStore((s) => s.calendarError);
  const fetchCalendarAccounts = useStore((s) => s.fetchCalendarAccounts);
  const connectGoogleCalendar = useStore((s) => s.connectGoogleCalendar);
  const connectOutlookCalendar = useStore((s) => s.connectOutlookCalendar);
  const syncCalendar = useStore((s) => s.syncCalendar);
  const disconnectCalendar = useStore((s) => s.disconnectCalendar);

  const [disconnectTarget, setDisconnectTarget] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  useEffect(() => {
    fetchCalendarAccounts();
  }, [fetchCalendarAccounts]);

  const handleSync = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
      await syncCalendar(accountId);
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    await disconnectCalendar(disconnectTarget.id);
    setDisconnectTarget(null);
  };

  // Empty state
  if (calendarAccounts.length === 0 && !calendarSyncing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-semibold">No calendars connected</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Connect a Google or Outlook calendar to see your events in Element.
        </p>

        {calendarError && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            Calendar connection failed. Check your internet connection and try
            again.
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={connectGoogleCalendar}
            disabled={calendarSyncing}
          >
            {calendarSyncing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Connect Google Calendar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={connectOutlookCalendar}
            disabled={calendarSyncing}
          >
            {calendarSyncing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 24H0V8.8l11.4-2.6V24zM24 24H12.6V6L24 3.6V24zM11.4 5.8L0 8V.6L11.4 0v5.8zM24 3.2L12.6 5.6V0L24 0v3.2z" />
                </svg>
                Connect Outlook Calendar
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected accounts */}
      <div className="space-y-2">
        {calendarAccounts.map((account) => (
          <div
            key={account.id}
            className="group flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors hover:bg-muted"
          >
            {/* Color dot */}
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: getCalendarColor(account.colorIndex) }}
            />

            {/* Provider icon */}
            {account.provider === "google" ? (
              <svg className="size-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            ) : (
              <svg className="size-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.4 24H0V8.8l11.4-2.6V24zM24 24H12.6V6L24 3.6V24zM11.4 5.8L0 8V.6L11.4 0v5.8zM24 3.2L12.6 5.6V0L24 0v3.2z" />
              </svg>
            )}

            {/* Account info */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{account.email}</p>
              <p className="text-xs text-muted-foreground">
                {syncingAccountId === account.id
                  ? "Syncing..."
                  : `Last synced ${relativeTime(account.lastSyncedAt)}`}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Refresh calendar sync"
                onClick={() => handleSync(account.id)}
                disabled={syncingAccountId === account.id}
              >
                <RefreshCw
                  className={`size-4 ${syncingAccountId === account.id ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive-foreground hover:text-destructive"
                aria-label="Disconnect calendar account"
                onClick={() =>
                  setDisconnectTarget({
                    id: account.id,
                    email: account.email,
                  })
                }
              >
                <Unlink className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Error state */}
      {calendarError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {calendarError.includes("sync")
            ? "Couldn't sync calendar. Will retry automatically in 5 minutes."
            : "Calendar connection failed. Check your internet connection and try again."}
        </div>
      )}

      {/* Connect more buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={connectGoogleCalendar}
          disabled={calendarSyncing}
        >
          {calendarSyncing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect Google Calendar"
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={connectOutlookCalendar}
          disabled={calendarSyncing}
        >
          {calendarSyncing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect Outlook Calendar"
          )}
        </Button>
      </div>

      {/* Disconnect confirmation dialog */}
      {disconnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Disconnect Calendar</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will remove the connection to {disconnectTarget.email}.
              Calendar events from this account will no longer appear in
              Element.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDisconnectTarget(null)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
