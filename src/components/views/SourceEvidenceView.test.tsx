/**
 * SourceEvidenceView — Component Tests
 *
 * Tests content display, empty states, and patient name rendering.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SourceEvidenceView } from "./SourceEvidenceView";
import { resetStore, setStoreState, mockPatient } from "../../test-utils";

beforeEach(() => {
  resetStore();
});

// ═══════════════════════════════════════════════════════════════
// 1. Content display
// ═══════════════════════════════════════════════════════════════

describe("SourceEvidenceView — content display", () => {
  it("renders the page heading", () => {
    render(<SourceEvidenceView />);
    expect(screen.getByText("Source Evidence")).toBeInTheDocument();
  });

  it("shows patient name in the description", () => {
    render(<SourceEvidenceView />);
    expect(screen.getByText(mockPatient.name)).toBeInTheDocument();
  });

  it("renders clinical notes when present", () => {
    render(<SourceEvidenceView />);
    expect(
      screen.getByText(mockPatient.notes)
    ).toBeInTheDocument();
  });

  it("renders prior reports when present", () => {
    render(<SourceEvidenceView />);
    expect(
      screen.getByText(mockPatient.priorReports)
    ).toBeInTheDocument();
  });

  it("renders section headings", () => {
    render(<SourceEvidenceView />);
    expect(screen.getByText("Clinical Notes")).toBeInTheDocument();
    expect(screen.getByText("Prior Radiology Reports")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Empty states
// ═══════════════════════════════════════════════════════════════

describe("SourceEvidenceView — empty states", () => {
  it("shows empty state for notes when patient has no notes", () => {
    setStoreState({
      patient: { ...mockPatient, notes: "" },
    });
    render(<SourceEvidenceView />);
    expect(
      screen.getByText("No clinical notes available for this patient.")
    ).toBeInTheDocument();
  });

  it("shows empty state for reports when patient has no reports", () => {
    setStoreState({
      patient: { ...mockPatient, priorReports: "" },
    });
    render(<SourceEvidenceView />);
    expect(
      screen.getByText("No prior radiology reports available for this patient.")
    ).toBeInTheDocument();
  });

  it("shows both empty states when patient has neither", () => {
    setStoreState({
      patient: { ...mockPatient, notes: "", priorReports: "" },
    });
    render(<SourceEvidenceView />);
    expect(
      screen.getByText("No clinical notes available for this patient.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("No prior radiology reports available for this patient.")
    ).toBeInTheDocument();
  });

  it("treats whitespace-only notes as empty", () => {
    setStoreState({
      patient: { ...mockPatient, notes: "   \n  " },
    });
    render(<SourceEvidenceView />);
    expect(
      screen.getByText("No clinical notes available for this patient.")
    ).toBeInTheDocument();
  });

  it("treats whitespace-only reports as empty", () => {
    setStoreState({
      patient: { ...mockPatient, priorReports: "   \t  " },
    });
    render(<SourceEvidenceView />);
    expect(
      screen.getByText("No prior radiology reports available for this patient.")
    ).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Patient switching
// ═══════════════════════════════════════════════════════════════

describe("SourceEvidenceView — patient switching", () => {
  it("updates displayed content when patient changes", () => {
    const { rerender } = render(<SourceEvidenceView />);
    expect(screen.getByText(mockPatient.notes)).toBeInTheDocument();

    // Switch patient
    setStoreState({
      patient: {
        ...mockPatient,
        name: "New Patient",
        notes: "Different clinical notes.",
        priorReports: "Different reports.",
      },
    });
    rerender(<SourceEvidenceView />);
    expect(screen.getByText("New Patient")).toBeInTheDocument();
    expect(screen.getByText("Different clinical notes.")).toBeInTheDocument();
  });
});
