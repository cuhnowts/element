import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BriefingSummaryCard } from "../BriefingSummaryCard";

describe("BriefingSummaryCard", () => {
  // BRIEF-03: Summary card with overview
  it("renders 'Today's Overview' heading", () => {
    render(<BriefingSummaryCard summary="Test summary" />);
    expect(screen.getByText("Today's Overview")).toBeInTheDocument();
  });

  it("renders summary text from prop", () => {
    render(<BriefingSummaryCard summary="Packed day -- most of your time is spoken for." />);
    expect(screen.getByText("Packed day -- most of your time is spoken for.")).toBeInTheDocument();
  });

  it("has aria-label 'Briefing summary'", () => {
    render(<BriefingSummaryCard summary="Test" />);
    expect(screen.getByLabelText("Briefing summary")).toBeInTheDocument();
  });
});
