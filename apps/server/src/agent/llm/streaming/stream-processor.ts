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
  ToolSet,
} from "ai";
import { createTools } from "../../tools";
import { ModelProvider } from "../models/model-provider";
import { ChunkHandlers } from "./chunk-handlers";
import { braintrustService } from "../observability/braintrust-service";

const MAX_STEPS = 100;

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
        model === AvailableModels.GPT_5 || model === AvailableModels.GPT_5_MINI;

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

      // Provider-specific options for reasoning/thinking modes
      const reasoningProviderOptions = {
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
        // AI SDK v5 experimental_repairToolCall - disabled for now due to type changes
        // Tool repair will be re-enabled once the v5 API stabilizes
        // ...(enableTools && tools && { experimental_repairToolCall: ... }),
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
