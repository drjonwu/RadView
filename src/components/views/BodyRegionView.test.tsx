/**
 * BodyRegionView — Component Tests
 *
 * Tests region grouping, empty state, and event details.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BodyRegionView } from "./BodyRegionView";
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

describe("BodyRegionView — empty state", () => {
  it("shows placeholder when no analysis has been run", () => {
    render(<BodyRegionView />);
    expect(
      screen.getByText(/Click .Run Analysis. above to extract imaging events/)
    ).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(<BodyRegionView />);
    expect(screen.getByText("Imaging by Body Region")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Grouped events
// ═══════════════════════════════════════════════════════════════

describe("BodyRegionView — grouped events", () => {
  beforeEach(() => {
    setStoreState({ analysisResult: mockAnalysisResult });
  });

  it("groups events by body region", () => {
    render(<BodyRegionView />);
    // Two regions: Abdomen/Pelvis and Brain
    expect(screen.getByText("Abdomen/Pelvis")).toBeInTheDocument();
    expect(screen.getByText("Brain")).toBeInTheDocument();
  });

  it("renders region headings as uppercase section headers", () => {
    render(<BodyRegionView />);
    const header = screen.getByText("Abdomen/Pelvis");
    expect(header.tagName).toBe("H3");
    expect(header.className).toContain("uppercase");
  });

  it("shows study descriptions under correct region", () => {
    render(<BodyRegionView />);
    expect(
      screen.getByText("CT Abdomen/Pelvis with contrast")
    ).toBeInTheDocument();
    expect(
      screen.getByText("MRI Brain without contrast")
    ).toBeInTheDocument();
  });

  it("displays event dates and status", () => {
    render(<BodyRegionView />);
    expect(screen.getByText("2025-01-15")).toBeInTheDocument();
    expect(screen.getByText("2024-06-10")).toBeInTheDocument();
  });

  it("shows key findings when present", () => {
    render(<BodyRegionView />);
    expect(screen.getByText("No acute abnormality")).toBeInTheDocument();
    expect(screen.getByText("Normal study")).toBeInTheDocument();
  });

  it("sorts regions alphabetically", () => {
    render(<BodyRegionView />);
    const headers = screen.getAllByRole("heading", { level: 3 });
    const regionHeaders = headers.filter(
      (h) => h.className.includes("uppercase")
    );
    const regionNames = regionHeaders.map((h) => h.textContent);
    expect(regionNames).toEqual(["Abdomen/Pelvis", "Brain"]);
  });
});
