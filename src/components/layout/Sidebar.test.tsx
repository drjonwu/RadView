/**
 * Sidebar — Component Tests
 *
 * Tests patient selector, view navigation, active state highlighting,
 * accessibility attributes, and mobile bottom nav.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./Sidebar";
import { resetStore, setStoreState } from "../../test-utils";
import { useAppStore } from "../../store/useAppStore";

beforeEach(() => {
  resetStore();
});

// ═══════════════════════════════════════════════════════════════
// 1. Patient selector (desktop)
// ═══════════════════════════════════════════════════════════════

describe("Sidebar — patient selector", () => {
  it("renders the patient dropdown with label", () => {
    render(<Sidebar />);
    expect(screen.getByLabelText("DEMO PATIENT")).toBeInTheDocument();
  });

  it("renders a select element with patient options", () => {
    render(<Sidebar />);
    const select = screen.getByLabelText("DEMO PATIENT") as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    // Should have options (at minimum the mock patient, but since resetStore
    // sets patient to mockPatient and the real Sidebar reads ALL_PATIENTS,
    // we'll check for real patient names)
    const options = select.querySelectorAll("option");
    expect(options.length).toBeGreaterThan(0);
  });

  it("has matching htmlFor and id for accessibility", () => {
    render(<Sidebar />);
    const label = screen.getByText("DEMO PATIENT");
    const select = document.getElementById("patient-select");
    expect(label).toHaveAttribute("for", "patient-select");
    expect(select).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. View navigation
// ═══════════════════════════════════════════════════════════════

describe("Sidebar — view navigation", () => {
  it("renders all seven navigation tabs", () => {
    render(<Sidebar />);
    // Desktop sidebar shows full labels, mobile shows short labels
    // At minimum, desktop labels should be present
    expect(screen.getAllByText("Source Evidence").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Timeline").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("By Region").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Appropriateness").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Comparison").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ask Copilot").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Audit Trail").length).toBeGreaterThanOrEqual(1);
  });

  it("highlights active view with aria-current='page'", () => {
    setStoreState({ activeView: "SOURCE_EVIDENCE" });
    render(<Sidebar />);
    // Find buttons with aria-current="page"
    const activeButtons = screen.getAllByRole("button").filter(
      (btn) => btn.getAttribute("aria-current") === "page"
    );
    expect(activeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("switches view on nav button click", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    // Click on "Timeline" — the desktop sidebar has one, mobile has another
    const timelineButtons = screen.getAllByText("Timeline");
    await user.click(timelineButtons[0]);
    // Store should now have activeView = "IMAGING_TIMELINE"
    expect(useAppStore.getState().activeView).toBe("IMAGING_TIMELINE");
  });

  it("does not set aria-current on inactive tabs", () => {
    setStoreState({ activeView: "ASK_COPILOT" });
    render(<Sidebar />);
    const sourceButtons = screen.getAllByText("Source Evidence");
    // The button containing "Source Evidence" should NOT have aria-current
    expect(sourceButtons[0].closest("button")?.getAttribute("aria-current")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Mobile bottom nav
// ═══════════════════════════════════════════════════════════════

describe("Sidebar — mobile bottom nav", () => {
  it("renders mobile patient switch button with accessible label", () => {
    render(<Sidebar />);
    expect(
      screen.getByLabelText("Switch patient")
    ).toBeInTheDocument();
  });

  it("renders mobile navigation with aria-label", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("navigation", { name: "Main navigation" })
    ).toBeInTheDocument();
  });

  it("shows short labels in mobile bottom nav", () => {
    render(<Sidebar />);
    // Mobile-only short labels
    expect(screen.getAllByText("Source").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Assess").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Copilot").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Audit").length).toBeGreaterThanOrEqual(1);
  });
});
