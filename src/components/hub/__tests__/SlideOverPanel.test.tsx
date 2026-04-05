import { render, screen } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { SlideOverPanel } from "../SlideOverPanel";

describe("useWorkspaceStore hub panel toggles", () => {
  beforeEach(() => {
    // Reset store to defaults
    act(() => {
      useWorkspaceStore.setState({
        hubCalendarOpen: false,
        hubGoalsOpen: false,
      });
    });
  });

  it("has hubCalendarOpen defaulting to false", () => {
    expect(useWorkspaceStore.getState().hubCalendarOpen).toBe(false);
  });

  it("has hubGoalsOpen defaulting to false", () => {
    expect(useWorkspaceStore.getState().hubGoalsOpen).toBe(false);
  });

  it("toggleHubCalendar flips hubCalendarOpen", () => {
    act(() => {
      useWorkspaceStore.getState().toggleHubCalendar();
    });
    expect(useWorkspaceStore.getState().hubCalendarOpen).toBe(true);

    act(() => {
      useWorkspaceStore.getState().toggleHubCalendar();
    });
    expect(useWorkspaceStore.getState().hubCalendarOpen).toBe(false);
  });

  it("toggleHubGoals flips hubGoalsOpen", () => {
    act(() => {
      useWorkspaceStore.getState().toggleHubGoals();
    });
    expect(useWorkspaceStore.getState().hubGoalsOpen).toBe(true);

    act(() => {
      useWorkspaceStore.getState().toggleHubGoals();
    });
    expect(useWorkspaceStore.getState().hubGoalsOpen).toBe(false);
  });
});

describe("SlideOverPanel", () => {
  it('with side="left" and open=false has class "-translate-x-full"', () => {
    const { container } = render(
      <SlideOverPanel side="left" open={false}>
        <div>Content</div>
      </SlideOverPanel>,
    );
    // biome-ignore lint/style/noNonNullAssertion: value guaranteed non-null in this context
    const panel = container.firstElementChild!;
    expect(panel.className).toContain("-translate-x-full");
  });

  it('with side="left" and open=true has class "translate-x-0"', () => {
    const { container } = render(
      <SlideOverPanel side="left" open={true}>
        <div>Content</div>
      </SlideOverPanel>,
    );
    // biome-ignore lint/style/noNonNullAssertion: value guaranteed non-null in this context
    const panel = container.firstElementChild!;
    expect(panel.className).toContain("translate-x-0");
  });

  it('with side="right" and open=false has class "translate-x-full"', () => {
    const { container } = render(
      <SlideOverPanel side="right" open={false}>
        <div>Content</div>
      </SlideOverPanel>,
    );
    // biome-ignore lint/style/noNonNullAssertion: value guaranteed non-null in this context
    const panel = container.firstElementChild!;
    // Should have translate-x-full but NOT -translate-x-full
    expect(panel.className).toContain("translate-x-full");
    expect(panel.className).not.toContain("-translate-x-full");
  });

  it('with side="right" and open=true has class "translate-x-0"', () => {
    const { container } = render(
      <SlideOverPanel side="right" open={true}>
        <div>Content</div>
      </SlideOverPanel>,
    );
    // biome-ignore lint/style/noNonNullAssertion: value guaranteed non-null in this context
    const panel = container.firstElementChild!;
    expect(panel.className).toContain("translate-x-0");
  });

  it('has "transition-transform" and "duration-200" classes', () => {
    const { container } = render(
      <SlideOverPanel side="left" open={false}>
        <div>Content</div>
      </SlideOverPanel>,
    );
    // biome-ignore lint/style/noNonNullAssertion: value guaranteed non-null in this context
    const panel = container.firstElementChild!;
    expect(panel.className).toContain("transition-transform");
    expect(panel.className).toContain("duration-200");
  });

  it("renders children", () => {
    render(
      <SlideOverPanel side="left" open={true}>
        <div data-testid="child">Hello</div>
      </SlideOverPanel>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
