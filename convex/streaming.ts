// @ts-nocheck
import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
// createOpenRouter removed in favor of createOpenAI configuration
import { type LanguageModel, type CoreMessage } from "ai";
import { createAgentTools, createExaWebSearchTool, WEB_SEARCH_SYSTEM_PROMPT } from "./agentTools";
import { generateTraceId } from "./observability";
import { withRetry, isTransientError } from "./lib/retry";

// Configuration for conversation context
const MAX_CONTEXT_MESSAGES = 20; // Number of recent messages to include as context
// Note: Braintrust integration is server-side only (apps/server) due to Node.js requirements
// Convex actions use the default AI SDK without Braintrust wrapping

/**
 * Fetch conversation history for a task and format as CoreMessage array for AI SDK.
 * This ensures the LLM has context from previous messages in the conversation.
 */
async function fetchConversationContext(
  ctx: ActionCtx,
  taskId: Id<"tasks">,
  excludeMessageId?: Id<"chatMessages">
): Promise<CoreMessage[]> {
  const messages = await ctx.runQuery(api.messages.byTask, { taskId });
  
  // Filter out the current message being generated (if any) and incomplete messages
  const completedMessages = messages.filter((m) => {
    // Exclude the message we're currently generating
    if (excludeMessageId && m._id === excludeMessageId) return false;
    // Exclude streaming messages (isStreaming in metadata)
    const metadata = m.metadataJson ? JSON.parse(m.metadataJson) : {};
    if (metadata.isStreaming) return false;
    // Exclude empty assistant messages
    if (m.role === "ASSISTANT" && !m.content?.trim()) return false;
    return true;
  });

  // Take the most recent messages for context
  const recentMessages = completedMessages.slice(-MAX_CONTEXT_MESSAGES);

  // Convert to CoreMessage format for AI SDK
  const coreMessages: CoreMessage[] = recentMessages.map((m) => {
    const role = m.role === "USER" ? "user" : "assistant";
    return {
      role,
      content: m.content || "",
    } as CoreMessage;
  });

  console.log(`[STREAMING] Fetched ${coreMessages.length} messages for conversation context`);
  return coreMessages;
}

// Throttle configuration for delta streaming (Best Practice BP005)
const DELTA_THROTTLE_MS = 100; // Batch writes every 100ms

// Feature flags (Best Practice: new behaviors default OFF)
const ENABLE_PROMPT_MESSAGE_ID = process.env.ENABLE_PROMPT_MESSAGE_ID === "true";
const ENABLE_RETRY_WITH_BACKOFF = process.env.ENABLE_RETRY_WITH_BACKOFF === "true";
const ENABLE_MESSAGE_COMPRESSION = process.env.ENABLE_MESSAGE_COMPRESSION === "true";
const MESSAGE_COMPRESSION_THRESHOLD = parseInt(process.env.MESSAGE_COMPRESSION_THRESHOLD || "50000", 10);

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
      exa: v.optional(v.string()),
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
      `[STREAMING] API keys present - anthropic: ${!!args.apiKeys?.anthropic}, openai: ${!!args.apiKeys?.openai}, openrouter: ${!!args.apiKeys?.openrouter}, exa: ${!!args.apiKeys?.exa}`
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
    console.log(`[STREAMING] Task found: ${task._id}, status: ${task.status}`);
    console.log(
      `[STREAMING] Task workspacePath: ${(task as any)?.workspacePath ?? "null"}`
    );

    // Set task to RUNNING status (handles resuming from STOPPED state)
    if (task.status !== "RUNNING") {
      console.log(`[STREAMING] Setting task status to RUNNING (was: ${task.status})`);
      await ctx.runMutation(api.tasks.update, {
        taskId: args.taskId,
        status: "RUNNING",
      });
    }

    // Initialize streaming message
    // BP012: Use promptMessageId pattern when enabled for retry-safe streaming
    let messageId: Id<"chatMessages">;
    let promptMessageId: Id<"chatMessages"> | undefined;

    if (ENABLE_PROMPT_MESSAGE_ID) {
      console.log(`[STREAMING] Using promptMessageId pattern (BP012)`);
      // Save user prompt first
      const promptResult = await ctx.runMutation(api.messages.savePromptMessage, {
        taskId: args.taskId,
        content: args.prompt,
        llmModel: args.llmModel,
      });
      promptMessageId = promptResult.messageId;
      console.log(`[STREAMING] Saved prompt message: ${promptMessageId}`);

      // Create assistant message placeholder linked to prompt
      const assistantResult = await ctx.runMutation(api.messages.createAssistantMessage, {
        taskId: args.taskId,
        promptMessageId,
        llmModel: args.llmModel,
      });
      messageId = assistantResult.messageId;
      console.log(`[STREAMING] Created assistant message: ${messageId} (linked to prompt)`);

      // Update status to streaming
      await ctx.runMutation(api.messages.updateMessageStatus, {
        messageId,
        status: "streaming",
      });
    } else {
      // Legacy path: create streaming message directly
      console.log(`[STREAMING] Starting streaming message (legacy)`);
      const result = await ctx.runMutation(api.messages.startStreaming, {
        taskId: args.taskId,
        llmModel: args.llmModel,
      });
      messageId = result.messageId;
      console.log(`[STREAMING] Streaming message created: ${messageId}`);
    }

    // Initialize observability trace (Best Practice BP002, BP018)
    const traceId = generateTraceId();
    const streamStartedAt = Date.now();
    // Streaming metrics tracking (unused vars will be used when throttling is fully implemented)
    let totalDeltaChars = 0;
    let totalDeltaCount = 0;
    let dbWriteCount = 0;

    // Start trace
    await ctx.runMutation(api.observability.startTrace, {
      taskId: args.taskId,
      traceId,
      workflowType: "streamChatWithTools",
      model: args.model,
      provider: args.apiKeys?.openrouter ? "openrouter" : args.apiKeys?.anthropic ? "anthropic" : "openai",
      messageId,
    });
    console.log(`[STREAMING] Trace started: ${traceId}`);

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
      
      // Add Exa web search tool if API key is available
      const exaTools = createExaWebSearchTool(args.apiKeys?.exa);
      const allTools = exaTools 
        ? { ...availableTools, ...exaTools }
        : availableTools;
      
      const requestedNames = args.tools?.map((t) => t.name) ?? null;
      const filteredTools = Object.fromEntries(
        Object.entries(allTools).filter(([name]) =>
          requestedNames ? requestedNames.includes(name) : true
        )
      );
      if (requestedNames && Object.keys(filteredTools).length === 0) {
        throw new Error(
          `No matching tools were found for requested tools: ${requestedNames.join(", ")}`
        );
      }
      
      // ============================================================
      // MECHANICAL GUARDRAIL: Tool Deduplication at Execute Level
      // This ensures duplicate tool calls are blocked even when the
      // AI SDK auto-executes tools via its maxSteps loop.
      // ============================================================
      const executedToolSignatures = new Set<string>();
      const toolCallAttempts = new Map<string, number>(); // Track attempts per signature
      const MAX_TOOL_ATTEMPTS = 3;
      
      const createToolSignature = (toolName: string, toolArgs: unknown): string => {
        // Normalize args for comparison (exclude 'explanation' field)
        const argsForSignature = { ...(toolArgs as Record<string, unknown>) };
        delete argsForSignature.explanation;
        const sortedKeys = Object.keys(argsForSignature).sort();
        const normalized: Record<string, unknown> = {};
        for (const key of sortedKeys) {
          normalized[key] = argsForSignature[key];
        }
        return `${toolName}::${JSON.stringify(normalized)}`;
      };
      
      const wrapToolWithDedup = (toolName: string, originalTool: any) => {
        const originalExecute = originalTool.execute;
        return {
          ...originalTool,
          execute: async (args: any) => {
            const signature = createToolSignature(toolName, args);
            const attempts = (toolCallAttempts.get(signature) || 0) + 1;
            toolCallAttempts.set(signature, attempts);
            
            // Check for duplicate execution
            if (executedToolSignatures.has(signature)) {
              console.warn(`[DEDUP_BLOCK] Blocking duplicate tool call: ${toolName} with signature ${signature.substring(0, 100)}...`);
              return {
                success: false,
                error: "DUPLICATE_TOOL_CALL_BLOCKED",
                message: `⛔ BLOCKED: You already called "${toolName}" with these exact arguments. The result was returned previously. DO NOT call this tool again with the same arguments. Either:\n1. Use the result you already received\n2. Try a DIFFERENT tool\n3. Try the same tool with DIFFERENT arguments\n4. If stuck, explain to the user what you've tried and ask for guidance`,
                toolName,
                args,
                previouslyExecuted: true,
              };
            }
            
            // Check for too many attempts (even with different args)
            if (attempts > MAX_TOOL_ATTEMPTS) {
              console.warn(`[DEDUP_BLOCK] Tool "${toolName}" exceeded max attempts (${MAX_TOOL_ATTEMPTS})`);
              return {
                success: false,
                error: "MAX_ATTEMPTS_EXCEEDED",
                message: `⛔ BLOCKED: You have tried "${toolName}" ${attempts} times. This suggests the approach isn't working. Please either:\n1. Try a COMPLETELY DIFFERENT tool or approach\n2. Explain to the user what you've tried and ask for guidance\n\nDo NOT retry this tool.`,
                toolName,
                attempts,
              };
            }
            
            // Execute the original tool
            const result = await originalExecute(args);
            
            // Mark as executed
            executedToolSignatures.add(signature);
            console.log(`[DEDUP_TRACK] Executed ${toolName}, total unique calls: ${executedToolSignatures.size}`);
            
            return result;
          },
        };
      };
      
      // Wrap all tools with deduplication
      const aiTools = Object.fromEntries(
        Object.entries(filteredTools).map(([name, tool]) => [
          name,
          wrapToolWithDedup(name, tool),
        ])
      );
      console.log(`[DEDUP_INIT] Wrapped ${Object.keys(aiTools).length} tools with deduplication guardrail`);
      
      // Enhance system prompt with web search guidance if Exa is available
      const effectiveSystemPrompt = args.apiKeys?.exa
        ? `${args.systemPrompt || ""}\n\n${WEB_SEARCH_SYSTEM_PROMPT}`
        : args.systemPrompt;

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

      // Fetch conversation history for context (enables multi-turn conversations)
      const conversationHistory = await fetchConversationContext(ctx, args.taskId, messageId);
      console.log(`[STREAMING] Loaded ${conversationHistory.length} messages from conversation history`);

      let accumulatedText = "";

      const toolCallStates = new Map<
        string,
        { toolName: string; accumulatedArgsText: string; latestArgs: any }
      >();
      const knownToolCalls = new Set<string>();
      const completedToolCalls = new Set<string>();
      const completedToolSignatures = new Set<string>();
      let toolCallNamespace = 0;
      let toolTranscript = "";

      const stableStringify = (value: unknown): string => {
        const seen = new WeakSet<object>();
        const helper = (v: unknown): unknown => {
          if (v === null) return null;
          if (typeof v !== "object") return v;
          if (Array.isArray(v)) return v.map(helper);
          if (seen.has(v as object)) return "[Circular]";
          seen.add(v as object);
          const obj = v as Record<string, unknown>;
          const out: Record<string, unknown> = {};
          for (const key of Object.keys(obj).sort()) {
            out[key] = helper(obj[key]);
          }
          return out;
        };
        try {
          return JSON.stringify(helper(value));
        } catch {
          return String(value);
        }
      };

      const makeToolSignature = (toolName: string, toolArgs: unknown): string => {
        // Exclude 'explanation' field from signature to prevent duplicate calls
        // with different explanations from being treated as unique
        const argsForSignature = { ...(toolArgs as Record<string, unknown>) };
        delete argsForSignature.explanation;
        return `${toolName}::${stableStringify(argsForSignature)}`;
      };

      const formatForPrompt = (value: unknown): string => {
        try {
          const text = JSON.stringify(value);
          if (text.length <= MAX_SINGLE_TOOL_RESULT_CHARS) return text;
          return `${text.slice(0, MAX_SINGLE_TOOL_RESULT_CHARS)}... (truncated)`;
        } catch {
          return String(value);
        }
      };

      // Track already-read files for explicit deduplication guidance
      const alreadyReadFiles = new Set<string>();
      const alreadyListedDirs = new Set<string>();
      
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
        
        // Track completed file/directory operations for deduplication guidance
        const argsObj = entry.args as Record<string, unknown>;
        if (entry.toolName === "read_file" && typeof argsObj?.target_file === "string") {
          alreadyReadFiles.add(argsObj.target_file);
        } else if (entry.toolName === "list_dir" && typeof argsObj?.relative_workspace_path === "string") {
          alreadyListedDirs.add(argsObj.relative_workspace_path);
        } else if (entry.toolName === "grep_search" && typeof argsObj?.query === "string") {
          // Track grep searches too
          alreadyReadFiles.add(`grep:${argsObj.query}`);
        }
      };
      
      const buildContinuationPrompt = (): string => {
        let planBlock = "";
        if (planSteps.length > 0) {
          const completed = completedPlanSteps.size;
          const total = planSteps.length;
          const nextIdx = planSteps.findIndex(
            (_, idx) => !completedPlanSteps.has(idx)
          );
          const next = nextIdx >= 0 ? planSteps[nextIdx] : null;
          planBlock = `\n\nTool plan progress: ${completed}/${total} steps completed.\n${
            next
              ? `Next required tool call (call this now):\nTool: ${next.toolName}\nJSON args: ${formatForPrompt(next.args)}\nIMPORTANT: Do not repeat already completed steps.`
              : "All required tool steps are complete. Do not call more tools; write the final response."
          }\n`;
        }
        
        // Build explicit deduplication guidance
        let alreadyCompletedBlock = "";
        if (alreadyReadFiles.size > 0 || alreadyListedDirs.size > 0) {
          alreadyCompletedBlock = "\n\n🚫 ALREADY COMPLETED - DO NOT CALL THESE AGAIN:";
          if (alreadyReadFiles.size > 0) {
            alreadyCompletedBlock += `\n- Files read: ${Array.from(alreadyReadFiles).join(", ")}`;
          }
          if (alreadyListedDirs.size > 0) {
            alreadyCompletedBlock += `\n- Directories listed: ${Array.from(alreadyListedDirs).join(", ")}`;
          }
          alreadyCompletedBlock += "\nIf you need different information, use a DIFFERENT file path or tool.\n";
        }
        
        return `${basePrompt}

## CRITICAL INSTRUCTIONS
1. REVIEW the tool results below carefully before taking any action
2. VERIFY the results match what you intended - if you asked for README.md but got something else, that's an error
3. DO NOT repeat the same tool call - if it's in "ALREADY COMPLETED", use a different approach
4. If you have the information you need, WRITE YOUR RESPONSE instead of calling more tools
${planBlock}${alreadyCompletedBlock}

## Tool Results So Far:
${toolTranscript || "(no tool calls yet)"}

## Your Task
Review the above results. If you have enough information, provide your response. If not, call ONE different tool with correct arguments.`;
      };

      const parseToolPlan = (
        prompt: string,
        allowedToolNames: Set<string>
      ): Array<{ toolName: string; args: Record<string, unknown> }> => {
        const lines = prompt.split("\n");
        const plan: Array<{ toolName: string; args: Record<string, unknown> }> =
          [];
        for (const line of lines) {
          const m = line.match(/^\s*\d+\)\s*([a-zA-Z0-9_.-]+)\s*(.*)$/);
          if (!m) continue;
          const toolName = m[1]?.trim();
          if (!toolName || !allowedToolNames.has(toolName)) continue;
          const rest = (m[2] ?? "").trim();

          const args: Record<string, unknown> = {};
          const re = /([a-zA-Z0-9_]+)=(".*?"|\S+)/g;
          while (true) {
            const match = re.exec(rest);
            if (!match) break;
            const key = match[1];
            if (!key) continue;
            let raw = match[2] ?? "";
            if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
              raw = raw.slice(1, -1);
            }
            if (raw === "true") args[key] = true;
            else if (raw === "false") args[key] = false;
            else if (!Number.isNaN(Number(raw)) && raw !== "")
              args[key] = Number(raw);
            else args[key] = raw;
          }

          if (Object.keys(args).length > 0) {
            plan.push({ toolName, args });
          }
        }
        return plan;
      };

      const matchesPlanStep = (
        step: { toolName: string; args: Record<string, unknown> },
        toolName: string,
        toolArgs: Record<string, unknown>
      ): boolean => {
        if (step.toolName !== toolName) return false;
        for (const [k, v] of Object.entries(step.args)) {
          const candidate = toolArgs[k];
          if (stableStringify(candidate) !== stableStringify(v)) return false;
        }
        return true;
      };

      const planSteps = parseToolPlan(
        basePrompt,
        new Set(Object.keys(aiTools))
      );
      const completedPlanSteps = new Set<number>();

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

        const completedSignaturesBefore = completedToolSignatures.size;
        const completedPlanBefore = completedPlanSteps.size;
        const textBeforeLen = accumulatedText.length;

        let result: ReturnType<typeof streamText>;
        try {
          // BP003: Apply message compression if enabled and prompt is long
          let effectivePrompt = promptForRound;
          if (ENABLE_MESSAGE_COMPRESSION && round > 3 && promptForRound.length > MESSAGE_COMPRESSION_THRESHOLD) {
            // Simple compression: truncate middle of prompt, keep beginning and end
            const keepStart = Math.floor(MESSAGE_COMPRESSION_THRESHOLD * 0.4);
            const keepEnd = Math.floor(MESSAGE_COMPRESSION_THRESHOLD * 0.4);
            const truncatedMiddle = `\n\n[... ${promptForRound.length - keepStart - keepEnd} characters of earlier context compressed ...]\n\n`;
            effectivePrompt = promptForRound.substring(0, keepStart) + truncatedMiddle + promptForRound.substring(promptForRound.length - keepEnd);
            console.log(`[STREAMING] BP003: Compressed prompt from ${promptForRound.length} to ${effectivePrompt.length} chars (round=${round})`);
          }

          // BP009: Wrap LLM call with retry logic for transient failures
          // Build messages array with conversation history + current prompt
          const messagesForLLM: CoreMessage[] = [
            // Include conversation history from previous messages
            ...conversationHistory,
            // Add current prompt as user message
            { role: "user" as const, content: effectivePrompt },
          ];
          console.log(`[STREAMING] Sending ${messagesForLLM.length} messages to LLM (${conversationHistory.length} history + 1 current)`);

          const llmCall = async (): Promise<ReturnType<typeof streamText>> => {
            return streamText({
              model: providerModel,
              // Use messages array instead of prompt for conversation context
              messages: messagesForLLM,
              system: effectiveSystemPrompt,
              tools: aiTools,
              temperature: 0.7,
              // AI SDK v5+: use stopWhen to allow multi-step tool execution
              stopWhen: stepCountIs(MAX_AGENT_STEPS),
              abortSignal: controller.signal,
            } as Parameters<typeof streamText>[0]);
          };

          if (ENABLE_RETRY_WITH_BACKOFF) {
            result = await withRetry(llmCall, {
              maxAttempts: 3,
              initialBackoffMs: 200,
              base: 2,
              jitter: true,
              onRetry: (attempt, error, delay) => {
                console.log(
                  `[STREAMING] LLM retry ${attempt}/3, waiting ${delay}ms: ${error.message.substring(0, 100)}`
                );
              },
            });
          } else {
            result = await llmCall();
          }
          console.log(
            `[STREAMING] streamText promise resolved, processing stream... (round=${round}, promptLen=${effectivePrompt.length})`
          );
        } catch (streamTextError) {
          // Check if it's a transient error for better error messaging
          const isTransient = isTransientError(streamTextError);
          console.error(
            `[STREAMING] streamText failed (round=${round}, transient=${isTransient}):`,
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
            completedToolSignatures.add(
              makeToolSignature(
                toolName,
                toolCallStates.get(toolCallId)?.latestArgs ?? {}
              )
            );
            if (planSteps.length > 0) {
              const nextIdx = planSteps.findIndex(
                (_, idx) => !completedPlanSteps.has(idx)
              );
              const step = nextIdx >= 0 ? planSteps[nextIdx] : undefined;
              const candidateArgs = (toolCallStates.get(toolCallId)
                ?.latestArgs ?? {}) as Record<string, unknown>;
              if (step && matchesPlanStep(step, toolName, candidateArgs)) {
                completedPlanSteps.add(nextIdx);
              }
            }
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
                // Only apply recovered args if they appear to match the current tool.
                // Some models (notably Kimi) may include JSON for a different tool in the prompt.
                if (
                  state.toolName === "list_dir" &&
                  typeof (recovered as any).relative_workspace_path === "string" &&
                  typeof (recovered as any).explanation === "string"
                ) {
                  Object.assign(execArgs, recovered);
                } else if (
                  state.toolName === "read_file" &&
                  typeof (recovered as any).target_file === "string" &&
                  typeof (recovered as any).explanation === "string"
                ) {
                  Object.assign(execArgs, recovered);
                } else if (
                  state.toolName === "grep_search" &&
                  typeof (recovered as any).query === "string" &&
                  typeof (recovered as any).explanation === "string"
                ) {
                  Object.assign(execArgs, recovered);
                } else if (
                  state.toolName === "file_search" &&
                  typeof (recovered as any).query === "string" &&
                  typeof (recovered as any).explanation === "string"
                ) {
                  Object.assign(execArgs, recovered);
                }
              }
            }
            // Some providers (notably Kimi) emit tool-input-start without args; auto-fill when possible.
            if (
              state.toolName === "list_dir" &&
              (typeof execArgs.relative_workspace_path !== "string" ||
                typeof execArgs.explanation !== "string")
            ) {
              execArgs.relative_workspace_path = ".";
              execArgs.explanation = "Auto-filled missing tool args";
            }
            // For read_file, try to extract filename from prompt if args missing
            if (
              state.toolName === "read_file" &&
              (!execArgs.target_file || Object.keys(execArgs).length === 0)
            ) {
              // Extract common file patterns from prompt
              const filePatterns = [
                /read\s+(?:the\s+)?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/i,
                /([a-zA-Z0-9_\-./]+\.(?:md|txt|json|ts|tsx|js|jsx|py|yaml|yml|toml|env))/i,
              ];
              for (const pattern of filePatterns) {
                const match = promptForRound.match(pattern);
                if (match?.[1]) {
                  execArgs.target_file = match[1];
                  execArgs.should_read_entire_file = true;
                  execArgs.explanation = "Auto-filled from prompt context";
                  console.log(
                    `[STREAMING] [v8] Auto-filled read_file args from prompt: ${match[1]}`
                  );
                  break;
                }
              }
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
                const serverBackedTools = new Set([
                  "read_file",
                  "edit_file",
                  "search_replace",
                  "run_terminal_cmd",
                  "list_dir",
                  "grep_search",
                  "file_search",
                  "delete_file",
                  "semantic_search",
                  "warp_grep",
                ]);

                const callToolApiWithWorkspaceFallback = async () => {
                  console.log(
                    `[STREAMING] [v7] Using direct tool API call (tool=${state.toolName}, workspaceOverride=${workspacePathOverride})`
                  );
                  const callOnce = async (workspacePath: string) => {
                    const resp = await fetch(
                      `${serverUrl}/api/tools/${args.taskId}/${state.toolName}`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "x-convex-tool-key": toolApiKey,
                          "x-shadow-workspace-path": workspacePath,
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
                    return (await resp.json()) as unknown;
                  };

                  const first = await callOnce(workspacePathOverride);
                  if (
                    (first as any)?.success === false &&
                    typeof (first as any)?.error === "string" &&
                    ((first as any).error as string).includes("ENOENT") &&
                    workspacePathOverride !== "/workspace"
                  ) {
                    console.log(
                      `[STREAMING] [v7] ${state.toolName} ENOENT on ${workspacePathOverride}, retrying with /workspace`
                    );
                    return await callOnce("/workspace");
                  }
                  return first;
                };

                const toolSignature = makeToolSignature(
                  state.toolName,
                  execArgs
                );
                if (completedToolSignatures.has(toolSignature)) {
                  toolResult = {
                    success: true,
                    skipped: true,
                    reason: "DUPLICATE_TOOL_CALL",
                    toolName: state.toolName,
                    args: execArgs,
                  };
                } else {
                  toolResult = serverBackedTools.has(state.toolName)
                    ? await callToolApiWithWorkspaceFallback()
                    : await toolDef.execute(execArgs);
                  completedToolSignatures.add(toolSignature);
                  if (planSteps.length > 0) {
                    const nextIdx = planSteps.findIndex(
                      (_, idx) => !completedPlanSteps.has(idx)
                    );
                    const step = nextIdx >= 0 ? planSteps[nextIdx] : undefined;
                    if (
                      step &&
                      matchesPlanStep(step, state.toolName, execArgs)
                    ) {
                      completedPlanSteps.add(nextIdx);
                    }
                  }
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

        // If the user prompt includes an explicit numbered tool plan (e.g. "1) list_dir ..."),
        // proactively enforce forward progress in cases where a provider repeats the same call.
        if (planSteps.length > 0) {
          const nextIdx = planSteps.findIndex(
            (_, idx) => !completedPlanSteps.has(idx)
          );
          const planComplete = nextIdx < 0;
          const progressedPlanThisRound =
            completedPlanSteps.size > completedPlanBefore;

          if (!planComplete && !progressedPlanThisRound) {
            const step = planSteps[nextIdx];
            if (step) {
              // Safety: only force read-only tools. Never force write/exec tools.
              const safeForcedTools = new Set([
                "list_dir",
                "read_file",
                "grep_search",
                "file_search",
                "semantic_search",
                "warp_grep",
              ]);
              if (!safeForcedTools.has(step.toolName)) {
                // Do not force non-read-only tools; let the model decide.
              } else {
                const forcedToolCallId = normalizeToolCallId(`plan:${nextIdx}`);
                const forcedArgs: Record<string, unknown> = {
                  ...step.args,
                  explanation:
                    step.args.explanation ??
                    `Forced execution of step ${nextIdx + 1}/${planSteps.length} from user tool plan`,
                };

                await ensureToolTracking(
                  forcedToolCallId,
                  step.toolName,
                  forcedArgs
                );

                const candidateTaskWorkspace = (task as any)?.workspacePath as
                  | string
                  | undefined;
                const workspacePathOverride =
                  candidateTaskWorkspace || "/workspace";
                const serverUrl =
                  process.env.SHADOW_SERVER_URL || "http://localhost:4000";
                const toolApiKey =
                  process.env.CONVEX_TOOL_API_KEY || "shadow-internal-tool-key";

                const serverBackedTools = new Set([
                  "read_file",
                  "edit_file",
                  "search_replace",
                  "run_terminal_cmd",
                  "list_dir",
                  "grep_search",
                  "file_search",
                  "delete_file",
                  "semantic_search",
                  "warp_grep",
                ]);

                const callToolApiWithWorkspaceFallback = async () => {
                  const callOnce = async (workspacePath: string) => {
                    const resp = await fetch(
                      `${serverUrl}/api/tools/${args.taskId}/${step.toolName}`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "x-convex-tool-key": toolApiKey,
                          "x-shadow-workspace-path": workspacePath,
                        },
                        body: JSON.stringify(forcedArgs),
                      }
                    );
                    if (!resp.ok) {
                      const errorText = await resp.text();
                      throw new Error(
                        `Tool API error: ${resp.status} - ${errorText}`
                      );
                    }
                    return (await resp.json()) as unknown;
                  };

                  const first = await callOnce(workspacePathOverride);
                  if (
                    (first as any)?.success === false &&
                    typeof (first as any)?.error === "string" &&
                    ((first as any).error as string).includes("ENOENT") &&
                    workspacePathOverride !== "/workspace"
                  ) {
                    return await callOnce("/workspace");
                  }
                  return first;
                };

                let forcedResult: unknown;
                try {
                  const toolDef = (aiTools as any)[step.toolName];
                  forcedResult = serverBackedTools.has(step.toolName)
                    ? await callToolApiWithWorkspaceFallback()
                    : await toolDef.execute(forcedArgs);
                } catch (e) {
                  forcedResult = { success: false, error: String(e) };
                }

                await ctx.runMutation(api.toolCallTracking.updateResult, {
                  toolCallId: forcedToolCallId,
                  result: forcedResult,
                  status:
                    (forcedResult as any)?.success === false
                      ? "FAILED"
                      : "COMPLETED",
                });

                await ctx.runMutation(api.messages.appendStreamDelta, {
                  messageId,
                  deltaText: "",
                  isFinal: false,
                  parts: [
                    {
                      type: "tool-call",
                      toolCallId: forcedToolCallId,
                      toolName: step.toolName,
                      args: forcedArgs,
                      partialArgs: forcedArgs,
                      streamingState: "complete",
                      argsComplete: true,
                      accumulatedArgsText: "",
                    },
                    {
                      type: "tool-result",
                      toolCallId: forcedToolCallId,
                      toolName: step.toolName,
                      result: forcedResult,
                    },
                  ],
                });

                completedToolCalls.add(forcedToolCallId);
                completedToolSignatures.add(
                  makeToolSignature(step.toolName, forcedArgs)
                );
                completedPlanSteps.add(nextIdx);
                appendToolTranscript({
                  toolCallId: forcedToolCallId,
                  toolName: step.toolName,
                  args: forcedArgs,
                  result: forcedResult,
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
          completedToolSignatures.size > completedSignaturesBefore ||
          completedPlanSteps.size > completedPlanBefore ||
          accumulatedText.length > textBeforeLen;

        // Stop if we are not making progress; prevents infinite loops with buggy providers.
        if (!progressed) {
          console.log(
            `[STREAMING] [v9] No progress in round=${round}; stopping continuation loop`
          );
          break;
        }

        // If we completed an explicit tool plan, stop immediately after writing tool results.
        if (
          planSteps.length > 0 &&
          completedPlanSteps.size >= planSteps.length
        ) {
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

      // Cleanup: mark any stale RUNNING/PENDING tool calls as FAILED
      const staleCleanup = await ctx.runMutation(
        api.toolCallTracking.failStaleRunning,
        { messageId }
      );
      if (staleCleanup.marked > 0) {
        console.log(
          `[STREAMING] Marked ${staleCleanup.marked} stale tool calls as FAILED`
        );
      }

      // Update trace with success (Best Practice BP002, BP018)
      const streamEndedAt = Date.now();
      await ctx.runMutation(api.observability.updateTrace, {
        traceId,
        status: "COMPLETED",
        promptTokens: finalUsage?.promptTokens,
        completionTokens: finalUsage?.completionTokens,
        totalTokens: finalUsage?.totalTokens,
        model: args.model,
      });

      // BP012: Update message status to complete
      if (ENABLE_PROMPT_MESSAGE_ID) {
        await ctx.runMutation(api.messages.updateMessageStatus, {
          messageId,
          status: "complete",
          content: accumulatedText,
          promptTokens: finalUsage?.promptTokens,
          completionTokens: finalUsage?.completionTokens,
          totalTokens: finalUsage?.totalTokens,
          finishReason: typeof finalFinishReason === "string" ? finalFinishReason : undefined,
        });
      }

      // Record streaming metrics (Best Practice BP005)
      totalDeltaChars = accumulatedText.length;
      dbWriteCount = dbWriteCount || 1; // At least one write
      await ctx.runMutation(api.observability.recordStreamingMetrics, {
        taskId: args.taskId,
        messageId,
        traceId,
        totalDeltas: totalDeltaCount || 1,
        totalChars: totalDeltaChars,
        throttleIntervalMs: DELTA_THROTTLE_MS,
        dbWriteCount,
        streamStatus: "completed",
        streamStartedAt,
        streamEndedAt,
      });

      console.log(
        `[STREAMING] Streaming completed successfully, text length: ${accumulatedText.length}, traceId: ${traceId}`
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

      // Update trace with failure (Best Practice BP002, BP018)
      const errorType = error instanceof Error ? error.name : "UnknownError";
      const errorMessage = error instanceof Error ? error.message : String(error);
      try {
        await ctx.runMutation(api.observability.updateTrace, {
          traceId,
          status: "FAILED",
          errorType,
          errorMessage: errorMessage.substring(0, 1000), // Truncate long errors
        });
        await ctx.runMutation(api.observability.recordStreamingMetrics, {
          taskId: args.taskId,
          messageId,
          traceId,
          totalDeltas: totalDeltaCount || 0,
          totalChars: totalDeltaChars,
          throttleIntervalMs: DELTA_THROTTLE_MS,
          dbWriteCount,
          streamStatus: "failed",
          streamStartedAt,
          streamEndedAt: Date.now(),
        });

        // BP012: Update message status to failed (message still exists for retry)
        if (ENABLE_PROMPT_MESSAGE_ID) {
          await ctx.runMutation(api.messages.updateMessageStatus, {
            messageId,
            status: "failed",
            errorMessage: errorMessage.substring(0, 500),
          });
        }
      } catch (traceError) {
        console.error(`[STREAMING] Failed to update trace on error:`, traceError);
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
 * Cancel streaming action by message ID
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
 * Stop a running task - sets task status to STOPPED and aborts any active streams.
 * Also marks any streaming/pending messages as failed to prevent blocking next request.
 */
export const stopTask = action({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    console.log(`[STREAMING] Stopping task: ${args.taskId}`);
    
    // Find and abort any active streams for this task
    // Stream controllers are keyed by messageId, so we need to find messages for this task
    const messages = await ctx.runQuery(api.messages.byTask, {
      taskId: args.taskId,
    });
    
    // Abort any active stream controllers for this task's messages
    let abortedCount = 0;
    let markedFailedCount = 0;
    
    for (const message of messages) {
      const controller = streamControllers.get(message._id);
      if (controller) {
        controller.abort();
        streamControllers.delete(message._id);
        abortedCount++;
        console.log(`[STREAMING] Aborted stream for message: ${message._id}`);
      }
      
      // Mark streaming/pending messages as stopped so they don't block next request
      const metadata = message.metadataJson ? JSON.parse(message.metadataJson) : {};
      if (metadata.isStreaming || message.status === "streaming" || message.status === "pending") {
        await ctx.runMutation(api.messages.updateMessageStatus, {
          messageId: message._id,
          status: "failed",
          finishReason: "stopped",
          errorMessage: "Task was stopped by user",
        });
        markedFailedCount++;
        console.log(`[STREAMING] Marked message ${message._id} as failed (was streaming/pending)`);
      }
    }
    
    // Update task status to STOPPED - but make it resumable
    // Set to STOPPED instead of FAILED so user can continue
    await ctx.runMutation(api.tasks.update, {
      taskId: args.taskId,
      status: "STOPPED",
    });
    
    console.log(`[STREAMING] Task stopped. Aborted ${abortedCount} active streams, marked ${markedFailedCount} messages as failed.`);
    return { success: true, abortedStreams: abortedCount, markedFailed: markedFailedCount };
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
