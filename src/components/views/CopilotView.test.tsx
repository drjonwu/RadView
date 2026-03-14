/**
 * CopilotView — Component Tests
 *
 * Tests chat UI rendering, empty state, message display, error bubbles,
 * input behavior, loading state, source pills, and clear button.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopilotView } from "./CopilotView";
import {
  resetStore,
  setStoreState,
  mockPatient,
} from "../../test-utils";
import type { ChatMessage } from "../../types";

beforeEach(() => {
  resetStore();
  setStoreState({ activeView: "ASK_COPILOT" });
});

// ═══════════════════════════════════════════════════════════════
// 1. Empty state
// ═══════════════════════════════════════════════════════════════

describe("CopilotView — empty state", () => {
  it("shows suggested questions when chat is empty", () => {
    render(<CopilotView />);
    expect(screen.getByText(/Try asking a question/)).toBeInTheDocument();
    // Dynamic suggestions are rendered as clickable buttons
    const suggestionButtons = screen.getAllByRole("button").filter(
      (btn) => btn.className.includes("rounded-full") && btn.textContent && btn.textContent.includes("?")
    );
    expect(suggestionButtons.length).toBeGreaterThan(0);
  });

  it("shows patient name in header", () => {
    render(<CopilotView />);
    expect(screen.getByText(mockPatient.name)).toBeInTheDocument();
  });

  it("does not show clear button when chat is empty", () => {
    render(<CopilotView />);
    expect(screen.queryByLabelText("Clear chat")).not.toBeInTheDocument();
  });

  it("shows no-API-key message when apiKey is empty", () => {
    setStoreState({ apiKey: "" });
    render(<CopilotView />);
    expect(
      screen.getByText(/keyword-only mode/i)
    ).toBeInTheDocument();
  });

  it("does not show no-API-key message when apiKey is set", () => {
    setStoreState({ apiKey: "test-key-12345" });
    render(<CopilotView />);
    expect(screen.queryByText(/keyword-only mode/i)).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Chat message rendering
// ═══════════════════════════════════════════════════════════════

describe("CopilotView — message rendering", () => {
  const userMsg: ChatMessage = {
    role: "user",
    content: "When was the last CT scan?",
    timestamp: 1000,
  };

  const assistantMsg: ChatMessage = {
    role: "assistant",
    content: "The last CT was performed on January 15, 2025.",
    timestamp: 2000,
    context: [
      {
        text: "CT abdomen/pelvis performed 1/15/2025",
        source: "reports",
        startIdx: 0,
        endIdx: 38,
      },
      {
        text: "Patient presented with abdominal pain",
        source: "notes",
        startIdx: 100,
        endIdx: 138,
      },
    ],
  };

  it("renders user messages with blue styling", () => {
    setStoreState({ chatHistory: [userMsg] });
    render(<CopilotView />);
    const bubble = screen.getByText("When was the last CT scan?");
    expect(bubble.className).toContain("bg-blue-600");
    expect(bubble.className).toContain("text-white");
  });

  it("renders assistant messages with white styling", () => {
    setStoreState({ chatHistory: [assistantMsg] });
    render(<CopilotView />);
    const bubble = screen.getByText(
      "The last CT was performed on January 15, 2025."
    );
    expect(bubble.className).toContain("bg-white");
  });

  it("renders source pills for assistant messages with context", () => {
    setStoreState({ chatHistory: [assistantMsg] });
    render(<CopilotView />);
    expect(screen.getByText(/\[1\] Report/)).toBeInTheDocument();
    expect(screen.getByText(/\[2\] Notes/)).toBeInTheDocument();
  });

  it("does not render source pills for user messages", () => {
    setStoreState({ chatHistory: [userMsg] });
    render(<CopilotView />);
    expect(screen.queryByText(/Report/)).not.toBeInTheDocument();
  });

  it("hides empty-state suggested questions once chat has messages", () => {
    setStoreState({ chatHistory: [userMsg] });
    render(<CopilotView />);
    expect(screen.queryByText(/Try asking a question/)).not.toBeInTheDocument();
  });

  it("shows clear chat button when messages exist", () => {
    setStoreState({ chatHistory: [userMsg] });
    render(<CopilotView />);
    expect(screen.getByLabelText("Clear chat")).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Error messages
// ═══════════════════════════════════════════════════════════════

describe("CopilotView — error messages", () => {
  it("renders error messages with red styling", () => {
    const errorMsg: ChatMessage = {
      role: "assistant",
      content: "Error: API key is invalid",
      timestamp: 1000,
      isError: true,
    };
    setStoreState({ chatHistory: [errorMsg] });
    render(<CopilotView />);
    const bubble = screen.getByText("Error: API key is invalid");
    expect(bubble.className).toContain("bg-red-50");
    expect(bubble.className).toContain("border-red-200");
  });

  it("does not apply error styling to normal assistant messages", () => {
    const normalMsg: ChatMessage = {
      role: "assistant",
      content: "Error: This starts with error but is not flagged",
      timestamp: 1000,
      isError: false,
    };
    setStoreState({ chatHistory: [normalMsg] });
    render(<CopilotView />);
    const bubble = screen.getByText(
      "Error: This starts with error but is not flagged"
    );
    expect(bubble.className).not.toContain("bg-red-50");
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. Input behavior
// ═══════════════════════════════════════════════════════════════

describe("CopilotView — input", () => {
  it("has a text input with correct placeholder", () => {
    render(<CopilotView />);
    const input = screen.getByPlaceholderText("Ask about imaging history...");
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();
  });

  it("disables send button when input is empty", () => {
    render(<CopilotView />);
    const button = screen.getByLabelText("Send message");
    expect(button).toBeDisabled();
  });

  it("enables send button when input has text", async () => {
    const user = userEvent.setup();
    render(<CopilotView />);
    const input = screen.getByPlaceholderText("Ask about imaging history...");
    await user.type(input, "test question");
    const button = screen.getByLabelText("Send message");
    expect(button).not.toBeDisabled();
  });

  it("shows loading placeholder when copilot is loading", () => {
    setStoreState({ isCopilotLoading: true });
    render(<CopilotView />);
    expect(
      screen.getByPlaceholderText("Waiting for response...")
    ).toBeInTheDocument();
  });

  it("disables input during loading", () => {
    setStoreState({ isCopilotLoading: true });
    render(<CopilotView />);
    const input = screen.getByPlaceholderText("Waiting for response...");
    expect(input).toBeDisabled();
  });

  it("shows typing indicator during loading", () => {
    setStoreState({ isCopilotLoading: true });
    render(<CopilotView />);
    expect(
      screen.getByText("Searching patient records...")
    ).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Interactions
// ═══════════════════════════════════════════════════════════════

describe("CopilotView — interactions", () => {
  it("clears chat after two clicks (confirmation pattern)", async () => {
    const user = userEvent.setup();
    const userMsg: ChatMessage = {
      role: "user",
      content: "Hello",
      timestamp: 1000,
    };
    setStoreState({ chatHistory: [userMsg] });
    render(<CopilotView />);

    // First click shows confirmation
    const clearBtn = screen.getByLabelText("Clear chat");
    await user.click(clearBtn);
    expect(screen.getByLabelText("Confirm clear chat")).toBeInTheDocument();

    // Second click confirms and clears
    const confirmBtn = screen.getByLabelText("Confirm clear chat");
    await user.click(confirmBtn);

    // After clearing, suggested questions should reappear
    expect(screen.getByText(/Try asking a question/)).toBeInTheDocument();
  });
});
