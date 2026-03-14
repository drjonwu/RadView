import { useState, useCallback } from "react";
import { Check } from "lucide-react";

/**
 * Hook to display a brief success toast that auto-dismisses.
 * Returns [isVisible, showToast, ToastElement].
 */
export function useToast(duration = 2000) {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback(
    (text: string) => {
      setMessage(text);
      setTimeout(() => setMessage(null), duration);
    },
    [duration]
  );

  const ToastElement = message ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-green-700 font-medium animate-pulse">
      <Check className="w-3.5 h-3.5" />
      {message}
    </span>
  ) : null;

  return { show, ToastElement } as const;
}
