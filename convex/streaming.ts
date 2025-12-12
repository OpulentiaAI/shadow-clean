import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
// createOpenRouter removed in favor of createOpenAI configuration
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
  "HTTP-Referer":
    process.env.OPENROUTER_REFERRER || "https://code.opulentia.ai",
  "X-Title": process.env.OPENROUTER_TITLE || "Shadow Agent",
};

function resolveProvider({ model, apiKeys }: ProviderOptions): LanguageModel {
  console.log(`[STREAMING] ========== RESOLVE PROVIDER ==========`);
  console.log(`[STREAMING] Model requested: ${model}`);
  console.log(`[STREAMING] API keys from args:`);
  console.log(
    `[STREAMING]   - openrouter: ${apiKeys.openrouter ? `YES (${apiKeys.openrouter.length} chars, prefix: ${apiKeys.openrouter.substring(0, 8)}...)` : "NO"}`
  );
  console.log(
    `[STREAMING]   - anthropic: ${apiKeys.anthropic ? `YES (${apiKeys.anthropic.length} chars)` : "NO"}`
  );
  console.log(
    `[STREAMING]   - openai: ${apiKeys.openai ? `YES (${apiKeys.openai.length} chars)` : "NO"}`
  );
  console.log(`[STREAMING] Environment variables:`);
  console.log(
    `[STREAMING]   - OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? `YES (${process.env.OPENROUTER_API_KEY.length} chars, prefix: ${process.env.OPENROUTER_API_KEY.substring(0, 8)}...)` : "NO"}`
  );
  console.log(
    `[STREAMING]   - ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? "YES" : "NO"}`
  );
  console.log(
    `[STREAMING]   - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "YES" : "NO"}`
  );

  // Prefer OpenRouter when provided (first-party requirement)
  if (apiKeys.openrouter) {
    const keyPrefix = apiKeys.openrouter.substring(0, 12);
    const keySuffix = apiKeys.openrouter.substring(
      apiKeys.openrouter.length - 4
    );
    const keyLength = apiKeys.openrouter.length;

    // Pre-flight validation: Check if key looks valid
    const isValidKeyFormat =
      apiKeys.openrouter.startsWith("sk-or-v1-") && keyLength > 20;
    console.log(
      `[STREAMING] >>> USING: OpenRouter (via OpenAI provider) with CLIENT-PROVIDED key: ${keyPrefix}...${keySuffix} (${keyLength} chars)`
    );
    console.log(
      `[STREAMING] Key format validation: ${isValidKeyFormat ? "PASSED" : "FAILED - key may be invalid!"}`
    );
    console.log(
      `[STREAMING] OpenRouter headers:`,
      JSON.stringify(OPENROUTER_HEADERS)
    );

    if (!isValidKeyFormat) {
      console.error(`[STREAMING] !!! API KEY FORMAT INVALID !!!`);
      console.error(
        `[STREAMING] Expected: starts with 'sk-or-v1-', length > 20`
      );
      console.error(
        `[STREAMING] Got: starts with '${apiKeys.openrouter.substring(0, 9)}', length ${keyLength}`
      );
    }

    const openrouter = createOpenAI({
      apiKey: apiKeys.openrouter,
      baseURL: "https://openrouter.ai/api/v1",
      headers: OPENROUTER_HEADERS,
    });
    return openrouter(model);
  }

  if (apiKeys.anthropic) {
    console.log(`[STREAMING] Using Anthropic with client-provided API key`);
    return createAnthropic({ apiKey: apiKeys.anthropic })(model);
  }

  if (apiKeys.openai) {
    console.log(`[STREAMING] Using OpenAI with client-provided API key`);
    return createOpenAI({ apiKey: apiKeys.openai })(model);
  }

  const envOpenRouter = process.env.OPENROUTER_API_KEY;
  if (envOpenRouter) {
    const keyPrefix = envOpenRouter.substring(0, 12);
    const keyLength = envOpenRouter.length;
    console.log(
      `[STREAMING] >>> USING: OpenRouter (via OpenAI provider) with ENVIRONMENT key: ${keyPrefix}... (${keyLength} chars)`
    );
    const openrouter = createOpenAI({
      apiKey: envOpenRouter,
      baseURL: "https://openrouter.ai/api/v1",
      headers: OPENROUTER_HEADERS,
    });
    return openrouter(model);
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
    usage.promptTokens ?? usage.inputTokens ?? usage.prompt ?? 0;
  const completionTokens =
    usage.completionTokens ?? usage.outputTokens ?? usage.completion ?? 0;
  const totalTokens =
    usage.totalTokens ?? usage.total ?? promptTokens + completionTokens;

  return { promptTokens, completionTokens, totalTokens };
}

// Return type for streamChat action
type StreamChatResult = {
  success: boolean;
  messageId: Id<"chatMessages">;
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

// Return type for streamChatWithTools action
type StreamChatWithToolsResult = {
  success: boolean;
  messageId: Id<"chatMessages">;
  text: string;
  toolCallIds: string[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
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

      if (
        userMessage.includes("No output generated") ||
        userMessage.includes("AI_NoOutputGeneratedError")
      ) {
        userMessage =
          "The model returned no response. This usually happens due to rate limiting on free-tier models. Please try again or switch to a different model.";
      } else if (
        userMessage.includes("rate limit") ||
        userMessage.includes("Rate limit")
      ) {
        userMessage =
          "Rate limit exceeded. Please wait a moment before trying again, or switch to a different model.";
      }

      await ctx.runMutation(api.messages.update, {
        messageId,
        content: `⚠️ ${userMessage}`,
      });

      throw error;
    } finally {
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
    console.log(`[STREAMING] === ACTION START [v7-start-marker-6c21] ===`);
    console.log(
      `[STREAMING] streamChatWithTools called for task ${args.taskId}`
    );
    console.log(
      `[STREAMING] Model: ${args.model}, prompt length: ${args.prompt?.length || 0}`
    );
    console.log(
      `[STREAMING] API keys present - anthropic: ${!!args.apiKeys?.anthropic}, openai: ${!!args.apiKeys?.openai}, openrouter: ${!!args.apiKeys?.openrouter}`
    );
    if (args.apiKeys?.openrouter) {
      console.log(
        `[STREAMING] OpenRouter key from args: ${args.apiKeys.openrouter.length} chars`
      );
    } else {
      console.log(`[STREAMING] No OpenRouter key in args, will check env`);
      console.log(
        `[STREAMING] Env OPENROUTER_API_KEY present: ${!!process.env.OPENROUTER_API_KEY}`
      );
    }

    // Get task details
    const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
    if (!task) {
      console.error(`[STREAMING] Task not found: ${args.taskId}`);
      throw new Error("Task not found");
    }
    console.log(`[STREAMING] Task found: ${task._id}`);
    console.log(
      `[STREAMING] Task workspacePath: ${(task as any)?.workspacePath ?? "null"}`
    );

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
      const { streamText, stepCountIs } = await import("ai");
      const providerModel = resolveProvider({
        model: args.model,
        apiKeys: args.apiKeys || {},
      });
      console.log(`[STREAMING] Provider resolved for model: ${args.model}`);
      const controller = new AbortController();
      streamControllers.set(messageId, controller);

      // Build allowed tools from the Convex agent toolset; optionally filter by requested names
      const availableTools = createAgentTools(
        ctx as any,
        args.taskId,
        (task as any)?.workspacePath
      );
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
      console.log(
        `[STREAMING] Starting streamText with ${Object.keys(aiTools).length} tools`
      );
      console.log(
        `[STREAMING] Prompt preview: ${args.prompt?.substring(0, 100)}...`
      );
      console.log(
        `[STREAMING] System prompt length: ${args.systemPrompt?.length || 0}`
      );

      const basePrompt = args.prompt;
      const MAX_AGENT_STEPS = 64;
      const MAX_TOOL_TRANSCRIPT_CHARS = 30000;
      const MAX_SINGLE_TOOL_RESULT_CHARS = 12000;

      let accumulatedText = "";

      const toolCallStates = new Map<
        string,
        { toolName: string; accumulatedArgsText: string; latestArgs: any }
      >();
      const knownToolCalls = new Set<string>();
      const completedToolCalls = new Set<string>();
      let toolCallNamespace = 0;
      let toolTranscript = "";

      const formatForPrompt = (value: unknown): string => {
        try {
          const text = JSON.stringify(value);
          if (text.length <= MAX_SINGLE_TOOL_RESULT_CHARS) return text;
          return `${text.slice(0, MAX_SINGLE_TOOL_RESULT_CHARS)}... (truncated)`;
        } catch {
          return String(value);
        }
      };

      const appendToolTranscript = (entry: {
        toolCallId: string;
        toolName: string;
        args: unknown;
        result: unknown;
      }) => {
        toolTranscript += `\n\n[Tool ${entry.toolName} completed]\nToolCallId: ${entry.toolCallId}\nArgs: ${formatForPrompt(entry.args)}\nResult: ${formatForPrompt(entry.result)}\n`;
        if (toolTranscript.length > MAX_TOOL_TRANSCRIPT_CHARS) {
          toolTranscript = toolTranscript.slice(-MAX_TOOL_TRANSCRIPT_CHARS);
        }
      };

      const buildContinuationPrompt = (): string => {
        return `${basePrompt}

You are exploring the codebase step-by-step. Continue from the latest tool results below.
If you need more information, call another tool. If you have enough information, write your response.

Latest tool results:
${toolTranscript || "(none)"}

Continue now.`;
      };

      const extractJsonArgsFromPrompt = (
        prompt: string
      ): Record<string, unknown> | null => {
        const markerIdx = prompt.indexOf("JSON args:");
        const searchStart =
          markerIdx >= 0 ? markerIdx + "JSON args:".length : 0;
        const s = prompt.slice(searchStart);

        const firstBrace = s.indexOf("{");
        if (firstBrace < 0) return null;

        // Find matching closing brace with a simple brace counter.
        let depth = 0;
        let end = -1;
        for (let i = firstBrace; i < s.length; i++) {
          const ch = s[i];
          if (ch === "{") depth++;
          if (ch === "}") {
            depth--;
            if (depth === 0) {
              end = i;
              break;
            }
          }
        }
        if (end < 0) return null;

        const jsonText = s.slice(firstBrace, end + 1).trim();
        try {
          const parsed = JSON.parse(jsonText);
          if (parsed && typeof parsed === "object") {
            return parsed as Record<string, unknown>;
          }
        } catch {
          // ignore
        }
        return null;
      };

      const normalizeToolCallId = (raw: string): string => {
        const id = String(raw ?? "").trim();
        // Provider-native unique ids (OpenAI style) - keep as-is.
        if (
          id.startsWith("call_") ||
          id.startsWith("toolu_") ||
          id.startsWith("tool-") ||
          id.includes("-")
        ) {
          return id;
        }
        // Many providers use small ids like "read_file:0" or "functions.list_dir:0"
        // which collide across messages. Namespace them by messageId.
        // If we need to re-invoke streamText (some providers finish with stop after tool-input-*),
        // add a namespace to avoid collisions when providers reuse small ids across calls.
        return toolCallNamespace > 0
          ? `${messageId}:${toolCallNamespace}:${id}`
          : `${messageId}:${id}`;
      };

      const ensureToolTracking = async (
        toolCallId: string,
        toolName: string,
        toolArgs: any
      ) => {
        if (knownToolCalls.has(toolCallId)) return;

        await ctx.runMutation(api.toolCallTracking.create, {
          messageId,
          taskId: args.taskId,
          toolName,
          args: toolArgs,
          toolCallId,
          status: "RUNNING",
        });
        toolCallIds.push(toolCallId);
        knownToolCalls.add(toolCallId);
      };

      let hasAnyUsage = false;
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let totalTokens = 0;
      let finalFinishReason: unknown = undefined;

      for (let round = 0; round < MAX_AGENT_STEPS; round++) {
        toolCallNamespace = round;
        const promptForRound =
          round === 0 ? basePrompt : buildContinuationPrompt();
        const roundToolCallIds = new Set<string>();
        let roundPartCount = 0;

        const completedBefore = completedToolCalls.size;
        const textBeforeLen = accumulatedText.length;

        let result: Awaited<ReturnType<typeof streamText>>;
        try {
          result = await streamText({
            model: providerModel,
            prompt: promptForRound,
            system: args.systemPrompt,
            tools: aiTools,
            temperature: 0.7,
            // AI SDK v5+: use stopWhen to allow multi-step tool execution
            stopWhen: stepCountIs(MAX_AGENT_STEPS),
            abortSignal: controller.signal,
          } as Parameters<typeof streamText>[0]);
          console.log(
            `[STREAMING] streamText promise resolved, processing stream... (round=${round}, promptLen=${promptForRound.length})`
          );
        } catch (streamTextError) {
          console.error(
            `[STREAMING] streamText failed immediately (round=${round}):`,
            streamTextError
          );
          throw streamTextError;
        }

        console.log(`[STREAMING] Starting to iterate fullStream...`);
        // Stream all parts (text, tool calls, tool results)
        for await (const part of result.fullStream as any) {
          const partType = (part as any).type as string;
          roundPartCount++;
          if (roundPartCount === 1) {
            console.log(
              `[STREAMING] Received first stream part, type: ${partType}`
            );
          }
          // Avoid log overflow: only log tool start/result events (not every delta).
          if (
            partType === "tool-input-start" ||
            partType === "tool-call-start" ||
            partType === "tool-call" ||
            partType === "tool-result"
          ) {
            console.log(
              `[STREAMING] TOOL STREAM PART type=${partType} payload=${JSON.stringify(part).substring(0, 500)}`
            );
          }
          // Handle error events from the stream
          if (partType === "error") {
            const errorObj = part as any;
            console.error(`[STREAMING] Stream error event:`, errorObj.error);
            throw new Error(
              `Stream error: ${errorObj.error?.message || JSON.stringify(errorObj.error)}`
            );
          }
          if (partType === "text-delta") {
            accumulatedText += part.text;

            await ctx.runMutation(api.messages.appendStreamDelta, {
              messageId,
              deltaText: part.text,
              isFinal: false,
              parts: [
                {
                  type: "text",
                  text: part.text,
                },
              ],
            });
          } else if (
            partType === "tool-call-delta" ||
            partType === "tool_call_delta" ||
            // AI SDK v5 (some providers) streams tool args as tool-input-*
            partType === "tool-input-start" ||
            partType === "tool-input-delta" ||
            partType === "tool-call-start"
          ) {
            const rawToolCallId = (part as any).toolCallId ?? (part as any).id;
            const toolCallIdRaw = rawToolCallId
              ? String(rawToolCallId).trim()
              : "";
            const toolCallId = toolCallIdRaw
              ? normalizeToolCallId(toolCallIdRaw)
              : "";

            const rawToolName =
              (part as any).toolName ?? (part as any).name ?? "unknown-tool";
            const incomingToolName = rawToolName
              ? String(rawToolName).trim()
              : "";

            const argsText =
              (part as any).argsText ??
              (part as any).delta ?? // tool-input-delta
              (part as any).text ??
              (typeof (part as any).args === "string"
                ? (part as any).args
                : "");
            const argsObject =
              (part as any).args ?? (part as any).input ?? undefined;

            if (!toolCallId) continue;
            roundToolCallIds.add(toolCallId);

            const existing = toolCallStates.get(toolCallId);
            const currentState = existing ?? {
              toolName: incomingToolName || "unknown-tool",
              accumulatedArgsText: "",
              latestArgs: {},
            };

            // Preserve toolName from tool-input-start when tool-input-delta has none.
            if (
              incomingToolName &&
              incomingToolName !== "unknown-tool" &&
              currentState.toolName === "unknown-tool"
            ) {
              currentState.toolName = incomingToolName;
            }

            if (argsText) {
              currentState.accumulatedArgsText += String(argsText);
              // Best-effort parse of streamed JSON args
              try {
                const parsed = JSON.parse(currentState.accumulatedArgsText);
                if (parsed && typeof parsed === "object") {
                  currentState.latestArgs = {
                    ...(currentState.latestArgs ?? {}),
                    ...(parsed as Record<string, unknown>),
                  };
                }
              } catch {
                // Not valid JSON yet; keep accumulating.
              }
            }

            if (argsObject && typeof argsObject === "object") {
              currentState.latestArgs = {
                ...(currentState.latestArgs ?? {}),
                ...(argsObject as Record<string, unknown>),
              };
            }

            toolCallStates.set(toolCallId, currentState);
            await ensureToolTracking(
              toolCallId,
              currentState.toolName,
              currentState.latestArgs
            );

            await ctx.runMutation(api.messages.appendStreamDelta, {
              messageId,
              deltaText: "",
              isFinal: false,
              parts: [
                {
                  type: "tool-call",
                  toolCallId,
                  toolName: currentState.toolName,
                  args: currentState.latestArgs,
                  partialArgs: currentState.latestArgs,
                  streamingState: "streaming",
                  argsComplete: false,
                  accumulatedArgsText: currentState.accumulatedArgsText,
                },
              ],
            });
          } else if (partType === "tool-call") {
            const rawToolCallId = (part as any).toolCallId ?? (part as any).id;
            const toolCallIdRaw = rawToolCallId
              ? String(rawToolCallId).trim()
              : "";
            const toolCallId = toolCallIdRaw
              ? normalizeToolCallId(toolCallIdRaw)
              : "";
            const toolName =
              (part as any).toolName ?? (part as any).name ?? "unknown-tool";
            const toolArgs = (part as any).args ?? (part as any).input;
            if (!toolCallId) {
              continue;
            }
            roundToolCallIds.add(toolCallId);

            const currentState = toolCallStates.get(toolCallId) ?? {
              toolName,
              accumulatedArgsText: "",
              latestArgs: {},
            };

            if (toolArgs && typeof toolArgs === "object") {
              currentState.latestArgs = {
                ...(currentState.latestArgs ?? {}),
                ...(toolArgs as Record<string, unknown>),
              };
            }

            toolCallStates.set(toolCallId, currentState);
            await ensureToolTracking(
              toolCallId,
              toolName,
              currentState.latestArgs
            );

            await ctx.runMutation(api.messages.appendStreamDelta, {
              messageId,
              deltaText: "",
              isFinal: false,
              parts: [
                {
                  type: "tool-call",
                  toolCallId,
                  toolName,
                  args: currentState.latestArgs,
                  partialArgs: currentState.latestArgs,
                  streamingState: "complete",
                  argsComplete: true,
                  accumulatedArgsText: currentState.accumulatedArgsText,
                },
              ],
            });
          } else if (partType === "tool-result") {
            const rawToolCallId = (part as any).toolCallId ?? (part as any).id;
            const toolCallIdRaw = rawToolCallId
              ? String(rawToolCallId).trim()
              : "";
            const toolCallId = toolCallIdRaw
              ? normalizeToolCallId(toolCallIdRaw)
              : "";
            const toolName =
              (part as any).toolName ??
              toolCallStates.get(toolCallId)?.toolName ??
              "unknown-tool";
            const toolResult = (part as any).result ?? (part as any).output;
            if (!toolCallId) continue;
            roundToolCallIds.add(toolCallId);

            await ctx.runMutation(api.toolCallTracking.updateResult, {
              toolCallId,
              result: toolResult,
              status: "COMPLETED",
            });

            await ctx.runMutation(api.messages.appendStreamDelta, {
              messageId,
              deltaText: "",
              isFinal: false,
              parts: [
                {
                  type: "tool-result",
                  toolCallId,
                  toolName,
                  result: toolResult,
                },
              ],
            });

            completedToolCalls.add(toolCallId);
            appendToolTranscript({
              toolCallId,
              toolName,
              args: toolCallStates.get(toolCallId)?.latestArgs ?? {},
              result: toolResult,
            });
          }
        }

        console.log(
          `[STREAMING] Stream iteration complete, processed ${roundPartCount} parts (round=${round})`
        );
        console.log(
          `[STREAMING] Accumulated text length: ${accumulatedText.length}`
        );

        // Check if we got any output - if not, this might be a model issue
        if (roundPartCount === 0) {
          console.error(
            `[STREAMING] No stream parts received - model may have returned empty response`
          );
          throw new Error(
            `Model returned no output. This may be due to rate limiting or model unavailability. Try a different model.`
          );
        }

        // [v6] Execute any pending tool calls that weren't auto-executed by AI SDK
        // This handles providers that emit tool-input-* parts then finish with stop.
        console.log(
          `[STREAMING] [v6] Checking pending tools (round=${round}): toolStates=${toolCallStates.size}, roundTools=${roundToolCallIds.size}, toolCount=${Object.keys(aiTools).length}`
        );
        if (roundToolCallIds.size > 0 && Object.keys(aiTools).length > 0) {
          for (const toolCallId of roundToolCallIds) {
            if (completedToolCalls.has(toolCallId)) continue;
            const state = toolCallStates.get(toolCallId);
            if (!state) continue;

            console.log(
              `[STREAMING] [v6] Tool state: id=${toolCallId}, name=${state.toolName}, argKeys=${Object.keys(state.latestArgs).join(",")}`
            );
            const toolDef = (aiTools as any)[state.toolName];
            const execArgs: Record<string, unknown> = {
              ...(state.latestArgs ?? {}),
            };
            // If provider didn't stream args, try to recover them from the prompt (CLI testing mode).
            if (Object.keys(execArgs).length === 0) {
              const recovered = extractJsonArgsFromPrompt(promptForRound);
              if (recovered) {
                console.log(
                  `[STREAMING] [v6] Recovered tool args from prompt for ${state.toolName}: ${Object.keys(recovered).join(",")}`
                );
                Object.assign(execArgs, recovered);
              }
            }
            // Some providers emit tool-input-start without args; for list_dir we can safely default.
            if (
              state.toolName === "list_dir" &&
              Object.keys(execArgs).length === 0
            ) {
              execArgs.relative_workspace_path = ".";
              execArgs.explanation = "Auto-filled missing tool args";
            }

            if (toolDef?.execute && Object.keys(execArgs).length > 0) {
              console.log(`[STREAMING] [v6] Executing ${state.toolName}...`);
              try {
                console.log(`[STREAMING] [v7] DIRECT_CALL_MARKER`);
                // Prefer direct HTTP execution for server-backed tools so we can
                // pass workspacePath explicitly (avoids tool API needing to read task from Convex).
                // Prefer the actual task workspace when available; fall back to /workspace
                // (guaranteed to exist on the Railway tool server container) for CLI testing.
                // If this task doesn't have an initialized workspace directory on the tool server,
                // fall back to /workspace so CLI tool execution can still be verified.
                const candidateTaskWorkspace = (task as any)?.workspacePath as
                  | string
                  | undefined;
                const workspacePathOverride =
                  candidateTaskWorkspace || "/workspace";
                const serverUrl =
                  process.env.SHADOW_SERVER_URL || "http://localhost:4000";
                const toolApiKey =
                  process.env.CONVEX_TOOL_API_KEY || "shadow-internal-tool-key";

                let toolResult: unknown;
                if (state.toolName === "list_dir") {
                  console.log(
                    `[STREAMING] [v7] Using direct tool API call (workspaceOverride=${workspacePathOverride})`
                  );
                  const resp = await fetch(
                    `${serverUrl}/api/tools/${args.taskId}/list_dir`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "x-convex-tool-key": toolApiKey,
                        "x-shadow-workspace-path": workspacePathOverride,
                      },
                      body: JSON.stringify(execArgs),
                    }
                  );
                  if (!resp.ok) {
                    const errorText = await resp.text();
                    throw new Error(
                      `Tool API error: ${resp.status} - ${errorText}`
                    );
                  }
                  toolResult = await resp.json();
                  // If the workspace path doesn't exist on the tool server, retry against /workspace
                  // so we can still validate tool execution end-to-end in CLI.
                  if (
                    (toolResult as any)?.success === false &&
                    typeof (toolResult as any)?.error === "string" &&
                    ((toolResult as any).error as string).includes("ENOENT") &&
                    workspacePathOverride !== "/workspace"
                  ) {
                    console.log(
                      `[STREAMING] [v7] list_dir ENOENT on ${workspacePathOverride}, retrying with /workspace`
                    );
                    const retryResp = await fetch(
                      `${serverUrl}/api/tools/${args.taskId}/list_dir`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "x-convex-tool-key": toolApiKey,
                          "x-shadow-workspace-path": "/workspace",
                        },
                        body: JSON.stringify(execArgs),
                      }
                    );
                    if (!retryResp.ok) {
                      const retryText = await retryResp.text();
                      throw new Error(
                        `Tool API error: ${retryResp.status} - ${retryText}`
                      );
                    }
                    toolResult = await retryResp.json();
                  }
                } else {
                  toolResult = await toolDef.execute(execArgs);
                }
                console.log(
                  `[STREAMING] [v6] Tool result:`,
                  JSON.stringify(toolResult).substring(0, 200)
                );
                await ctx.runMutation(api.toolCallTracking.updateResult, {
                  toolCallId,
                  result: toolResult,
                  status: "COMPLETED",
                });

                // IMPORTANT: Also append tool-call + tool-result parts to the message metadata
                // so the streaming UI (which primarily renders `message.metadata.parts`) can
                // display the completed tool output even when the model stops after emitting
                // only tool-input-* deltas.
                await ctx.runMutation(api.messages.appendStreamDelta, {
                  messageId,
                  deltaText: "",
                  isFinal: false,
                  parts: [
                    {
                      type: "tool-call",
                      toolCallId,
                      toolName: state.toolName,
                      args: execArgs,
                      partialArgs: execArgs,
                      streamingState: "complete",
                      argsComplete: true,
                      accumulatedArgsText: state.accumulatedArgsText,
                    },
                    {
                      type: "tool-result",
                      toolCallId,
                      toolName: state.toolName,
                      result: toolResult,
                    },
                  ],
                });

                completedToolCalls.add(toolCallId);
                appendToolTranscript({
                  toolCallId,
                  toolName: state.toolName,
                  args: execArgs,
                  result: toolResult,
                });
              } catch (toolErr) {
                console.error(`[STREAMING] [v6] Tool failed:`, toolErr);
                const failedResult = {
                  success: false,
                  error: String(toolErr),
                };
                await ctx.runMutation(api.toolCallTracking.updateResult, {
                  toolCallId,
                  result: failedResult,
                  status: "FAILED",
                });
                // Also surface failures in message parts so the UI doesn't "die silently".
                await ctx.runMutation(api.messages.appendStreamDelta, {
                  messageId,
                  deltaText: "",
                  isFinal: false,
                  parts: [
                    {
                      type: "tool-call",
                      toolCallId,
                      toolName: state.toolName,
                      args: execArgs,
                      partialArgs: execArgs,
                      streamingState: "complete",
                      argsComplete: true,
                      accumulatedArgsText: state.accumulatedArgsText,
                    },
                    {
                      type: "tool-result",
                      toolCallId,
                      toolName: state.toolName,
                      result: failedResult,
                    },
                  ],
                });

                completedToolCalls.add(toolCallId);
                appendToolTranscript({
                  toolCallId,
                  toolName: state.toolName,
                  args: execArgs,
                  result: failedResult,
                });
              }
            }
          }
        }

        const usage = normalizeUsage(await result.usage);
        const finishReason = await result.finishReason;
        if (usage) {
          hasAnyUsage = true;
          totalPromptTokens += usage.promptTokens;
          totalCompletionTokens += usage.completionTokens;
          totalTokens += usage.totalTokens;
        }
        finalFinishReason = finishReason ?? finalFinishReason;
        console.log(
          `[STREAMING] Usage: ${JSON.stringify(usage)}, finishReason: ${finishReason}`
        );

        const progressed =
          completedToolCalls.size > completedBefore ||
          accumulatedText.length > textBeforeLen;

        // Stop if we are not making progress; prevents infinite loops with buggy providers.
        if (!progressed) {
          console.log(
            `[STREAMING] [v9] No progress in round=${round}; stopping continuation loop`
          );
          break;
        }

        // If there were no tool calls in this round, there's nothing to continue from.
        if (roundToolCallIds.size === 0) {
          break;
        }
      }

      // Finalize message
      const finalUsage = hasAnyUsage
        ? {
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens,
            totalTokens,
          }
        : undefined;

      await ctx.runMutation(api.messages.update, {
        messageId,
        content: accumulatedText,
        promptTokens: finalUsage?.promptTokens,
        completionTokens: finalUsage?.completionTokens,
        totalTokens: finalUsage?.totalTokens,
        finishReason:
          typeof finalFinishReason === "string" ? finalFinishReason : undefined,
      });

      console.log(
        `[STREAMING] Streaming completed successfully, text length: ${accumulatedText.length}`
      );
      return {
        success: true,
        messageId,
        text: accumulatedText,
        toolCallIds,
        usage: finalUsage ?? undefined,
      };
    } catch (error) {
      console.error(`[STREAMING] Error during streaming:`, error);
      if (error instanceof Error) {
        console.error(`[STREAMING] Error stack:`, error.stack);
      }

      // Enhanced 401 debugging
      const errorStr = String(error);
      if (
        errorStr.includes("401") ||
        (error instanceof Error && error.message.includes("401"))
      ) {
        console.error(`[STREAMING] ====== 401 ERROR DETAILS ======`);
        console.error(`[STREAMING] API keys at time of error:`);
        console.error(
          `[STREAMING]   - args.apiKeys.openrouter: ${args.apiKeys?.openrouter ? `present (${args.apiKeys.openrouter.length} chars, prefix: ${args.apiKeys.openrouter.substring(0, 12)}...)` : "MISSING"}`
        );
        console.error(
          `[STREAMING]   - OPENROUTER_API_KEY env: ${process.env.OPENROUTER_API_KEY ? `present (${process.env.OPENROUTER_API_KEY.length} chars, prefix: ${process.env.OPENROUTER_API_KEY.substring(0, 12)}...)` : "MISSING"}`
        );
        console.error(`[STREAMING] Model being used: ${args.model}`);
        console.error(
          `[STREAMING] Full error object:`,
          JSON.stringify(error, Object.getOwnPropertyNames(error))
        );
        console.error(`[STREAMING] ====== END 401 ERROR DETAILS ======`);
      }

      // Format user-friendly error message
      let userMessage = error instanceof Error ? error.message : String(error);

      // Check for specific error types and provide better messages
      if (
        errorStr.includes("401") ||
        userMessage.includes("401") ||
        userMessage.includes("Unauthorized")
      ) {
        userMessage =
          "API authentication failed (401). The API key may be invalid or expired. Please check your API key configuration.";
      } else if (
        errorStr.includes("403") ||
        userMessage.includes("403") ||
        userMessage.includes("Forbidden")
      ) {
        userMessage =
          "API access forbidden (403). Your API key may not have permission to use this model.";
      } else if (
        userMessage.includes("No output generated") ||
        userMessage.includes("AI_NoOutputGeneratedError")
      ) {
        userMessage =
          "The model returned no response. This usually happens due to rate limiting on free-tier models. Please try again or switch to a different model.";
      } else if (
        userMessage.includes("rate limit") ||
        userMessage.includes("Rate limit") ||
        errorStr.includes("429")
      ) {
        userMessage =
          "Rate limit exceeded. Please wait a moment before trying again, or switch to a different model.";
      } else if (userMessage.includes("quota")) {
        userMessage =
          "API quota exceeded. Please check your API key credits or switch to a different provider.";
      }

      await ctx.runMutation(api.messages.update, {
        messageId,
        content: `⚠️ ${userMessage}`,
      });

      throw error;
    } finally {
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
