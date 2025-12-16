/**
 * Retry utility with exponential backoff and jitter
 * Best Practice BP009: Handle transient API failures gracefully
 * Source: https://www.convex.dev/components/workflow#retry-behavior
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial backoff delay in ms (default: 100) */
  initialBackoffMs?: number;
  /** Maximum backoff delay in ms (default: 10000) */
  maxBackoffMs?: number;
  /** Backoff multiplier (default: 2 for exponential) */
  base?: number;
  /** Add random jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Optional callback for retry events */
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry">> = {
  maxAttempts: 3,
  initialBackoffMs: 100,
  maxBackoffMs: 10000,
  base: 2,
  jitter: true,
};

/**
 * Non-transient errors that should NOT be retried
 */
const NON_TRANSIENT_ERRORS = [
  "InvalidApiKey",
  "AuthenticationError",
  "Unauthorized",
  "ValidationError",
  "ContentPolicyViolation",
  "InvalidRequestError",
  "PermissionDenied",
  "Forbidden",
  "NotFound",
  "BadRequest",
];

/**
 * HTTP status codes that indicate transient errors (should retry)
 */
const TRANSIENT_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
];

/**
 * Check if an error is transient and should be retried
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const name = error.name;

  // Check for non-transient error patterns
  for (const pattern of NON_TRANSIENT_ERRORS) {
    if (
      message.includes(pattern.toLowerCase()) ||
      name.includes(pattern)
    ) {
      return false;
    }
  }

  // Check for explicit 401/403 errors (auth failures - not transient)
  if (message.includes("401") || message.includes("403")) {
    return false;
  }

  // Check for transient status codes
  for (const code of TRANSIENT_STATUS_CODES) {
    if (message.includes(String(code))) {
      return true;
    }
  }

  // Check for common transient error patterns
  const transientPatterns = [
    "timeout",
    "timed out",
    "econnreset",
    "econnrefused",
    "socket hang up",
    "network",
    "rate limit",
    "too many requests",
    "temporarily unavailable",
    "service unavailable",
    "overloaded",
    "capacity",
    "retry",
  ];

  for (const pattern of transientPatterns) {
    if (message.includes(pattern)) {
      return true;
    }
  }

  // Default: treat as transient (safer for reliability)
  return true;
}

/**
 * Calculate backoff delay with optional jitter
 */
function calculateBackoff(
  attempt: number,
  options: Required<Omit<RetryOptions, "onRetry">>
): number {
  const { initialBackoffMs, maxBackoffMs, base, jitter } = options;

  // Exponential backoff: initialBackoffMs * base^(attempt-1)
  let delay = Math.min(
    initialBackoffMs * Math.pow(base, attempt - 1),
    maxBackoffMs
  );

  // Add jitter: random value between 50% and 100% of delay
  if (jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.round(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => streamText({ model: openai("gpt-4o"), prompt }),
 *   { maxAttempts: 3, initialBackoffMs: 200 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error("No attempts made");

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry non-transient errors
      if (!isTransientError(error)) {
        console.log(
          `[Retry] Non-transient error on attempt ${attempt}, not retrying:`,
          lastError.message.substring(0, 100)
        );
        throw lastError;
      }

      // Don't retry if we've exhausted attempts
      if (attempt === opts.maxAttempts) {
        console.log(
          `[Retry] Exhausted ${opts.maxAttempts} attempts, giving up:`,
          lastError.message.substring(0, 100)
        );
        throw lastError;
      }

      // Calculate backoff delay
      const delay = calculateBackoff(attempt, opts);

      console.log(
        `[Retry] Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delay}ms:`,
        lastError.message.substring(0, 100)
      );

      // Call optional retry callback
      if (options.onRetry) {
        options.onRetry(attempt, lastError, delay);
      }

      // Wait before next attempt
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Decorator-style retry wrapper for class methods
 */
export function retryable<T extends (...args: unknown[]) => Promise<unknown>>(
  options: RetryOptions = {}
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    } as T;

    return descriptor;
  };
}
