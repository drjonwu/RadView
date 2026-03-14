/**
 * RadView — Centralized Error Mapping
 *
 * Shared error classification logic used across all services
 * (Gemini extraction, RAG copilot, FHIR client).
 * Centralizes error-to-AppError mapping to ensure consistent
 * error categories and user-facing messages.
 */

import { AppError, ErrorCategory } from "../types";

/**
 * Maps a raw error to a structured AppError based on message patterns.
 * Used by geminiService, ragService, and fhirService.
 *
 * @param error - The raw error to classify
 * @param context - Human-readable context for the error message (e.g., "Gemini extraction", "FHIR request")
 */
export const mapServiceError = (
  error: unknown,
  context: string = "Service"
): AppError => {
  if (error instanceof AppError) return error;

  const msg = (error as Error)?.message ?? String(error);

  // Auth / permission errors
  if (
    msg.includes("400") ||
    msg.includes("INVALID_ARGUMENT")
  ) {
    return new AppError(
      ErrorCategory.AUTH,
      `${context}: Invalid request. Check API key and configuration.`,
      error
    );
  }
  if (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("PERMISSION_DENIED")
  ) {
    return new AppError(
      ErrorCategory.AUTH,
      `${context}: Invalid or expired API key. Please check your credentials.`,
      error
    );
  }

  // Rate limiting
  if (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota")
  ) {
    return new AppError(
      ErrorCategory.RATE_LIMIT,
      `${context}: API rate limit reached. Please wait a moment and try again.`,
      error
    );
  }

  // Content safety
  if (
    msg.includes("safety") ||
    msg.includes("blocked") ||
    msg.includes("SAFETY")
  ) {
    return new AppError(
      ErrorCategory.SAFETY,
      `${context}: Content triggered safety filters. Try simplifying the input.`,
      error
    );
  }

  // Server errors
  if (
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("UNAVAILABLE")
  ) {
    return new AppError(
      ErrorCategory.SERVER,
      `${context}: Service is temporarily unavailable. Please try again.`,
      error
    );
  }

  // Timeout
  if (msg.includes("timed out") || msg.includes("timeout")) {
    return new AppError(
      ErrorCategory.SERVER,
      `${context}: Request timed out. The service may be overloaded.`,
      error
    );
  }

  // Fallback
  return new AppError(
    ErrorCategory.UNKNOWN,
    `${context}: ${msg.slice(0, 200)}`,
    error
  );
};

/**
 * Determines whether an error is retryable.
 * Rate limits (429) and server errors (5xx) are retryable.
 * Auth, safety, and validation errors are not.
 */
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return (
      error.category === ErrorCategory.RATE_LIMIT ||
      error.category === ErrorCategory.SERVER
    );
  }
  const msg = (error as Error)?.message ?? "";
  return (
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("RESOURCE_EXHAUSTED")
  );
};
