import { action, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { components, internal, api } from "./_generated/api";
import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";

const shadowAgent = new Agent(components.agent, {
  name: "ShadowAgent",
  chat: openai.chat("gpt-4o"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
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
    const thread = await shadowAgent.createThread(ctx, {
      metadata: {
        taskId: args.taskId,
        userId: args.userId,
        ...args.metadata,
      },
    });
    return { threadId: thread };
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
      threadId = await shadowAgent.createThread(ctx, {});
    }
    const agent = args.systemPrompt
      ? new Agent(components.agent, {
          name: "ShadowAgent",
          chat: openai.chat((args.model as any) || "gpt-4o"),
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

export const streamText = action({
  args: {
    prompt: v.string(),
    threadId: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    let threadId = args.threadId;
    if (!threadId) {
      threadId = await shadowAgent.createThread(ctx, {
        metadata: { taskId: args.taskId },
      });
    }
    const agent = args.systemPrompt
      ? new Agent(components.agent, {
          name: "ShadowAgent",
          chat: openai.chat((args.model as any) || "gpt-4o"),
          instructions: args.systemPrompt,
        })
      : shadowAgent;
    const { stream } = await agent.streamText(ctx, { threadId }, { prompt: args.prompt });

    // Create a streaming assistant message
    const start = await ctx.runMutation(api.messages.startStreaming, {
      taskId: args.taskId as any,
      llmModel: args.model,
    });
    const messageId = start.messageId;

    let fullText = "";
    let usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } = {};
    let finishReason: string | undefined = undefined;

    for await (const chunk of stream) {
      if (chunk.type === "text-delta") {
        fullText += chunk.textDelta;
        await ctx.runMutation(api.messages.appendStreamDelta, {
          messageId,
          deltaText: chunk.textDelta,
          parts: [{ type: "text", text: chunk.textDelta }],
          isFinal: false,
        });
      } else if (chunk.type === "usage") {
        usage = {
          promptTokens: chunk.usage.promptTokens,
          completionTokens: chunk.usage.completionTokens,
          totalTokens: chunk.usage.totalTokens,
        };
      } else if (chunk.type === "finish") {
        finishReason = chunk.finishReason;
      } else {
        // Capture non-text streaming parts (tool calls, results, etc.)
        await ctx.runMutation(api.messages.appendStreamDelta, {
          messageId,
          deltaText: "",
          parts: [{ type: chunk.type, data: chunk }],
          isFinal: false,
        });
      }
    }

    // Finalize message with usage/finishReason
    await ctx.runMutation(api.messages.appendStreamDelta, {
      messageId,
      deltaText: "",
      parts: [],
      usage,
      finishReason,
      isFinal: true,
    });

    return {
      threadId,
      text: fullText,
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
          chat: openai.chat(args.model as any),
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
    const threadId = await shadowAgent.createThread(ctx, {
      metadata: { type: "code-analysis" },
    });
    const result = await shadowAgent.generateText(
      ctx,
      { threadId },
      { prompt },
    );
    return {
      analysis: result.text,
      threadId,
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
    const threadId = await shadowAgent.createThread(ctx, {
      metadata: { type: "code-generation", language: args.language },
    });
    const result = await shadowAgent.generateText(
      ctx,
      { threadId },
      { prompt },
    );
    return {
      code: result.text,
      threadId,
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
    const threadId = await shadowAgent.createThread(ctx, {
      metadata: { type: "error-explanation" },
    });
    const result = await shadowAgent.generateText(
      ctx,
      { threadId },
      { prompt },
    );
    return {
      explanation: result.text,
      threadId,
    };
  },
});

export const chat = action({
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
      threadId = await shadowAgent.createThread(ctx, {
        metadata: {
          taskId: args.taskId,
          repoFullName: task.repoFullName,
        },
      });
    }
    const agent = args.model
      ? new Agent(components.agent, {
          name: "ShadowAgent",
          chat: openai.chat(args.model as any),
          instructions: `You are Shadow, an AI coding assistant working on the repository: ${task.repoFullName}. Help the user with their coding tasks.`,
        })
      : new Agent(components.agent, {
          name: "ShadowAgent",
          chat: openai.chat("gpt-4o"),
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
