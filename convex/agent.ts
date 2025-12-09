import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { components, internal, api } from "./_generated/api";
import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
// import { createOpenRouter } from "@openrouter/ai-sdk-provider"; // Will be used for model switching
import OpenAI from "openai";
import { createAgentTools } from "./agentTools";
import { Id } from "./_generated/dataModel";

// OpenRouter provider for chat models when API key is available
// Currently unused - will be used when implementing model switching
// const openrouterApiKey = process.env.OPENROUTER_API_KEY;
// const openrouterProvider = openrouterApiKey
//   ? createOpenRouter({ apiKey: openrouterApiKey })
//   : null;

const shadowAgent = new Agent(components.agent, {
  name: "ShadowAgent",
  languageModel: openai.chat("gpt-4o"),
  // Note: textEmbedding removed - not supported in current @convex-dev/agent version
  instructions: `You are Shadow, an AI coding assistant. You help developers write, debug, and understand code.
You have access to the user's repository and can analyze code, suggest improvements, and help with implementation tasks.
Be concise but thorough. When showing code, use proper formatting.`,
});

export const createThread = action({
  args: {
    taskId: v.optional(v.string()),
    userId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const result = await shadowAgent.createThread(ctx, {
      userId: args.userId ?? undefined,
      title: args.taskId ? `Task: ${args.taskId}` : undefined,
    });
    return { threadId: result.threadId };
  },
});

export const generateText = action({
  args: {
    prompt: v.string(),
    threadId: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let threadId = args.threadId;
    if (!threadId) {
      const result = await shadowAgent.createThread(ctx, {});
      threadId = result.threadId;
    }
    const agent = args.systemPrompt
      ? new Agent(components.agent, {
          name: "ShadowAgent",
          languageModel: openai.chat((args.model as any) || "gpt-4o"),
          instructions: args.systemPrompt,
        })
      : shadowAgent;
    const result = await agent.generateText(
      ctx,
      { threadId },
      { prompt: args.prompt },
    );
    return {
      threadId,
      text: result.text,
      usage: result.usage,
    };
  },
});

// Use action with explicit type to avoid circular type reference
export const agentStreamText: ReturnType<typeof action> = action({
  args: {
    prompt: v.string(),
    threadId: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
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
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      defaultHeaders: {
        ...(process.env.OPENROUTER_REFERRER
          ? { "HTTP-Referer": process.env.OPENROUTER_REFERRER }
          : {}),
        ...(process.env.OPENROUTER_TITLE ? { "X-Title": process.env.OPENROUTER_TITLE } : {}),
      },
    });

    // Create streaming assistant message (use internal mutation to avoid circular types)
    const start = await ctx.runMutation(internal.messages.internalStartStreaming, {
      taskId: args.taskId as any,
      llmModel: args.model,
    });
    const messageId = start.messageId;

    let fullText = "";
    let finishReason: string | undefined;

    try {
      const stream = await client.chat.completions.create({
        model: args.model || "gpt-4o", // Default to gpt-4o if not specified
        messages: [{ role: "user", content: args.prompt }],
        stream: true,
      });

      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];
        const delta = choice?.delta?.content;
        finishReason = choice?.finish_reason || finishReason;

        // delta.content is string | null | undefined in OpenAI streaming API
        const textDelta = delta ?? "";

        if (textDelta) {
          fullText += textDelta;
          await ctx.runMutation(internal.messages.internalAppendStreamDelta, {
            messageId,
            deltaText: textDelta,
            parts: [{ type: "text", text: textDelta }],
            isFinal: false,
          });
        }
      }
    } catch (error) {
      console.error("OpenAI streaming error", error);
      await ctx.runMutation(internal.messages.internalAppendStreamDelta, {
        messageId,
        deltaText: `\n\n[Stream Error: ${error instanceof Error ? error.message : String(error)}]`,
        parts: [{ type: "error", data: String(error) }],
        isFinal: true,
      });
      throw error;
    }

    await ctx.runMutation(internal.messages.internalAppendStreamDelta, {
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

export const continueThread = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = args.model
      ? new Agent(components.agent, {
          name: "ShadowAgent",
          languageModel: openai.chat(args.model as any),
        })
      : shadowAgent;
    const result = await agent.generateText(
      ctx,
      { threadId: args.threadId },
      { prompt: args.prompt },
    );
    return {
      threadId: args.threadId,
      text: result.text,
      usage: result.usage,
    };
  },
});

export const analyzeCode = action({
  args: {
    code: v.string(),
    language: v.optional(v.string()),
    question: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const prompt = args.question
      ? `Analyze the following ${args.language || "code"}:\n\n\`\`\`${args.language || ""}\n${args.code}\n\`\`\`\n\nQuestion: ${args.question}`
      : `Analyze the following ${args.language || "code"} and provide insights about its functionality, potential issues, and improvements:\n\n\`\`\`${args.language || ""}\n${args.code}\n\`\`\``;
    const threadResult = await shadowAgent.createThread(ctx, {
      title: "Code Analysis",
    });
    const result = await shadowAgent.generateText(
      ctx,
      { threadId: threadResult.threadId },
      { prompt },
    );
    return {
      analysis: result.text,
      threadId: threadResult.threadId,
    };
  },
});

export const generateCode = action({
  args: {
    description: v.string(),
    language: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const prompt = args.context
      ? `Generate ${args.language} code for the following requirement:\n\n${args.description}\n\nContext:\n${args.context}`
      : `Generate ${args.language} code for the following requirement:\n\n${args.description}`;
    const threadResult = await shadowAgent.createThread(ctx, {
      title: `Code Generation: ${args.language}`,
    });
    const result = await shadowAgent.generateText(
      ctx,
      { threadId: threadResult.threadId },
      { prompt },
    );
    return {
      code: result.text,
      threadId: threadResult.threadId,
    };
  },
});

export const explainError = action({
  args: {
    error: v.string(),
    code: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let prompt = `Explain the following error and suggest how to fix it:\n\n${args.error}`;
    if (args.code) {
      prompt += `\n\nRelevant code:\n\`\`\`${args.language || ""}\n${args.code}\n\`\`\``;
    }
    const threadResult = await shadowAgent.createThread(ctx, {
      title: "Error Explanation",
    });
    const result = await shadowAgent.generateText(
      ctx,
      { threadId: threadResult.threadId },
      { prompt },
    );
    return {
      explanation: result.text,
      threadId: threadResult.threadId,
    };
  },
});

// Add type annotation to avoid circular type reference
export const chat: ReturnType<typeof action> = action({
  args: {
    taskId: v.id("tasks"),
    message: v.string(),
    model: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
    if (!task) {
      throw new Error("Task not found");
    }
    let threadId = args.threadId;
    if (!threadId) {
      const threadResult = await shadowAgent.createThread(ctx, {
        title: `Task: ${task.title || args.taskId}`,
      });
      threadId = threadResult.threadId;
    }
    const agent = args.model
      ? new Agent(components.agent, {
          name: "ShadowAgent",
          languageModel: openai.chat(args.model as any),
          instructions: `You are Shadow, an AI coding assistant working on the repository: ${task.repoFullName}. Help the user with their coding tasks.`,
        })
      : new Agent(components.agent, {
          name: "ShadowAgent",
          languageModel: openai.chat("gpt-4o"),
          instructions: `You are Shadow, an AI coding assistant working on the repository: ${task.repoFullName}. Help the user with their coding tasks.`,
        });
    const result = await agent.generateText(
      ctx,
      { threadId },
      { prompt: args.message },
    );
    return {
      threadId,
      response: result.text,
      usage: result.usage,
    };
  },
});

/**
 * Create an Agent with tools for a specific task
 * This is used for full autonomous coding sessions
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createTaskAgent(ctx: ActionCtx, taskId: Id<"tasks">, model?: string) {
  const tools = createAgentTools(ctx, taskId);

  return new Agent(components.agent, {
    name: "ShadowTaskAgent",
    languageModel: openai.chat((model as any) || "gpt-4o"),
    instructions: `You are Shadow, an AI coding assistant with access to tools for file operations, code search, and task management.

CRITICAL RULES:
1. Always read files before editing them
2. Use todo_write to track progress on multi-step tasks
3. Mark todos as in_progress before starting, completed when done
4. Only one todo should be in_progress at a time
5. Never mark as completed if tests fail or work is incomplete
6. Use grep_search or semantic_search to understand the codebase
7. Run terminal commands to test your changes`,
    tools,
  });
}

/**
 * Execute a task with full tool support
 * This action creates an Agent with tools and processes the message
 */
export const executeTaskWithTools: ReturnType<typeof action> = action({
  args: {
    taskId: v.id("tasks"),
    message: v.string(),
    model: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
    if (!task) {
      throw new Error("Task not found");
    }

    const agent = createTaskAgent(ctx, args.taskId, args.model);

    let threadId = args.threadId;
    if (!threadId) {
      const threadResult = await agent.createThread(ctx, {
        title: `Task: ${task.title || args.taskId}`,
      });
      threadId = threadResult.threadId;
    }

    const result = await agent.generateText(
      ctx,
      { threadId },
      { prompt: args.message },
    );

    return {
      threadId,
      response: result.text,
      usage: result.usage,
      toolCalls: result.toolCalls || [],
    };
  },
});

/**
 * Stream task execution with tools (for real-time UI updates)
 * This creates a streaming response that can be consumed by the frontend
 */
export const streamTaskWithTools: ReturnType<typeof action> = action({
  args: {
    taskId: v.id("tasks"),
    message: v.string(),
    model: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
    if (!task) {
      throw new Error("Task not found");
    }

    const agent = createTaskAgent(ctx, args.taskId, args.model);

    let threadId = args.threadId;
    if (!threadId) {
      const threadResult = await agent.createThread(ctx, {
        title: `Task: ${task.title || args.taskId}`,
      });
      threadId = threadResult.threadId;
    }

    // Create a message record in the database for streaming
    const start = await ctx.runMutation(internal.messages.internalStartStreaming, {
      taskId: args.taskId,
      llmModel: args.model,
    });
    const messageId = start.messageId;

    try {
      // Generate with tools
      const result = await agent.generateText(
        ctx,
        { threadId },
        { prompt: args.message },
      );

      // Update the message with the final result
      // Cast usage to any to handle different AI SDK versions
      const usageData: any = result.usage;
      await ctx.runMutation(internal.messages.internalAppendStreamDelta, {
        messageId,
        deltaText: result.text,
        parts: [{ type: "text", text: result.text }],
        usage: usageData ? {
          promptTokens: usageData.promptTokens || usageData.inputTokens || 0,
          completionTokens: usageData.completionTokens || usageData.outputTokens || 0,
          totalTokens: (usageData.promptTokens || usageData.inputTokens || 0) + (usageData.completionTokens || usageData.outputTokens || 0),
        } : undefined,
        isFinal: true,
      });

      return {
        threadId,
        messageId,
        response: result.text,
        usage: result.usage,
        toolCalls: result.toolCalls || [],
      };
    } catch (error) {
      // Mark message as error
      await ctx.runMutation(internal.messages.internalAppendStreamDelta, {
        messageId,
        deltaText: `\n\n[Error: ${error instanceof Error ? error.message : String(error)}]`,
        parts: [{ type: "error", data: String(error) }],
        isFinal: true,
      });
      throw error;
    }
  },
});
