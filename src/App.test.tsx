/**
 * App.tsx — ViewRouter & AnalysisControls Component Tests
 *
 * Tests view routing, run analysis button states, and error display.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { AppError, ErrorCategory } from "./types";
import {
  resetStore,
  setStoreState,
  mockAnalysisResult,
} from "./test-utils";

beforeEach(() => {
  resetStore();
});

// ═══════════════════════════════════════════════════════════════
// 1. ViewRouter — renders correct view for each activeView
// ═══════════════════════════════════════════════════════════════

describe("ViewRouter", () => {
  it("renders Source Evidence view by default", () => {
    render(<App />);
    expect(screen.getByText("Source Evidence")).toBeInTheDocument();
    expect(screen.getByText("Clinical Notes")).toBeInTheDocument();
  });

  it("renders Imaging Timeline view", () => {
    setStoreState({ activeView: "IMAGING_TIMELINE" });
    render(<App />);
    expect(screen.getByText("Imaging Timeline")).toBeInTheDocument();
    expect(
      screen.getByText("Chronological view of all imaging studies extracted from the medical record.")
    ).toBeInTheDocument();
  });

  it("renders Body Region view", () => {
    setStoreState({ activeView: "BODY_REGION_HISTORY" });
    render(<App />);
    expect(screen.getByText("Imaging by Body Region")).toBeInTheDocument();
  });

  it("renders Appropriateness view", () => {
    setStoreState({ activeView: "APPROPRIATENESS_ANALYSIS" });
    render(<App />);
    expect(screen.getByText("Appropriateness Analysis")).toBeInTheDocument();
  });

  it("renders Comparison view", () => {
    setStoreState({ activeView: "ORDER_COMPARISON" });
    render(<App />);
    expect(screen.getByText("Order Comparison")).toBeInTheDocument();
  });

  it("renders Copilot view", () => {
    setStoreState({ activeView: "ASK_COPILOT" });
    render(<App />);
    expect(screen.getByText("Ask Copilot")).toBeInTheDocument();
  });

  it("renders Audit Trail view", () => {
    setStoreState({ activeView: "AUDIT_TRAIL" });
    render(<App />);
    expect(screen.getByText("Audit Trail")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. AnalysisControls — button states and error display
// ═══════════════════════════════════════════════════════════════

describe("AnalysisControls", () => {
  it("shows Run Analysis button in IDLE state", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: /run analysis/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("shows Analyzing... and disables button during EXTRACTING", () => {
    setStoreState({ analysisStatus: "EXTRACTING" });
    render(<App />);
    const button = screen.getByRole("button", { name: /analyzing/i });
    expect(button).toBeDisabled();
    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
  });

  it("shows Analyzing... during RUNNING_RULES", () => {
    setStoreState({ analysisStatus: "RUNNING_RULES" });
    render(<App />);
    expect(screen.getByText("Analyzing...")).toBeInTheDocument();
  });

  it("shows the current order description", () => {
    render(<App />);
    expect(
      screen.getByText("CT Abdomen/Pelvis with IV contrast")
    ).toBeInTheDocument();
  });

  it("displays error message when analysis fails", () => {
    setStoreState({
      analysisStatus: "ERROR",
      error: new AppError(ErrorCategory.UNKNOWN, "Network request failed"),
    });
    render(<App />);
    expect(screen.getByText("Network request failed")).toBeInTheDocument();
  });

  it("re-enables Run Analysis button after COMPLETE", () => {
    setStoreState({
      analysisStatus: "COMPLETE",
      analysisResult: mockAnalysisResult,
    });
    render(<App />);
    const button = screen.getByRole("button", { name: /run analysis/i });
    expect(button).not.toBeDisabled();
  });
});
