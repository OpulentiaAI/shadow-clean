/**
 * Message compression utility for long conversation loops
 * Best Practice BP003: Use prepareStep for message compression in long loops
 * Source: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#preparestep-callback
 */
export interface Message {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    name?: string;
    tool_call_id?: string;
}
export interface CompressMessagesOptions {
    /** Character threshold before compression (default: 50000) */
    threshold?: number;
    /** Number of recent messages to keep uncompressed (default: 4) */
    keepRecent?: number;
    /** Model to use for summarization (default: gpt-4o-mini) */
    summaryModel?: string;
    /** API key for summarization model */
    apiKey?: string;
}
/**
 * Calculate total character count of messages
 */
export declare function getMessagesTotalChars(messages: Message[]): number;
/**
 * Check if messages need compression
 */
export declare function needsCompression(messages: Message[], threshold?: number): boolean;
/**
 * Simple compression: truncate old messages and add summary marker
 * This is a lightweight approach that doesn't require an LLM call
 */
export declare function compressMessagesSimple(messages: Message[], options?: CompressMessagesOptions): Message[];
/**
 * Advanced compression using LLM summarization
 * Requires an LLM call which adds latency but produces better summaries
 */
export declare function compressMessagesWithLLM(messages: Message[], options: CompressMessagesOptions & {
    generateSummary: (prompt: string) => Promise<string>;
}): Promise<Message[]>;
/**
 * PrepareStep callback factory for AI SDK streamText
 * Returns a prepareStep function that compresses messages when needed
 *
 * @example
 * ```typescript
 * const result = await streamText({
 *   model: openai("gpt-4o"),
 *   messages: initialMessages,
 *   prepareStep: createPrepareStep({ threshold: 50000 }),
 * });
 * ```
 */
export declare function createPrepareStep(options?: CompressMessagesOptions): ({ messages, stepNumber }: {
    messages: Message[];
    stepNumber: number;
}) => Promise<{
    messages: Message[];
}>;
/**
 * Estimate token count from characters (rough approximation)
 * ~4 chars per token for English text
 */
export declare function estimateTokens(chars: number): number;
/**
 * Check if messages are approaching context limit
 */
export declare function isApproachingLimit(messages: Message[], maxTokens?: number): boolean;
//# sourceMappingURL=messageCompression.d.ts.map