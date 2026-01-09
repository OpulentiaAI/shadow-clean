"use node";
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamTaskWithTools = exports.executeTaskWithTools = exports.chat = exports.agentStreamText = exports.explainError = exports.generateCode = exports.analyzeCode = exports.continueThread = exports.generateText = exports.generateTextWithOpenRouter = exports.createThread = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const api_1 = require("./_generated/api");
const openai_1 = __importDefault(require("openai"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * NOTE:
 * This project currently uses AI SDK streaming actions in `convex/streaming.ts` for
 * real tool-calling and chat streaming.
 *
 * We intentionally avoid `@convex-dev/agent` here to prevent deploy-time module
 * resolution failures when that dependency isn't present.
 */
function makeOpenRouterClient() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is not set in Convex environment");
    }
    return new openai_1.default({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
            "HTTP-Referer": process.env.OPENROUTER_REFERRER || "https://code.opulentia.ai",
            "X-Title": process.env.OPENROUTER_TITLE || "Opulent Code",
        },
    });
}
function newThreadId() {
    return `thread_${crypto_1.default.randomBytes(8).toString("hex")}`;
}
async function generateTextCore(args) {
    const client = makeOpenRouterClient();
    const completion = await client.chat.completions.create({
        model: args.model || "moonshotai/kimi-k2-thinking",
        messages: args.systemPrompt
            ? [
                { role: "system", content: args.systemPrompt },
                { role: "user", content: args.prompt },
            ]
            : [{ role: "user", content: args.prompt }],
        max_tokens: args.maxTokens,
    });
    return {
        text: completion.choices[0]?.message?.content || "",
        usage: completion.usage
            ? {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens,
                totalTokens: completion.usage.total_tokens,
            }
            : undefined,
    };
}
exports.createThread = (0, server_1.action)({
    args: {
        taskId: values_1.v.optional(values_1.v.string()),
        userId: values_1.v.optional(values_1.v.string()),
        metadata: values_1.v.optional(values_1.v.any()),
    },
    handler: async () => {
        return { threadId: newThreadId() };
    },
});
exports.generateTextWithOpenRouter = (0, server_1.action)({
    args: {
        prompt: values_1.v.string(),
        model: values_1.v.optional(values_1.v.string()),
        systemPrompt: values_1.v.optional(values_1.v.string()),
        maxTokens: values_1.v.optional(values_1.v.number()),
    },
    handler: async (_ctx, args) => {
        const result = await generateTextCore({
            prompt: args.prompt,
            systemPrompt: args.systemPrompt,
            model: args.model,
            maxTokens: args.maxTokens || 500,
        });
        return {
            text: result.text,
            usage: result.usage,
            model: args.model || "moonshotai/kimi-k2-thinking",
        };
    },
});
exports.generateText = (0, server_1.action)({
    args: {
        prompt: values_1.v.string(),
        threadId: values_1.v.optional(values_1.v.string()),
        systemPrompt: values_1.v.optional(values_1.v.string()),
        model: values_1.v.optional(values_1.v.string()),
        maxTokens: values_1.v.optional(values_1.v.number()),
    },
    handler: async (_ctx, args) => {
        const result = await generateTextCore({
            prompt: args.prompt,
            systemPrompt: args.systemPrompt,
            model: args.model,
            maxTokens: args.maxTokens,
        });
        return {
            threadId: args.threadId ?? null,
            text: result.text,
            usage: result.usage,
        };
    },
});
exports.continueThread = (0, server_1.action)({
    args: {
        threadId: values_1.v.string(),
        prompt: values_1.v.string(),
        model: values_1.v.optional(values_1.v.string()),
    },
    handler: async (_ctx, args) => {
        const result = await generateTextCore({
            prompt: args.prompt,
            model: args.model,
        });
        return {
            threadId: args.threadId,
            text: result.text,
            usage: result.usage,
        };
    },
});
exports.analyzeCode = (0, server_1.action)({
    args: {
        code: values_1.v.string(),
        language: values_1.v.optional(values_1.v.string()),
        question: values_1.v.optional(values_1.v.string()),
    },
    handler: async (_ctx, args) => {
        const prompt = args.question
            ? `Analyze the following ${args.language || "code"}:\n\n\`\`\`${args.language || ""}\n${args.code}\n\`\`\`\n\nQuestion: ${args.question}`
            : `Analyze the following ${args.language || "code"} and provide insights about its functionality, potential issues, and improvements:\n\n\`\`\`${args.language || ""}\n${args.code}\n\`\`\``;
        const threadId = newThreadId();
        const result = await generateTextCore({ prompt });
        return {
            analysis: result.text,
            threadId,
        };
    },
});
exports.generateCode = (0, server_1.action)({
    args: {
        description: values_1.v.string(),
        language: values_1.v.string(),
        context: values_1.v.optional(values_1.v.string()),
    },
    handler: async (_ctx, args) => {
        const prompt = args.context
            ? `Generate ${args.language} code for the following requirement:\n\n${args.description}\n\nContext:\n${args.context}`
            : `Generate ${args.language} code for the following requirement:\n\n${args.description}`;
        const threadId = newThreadId();
        const result = await generateTextCore({ prompt });
        return {
            code: result.text,
            threadId,
        };
    },
});
exports.explainError = (0, server_1.action)({
    args: {
        error: values_1.v.string(),
        code: values_1.v.optional(values_1.v.string()),
        language: values_1.v.optional(values_1.v.string()),
    },
    handler: async (_ctx, args) => {
        let prompt = `Explain the following error and suggest how to fix it:\n\n${args.error}`;
        if (args.code) {
            prompt += `\n\nRelevant code:\n\`\`\`${args.language || ""}\n${args.code}\n\`\`\``;
        }
        const threadId = newThreadId();
        const result = await generateTextCore({ prompt });
        return {
            explanation: result.text,
            threadId,
        };
    },
});
// Use action with explicit type to avoid circular type reference
exports.agentStreamText = (0, server_1.action)({
    args: {
        prompt: values_1.v.string(),
        threadId: values_1.v.optional(values_1.v.string()),
        systemPrompt: values_1.v.optional(values_1.v.string()),
        model: values_1.v.optional(values_1.v.string()),
        taskId: values_1.v.optional(values_1.v.id("tasks")),
    },
    handler: async (ctx, args) => {
        // If no task context is provided, bail out early to avoid validation errors downstream.
        if (!args.taskId) {
            console.warn("[agent.agentStreamText] missing taskId, skipping streaming");
            return {
                threadId: args.threadId ?? null,
                text: "",
                messageId: null,
            };
        }
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENROUTER_API_KEY or OPENAI_API_KEY is required for streaming");
        }
        const client = new openai_1.default({
            apiKey,
            baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
            defaultHeaders: {
                ...(process.env.OPENROUTER_REFERRER
                    ? { "HTTP-Referer": process.env.OPENROUTER_REFERRER }
                    : {}),
                ...(process.env.OPENROUTER_TITLE
                    ? { "X-Title": process.env.OPENROUTER_TITLE }
                    : {}),
            },
        });
        // Create streaming assistant message
        const start = await ctx.runMutation(api_1.internal.messages.internalStartStreaming, {
            taskId: args.taskId,
            llmModel: args.model,
        });
        const messageId = start.messageId;
        let fullText = "";
        let finishReason;
        try {
            const stream = await client.chat.completions.create({
                model: args.model || "moonshotai/kimi-k2-thinking",
                messages: args.systemPrompt
                    ? [
                        { role: "system", content: args.systemPrompt },
                        { role: "user", content: args.prompt },
                    ]
                    : [{ role: "user", content: args.prompt }],
                stream: true,
            });
            for await (const chunk of stream) {
                const choice = chunk.choices?.[0];
                const delta = choice?.delta?.content;
                finishReason = choice?.finish_reason || finishReason;
                const textDelta = delta ?? "";
                if (textDelta) {
                    fullText += textDelta;
                    await ctx.runMutation(api_1.internal.messages.internalAppendStreamDelta, {
                        messageId,
                        deltaText: textDelta,
                        parts: [{ type: "text", text: textDelta }],
                        isFinal: false,
                    });
                }
            }
        }
        catch (error) {
            console.error("OpenAI streaming error", error);
            await ctx.runMutation(api_1.internal.messages.internalAppendStreamDelta, {
                messageId,
                deltaText: `\n\n[Stream Error: ${error instanceof Error ? error.message : String(error)}]`,
                parts: [{ type: "error", data: String(error) }],
                isFinal: true,
            });
            throw error;
        }
        await ctx.runMutation(api_1.internal.messages.internalAppendStreamDelta, {
            messageId,
            deltaText: "",
            parts: [],
            usage: undefined,
            finishReason,
            isFinal: true,
        });
        return {
            threadId: args.threadId ?? null,
            text: fullText,
            messageId,
        };
    },
});
exports.chat = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        message: values_1.v.string(),
        model: values_1.v.optional(values_1.v.string()),
        threadId: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const task = await ctx.runQuery(api_1.api.tasks.get, { taskId: args.taskId });
        if (!task) {
            throw new Error("Task not found");
        }
        const threadId = args.threadId ?? newThreadId();
        const systemPrompt = `You are Opulent Code, an AI coding assistant working on the repository: ${task.repoFullName}.`;
        const result = await generateTextCore({
            prompt: args.message,
            systemPrompt,
            model: args.model,
        });
        return {
            threadId,
            response: result.text,
            usage: result.usage,
        };
    },
});
exports.executeTaskWithTools = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        message: values_1.v.string(),
        model: values_1.v.optional(values_1.v.string()),
        threadId: values_1.v.optional(values_1.v.string()),
    },
    handler: async () => {
        throw new Error("executeTaskWithTools is not supported in this build. Use streaming:streamChatWithTools.");
    },
});
exports.streamTaskWithTools = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        message: values_1.v.string(),
        model: values_1.v.optional(values_1.v.string()),
        threadId: values_1.v.optional(values_1.v.string()),
    },
    handler: async () => {
        throw new Error("streamTaskWithTools is not supported in this build. Use streaming:streamChatWithTools.");
    },
});
