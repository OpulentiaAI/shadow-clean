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
/**
 * Check if an error is transient and should be retried
 */
export declare function isTransientError(error: unknown): boolean;
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
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
/**
 * Decorator-style retry wrapper for class methods
 */
export declare function retryable<T extends (...args: unknown[]) => Promise<unknown>>(options?: RetryOptions): (_target: unknown, _propertyKey: string, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T>;
//# sourceMappingURL=retry.d.ts.map