import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { HubToolbar } from "../HubToolbar";

describe("HubToolbar", () => {
  beforeEach(() => {
    act(() => {
      useWorkspaceStore.setState({
        hubCalendarOpen: false,
        hubGoalsOpen: false,
      });
    });
  });

  it('renders a button with text "Calendar"', () => {
    render(<HubToolbar />);
    expect(screen.getByRole("button", { name: /calendar/i })).toBeInTheDocument();
  });

  it('renders a button with text "Goals"', () => {
    render(<HubToolbar />);
    expect(screen.getByRole("button", { name: /goals/i })).toBeInTheDocument();
  });

  it('Calendar button uses variant="ghost" when hubCalendarOpen is false', () => {
    render(<HubToolbar />);
    const btn = screen.getByRole("button", { name: /calendar/i });
    // ghost variant in shadcn does NOT have data-slot="button" with default styling;
    // we check that it does NOT have the default variant's primary bg class
    // shadcn Button with variant="ghost" gets a specific set of classes
    expect(btn.className).not.toContain("bg-primary");
  });

  it('Calendar button uses variant="default" when hubCalendarOpen is true', () => {
    act(() => {
      useWorkspaceStore.setState({ hubCalendarOpen: true });
    });
    render(<HubToolbar />);
    const btn = screen.getByRole("button", { name: /calendar/i });
    expect(btn.className).toContain("bg-primary");
  });

  it('Goals button uses variant="ghost" when hubGoalsOpen is false', () => {
    render(<HubToolbar />);
    const btn = screen.getByRole("button", { name: /goals/i });
    expect(btn.className).not.toContain("bg-primary");
  });

  it('Goals button uses variant="default" when hubGoalsOpen is true', () => {
    act(() => {
      useWorkspaceStore.setState({ hubGoalsOpen: true });
    });
    render(<HubToolbar />);
    const btn = screen.getByRole("button", { name: /goals/i });
    expect(btn.className).toContain("bg-primary");
  });

  it("clicking Calendar button calls toggleHubCalendar", () => {
    render(<HubToolbar />);
    const btn = screen.getByRole("button", { name: /calendar/i });
    fireEvent.click(btn);
    expect(useWorkspaceStore.getState().hubCalendarOpen).toBe(true);
  });

  it("clicking Goals button calls toggleHubGoals", () => {
    render(<HubToolbar />);
    const btn = screen.getByRole("button", { name: /goals/i });
    fireEvent.click(btn);
    expect(useWorkspaceStore.getState().hubGoalsOpen).toBe(true);
  });
});
