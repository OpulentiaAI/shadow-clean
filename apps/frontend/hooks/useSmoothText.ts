/**
 * useSmoothText - Smooth streaming text display hook
 * Best Practice BP006: Use useSmoothText for smooth streaming UX
 * Source: https://docs.convex.dev/agents/streaming#text-smoothing
 *
 * This hook smooths the display of streaming text to prevent choppy/bursty rendering.
 * It buffers incoming text and releases it at a controlled rate.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export interface UseSmoothTextOptions {
  /** Enable/disable smoothing (default: true) */
  enabled?: boolean;
  /** Target characters per second (default: 40) */
  charsPerSecond?: number;
  /** Minimum delay between updates in ms (default: 16 for ~60fps) */
  minDelayMs?: number;
  /** Maximum buffer size before forcing flush (default: 100) */
  maxBufferSize?: number;
}

export interface UseSmoothTextState {
  /** Whether the display has caught up to the source text */
  isComplete: boolean;
  /** Number of characters still buffered */
  buffer: number;
  /** Current display rate in chars/second */
  currentRate: number;
}

const DEFAULT_OPTIONS: Required<Omit<UseSmoothTextOptions, "enabled">> & {
  enabled: boolean;
} = {
  enabled: true,
  charsPerSecond: 40,
  minDelayMs: 16,
  maxBufferSize: 100,
};

/**
 * Hook for smooth text rendering during streaming
 *
 * @param rawText - The source text (may be updating during streaming)
 * @param options - Configuration options
 * @returns [displayText, state] - The smoothed display text and state info
 *
 * @example
 * ```tsx
 * function StreamingMessage({ message, isStreaming }) {
 *   const [smoothText, { isComplete }] = useSmoothText(message.content, {
 *     enabled: isStreaming,
 *     charsPerSecond: 40,
 *   });
 *
 *   return (
 *     <div>
 *       <Markdown>{smoothText}</Markdown>
 *       {isStreaming && !isComplete && <span className="cursor">▊</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSmoothText(
  rawText: string,
  options: UseSmoothTextOptions = {}
): [string, UseSmoothTextState] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { enabled, charsPerSecond, maxBufferSize } = opts;

  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(true);

  // Refs for animation state
  const bufferRef = useRef(rawText);
  const lastUpdateRef = useRef(Date.now());
  const rafRef = useRef<number | null>(null);
  const currentRateRef = useRef(charsPerSecond);

  // Update buffer when source text changes
  useEffect(() => {
    bufferRef.current = rawText;

    if (!enabled) {
      // When disabled, immediately show all text
      setDisplayText(rawText);
      setIsComplete(true);
      return;
    }

    // Check if we're behind
    if (displayText.length < rawText.length) {
      setIsComplete(false);
    }
  }, [rawText, enabled, displayText.length]);

  // Animation tick function
  const tick = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    const target = bufferRef.current;

    setDisplayText((prev) => {
      // Already caught up
      if (prev.length >= target.length) {
        setIsComplete(true);
        rafRef.current = null;
        return prev;
      }

      // Calculate how many chars to release based on elapsed time
      const charsToRelease = Math.max(
        1,
        Math.floor((elapsed / 1000) * charsPerSecond)
      );

      // Force flush if buffer is too large
      const buffer = target.length - prev.length;
      const effectiveChars =
        buffer > maxBufferSize ? Math.max(charsToRelease, buffer - maxBufferSize) : charsToRelease;

      const newLength = Math.min(prev.length + effectiveChars, target.length);
      const newText = target.slice(0, newLength);

      // Update rate tracking
      if (elapsed > 0) {
        currentRateRef.current = (effectiveChars / elapsed) * 1000;
      }

      lastUpdateRef.current = now;

      // Check if we've caught up
      if (newLength >= target.length) {
        setIsComplete(true);
        rafRef.current = null;
      } else {
        // Schedule next tick
        rafRef.current = requestAnimationFrame(tick);
      }

      return newText;
    });
  }, [charsPerSecond, maxBufferSize]);

  // Start/stop animation based on state
  useEffect(() => {
    if (!enabled) {
      // Cancel any pending animation
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    // Start animation if not complete
    if (!isComplete && !rafRef.current) {
      lastUpdateRef.current = Date.now();
      rafRef.current = requestAnimationFrame(tick);
    }

    // Cleanup on unmount
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, isComplete, tick]);

  // Flush on unmount - show final text
  useEffect(() => {
    return () => {
      setDisplayText(bufferRef.current);
    };
  }, []);

  // Calculate current state
  const buffer = Math.max(0, bufferRef.current.length - displayText.length);

  return [
    enabled ? displayText : rawText,
    {
      isComplete,
      buffer,
      currentRate: currentRateRef.current,
    },
  ];
}

/**
 * Simpler hook that just returns the smoothed text
 * Useful when you don't need the state info
 */
export function useSmoothTextSimple(
  rawText: string,
  enabled: boolean = true,
  charsPerSecond: number = 40
): string {
  const [text] = useSmoothText(rawText, { enabled, charsPerSecond });
  return text;
}

export default useSmoothText;
