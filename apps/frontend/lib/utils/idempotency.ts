/**
 * Idempotency Key System
 *
 * Generates unique, deterministic keys for message submissions to prevent
 * duplicate processing. Based on AI SDK best practices for message persistence.
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
 */

/**
 * Generate a unique idempotency key for a message submission
 * Uses a combination of taskId, content hash, and timestamp window
 *
 * @param taskId - The task/thread ID
 * @param content - The message content
 * @param windowMs - Time window for grouping rapid submissions (default 5s)
 */
export function generateIdempotencyKey(
  taskId: string,
  content: string,
  windowMs: number = 5000
): string {
  const trimmedContent = content.trim();
  const contentHash = hashString(trimmedContent);
  // Round timestamp to window to group rapid submissions
  const timeWindow = Math.floor(Date.now() / windowMs);

  return `${taskId}-${contentHash}-${timeWindow}`;
}

/**
 * Simple string hash function (djb2 algorithm)
 * Fast and produces consistent results for the same input
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  // Convert to positive hex string
  return (hash >>> 0).toString(16);
}

/**
 * Idempotency key tracker for client-side duplicate prevention
 */
export interface IdempotencyTracker {
  keys: Map<string, IdempotencyEntry>;
  maxAge: number;
  maxSize: number;
}

export interface IdempotencyEntry {
  key: string;
  createdAt: number;
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
  messageId?: string;
}

/**
 * Create a new idempotency tracker
 */
export function createIdempotencyTracker(
  maxAge: number = 60000, // 1 minute default
  maxSize: number = 100
): IdempotencyTracker {
  return {
    keys: new Map(),
    maxAge,
    maxSize,
  };
}

/**
 * Check if a key already exists and is still valid
 */
export function hasValidKey(
  tracker: IdempotencyTracker,
  key: string
): boolean {
  const entry = tracker.keys.get(key);
  if (!entry) return false;

  const now = Date.now();
  if (now - entry.createdAt > tracker.maxAge) {
    tracker.keys.delete(key);
    return false;
  }

  return true;
}

/**
 * Get the status of an idempotency key
 */
export function getKeyStatus(
  tracker: IdempotencyTracker,
  key: string
): IdempotencyEntry | null {
  const entry = tracker.keys.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.createdAt > tracker.maxAge) {
    tracker.keys.delete(key);
    return null;
  }

  return entry;
}

/**
 * Register a new idempotency key
 */
export function registerKey(
  tracker: IdempotencyTracker,
  key: string
): IdempotencyEntry {
  // Cleanup old entries if we're at max size
  if (tracker.keys.size >= tracker.maxSize) {
    cleanupOldEntries(tracker);
  }

  const entry: IdempotencyEntry = {
    key,
    createdAt: Date.now(),
    status: 'pending',
  };

  tracker.keys.set(key, entry);
  return entry;
}

/**
 * Update the status of an idempotency key
 */
export function updateKeyStatus(
  tracker: IdempotencyTracker,
  key: string,
  status: IdempotencyEntry['status'],
  messageId?: string
): void {
  const entry = tracker.keys.get(key);
  if (entry) {
    entry.status = status;
    if (messageId) {
      entry.messageId = messageId;
    }
  }
}

/**
 * Remove old entries from the tracker
 */
export function cleanupOldEntries(tracker: IdempotencyTracker): number {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of tracker.keys.entries()) {
    if (now - entry.createdAt > tracker.maxAge) {
      tracker.keys.delete(key);
      removed++;
    }
  }

  return removed;
}

/**
 * Generate a unique message ID (compatible with AI SDK format)
 * Uses a combination of prefix and random bytes
 */
export function generateMessageId(prefix: string = 'msg'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${random}`;
}
