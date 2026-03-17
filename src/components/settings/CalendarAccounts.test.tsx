import { describe, it } from "vitest";

describe("CalendarAccounts", () => {
  describe("empty state", () => {
    it.todo("renders 'No calendars connected' heading when no accounts");
    it.todo("renders Connect Google Calendar button");
    it.todo("renders Connect Outlook Calendar button");
  });

  describe("connected accounts", () => {
    it.todo("renders account email and provider icon for each account");
    it.todo("shows color-coded dot matching account colorIndex");
    it.todo("shows 'Last synced' relative time label");
    it.todo("shows manual refresh button for each account");
    it.todo("shows disconnect button for each account");
  });

  describe("OAuth flow", () => {
    it.todo("shows 'Connecting...' and spinner during OAuth");
    it.todo("disables connect button during OAuth");
    it.todo("shows error toast on OAuth failure");
  });

  describe("sync", () => {
    it.todo("calls syncCalendar when refresh button clicked");
    it.todo("shows 'Syncing...' with spinner during sync");
  });

  describe("disconnect", () => {
    it.todo("shows confirmation dialog when disconnect clicked");
    it.todo("calls disconnectCalendar when confirmed");
    it.todo("shows correct warning text with account email");
  });
});
