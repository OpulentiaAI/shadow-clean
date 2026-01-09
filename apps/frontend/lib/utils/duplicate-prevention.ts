/**
 * Utility for preventing duplicate message submissions
 */

export interface LastSentMessage {
  message: string;
  timestamp: number;
}

export const DEFAULT_DUPLICATE_PREVENTION_WINDOW_MS = 2000;

/**
 * Check if a message should be blocked as a duplicate
 * @param message - The message to check
 * @param lastSent - The last sent message info (or null)
 * @param windowMs - The time window in milliseconds to consider duplicates
 * @returns true if the message should be blocked, false otherwise
 */
export function isDuplicateMessage(
  message: string,
  lastSent: LastSentMessage | null,
  windowMs: number = DEFAULT_DUPLICATE_PREVENTION_WINDOW_MS
): boolean {
  if (!lastSent) {
    return false;
  }

  const now = Date.now();
  const trimmedMessage = message.trim();

  return (
    lastSent.message === trimmedMessage &&
    now - lastSent.timestamp < windowMs
  );
}

/**
 * Create a new last sent message record
 * @param message - The message that was sent
 * @returns A new LastSentMessage object
 */
export function createLastSentMessage(message: string): LastSentMessage {
  return {
    message: message.trim(),
    timestamp: Date.now(),
  };
}
