/**
 * ImagingTimelineView — Component Tests
 *
 * Tests timeline rendering, empty state, time-period grouping,
 * modality display, and event details.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImagingTimelineView } from "./ImagingTimelineView";
import {
  resetStore,
  setStoreState,
  mockAnalysisResult,
} from "../../test-utils";

beforeEach(() => {
  resetStore();
});

// ═══════════════════════════════════════════════════════════════
// 1. Empty state
// ═══════════════════════════════════════════════════════════════

describe("ImagingTimelineView — empty state", () => {
  it("shows placeholder when no analysis has been run", () => {
    render(<ImagingTimelineView />);
    expect(
      screen.getByText(/Click .Run Analysis. above to extract imaging events/)
    ).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(<ImagingTimelineView />);
    expect(screen.getByText("Imaging Timeline")).toBeInTheDocument();
  });

  it("does not show Export CSV button when no events", () => {
    render(<ImagingTimelineView />);
    expect(screen.queryByText("Export CSV")).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Timeline with events
// ═══════════════════════════════════════════════════════════════

describe("ImagingTimelineView — with events", () => {
  beforeEach(() => {
    setStoreState({ analysisResult: mockAnalysisResult });
  });

  it("renders all imaging events", () => {
    render(<ImagingTimelineView />);
    expect(
      screen.getByText("CT Abdomen/Pelvis with contrast")
    ).toBeInTheDocument();
    expect(
      screen.getByText("MRI Brain without contrast")
    ).toBeInTheDocument();
  });

  it("shows formatted event dates", () => {
    render(<ImagingTimelineView />);
    // formatDate outputs "Jan 15, 2025" format
    expect(screen.getByText(/Jan 15, 2025/)).toBeInTheDocument();
    expect(screen.getByText(/Jun 10, 2024/)).toBeInTheDocument();
  });

  it("displays modality badges", () => {
    render(<ImagingTimelineView />);
    expect(screen.getByText("CT Scan")).toBeInTheDocument();
    expect(screen.getByText("MRI")).toBeInTheDocument();
  });

  it("shows status for each event", () => {
    render(<ImagingTimelineView />);
    const completedLabels = screen.getAllByText("Completed");
    expect(completedLabels.length).toBe(2);
  });

  it("displays clinical indications", () => {
    render(<ImagingTimelineView />);
    expect(screen.getByText("Abdominal pain")).toBeInTheDocument();
    expect(screen.getByText("Headache")).toBeInTheDocument();
  });

  it("shows key findings when present", () => {
    render(<ImagingTimelineView />);
    expect(
      screen.getByText("Findings: No acute abnormality")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Findings: Normal study")
    ).toBeInTheDocument();
  });

  it("renders timeline dots with aria-labels", () => {
    render(<ImagingTimelineView />);
    expect(screen.getByLabelText("CT study")).toBeInTheDocument();
    expect(screen.getByLabelText("MRI study")).toBeInTheDocument();
  });

  it("applies correct modality colors to timeline dots", () => {
    render(<ImagingTimelineView />);
    const ctDot = screen.getByLabelText("CT study");
    expect(ctDot.style.backgroundColor).toBe("rgb(37, 99, 235)"); // #2563eb
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Time-period grouping
// ═══════════════════════════════════════════════════════════════

describe("ImagingTimelineView — time-period grouping", () => {
  beforeEach(() => {
    setStoreState({ analysisResult: mockAnalysisResult });
  });

  it("renders period headers with study counts", () => {
    render(<ImagingTimelineView />);
    // Both mock events are > 1 year old, so they should be in an older bucket
    const studyCountBadges = screen.getAllByText(/\d+ stud/);
    expect(studyCountBadges.length).toBeGreaterThan(0);
  });

  it("allows collapsing a time period section", async () => {
    const user = userEvent.setup();
    render(<ImagingTimelineView />);
    // Find a period header button (they have aria-expanded)
    const headers = screen.getAllByRole("button", { expanded: true });
    expect(headers.length).toBeGreaterThan(0);
    // Click to collapse
    await user.click(headers[0]);
    // After collapsing, should have at least one collapsed section
    const collapsed = screen.getAllByRole("button", { expanded: false });
    expect(collapsed.length).toBeGreaterThan(0);
  });

  it("shows Export CSV button when events exist", () => {
    render(<ImagingTimelineView />);
    expect(screen.getByText("Export CSV")).toBeInTheDocument();
  });
});
