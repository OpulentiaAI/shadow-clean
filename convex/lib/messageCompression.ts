/**
 * Message compression utility for long conversation loops
 * Best Practice BP003: Use prepareStep for message compression in long loops
 * Source: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#preparestep-callback
 */

/** Threshold in characters before compression kicks in */
const COMPRESSION_THRESHOLD = 50000;

/** Number of recent messages to keep uncompressed */
const KEEP_RECENT_MESSAGES = 4;

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
export function getMessagesTotalChars(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
}

/**
 * Check if messages need compression
 */
export function needsCompression(
  messages: Message[],
  threshold: number = COMPRESSION_THRESHOLD
): boolean {
  return getMessagesTotalChars(messages) >= threshold;
}

/**
 * Simple compression: truncate old messages and add summary marker
 * This is a lightweight approach that doesn't require an LLM call
 */
export function compressMessagesSimple(
  messages: Message[],
  options: CompressMessagesOptions = {}
): Message[] {
  const { threshold = COMPRESSION_THRESHOLD, keepRecent = KEEP_RECENT_MESSAGES } = options;

  const totalChars = getMessagesTotalChars(messages);
  if (totalChars < threshold) {
    return messages; // No compression needed
  }

  // Split into old (to compress) and recent (to keep)
  const splitIndex = Math.max(0, messages.length - keepRecent);
  const oldMessages = messages.slice(0, splitIndex);
  const recentMessages = messages.slice(splitIndex);

  if (oldMessages.length === 0) {
    return messages; // Nothing to compress
  }

  // Create a simple summary of old messages
  const oldMessageCount = oldMessages.length;
  const oldChars = getMessagesTotalChars(oldMessages);
  const toolCalls = oldMessages.filter(m => m.role === "tool" || m.name).length;
  
  // Extract key facts from old messages (simple heuristic)
  const keyFacts: string[] = [];
  for (const msg of oldMessages) {
    if (msg.role === "user" && (msg.content?.length ?? 0) > 20) {
      // Extract first line of user messages as key points
      const firstLine = (msg.content ?? "").split("\n")[0]?.substring(0, 200) ?? "";
      keyFacts.push(`- User: ${firstLine}`);
    }
    if (msg.role === "tool" && (msg.content?.length ?? 0) > 100) {
      // Note tool usage
      keyFacts.push(`- Tool result received (${msg.content?.length ?? 0} chars)`);
    }
  }

  const summaryContent = `[Conversation summary: ${oldMessageCount} earlier messages (${oldChars} chars) compressed. ${toolCalls} tool calls. Key points:\n${keyFacts.slice(0, 5).join("\n")}\n...]`;

  // Return compressed history + recent messages
  return [
    { role: "system", content: summaryContent },
    ...recentMessages,
  ];
}

/**
 * Advanced compression using LLM summarization
 * Requires an LLM call which adds latency but produces better summaries
 */
export async function compressMessagesWithLLM(
  messages: Message[],
  options: CompressMessagesOptions & {
    generateSummary: (prompt: string) => Promise<string>;
  }
): Promise<Message[]> {
  const { threshold = COMPRESSION_THRESHOLD, keepRecent = KEEP_RECENT_MESSAGES } = options;

  const totalChars = getMessagesTotalChars(messages);
  if (totalChars < threshold) {
    return messages; // No compression needed
  }

  // Split into old (to compress) and recent (to keep)
  const splitIndex = Math.max(0, messages.length - keepRecent);
  const oldMessages = messages.slice(0, splitIndex);
  const recentMessages = messages.slice(splitIndex);

  if (oldMessages.length === 0) {
    return messages; // Nothing to compress
  }

  // Build prompt for summarization
  const conversationText = oldMessages
    .map(m => `[${m.role}${m.name ? `:${m.name}` : ""}]: ${m.content.substring(0, 500)}${m.content.length > 500 ? "..." : ""}`)
    .join("\n\n");

  const summaryPrompt = `Summarize the following conversation history concisely. 
Preserve key facts, decisions, tool results, and context needed for continuing the conversation.
Keep it under 500 words.

CONVERSATION:
${conversationText}

SUMMARY:`;

  try {
    const summary = await options.generateSummary(summaryPrompt);
    
    return [
      { role: "system", content: `[Previous conversation summary]: ${summary}` },
      ...recentMessages,
    ];
  } catch (error) {
    console.error("[MessageCompression] LLM summarization failed, using simple compression:", error);
    // Fallback to simple compression
    return compressMessagesSimple(messages, options);
  }
}

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
export function createPrepareStep(options: CompressMessagesOptions = {}) {
  return async ({ messages, stepNumber }: { messages: Message[]; stepNumber: number }) => {
    // Only compress after step 3 (let context build up first)
    if (stepNumber <= 3) {
      return { messages };
    }

    const totalChars = getMessagesTotalChars(messages);
    const { threshold = COMPRESSION_THRESHOLD } = options;

    if (totalChars < threshold) {
      return { messages };
    }

    console.log(
      `[prepareStep] Step ${stepNumber}: Compressing ${messages.length} messages (${totalChars} chars)`
    );

    const compressed = compressMessagesSimple(messages, options);

    console.log(
      `[prepareStep] Compressed to ${compressed.length} messages (${getMessagesTotalChars(compressed)} chars)`
    );

    return { messages: compressed };
  };
}

/**
 * Estimate token count from characters (rough approximation)
 * ~4 chars per token for English text
 */
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

/**
 * Check if messages are approaching context limit
 */
export function isApproachingLimit(
  messages: Message[],
  maxTokens: number = 128000
): boolean {
  const chars = getMessagesTotalChars(messages);
  const estimatedTokens = estimateTokens(chars);
  // Warn when at 80% of limit
  return estimatedTokens >= maxTokens * 0.8;
}
