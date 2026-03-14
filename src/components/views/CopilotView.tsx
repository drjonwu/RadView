import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Send, Trash2, Loader2, AlertCircle, FileText, BookOpen, Sparkles } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import type { ChatMessage, RAGChunk, CompleteAnalysisResult, ImagingOrder, PatientProfile } from "../../types";

// ═══════════════════════════════════════════════════════════════
// SOURCE CITATION PILL
// ═══════════════════════════════════════════════════════════════

/**
 * Renders a small pill showing the source type and character range
 * for a retrieved chunk used in the response.
 */
const SourcePill = ({
  chunk,
  index,
}: {
  chunk: RAGChunk;
  index: number;
}) => {
  const Icon = chunk.source === "reports" ? FileText : BookOpen;
  const label = chunk.source === "reports" ? "Report" : "Notes";

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
      title={`${label}: chars ${chunk.startIdx}–${chunk.endIdx}\n\n${chunk.text.slice(0, 200)}...`}
    >
      <Icon className="w-3 h-3" />
      [{index + 1}] {label}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════
// CHAT BUBBLE
// ═══════════════════════════════════════════════════════════════

const ChatBubble = ({ msg }: { msg: ChatMessage }) => {
  const isUser = msg.role === "user";
  const isError = !isUser && (msg.isError === true);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] space-y-2`}>
        {/* Message bubble */}
        <div
          className={`rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
            isUser
              ? "bg-blue-600 text-white"
              : isError
                ? "bg-red-50 border border-red-200 text-red-800"
                : "bg-white border border-gray-200 text-gray-800"
          }`}
        >
          {isError && (
            <AlertCircle className="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-red-500" />
          )}
          {msg.content}
        </div>

        {/* Source citations (assistant messages with context) */}
        {!isUser && msg.context && msg.context.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {msg.context.map((chunk, i) => (
              <SourcePill key={`${chunk.source}-${chunk.startIdx}`} chunk={chunk} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════════════════════════════

const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      Searching patient records...
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// SMART SUGGESTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate contextual follow-up questions based on analysis results,
 * the current order, and the patient profile.
 */
function generateSuggestions(
  analysisResult: CompleteAnalysisResult | null,
  order: ImagingOrder,
  patient: PatientProfile
): string[] {
  const suggestions: string[] = [];

  if (!analysisResult) {
    // Pre-analysis suggestions
    suggestions.push(`When was ${patient.name}'s last imaging study?`);
    suggestions.push("Is there any documented contrast allergy?");
    suggestions.push("Summarize the imaging history for this patient.");
    return suggestions;
  }

  const { extraction, appropriateness } = analysisResult;
  const events = extraction.events;

  // 1. Suggestion based on overall verdict
  if (appropriateness.overallVerdict === "USUALLY_NOT_APPROPRIATE") {
    suggestions.push("Why is this order flagged as usually not appropriate?");
  } else if (appropriateness.overallVerdict === "MAY_BE_APPROPRIATE") {
    suggestions.push("What additional information would clarify if this order is appropriate?");
  }

  // 2. Suggestion about repeat scans
  const repeatAlert = appropriateness.alerts.find((a) => a.ruleId.startsWith("REPEAT"));
  if (repeatAlert) {
    suggestions.push(`When was the last ${order.modality} of the ${order.bodyRegion}?`);
  }

  // 3. Suggestion about contrast safety
  if (order.contrast !== "NONE") {
    if (patient.renalFunction && patient.renalFunction.eGFR < 60) {
      suggestions.push("Is it safe to give IV contrast with this patient's renal function?");
    }
    suggestions.push("Does this patient have any documented contrast allergies?");
  }

  // 4. Suggestion about pending/future studies
  const pending = events.filter((e) => e.status === "ORDERED" || e.status === "PENDING" || e.status === "RECOMMENDED");
  if (pending.length > 0) {
    suggestions.push("What imaging studies are currently pending or recommended?");
  }

  // 5. Suggestion about findings from the most recent study
  const completed = events.filter((e) => e.status === "COMPLETED");
  if (completed.length > 0) {
    const latest = completed[0]; // events are sorted newest first
    if (latest.keyFindings.length > 0) {
      suggestions.push(`What were the key findings from the ${latest.studyDescription}?`);
    }
  }

  // 6. Body-region-specific follow-up
  const sameRegion = completed.filter((e) => e.bodyRegion === order.bodyRegion);
  if (sameRegion.length > 1) {
    suggestions.push(`How many prior ${order.bodyRegion} studies does this patient have?`);
  }

  // 7. General clinical summary
  suggestions.push("Summarize all imaging findings for this patient.");

  // Deduplicate and limit to 5
  const unique = [...new Set(suggestions)];
  return unique.slice(0, 5);
}

const SuggestedQuestions = ({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (q: string) => void;
}) => {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        Suggested questions
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-left text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// COPILOT VIEW (Main Component)
// ═══════════════════════════════════════════════════════════════

export const CopilotView = () => {
  const chatHistory = useAppStore((s) => s.chatHistory);
  const isCopilotLoading = useAppStore((s) => s.isCopilotLoading);
  const sendChatMessage = useAppStore((s) => s.sendChatMessage);
  const clearChat = useAppStore((s) => s.clearChat);
  const patient = useAppStore((s) => s.patient);
  const order = useAppStore((s) => s.order);
  const apiKey = useAppStore((s) => s.apiKey);
  const analysisResult = useAppStore((s) => s.analysisResult);

  const [input, setInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /** Two-step clear: first click shows "Clear?", second click confirms */
  const handleClearChat = useCallback(() => {
    if (confirmClear) {
      clearChat();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      // Auto-dismiss confirmation after 3 seconds
      setTimeout(() => setConfirmClear(false), 3000);
    }
  }, [confirmClear, clearChat]);

  // Auto-scroll to bottom on new messages or loading state change
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatHistory.length, isCopilotLoading]);

  /** Context-aware suggested questions */
  const suggestions = useMemo(
    () => generateSuggestions(analysisResult, order, patient),
    [analysisResult, order, patient]
  );

  const handleSend = async (text?: string) => {
    const message = text ?? input.trim();
    if (!message || isCopilotLoading) return;
    setInput("");
    await sendChatMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const noApiKey = !apiKey || apiKey.trim().length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Ask Copilot
          </h2>
          <p className="text-sm text-gray-500">
            Ask questions about{" "}
            <span className="font-medium text-gray-700">{patient.name}</span>'s
            imaging history.
            {noApiKey && " Keyword-only mode (no API key)."}
          </p>
        </div>
        {chatHistory.length > 0 && (
          <button
            onClick={handleClearChat}
            className={`transition-colors p-1.5 rounded-lg ${
              confirmClear
                ? "text-red-600 bg-red-50 hover:bg-red-100"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            aria-label={confirmClear ? "Confirm clear chat" : "Clear chat"}
            title={confirmClear ? "Click again to confirm" : "Clear conversation"}
          >
            {confirmClear ? (
              <span className="text-xs font-medium px-1">Clear?</span>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Chat History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
        {chatHistory.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-8 space-y-4">
            <p>Try asking a question about the patient's imaging history:</p>
            {/* Show smart suggestions in empty state */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  disabled={isCopilotLoading}
                  className="text-left text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg) => (
          <ChatBubble key={`${msg.role}-${msg.timestamp}`} msg={msg} />
        ))}

        {isCopilotLoading && <TypingIndicator />}
      </div>

      {/* Suggested follow-up questions (shown after messages, not in empty state) */}
      {chatHistory.length > 0 && !isCopilotLoading && (
        <div className="mb-3">
          <SuggestedQuestions
            suggestions={suggestions}
            onSelect={(q) => handleSend(q)}
          />
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isCopilotLoading}
          rows={2}
          placeholder={
            isCopilotLoading
              ? "Waiting for response..."
              : "Ask about imaging history..."
          }
          aria-label="Ask a question about the patient's imaging history"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 resize-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isCopilotLoading}
          className="bg-blue-600 text-white rounded-lg px-4 py-2.5 h-[42px] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          aria-label="Send message"
        >
          {isCopilotLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
