import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { type LanguageModel } from "ai";
import { createAgentTools } from "./agentTools";

// Track active stream controllers so cancelStream can abort in-flight actions
const streamControllers = new Map<string, AbortController>();

type ProviderOptions = {
  model: string;
  apiKeys: {
    anthropic?: string;
    openai?: string;
    openrouter?: string;
  };
};

const OPENROUTER_HEADERS = {
  "HTTP-Referer": process.env.OPENROUTER_REFERRER || "https://code.opulentia.ai",
  "X-Title": process.env.OPENROUTER_TITLE || "Shadow Agent",
};

function resolveProvider({ model, apiKeys }: ProviderOptions): LanguageModel {
  console.log(`[STREAMING] resolveProvider called for model: ${model}`);
  console.log(`[STREAMING] API keys check - openrouter: ${!!apiKeys.openrouter}, anthropic: ${!!apiKeys.anthropic}, openai: ${!!apiKeys.openai}`);

  // Prefer OpenRouter when provided (first-party requirement)
  if (apiKeys.openrouter) {
    console.log(`[STREAMING] Using OpenRouter with client-provided API key`);
    const openrouterClient = createOpenRouter({
      apiKey: apiKeys.openrouter,
      headers: OPENROUTER_HEADERS,
    });
    return openrouterClient.chat(model) as any;
  }

  if (apiKeys.anthropic) {
    console.log(`[STREAMING] Using Anthropic with client-provided API key`);
    return createAnthropic({ apiKey: apiKeys.anthropic })(model);
  }

  if (apiKeys.openai) {
    console.log(`[STREAMING] Using OpenAI with client-provided API key`);
    return createOpenAI({ apiKey: apiKeys.openai })(model);
  }

  // Fallback to environment keys to keep UI simple (no client key prompts)
  const envOpenRouter = process.env.OPENROUTER_API_KEY;
  if (envOpenRouter) {
    console.log(`[STREAMING] Using OpenRouter with environment API key`);
    const openrouterClient = createOpenRouter({
      apiKey: envOpenRouter,
      headers: OPENROUTER_HEADERS,
    });
    return openrouterClient.chat(model) as any;
  }

  const envAnthropic = process.env.ANTHROPIC_API_KEY;
  if (envAnthropic) {
    console.log(`[STREAMING] Using Anthropic with environment API key`);
    return createAnthropic({ apiKey: envAnthropic })(model);
  }

  const envOpenAI = process.env.OPENAI_API_KEY;
  if (envOpenAI) {
    console.log(`[STREAMING] Using OpenAI with environment API key`);
    return createOpenAI({ apiKey: envOpenAI })(model);
  }

  console.error(`[STREAMING] No API key found for model: ${model}`);
  throw new Error("No API key provided");
}

function normalizeUsage(usage: any | undefined) {
  if (!usage) return undefined;
  const promptTokens =
    usage.promptTokens ??
    usage.inputTokens ??
    usage.prompt ??
    0;
  const completionTokens =
    usage.completionTokens ??
    usage.outputTokens ??
    usage.completion ??
    0;
  const totalTokens =
    usage.totalTokens ??
    usage.total ??
    promptTokens + completionTokens;

  return { promptTokens, completionTokens, totalTokens };
}

// Return type for streamChat action
type StreamChatResult = {
  success: boolean;
  messageId: Id<"chatMessages">;
  text: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
};

// Return type for streamChatWithTools action
type StreamChatWithToolsResult = {
  success: boolean;
  messageId: Id<"chatMessages">;
  text: string;
  toolCallIds: string[];
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
};

/**
 * Streaming chat action using Convex's native streaming support
 * Replaces Socket.IO streaming with Convex actions + subscriptions
 */
export const streamChat = action({
  args: {
    taskId: v.id("tasks"),
    prompt: v.string(),
    model: v.string(),
    systemPrompt: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    apiKeys: v.object({
      anthropic: v.optional(v.string()),
      openai: v.optional(v.string()),
      openrouter: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args): Promise<StreamChatResult> => {
    // Get task details
    const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
    if (!task) {
      throw new Error("Task not found");
    }

    // Initialize streaming message
    const { messageId } = await ctx.runMutation(api.messages.startStreaming, {
      taskId: args.taskId,
      llmModel: args.llmModel,
    });

    try {
      // Import AI SDK dynamically (server-side only)
      const { streamText } = await import("ai");
      const providerModel = resolveProvider({
        model: args.model,
        apiKeys: args.apiKeys || {},
      });
      const controller = new AbortController();
      streamControllers.set(messageId, controller);

      // Start streaming
      const result = await streamText({
        model: providerModel,
        prompt: args.prompt,
        system: args.systemPrompt,
        temperature: 0.7,
        abortSignal: controller.signal,
      });

      // Stream text chunks
      let accumulatedText = "";
      for await (const delta of result.textStream) {
        accumulatedText += delta;

        // Update message with delta
        await ctx.runMutation(api.messages.appendStreamDelta, {
          messageId,
          deltaText: delta,
          isFinal: false,
        });
      }

      // Finalize message
      const usage = normalizeUsage(await result.usage);
      const finishReason = await result.finishReason;

      await ctx.runMutation(api.messages.update, {
        messageId,
        content: accumulatedText,
        promptTokens: usage?.promptTokens,
        completionTokens: usage?.completionTokens,
        totalTokens: usage?.totalTokens,
        finishReason: finishReason ?? undefined,
      });

      return {
        success: true,
        messageId,
        text: accumulatedText,
        usage: usage ?? undefined,
      };
    } catch (error) {
      // Handle error
      await ctx.runMutation(api.messages.update, {
        messageId,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });

      throw error;
    }
    finally {
      streamControllers.delete(messageId);
    }
  },
});

/**
 * Streaming chat with tool calling support
 * Full replacement for Socket.IO agent streaming
 */
export const streamChatWithTools = action({
  args: {
    taskId: v.id("tasks"),
    prompt: v.string(),
    model: v.string(),
    systemPrompt: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    tools: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.string(),
          parameters: v.any(),
        })
      )
    ),
    apiKeys: v.object({
      anthropic: v.optional(v.string()),
      openai: v.optional(v.string()),
      openrouter: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args): Promise<StreamChatWithToolsResult> => {
    console.log(`[STREAMING] streamChatWithTools called for task ${args.taskId}`);
    console.log(`[STREAMING] Model: ${args.model}, prompt length: ${args.prompt?.length || 0}`);
    console.log(`[STREAMING] API keys present - anthropic: ${!!args.apiKeys?.anthropic}, openai: ${!!args.apiKeys?.openai}, openrouter: ${!!args.apiKeys?.openrouter}`);

    // Get task details
    const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
    if (!task) {
      console.error(`[STREAMING] Task not found: ${args.taskId}`);
      throw new Error("Task not found");
    }
    console.log(`[STREAMING] Task found: ${task._id}`);

    // Initialize streaming message
    console.log(`[STREAMING] Starting streaming message`);
    const { messageId } = await ctx.runMutation(api.messages.startStreaming, {
      taskId: args.taskId,
      llmModel: args.llmModel,
    });
    console.log(`[STREAMING] Streaming message created: ${messageId}`);

    try {
      // Import AI SDK dynamically
      console.log(`[STREAMING] Importing AI SDK and resolving provider`);
      const { streamText } = await import("ai");
      const providerModel = resolveProvider({
        model: args.model,
        apiKeys: args.apiKeys || {},
      });
      console.log(`[STREAMING] Provider resolved for model: ${args.model}`);
      const controller = new AbortController();
      streamControllers.set(messageId, controller);

      // Build allowed tools from the Convex agent toolset; optionally filter by requested names
      const availableTools = createAgentTools(ctx as any, args.taskId);
      const requestedNames = args.tools?.map((t) => t.name) ?? null;
      const aiTools = Object.fromEntries(
        Object.entries(availableTools).filter(([name]) =>
          requestedNames ? requestedNames.includes(name) : true
        )
      );
      if (requestedNames && Object.keys(aiTools).length === 0) {
        throw new Error(
          `No matching tools were found for requested tools: ${requestedNames.join(", ")}`
        );
      }

      const toolCallIds: string[] = [];

      // Start streaming with tools
      console.log(`[STREAMING] Starting streamText with ${Object.keys(aiTools).length} tools`);
      const result = await streamText({
        model: providerModel,
        prompt: args.prompt,
        system: args.systemPrompt,
        tools: aiTools,
        temperature: 0.7,
        abortSignal: controller.signal,
      });
      console.log(`[STREAMING] streamText initiated, processing stream...`);

      let accumulatedText = "";

      // Stream all parts (text, tool calls, tool results)
      for await (const part of result.fullStream) {
        if (part.type === "text-delta") {
          accumulatedText += part.text;

          await ctx.runMutation(api.messages.appendStreamDelta, {
            messageId,
            deltaText: part.text,
            isFinal: false,
          });
        } else if (part.type === "tool-call") {
          const toolCallId = (part as any).toolCallId ?? (part as any).id;
          const toolName = (part as any).toolName ?? (part as any).name ?? "unknown-tool";
          const toolArgs = (part as any).args ?? (part as any).input;
          if (!toolCallId) {
            continue;
          }

          await ctx.runMutation(api.toolCallTracking.create, {
            messageId,
            taskId: args.taskId,
            toolName,
            args: toolArgs,
            toolCallId,
            status: "RUNNING",
          });
          toolCallIds.push(toolCallId);
        } else if (part.type === "tool-result") {
          const toolCallId = (part as any).toolCallId ?? (part as any).id;
          const toolResult = (part as any).result ?? (part as any).output;
          if (!toolCallId) continue;

          await ctx.runMutation(api.toolCallTracking.updateResult, {
            toolCallId,
            result: toolResult,
            status: "COMPLETED",
          });
        }
      }

      // Finalize message
      const usage = normalizeUsage(await result.usage);
      const finishReason = await result.finishReason;

      await ctx.runMutation(api.messages.update, {
        messageId,
        content: accumulatedText,
        promptTokens: usage?.promptTokens,
        completionTokens: usage?.completionTokens,
        totalTokens: usage?.totalTokens,
        finishReason: finishReason ?? undefined,
      });

      console.log(`[STREAMING] Streaming completed successfully, text length: ${accumulatedText.length}`);
      return {
        success: true,
        messageId,
        text: accumulatedText,
        toolCallIds,
        usage: usage ?? undefined,
      };
    } catch (error) {
      console.error(`[STREAMING] Error during streaming:`, error);
      if (error instanceof Error) {
        console.error(`[STREAMING] Error stack:`, error.stack);
      }
      await ctx.runMutation(api.messages.update, {
        messageId,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });

      throw error;
    }
    finally {
      streamControllers.delete(messageId);
    }
  },
});

/**
 * Cancel streaming action
 */
export const cancelStream = action({
  args: {
    messageId: v.id("chatMessages"),
  },
  handler: async (ctx, args) => {
    // Abort active stream if present
    const controller = streamControllers.get(args.messageId);
    if (controller) {
      controller.abort();
      streamControllers.delete(args.messageId);
    }

    // Mark message as stopped
    await ctx.runMutation(api.messages.update, {
      messageId: args.messageId,
      finishReason: "stop",
    });

    return { success: true };
  },
});

/**
 * Resume streaming from a previous message
 */
export const resumeStream = action({
  args: {
    taskId: v.id("tasks"),
    fromMessageId: v.id("chatMessages"),
    prompt: v.string(),
    model: v.string(),
    systemPrompt: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    apiKeys: v.object({
      anthropic: v.optional(v.string()),
      openai: v.optional(v.string()),
      openrouter: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args): Promise<StreamChatResult> => {
    // Get the from message to find its sequence
    const fromMessage = await ctx.runQuery(api.messages.get, {
      messageId: args.fromMessageId,
    });

    if (!fromMessage) {
      throw new Error("From message not found");
    }

    // Remove all messages after the from message
    await ctx.runMutation(api.messages.removeAfterSequence, {
      taskId: args.taskId,
      sequence: fromMessage.sequence,
    });

    // Now create a new streaming message using the public API
    return ctx.runAction(api.streaming.streamChat, {
      taskId: args.taskId,
      prompt: args.prompt,
      model: args.model,
      systemPrompt: args.systemPrompt,
      llmModel: args.llmModel,
      apiKeys: args.apiKeys,
    });
  },
});
