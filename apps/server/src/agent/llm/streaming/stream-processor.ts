import {
  AIStreamChunk,
  Message,
  ModelType,
  StreamChunk,
  ToolName,
  getModelProvider,
  toCoreMessage,
  ApiKeys,
  AvailableModels,
} from "@repo/types";
import {
  CoreMessage,
  streamText,
  generateText,
  NoSuchToolError,
  InvalidToolArgumentsError,
  ToolSet,
} from "ai";
import type {
  LanguageModelV1FunctionToolCall,
  LanguageModelV1ProviderMetadata,
} from "@ai-sdk/provider";
import { createTools } from "../../tools";
import { ModelProvider } from "../models/model-provider";
import { ChunkHandlers } from "./chunk-handlers";
import { braintrustService } from "../observability/braintrust-service";

const MAX_STEPS = 100;
const MAX_REPAIR_ATTEMPTS_PER_TOOL_CALL = 3;

function parseArgsRecord(args: unknown): Record<string, unknown> | null {
  if (args && typeof args === "object" && !Array.isArray(args)) {
    return args as Record<string, unknown>;
  }

  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeToolArgs(
  toolName: string,
  args: Record<string, unknown>
): { normalizedArgs: Record<string, unknown>; changed: boolean } {
  const normalizedArgs: Record<string, unknown> = { ...args };
  let changed = false;

  const pickString = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = normalizedArgs[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
    return undefined;
  };

  if (["read_file", "edit_file", "delete_file"].includes(toolName)) {
    const current = normalizedArgs["target_file"];
    if (typeof current !== "string" || current.trim().length === 0) {
      const candidate = pickString([
        "file_path",
        "path",
        "targetFile",
        "filePath",
      ]);
      if (candidate) {
        normalizedArgs["target_file"] = candidate;
        changed = true;
      }
    }
  }

  if (toolName === "search_replace") {
    const current = normalizedArgs["file_path"];
    if (typeof current !== "string" || current.trim().length === 0) {
      const candidate = pickString([
        "target_file",
        "path",
        "targetFile",
        "filePath",
      ]);
      if (candidate) {
        normalizedArgs["file_path"] = candidate;
        changed = true;
      }
    }
  }

  if (toolName === "read_file") {
    const current = normalizedArgs["should_read_entire_file"];
    if (typeof current !== "boolean") {
      const candidate = normalizedArgs["shouldReadEntireFile"];
      normalizedArgs["should_read_entire_file"] =
        typeof candidate === "boolean" ? candidate : false;
      changed = true;
    }
  }

  if (toolName === "run_terminal_cmd") {
    const current = normalizedArgs["is_background"];
    if (typeof current !== "boolean") {
      const candidate = normalizedArgs["isBackground"];
      normalizedArgs["is_background"] =
        typeof candidate === "boolean" ? candidate : false;
      changed = true;
    }
  }

  const explanation = normalizedArgs["explanation"];
  if (typeof explanation !== "string" || explanation.trim().length === 0) {
    normalizedArgs["explanation"] = `Auto-filled explanation for ${toolName}`;
    changed = true;
  }

  return { normalizedArgs, changed };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function argsLikelyValidForTool(
  toolName: string,
  args: Record<string, unknown>
): boolean {
  switch (toolName) {
    case "read_file": {
      return (
        isNonEmptyString(args["target_file"]) &&
        typeof args["should_read_entire_file"] === "boolean" &&
        isNonEmptyString(args["explanation"])
      );
    }
    case "delete_file": {
      return (
        isNonEmptyString(args["target_file"]) &&
        isNonEmptyString(args["explanation"])
      );
    }
    case "run_terminal_cmd": {
      return (
        isNonEmptyString(args["command"]) &&
        typeof args["is_background"] === "boolean" &&
        isNonEmptyString(args["explanation"])
      );
    }
    case "list_dir": {
      return (
        isNonEmptyString(args["relative_workspace_path"]) &&
        isNonEmptyString(args["explanation"])
      );
    }
    case "file_search": {
      return isNonEmptyString(args["query"]) && isNonEmptyString(args["explanation"]);
    }
    case "grep_search": {
      return isNonEmptyString(args["query"]) && isNonEmptyString(args["explanation"]);
    }
    case "semantic_search": {
      return isNonEmptyString(args["query"]) && isNonEmptyString(args["explanation"]);
    }
    case "warp_grep": {
      return isNonEmptyString(args["query"]) && isNonEmptyString(args["explanation"]);
    }
    case "web_search": {
      return isNonEmptyString(args["query"]) && isNonEmptyString(args["explanation"]);
    }
    case "search_replace": {
      return (
        isNonEmptyString(args["file_path"]) &&
        isNonEmptyString(args["old_string"]) &&
        isNonEmptyString(args["new_string"])
      );
    }
    case "edit_file": {
      return (
        isNonEmptyString(args["target_file"]) &&
        isNonEmptyString(args["instructions"]) &&
        isNonEmptyString(args["code_edit"])
      );
    }
    case "todo_write": {
      return (
        typeof args["merge"] === "boolean" &&
        Array.isArray(args["todos"]) &&
        isNonEmptyString(args["explanation"])
      );
    }
    default:
      return false;
  }
}

function getToolRepairGuidance(toolName: string): string {
  if (toolName === "read_file") {
    return (
      "Required args: target_file (string), should_read_entire_file (boolean), explanation (string). " +
      "Optional: start_line_one_indexed (number), end_line_one_indexed_inclusive (number)."
    );
  }

  if (toolName === "delete_file") {
    return "Required args: target_file (string), explanation (string).";
  }

  if (toolName === "edit_file") {
    return "Required args: target_file (string), instructions (string), code_edit (string). Optional: is_new_file (boolean).";
  }

  if (toolName === "run_terminal_cmd") {
    return "Required args: command (string), is_background (boolean), explanation (string).";
  }

  if (toolName === "list_dir") {
    return "Required args: relative_workspace_path (string), explanation (string).";
  }

  if (toolName === "grep_search") {
    return "Required args: query (string), explanation (string). Optional: include_pattern, exclude_pattern, case_sensitive.";
  }

  if (toolName === "file_search") {
    return "Required args: query (string), explanation (string).";
  }

  if (toolName === "semantic_search") {
    return "Required args: query (string), explanation (string).";
  }

  if (toolName === "warp_grep") {
    return "Required args: query (string), explanation (string).";
  }

  if (toolName === "web_search") {
    return "Required args: query (string), explanation (string). Optional: domain.";
  }

  if (toolName === "todo_write") {
    return "Required args: merge (boolean), todos (array), explanation (string).";
  }

  return "";
}

export class StreamProcessor {
  private modelProvider = new ModelProvider();
  private chunkHandlers = new ChunkHandlers();

  async *createMessageStream(
    systemPrompt: string,
    messages: Message[],
    model: ModelType,
    userApiKeys: ApiKeys,
    enableTools: boolean = true,
    taskId: string,
    workspacePath?: string,
    abortSignal?: AbortSignal,
    preCreatedTools?: ToolSet
  ): AsyncGenerator<StreamChunk> {
    try {
      const modelInstance = this.modelProvider.getModel(model, userApiKeys);

      // Convert our messages to AI SDK CoreMessage format
      const coreMessages: CoreMessage[] = messages.map(toCoreMessage);

      // Use pre-created tools if provided, otherwise create tools with task context if taskId is provided
      const tools =
        preCreatedTools || (await createTools(taskId, workspacePath));

      const modelProvider = getModelProvider(model);
      const isAnthropicModel = modelProvider === "anthropic";
      const isGPT5Family =
        model === AvailableModels.OPENAI_GPT_5_2 || model === AvailableModels.OPENAI_GPT_5_1_CODEX;

      let finalMessages: CoreMessage[];
      if (isAnthropicModel) {
        const systemMessages = coreMessages.filter(
          (msg) => msg.role === "system"
        );
        const nonSystemMessages = coreMessages.filter(
          (msg) => msg.role !== "system"
        );

        finalMessages = [
          {
            role: "system",
            content: systemPrompt,
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          } as CoreMessage,
          ...systemMessages,
          ...nonSystemMessages,
        ];
      } else {
        finalMessages = coreMessages;
      }

      const reasoningProviderOptions: LanguageModelV1ProviderMetadata = {
        anthropic: {
          thinking: {
            type: "enabled",
            budgetTokens: 12000,
          },
        },
        ...(isGPT5Family
          ? {
              openai: {
                reasoningEffort: "medium",
              },
            }
          : {}),
      };

      const repairAttemptsByToolCallId = new Map<string, number>();

      const streamConfig = {
        model: modelInstance,
        ...(isAnthropicModel ? {} : { system: systemPrompt }),
        messages: finalMessages,
        temperature: isGPT5Family ? 1 : 0.7,
        maxSteps: MAX_STEPS,
        providerOptions: reasoningProviderOptions,
        ...(isAnthropicModel && {
          headers: {
            "anthropic-beta": "interleaved-thinking-2025-05-14",
          },
        }),
        ...(enableTools && tools && { tools, toolCallStreaming: true }),
        ...(abortSignal && { abortSignal }),
        experimental_telemetry: braintrustService.getOperationTelemetry(
          "chat-stream",
          {
            taskId,
            modelProvider,
            model,
            enableTools,
            messageCount: finalMessages.length,
            maxSteps: MAX_STEPS,
            temperature: isGPT5Family ? 1 : 0.7,
            hasWorkspace: !!workspacePath,
            hasTools: enableTools && !!tools,
            isAnthropicModel,
          }
        ),
        ...(enableTools &&
          tools && {
            experimental_repairToolCall: async ({
              system,
              messages,
              toolCall,
              tools,
              error,
            }: {
              system: string | undefined;
              messages: CoreMessage[];
              toolCall: LanguageModelV1FunctionToolCall;
              tools: ToolSet;
              error: NoSuchToolError | InvalidToolArgumentsError;
            }): Promise<LanguageModelV1FunctionToolCall | null> => {
              // Log error details for debugging
              console.log(
                `[REPAIR_DEBUG] Tool call repair triggered for ${toolCall.toolName}:`,
                {
                  errorType: error.constructor.name,
                  errorMessage: error.message,
                  isInvalidArgs: error instanceof InvalidToolArgumentsError,
                  isNoSuchTool: error instanceof NoSuchToolError,
                  originalArgs: toolCall.args,
                  toolCallId: toolCall.toolCallId,
                }
              );

              const currentAttempts =
                (repairAttemptsByToolCallId.get(toolCall.toolCallId) ?? 0) + 1;
              repairAttemptsByToolCallId.set(
                toolCall.toolCallId,
                currentAttempts
              );

              if (currentAttempts > MAX_REPAIR_ATTEMPTS_PER_TOOL_CALL) {
                console.log(
                  `[REPAIR_DEBUG] Max repair attempts exceeded for ${toolCall.toolName}:`,
                  {
                    toolCallId: toolCall.toolCallId,
                    attempts: currentAttempts,
                    maxAttempts: MAX_REPAIR_ATTEMPTS_PER_TOOL_CALL,
                  }
                );
                return null;
              }

              // Only handle parameter validation errors, let other errors fail normally
              if (error.constructor.name !== "InvalidToolArgumentsError") {
                console.log(
                  `[REPAIR_DEBUG] Skipping repair - error type: ${error.constructor.name}, instanceof check: ${error instanceof InvalidToolArgumentsError}`
                );
                return null;
              }

              try {
                console.log(
                  `[REPAIR_DEBUG] Attempting repair for ${toolCall.toolName} with error: ${error.message}`
                );

                const parsedArgs = parseArgsRecord(toolCall.args);
                if (parsedArgs) {
                  const normalized = normalizeToolArgs(
                    toolCall.toolName,
                    parsedArgs
                  );

                  if (
                    normalized.changed &&
                    argsLikelyValidForTool(
                      toolCall.toolName,
                      normalized.normalizedArgs
                    )
                  ) {
                    console.log(
                      `[REPAIR_DEBUG] Auto-repaired args for ${toolCall.toolName}:`,
                      {
                        originalArgs: toolCall.args,
                        repairedArgs: JSON.stringify(normalized.normalizedArgs),
                      }
                    );

                    return {
                      toolCallType: "function" as const,
                      toolCallId: toolCall.toolCallId,
                      toolName: toolCall.toolName,
                      args: JSON.stringify(normalized.normalizedArgs),
                    };
                  }
                }

                const guidance = getToolRepairGuidance(toolCall.toolName);

                // Re-ask the model with error context
                const repairResult = await generateText({
                  model: modelInstance,
                  system: system || systemPrompt,
                  messages: [
                    ...messages,
                    {
                      role: "assistant" as const,
                      content: `I attempted to call the tool ${toolCall.toolName} with arguments: ${toolCall.args}`,
                    },
                    {
                      role: "user" as const,
                      content: `Error: ${error.message}\n\nPlease retry this tool call with the correct parameters.\n${guidance ? `\n${guidance}` : ""}`,
                    },
                  ],
                  tools,
                  experimental_telemetry:
                    braintrustService.getOperationTelemetry("tool-repair", {
                      taskId,
                      toolName: toolCall.toolName,
                      errorType: error.constructor.name,
                      originalArgs: toolCall.args,
                      modelProvider,
                    }),
                });

                console.log(`[REPAIR_DEBUG] Repair result:`, {
                  toolCallsCount: repairResult.toolCalls?.length || 0,
                  toolCallNames:
                    repairResult.toolCalls?.map((tc) => tc.toolName) || [],
                  targetToolName: toolCall.toolName,
                });

                // Extract the first tool call that matches our tool name
                const repairedToolCall = repairResult.toolCalls?.find(
                  (tc) => tc.toolName === toolCall.toolName
                );

                if (repairedToolCall) {
                  console.log(
                    `[REPAIR_DEBUG] Successfully repaired ${toolCall.toolName}:`,
                    {
                      originalArgs: toolCall.args,
                      repairedArgs: JSON.stringify(repairedToolCall.args),
                    }
                  );

                  return {
                    toolCallType: "function" as const,
                    toolCallId: toolCall.toolCallId, // Keep original ID
                    toolName: repairedToolCall.toolName,
                    args: JSON.stringify(repairedToolCall.args),
                  };
                }

                console.log(
                  `[REPAIR_DEBUG] No matching tool call found in repair response for ${toolCall.toolName}`
                );
                return null;
              } catch (repairError) {
                console.log(`[REPAIR_DEBUG] Repair attempt failed:`, {
                  error:
                    repairError instanceof Error
                      ? repairError.message
                      : String(repairError),
                  toolName: toolCall.toolName,
                });
                return null;
              }
            },
          }),
      };

      // Log cache control usage for debugging
      if (isAnthropicModel) {
        console.log(
          `[LLM] Using Anthropic model ${model} with prompt caching enabled`
        );
      }

      // Pre-stream validation logs
      console.log("[DEBUG_STREAM] Model instance type:", typeof modelInstance);
      console.log(
        "[DEBUG_STREAM] Model instance keys:",
        Object.keys(modelInstance || {})
      );

      // Log API keys validation
      console.log("[DEBUG_STREAM] API keys present:", {
        anthropic: !!userApiKeys.anthropic,
        openai: !!userApiKeys.openai,
        anthropicLength: userApiKeys.anthropic?.length || 0,
      });

      // Log streamConfig validation
      console.log(
        "[DEBUG_STREAM] StreamConfig keys:",
        Object.keys(streamConfig)
      );
      console.log(
        "[DEBUG_STREAM] StreamConfig model:",
        streamConfig.model?.constructor?.name
      );
      console.log(
        "[DEBUG_STREAM] StreamConfig messages length:",
        streamConfig.messages?.length
      );
      console.log(
        "[DEBUG_STREAM] StreamConfig has tools:",
        !!streamConfig.tools
      );
      // Stream creation with error handling
      let result;
      try {
        result = streamText(streamConfig);

        // Handle environment difference: production returns Promise, local returns direct result
        const isPromise = result instanceof Promise;

        if (isPromise) {
          result = await result;
        }
      } catch (error) {
        console.error("[LLM_STREAM_ERROR] streamText threw error:", error);
        throw error;
      }

      const toolCallMap = new Map<string, ToolName>(); // toolCallId -> validated toolName

      // Check if fullStream is accessible (don't rely on truthiness since it could be a getter)
      if (!result.fullStream || !(Symbol.asyncIterator in result.fullStream)) {
        console.error(
          `[LLM_STREAM_ERROR] fullStream is not accessible for task ${taskId}`
        );

        // Try textStream as fallback if fullStream isn't available
        if (result.textStream && Symbol.asyncIterator in result.textStream) {
          for await (const textPart of result.textStream) {
            yield {
              type: "content",
              content: textPart,
            };
          }
          return;
        }

        console.error(
          "[LLM_STREAM_ERROR] Neither fullStream nor textStream are available"
        );
        yield {
          type: "error",
          error:
            "Stream initialization failed - no accessible stream properties",
          finishReason: "error",
        };
        return;
      }

      for await (const chunk of result.fullStream as AsyncIterable<AIStreamChunk>) {
        switch (chunk.type) {
          case "text-delta": {
            const streamChunk = this.chunkHandlers.handleTextDelta(chunk);
            if (streamChunk) {
              yield streamChunk;
            }
            break;
          }

          case "tool-call": {
            const streamChunks = this.chunkHandlers.handleToolCall(
              chunk,
              toolCallMap
            );
            for (const streamChunk of streamChunks) {
              yield streamChunk;
            }
            break;
          }

          case "tool-call-streaming-start": {
            const streamChunks =
              this.chunkHandlers.handleToolCallStreamingStart(
                chunk,
                toolCallMap
              );
            for (const streamChunk of streamChunks) {
              yield streamChunk;
            }
            break;
          }

          case "tool-call-delta": {
            const streamChunks = this.chunkHandlers.handleToolCallDelta(chunk);
            for (const streamChunk of streamChunks) {
              yield streamChunk;
            }
            break;
          }

          case "tool-result": {
            const streamChunk = this.chunkHandlers.handleToolResult(
              chunk,
              toolCallMap
            );
            if (streamChunk) {
              yield streamChunk;
            }
            break;
          }

          case "finish": {
            const streamChunks = this.chunkHandlers.handleFinish(chunk, model);
            for (const streamChunk of streamChunks) {
              yield streamChunk;
            }
            break;
          }

          case "reasoning": {
            const streamChunk = this.chunkHandlers.handleReasoning(chunk);
            if (streamChunk) {
              yield streamChunk;
            }
            break;
          }

          case "reasoning-signature": {
            const streamChunk =
              this.chunkHandlers.handleReasoningSignature(chunk);
            if (streamChunk) {
              yield streamChunk;
            }
            break;
          }

          case "redacted-reasoning": {
            const streamChunk =
              this.chunkHandlers.handleRedactedReasoning(chunk);
            if (streamChunk) {
              yield streamChunk;
            }
            break;
          }

          case "error": {
            const streamChunk = this.chunkHandlers.handleError(chunk);
            yield streamChunk;
            break;
          }
        }
      }
    } catch (error) {
      console.error("LLM Service Error:", error);
      yield {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        finishReason: "error",
      };
    }
  }
}
