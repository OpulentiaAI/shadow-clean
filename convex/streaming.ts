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
  console.log(`[STREAMING] ========== RESOLVE PROVIDER ==========`);
  console.log(`[STREAMING] Model requested: ${model}`);
  console.log(`[STREAMING] API keys from args:`);
  console.log(`[STREAMING]   - openrouter: ${apiKeys.openrouter ? `YES (${apiKeys.openrouter.length} chars, prefix: ${apiKeys.openrouter.substring(0, 8)}...)` : 'NO'}`);
  console.log(`[STREAMING]   - anthropic: ${apiKeys.anthropic ? `YES (${apiKeys.anthropic.length} chars)` : 'NO'}`);
  console.log(`[STREAMING]   - openai: ${apiKeys.openai ? `YES (${apiKeys.openai.length} chars)` : 'NO'}`);
  console.log(`[STREAMING] Environment variables:`);
  console.log(`[STREAMING]   - OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? `YES (${process.env.OPENROUTER_API_KEY.length} chars, prefix: ${process.env.OPENROUTER_API_KEY.substring(0, 8)}...)` : 'NO'}`);
  console.log(`[STREAMING]   - ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO'}`);
  console.log(`[STREAMING]   - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'YES' : 'NO'}`);

  // Prefer OpenRouter when provided (first-party requirement)
  if (apiKeys.openrouter) {
    const keyPrefix = apiKeys.openrouter.substring(0, 12);
    const keySuffix = apiKeys.openrouter.substring(apiKeys.openrouter.length - 4);
    const keyLength = apiKeys.openrouter.length;
    
    // Pre-flight validation: Check if key looks valid
    const isValidKeyFormat = apiKeys.openrouter.startsWith('sk-or-v1-') && keyLength > 20;
    console.log(`[STREAMING] >>> USING: OpenRouter with CLIENT-PROVIDED key: ${keyPrefix}...${keySuffix} (${keyLength} chars)`);
    console.log(`[STREAMING] Key format validation: ${isValidKeyFormat ? 'PASSED' : 'FAILED - key may be invalid!'}`);
    console.log(`[STREAMING] OpenRouter headers:`, JSON.stringify(OPENROUTER_HEADERS));
    
    if (!isValidKeyFormat) {
      console.error(`[STREAMING] !!! API KEY FORMAT INVALID !!!`);
      console.error(`[STREAMING] Expected: starts with 'sk-or-v1-', length > 20`);
      console.error(`[STREAMING] Got: starts with '${apiKeys.openrouter.substring(0, 9)}', length ${keyLength}`);
    }
    
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
    const keyPrefix = envOpenRouter.substring(0, 12);
    const keyLength = envOpenRouter.length;
    console.log(`[STREAMING] >>> USING: OpenRouter with ENVIRONMENT key: ${keyPrefix}... (${keyLength} chars)`);
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
      // Handle error with user-friendly message
      let userMessage = error instanceof Error ? error.message : String(error);
      
      if (userMessage.includes('No output generated') || userMessage.includes('AI_NoOutputGeneratedError')) {
        userMessage = 'The model returned no response. This usually happens due to rate limiting on free-tier models. Please try again or switch to a different model.';
      } else if (userMessage.includes('rate limit') || userMessage.includes('Rate limit')) {
        userMessage = 'Rate limit exceeded. Please wait a moment before trying again, or switch to a different model.';
      }
      
      await ctx.runMutation(api.messages.update, {
        messageId,
        content: `⚠️ ${userMessage}`,
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
    if (args.apiKeys?.openrouter) {
      console.log(`[STREAMING] OpenRouter key from args: ${args.apiKeys.openrouter.length} chars`);
    } else {
      console.log(`[STREAMING] No OpenRouter key in args, will check env`);
      console.log(`[STREAMING] Env OPENROUTER_API_KEY present: ${!!process.env.OPENROUTER_API_KEY}`);
    }

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
      console.log(`[STREAMING] Prompt preview: ${args.prompt?.substring(0, 100)}...`);
      console.log(`[STREAMING] System prompt length: ${args.systemPrompt?.length || 0}`);
      
      let result;
      try {
        result = await streamText({
          model: providerModel,
          prompt: args.prompt,
          system: args.systemPrompt,
          tools: aiTools,
          temperature: 0.7,
          abortSignal: controller.signal,
        });
        console.log(`[STREAMING] streamText promise resolved, processing stream...`);
      } catch (streamTextError) {
        console.error(`[STREAMING] streamText failed immediately:`, streamTextError);
        throw streamTextError;
      }

      let accumulatedText = "";
      let partCount = 0;

      console.log(`[STREAMING] Starting to iterate fullStream...`);
      // Stream all parts (text, tool calls, tool results)
      for await (const part of result.fullStream) {
        partCount++;
        if (partCount === 1) {
          console.log(`[STREAMING] Received first stream part, type: ${part.type}`);
        }
        // Handle error events from the stream
        if (part.type === "error") {
          const errorObj = part as any;
          console.error(`[STREAMING] Stream error event:`, errorObj.error);
          throw new Error(`Stream error: ${errorObj.error?.message || JSON.stringify(errorObj.error)}`);
        }
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

      console.log(`[STREAMING] Stream iteration complete, processed ${partCount} parts`);
      console.log(`[STREAMING] Accumulated text length: ${accumulatedText.length}`);
      
      // Check if we got any output - if not, this might be a model issue
      if (partCount === 0) {
        console.error(`[STREAMING] No stream parts received - model may have returned empty response`);
        throw new Error(`Model returned no output. This may be due to rate limiting or model unavailability. Try a different model.`);
      }
      
      // Finalize message
      const usage = normalizeUsage(await result.usage);
      const finishReason = await result.finishReason;
      console.log(`[STREAMING] Usage: ${JSON.stringify(usage)}, finishReason: ${finishReason}`);

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
      
      // Enhanced 401 debugging
      const errorStr = String(error);
      if (errorStr.includes('401') || (error instanceof Error && error.message.includes('401'))) {
        console.error(`[STREAMING] ====== 401 ERROR DETAILS ======`);
        console.error(`[STREAMING] API keys at time of error:`);
        console.error(`[STREAMING]   - args.apiKeys.openrouter: ${args.apiKeys?.openrouter ? `present (${args.apiKeys.openrouter.length} chars, prefix: ${args.apiKeys.openrouter.substring(0, 12)}...)` : 'MISSING'}`);
        console.error(`[STREAMING]   - OPENROUTER_API_KEY env: ${process.env.OPENROUTER_API_KEY ? `present (${process.env.OPENROUTER_API_KEY.length} chars, prefix: ${process.env.OPENROUTER_API_KEY.substring(0, 12)}...)` : 'MISSING'}`);
        console.error(`[STREAMING] Model being used: ${args.model}`);
        console.error(`[STREAMING] Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
        console.error(`[STREAMING] ====== END 401 ERROR DETAILS ======`);
      }
      
      // Format user-friendly error message
      let userMessage = error instanceof Error ? error.message : String(error);
      
      // Check for specific error types and provide better messages
      if (errorStr.includes('401') || userMessage.includes('401') || userMessage.includes('Unauthorized')) {
        userMessage = 'API authentication failed (401). The API key may be invalid or expired. Please check your API key configuration.';
      } else if (errorStr.includes('403') || userMessage.includes('403') || userMessage.includes('Forbidden')) {
        userMessage = 'API access forbidden (403). Your API key may not have permission to use this model.';
      } else if (userMessage.includes('No output generated') || userMessage.includes('AI_NoOutputGeneratedError')) {
        userMessage = 'The model returned no response. This usually happens due to rate limiting on free-tier models. Please try again or switch to a different model.';
      } else if (userMessage.includes('rate limit') || userMessage.includes('Rate limit') || errorStr.includes('429')) {
        userMessage = 'Rate limit exceeded. Please wait a moment before trying again, or switch to a different model.';
      } else if (userMessage.includes('quota')) {
        userMessage = 'API quota exceeded. Please check your API key credits or switch to a different provider.';
      }
      
      await ctx.runMutation(api.messages.update, {
        messageId,
        content: `⚠️ ${userMessage}`,
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
