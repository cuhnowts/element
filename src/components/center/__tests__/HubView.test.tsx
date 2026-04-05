import { render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { HubView } from "../HubView";

// Mock Tauri invoke to prevent runtime errors
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock heavy child components to isolate HubView layout testing
vi.mock("@/components/hub/HubToolbar", () => ({
  HubToolbar: () => <div data-testid="hub-toolbar">HubToolbar</div>,
}));

vi.mock("@/components/hub/CommandHub", () => ({
  CommandHub: () => <div data-testid="command-hub">CommandHub</div>,
}));

vi.mock("@/components/hub/calendar/HubCalendar", () => ({
  HubCalendar: () => <div data-testid="hub-calendar">HubCalendar</div>,
}));

vi.mock("@/components/hub/GoalsTreePanel", () => ({
  GoalsTreePanel: () => <div data-testid="goals-tree-panel">GoalsTreePanel</div>,
}));

describe("HubView", () => {
  beforeEach(() => {
    act(() => {
      useWorkspaceStore.setState({
        hubCalendarOpen: false,
        hubGoalsOpen: false,
      });
    });
  });

  it("renders HubToolbar", () => {
    render(<HubView />);
    expect(screen.getByTestId("hub-toolbar")).toBeInTheDocument();
  });

  it("renders CommandHub center content", () => {
    render(<HubView />);
    expect(screen.getByTestId("command-hub")).toBeInTheDocument();
  });

  it("does not render ResizablePanelGroup", () => {
    const { container } = render(<HubView />);
    // ResizablePanelGroup renders with data-panel-group attribute
    expect(container.querySelector("[data-panel-group]")).toBeNull();
  });

  it("renders calendar SlideOverPanel on left side", () => {
    render(<HubView />);
    expect(screen.getByTestId("hub-calendar")).toBeInTheDocument();
  });

  it("renders goals SlideOverPanel on right side", () => {
    render(<HubView />);
    expect(screen.getByTestId("goals-tree-panel")).toBeInTheDocument();
  });

  it("center view is full-width with overflow-hidden on outer container", () => {
    const { container } = render(<HubView />);
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.className).toContain("overflow-hidden");
    expect(outerDiv.className).toContain("h-full");
  });
});
