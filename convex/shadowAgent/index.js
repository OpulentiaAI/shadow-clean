"use strict";
/**
 * Shadow Agent - Canonical Agent Module
 *
 * This module provides the main Agent instance using @convex-dev/agent primitives.
 *
 * IMPORTANT: This file must NOT have "use node" directive because it's imported
 * by both action and non-action files. The Agent class itself works in both contexts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = exports.shadowAgent = void 0;
const agent_1 = require("@convex-dev/agent");
Object.defineProperty(exports, "Agent", { enumerable: true, get: function () { return agent_1.Agent; } });
const api_1 = require("../_generated/api");
const openai_1 = require("@ai-sdk/openai");
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
    const provider = (0, openai_1.createOpenAI)({
        apiKey,
        baseURL: OPENROUTER_BASE_URL,
        headers: {
            "HTTP-Referer": process.env.OPENROUTER_REFERRER || "https://code.opulentia.ai",
            "X-Title": process.env.OPENROUTER_TITLE || "Shadow Agent",
        },
    });
    // Use MiniMax M2.1 with .chat() to force chat completions API
    // The .responses() format is not supported by OpenRouter
    return provider.chat("minimax/minimax-m2.1");
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
exports.shadowAgent = new agent_1.Agent(api_1.components.agent, {
    name: "shadow",
    languageModel: createOpenRouterModel(),
    instructions: `You are Shadow, an expert AI coding assistant. You help users understand, modify, and create code.

## CRITICAL: Anti-Loop Rules
1. **VERIFY RESULTS**: After EVERY tool call, check if the result matches what you intended. If you asked to read "README.md" but got "CHANGELOG.md", STOP and fix the path.
2. **NO REPEATS**: NEVER call the same tool with the same arguments twice. If a tool call didn't give you what you needed, try a DIFFERENT approach.
3. **REASON FIRST**: Before each tool call, explicitly state what you expect to find. After the result, confirm you got what you expected.
4. **STOP ON MISMATCH**: If tool results don't match your intent, STOP and reassess. Ask yourself: "Did I call the right tool with the right arguments?"
5. **MAX 3 ATTEMPTS**: If you've tried 3 different approaches without success, explain the issue to the user and ask for guidance.

## Key Behaviors
- Be concise and direct in responses
- Use tools when needed to explore codebases
- Provide working code solutions
- Explain changes clearly
- Ask for clarification only when truly needed

## When Exploring a Codebase
1. Start with list_dir to understand structure
2. Use read_file for specific files (verify the path is correct!)
3. Use grep_search to find patterns
4. Make targeted edits with write_to_file or edit_file

## Before Taking Action
- State your plan clearly
- Verify file paths exist before reading/editing
- Check tool results match your expectations
- If something seems wrong, STOP and explain the issue`,
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
