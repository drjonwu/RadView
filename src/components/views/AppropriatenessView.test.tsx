/**
 * AppropriatenessView — Component Tests
 *
 * Tests verdict banner rendering, alert card display, severity badges,
 * citation links, and empty state.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppropriatenessView } from "./AppropriatenessView";
import {
  resetStore,
  setStoreState,
  mockAnalysisResult,
} from "../../test-utils";

beforeEach(() => {
  resetStore();
});

// ═══════════════════════════════════════════════════════════════
// 1. Empty / pre-analysis state
// ═══════════════════════════════════════════════════════════════

describe("AppropriatenessView — empty state", () => {
  it("shows placeholder when no analysis result exists", () => {
    setStoreState({ activeView: "APPROPRIATENESS_ANALYSIS" });
    render(<AppropriatenessView />);
    expect(
      screen.getByText(/Click .Run Analysis. above to evaluate this order/)
    ).toBeInTheDocument();
  });

  it("always shows the current order under review", () => {
    render(<AppropriatenessView />);
    expect(screen.getByText("Current Order Under Review")).toBeInTheDocument();
    expect(
      screen.getByText("CT Abdomen/Pelvis with IV contrast")
    ).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Verdict banner
// ═══════════════════════════════════════════════════════════════

describe("AppropriatenessView — verdict banner", () => {
  it("renders USUALLY_NOT_APPROPRIATE verdict", () => {
    setStoreState({ analysisResult: mockAnalysisResult });
    render(<AppropriatenessView />);
    expect(
      screen.getByText("Usually Not Appropriate")
    ).toBeInTheDocument();
  });

  it("renders USUALLY_APPROPRIATE verdict with green styling", () => {
    const appropriateResult = {
      ...mockAnalysisResult,
      appropriateness: {
        ...mockAnalysisResult.appropriateness,
        overallVerdict: "USUALLY_APPROPRIATE" as const,
        alerts: [],
      },
    };
    setStoreState({ analysisResult: appropriateResult });
    render(<AppropriatenessView />);
    expect(screen.getByText("Usually Appropriate")).toBeInTheDocument();
    // The verdict banner should have green classes
    const banner = screen.getByText("Usually Appropriate").closest("div");
    expect(banner?.className).toContain("bg-green-50");
  });

  it("renders MAY_BE_APPROPRIATE verdict with amber styling", () => {
    const mayResult = {
      ...mockAnalysisResult,
      appropriateness: {
        ...mockAnalysisResult.appropriateness,
        overallVerdict: "MAY_BE_APPROPRIATE" as const,
        alerts: [],
      },
    };
    setStoreState({ analysisResult: mayResult });
    render(<AppropriatenessView />);
    expect(screen.getByText("May Be Appropriate")).toBeInTheDocument();
    const banner = screen.getByText("May Be Appropriate").closest("div");
    expect(banner?.className).toContain("bg-amber-50");
  });

  it("shows correct alert count", () => {
    setStoreState({ analysisResult: mockAnalysisResult });
    render(<AppropriatenessView />);
    expect(screen.getByText(/2 alerts/)).toBeInTheDocument();
  });

  it("uses singular 'alert' for single alert", () => {
    const singleAlertResult = {
      ...mockAnalysisResult,
      appropriateness: {
        ...mockAnalysisResult.appropriateness,
        alerts: [mockAnalysisResult.appropriateness.alerts[0]],
      },
    };
    setStoreState({ analysisResult: singleAlertResult });
    render(<AppropriatenessView />);
    // "1 alert" without trailing "s"
    expect(screen.getByText("1 alert identified")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Alert cards
// ═══════════════════════════════════════════════════════════════

describe("AppropriatenessView — alert cards", () => {
  beforeEach(() => {
    setStoreState({ analysisResult: mockAnalysisResult });
  });

  it("renders all alert cards", () => {
    render(<AppropriatenessView />);
    expect(
      screen.getByText("Repeat CT Abdomen/Pelvis")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Contrast Allergy Screening")
    ).toBeInTheDocument();
  });

  it("displays severity badges", () => {
    render(<AppropriatenessView />);
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("applies correct severity badge styling", () => {
    render(<AppropriatenessView />);
    const highBadge = screen.getByText("HIGH");
    expect(highBadge.className).toContain("bg-red-100");
    expect(highBadge.className).toContain("text-red-800");

    const medBadge = screen.getByText("MEDIUM");
    expect(medBadge.className).toContain("bg-amber-100");
    expect(medBadge.className).toContain("text-amber-800");
  });

  it("shows description and recommendation for each alert", () => {
    render(<AppropriatenessView />);
    expect(
      screen.getByText("CT Abdomen/Pelvis was performed 30 days ago.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Consider using prior study results.")
    ).toBeInTheDocument();
  });

  it("renders citation links with external link icon", () => {
    render(<AppropriatenessView />);
    const link = screen.getByText("ACR Appropriateness Criteria, 2024");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://acsearch.acr.org/docs/69483/Narrative/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders plain text citation when no URL provided", () => {
    const noUrlResult = {
      ...mockAnalysisResult,
      appropriateness: {
        ...mockAnalysisResult.appropriateness,
        alerts: [
          {
            ...mockAnalysisResult.appropriateness.alerts[0],
            citationUrl: "",
          },
        ],
      },
    };
    setStoreState({ analysisResult: noUrlResult });
    render(<AppropriatenessView />);
    const citation = screen.getByText("ACR Appropriateness Criteria, 2024");
    expect(citation.tagName).toBe("P"); // <p> not <a>
  });
});
