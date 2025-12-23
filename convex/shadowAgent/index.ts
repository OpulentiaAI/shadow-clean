/**
 * Shadow Agent - Canonical Agent Module
 * 
 * This module provides the main Agent instance using @convex-dev/agent primitives.
 * 
 * IMPORTANT: This file must NOT have "use node" directive because it's imported
 * by both action and non-action files. The Agent class itself works in both contexts.
 */

import { Agent } from "@convex-dev/agent";
import { components } from "../_generated/api";
import { createOpenAI } from "@ai-sdk/openai";

// OpenRouter configuration via OpenAI-compatible API
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Create the OpenRouter provider for LLM calls
 * Uses environment variables for API key and headers
 */
function createOpenRouterModel() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required in environment");
  }

  const provider = createOpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    headers: {
      "HTTP-Referer": process.env.OPENROUTER_REFERRER || "https://code.opulentia.ai",
      "X-Title": process.env.OPENROUTER_TITLE || "Shadow Agent",
    },
  });

  // Return a model instance for the default model
  return provider("anthropic/claude-sonnet-4");
}

/**
 * Shadow Agent Instance
 * 
 * This is the canonical Agent used throughout the application.
 * It provides:
 * - Automatic thread/message persistence
 * - Conversation context from thread history
 * - Streaming with status lifecycle (pending → streaming → complete)
 * - Tool calling with step limits
 */
export const shadowAgent = new Agent(components.agent, {
  name: "shadow",
  languageModel: createOpenRouterModel(),
  instructions: `You are Shadow, an expert AI coding assistant. You help users understand, modify, and create code.

Key behaviors:
- Be concise and direct in responses
- Use tools when needed to explore codebases
- Provide working code solutions
- Explain changes clearly
- Ask for clarification only when truly needed

When exploring a codebase:
1. Start with list_dir to understand structure
2. Use read_file for specific files
3. Use grep_search to find patterns
4. Make targeted edits with write_to_file or edit_file`,

  // Context options for conversation history
  contextOptions: {
    recentMessages: 20,
    excludeToolMessages: false,
    searchOptions: {
      limit: 10,
      textSearch: false,
      vectorSearch: false,
    },
  },
});

// Export the Agent class and types for use in other modules
export { Agent };
export type { Thread } from "@convex-dev/agent";
