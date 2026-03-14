/**
 * Cancellable timeout utility — shared between geminiService and ragService.
 *
 * Creates a Promise that rejects after `ms` milliseconds with an AppError.
 * Calling `cancel()` clears the underlying timer to prevent memory leaks
 * when the actual API call resolves before the timeout fires.
 */

import { AppError, ErrorCategory } from "../types";

export const createCancellableTimeout = (
  ms: number,
  message: string
): { promise: Promise<never>; cancel: () => void } => {
  let timerId: ReturnType<typeof setTimeout>;
  const promise = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () => reject(new AppError(ErrorCategory.SERVER, message)),
      ms
    );
  });
  const cancel = () => clearTimeout(timerId);
  return { promise, cancel };
};
