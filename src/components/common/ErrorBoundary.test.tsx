/**
 * ErrorBoundary — Component Tests
 *
 * Tests error catching, fallback UI, and recovery behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";

// Suppress React error boundary console.error noise in test output
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const ThrowingComponent = ({ message }: { message: string }) => {
  throw new Error(message);
};

const GoodComponent = () => <div>All good!</div>;

// ═══════════════════════════════════════════════════════════════
// 1. Normal operation
// ═══════════════════════════════════════════════════════════════

describe("ErrorBoundary — normal operation", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("All good!")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Error catching
// ═══════════════════════════════════════════════════════════════

describe("ErrorBoundary — error catching", () => {
  it("catches errors and shows fallback UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Test crash" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test crash")).toBeInTheDocument();
  });

  it("uses custom fallback title when provided", () => {
    render(
      <ErrorBoundary fallbackTitle="View crashed">
        <ThrowingComponent message="Oops" />
      </ErrorBoundary>
    );
    expect(screen.getByText("View crashed")).toBeInTheDocument();
  });

  it("shows Try Again button", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Fail" />
      </ErrorBoundary>
    );
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Recovery
// ═══════════════════════════════════════════════════════════════

describe("ErrorBoundary — recovery", () => {
  it("resets error state when Try Again is clicked", async () => {
    const user = userEvent.setup();

    // We need a component that throws once then works
    let shouldThrow = true;
    const ConditionalThrower = () => {
      if (shouldThrow) throw new Error("First render crash");
      return <div>Recovered!</div>;
    };

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>
    );

    // Should show error
    expect(screen.getByText("First render crash")).toBeInTheDocument();

    // Fix the component before retry
    shouldThrow = false;

    // Click Try Again
    await user.click(screen.getByRole("button", { name: /try again/i }));

    // Should now render recovered content
    expect(screen.getByText("Recovered!")).toBeInTheDocument();
  });
});
