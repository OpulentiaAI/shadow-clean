/**
 * ConvexAgentBridge - Bridges Convex Agent with Socket.IO streaming
 *
 * This service handles the communication between:
 * - Convex Agent actions (which process messages with tools)
 * - Socket.IO clients (which need real-time streaming updates)
 *
 * Architecture:
 * 1. Calls Convex Agent action to process message
 * 2. Polls message document for streaming updates
 * 3. Forwards updates via Socket.IO to connected clients
 */

import { api } from "../../../../convex/_generated/api";
import { getConvexClient } from "../lib/convex-client";
import { toConvexId } from "../lib/convex-operations";
import {
  emitStreamChunk,
  endStream,
  startStream,
} from "../socket";
import type { StreamChunk } from "@repo/types";

// Types for message metadata parsing
interface MessagePart {
  type: string;
  text?: string;
  data?: unknown;
  toolCallId?: string;
  toolName?: string;
  args?: unknown;
  output?: unknown;
  error?: string;
  signature?: string;
}

interface MessageMetadata {
  isStreaming: boolean;
  parts: MessagePart[];
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string;
}

export class ConvexAgentBridge {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastSeenContent: Map<string, string> = new Map();
  private lastSeenPartsCount: Map<string, number> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * Process a user message using Convex Agent with real-time Socket.IO streaming
   */
  async processWithAgent({
    taskId,
    message,
    model,
    threadId,
  }: {
    taskId: string;
    message: string;
    model?: string;
    threadId?: string;
  }): Promise<{
    success: boolean;
    threadId?: string;
    messageId?: string;
    response?: string;
    error?: string;
  }> {
    const client = getConvexClient();
    const convexTaskId = toConvexId<"tasks">(taskId);

    // Create abort controller for this request
    const abortController = new AbortController();
    this.abortControllers.set(taskId, abortController);

    // Start streaming indicator
    startStream(taskId);

    try {
      // Start polling for message updates before calling the action
      // The action will create a message and start updating it
      // We don't await this - it runs in the background until we stop polling
      this.startPollingForUpdates(taskId, abortController.signal);

      // Call the Convex Agent action
      // This will create a message, process with tools, and update the message
      const result = await client.action(api.agent.streamTaskWithTools, {
        taskId: convexTaskId,
        message,
        model,
        threadId,
      });

      // Stop polling
      this.stopPolling(taskId);

      // NOTE: Don't emit final content here - polling already emitted all content incrementally.
      // Emitting the full response again causes duplicate messages in the UI.

      // Emit usage information if available
      if (result.usage) {
        emitStreamChunk(
          {
            type: "usage",
            usage: {
              promptTokens: result.usage.promptTokens || 0,
              completionTokens: result.usage.completionTokens || 0,
              totalTokens:
                (result.usage.promptTokens || 0) +
                (result.usage.completionTokens || 0),
            },
          },
          taskId
        );
      }

      // Emit tool calls if any
      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const toolCall of result.toolCalls) {
          emitStreamChunk(
            {
              type: "tool-call",
              toolCall: {
                id: toolCall.toolCallId,
                name: toolCall.toolName,
                args: toolCall.args,
              },
            },
            taskId
          );
        }
      }

      endStream(taskId);

      return {
        success: true,
        threadId: result.threadId || undefined,
        messageId: result.messageId as string,
        response: result.response,
      };
    } catch (error) {
      console.error(`[AGENT_BRIDGE] Error processing with agent:`, error);

      // Stop polling on error
      this.stopPolling(taskId);

      // Emit error chunk
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      emitStreamChunk(
        {
          type: "error",
          error: errorMessage,
          finishReason: "error",
        },
        taskId
      );

      endStream(taskId);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      this.abortControllers.delete(taskId);
      this.cleanup(taskId);
    }
  }

  /**
   * Start polling for message updates and emit via Socket.IO
   */
  private startPollingForUpdates(
    taskId: string,
    signal: AbortSignal
  ): Promise<void> {
    return new Promise((resolve) => {
      const pollInterval = setInterval(async () => {
        if (signal.aborted) {
          clearInterval(pollInterval);
          resolve();
          return;
        }

        try {
          await this.pollAndEmitUpdates(taskId);
        } catch (error) {
          console.error(`[AGENT_BRIDGE] Polling error:`, error);
        }
      }, 100); // Poll every 100ms for responsive updates

      this.pollingIntervals.set(taskId, pollInterval);

      // Resolve when aborted
      signal.addEventListener("abort", () => {
        clearInterval(pollInterval);
        resolve();
      });
    });
  }

  /**
   * Poll the message and emit any new content
   */
  private async pollAndEmitUpdates(taskId: string): Promise<void> {
    const client = getConvexClient();
    const convexTaskId = toConvexId<"tasks">(taskId);

    // Get the latest message for this task
    const messages = await client.query(api.messages.byTask, {
      taskId: convexTaskId,
    });

    if (!messages || messages.length === 0) {
      return;
    }

    // Get the last message (should be the streaming one)
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== "ASSISTANT") {
      return;
    }

    const messageId = latestMessage._id as string;
    const currentContent = latestMessage.content || "";
    const lastContent = this.lastSeenContent.get(messageId) || "";

    // Parse metadata for parts
    let metadata: MessageMetadata | null = null;
    try {
      if (latestMessage.metadataJson) {
        metadata = JSON.parse(latestMessage.metadataJson) as MessageMetadata;
      }
    } catch {
      // Ignore parse errors
    }

    // Emit new text content if any
    if (currentContent.length > lastContent.length) {
      const newContent = currentContent.slice(lastContent.length);
      emitStreamChunk(
        {
          type: "content",
          content: newContent,
        },
        taskId
      );
      this.lastSeenContent.set(messageId, currentContent);
    }

    // Emit new parts if any
    if (metadata && metadata.parts) {
      const lastPartsCount = this.lastSeenPartsCount.get(messageId) || 0;
      const newParts = metadata.parts.slice(lastPartsCount);

      for (const part of newParts) {
        this.emitPartAsChunk(part, taskId);
      }

      this.lastSeenPartsCount.set(messageId, metadata.parts.length);
    }

    // Check if streaming is complete
    if (metadata && !metadata.isStreaming) {
      // Emit final usage if available
      if (metadata.usage) {
        emitStreamChunk(
          {
            type: "usage",
            usage: {
              promptTokens: metadata.usage.promptTokens || 0,
              completionTokens: metadata.usage.completionTokens || 0,
              totalTokens: metadata.usage.totalTokens || 0,
            },
          },
          taskId
        );
      }
    }
  }

  /**
   * Convert a message part to a stream chunk and emit
   */
  private emitPartAsChunk(part: MessagePart, taskId: string): void {
    let chunk: StreamChunk | null = null;

    switch (part.type) {
      case "text":
        // Text parts are handled via content diff above
        break;

      case "reasoning":
        chunk = {
          type: "reasoning",
          reasoning: part.text || "",
        };
        break;

      case "reasoning-signature":
        chunk = {
          type: "reasoning-signature",
          reasoningSignature: part.signature || "",
        };
        break;

      case "redacted-reasoning":
        chunk = {
          type: "redacted-reasoning",
          redactedReasoningData: part.data as string,
        };
        break;

      case "tool-call":
        chunk = {
          type: "tool-call",
          toolCall: {
            id: part.toolCallId || "",
            name: part.toolName || "",
            args: (part.args || {}) as Record<string, unknown>,
          },
        };
        break;

      case "tool-result":
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chunk = {
          type: "tool-result",
          toolResult: {
            id: part.toolCallId || "",
            result: part.output as any,
          },
        };
        break;

      case "error":
        chunk = {
          type: "error",
          error: part.error || "Unknown error",
          finishReason: "error",
        };
        break;
    }

    if (chunk) {
      emitStreamChunk(chunk, taskId);
    }
  }

  /**
   * Stop polling for a task
   */
  stopPolling(taskId: string): void {
    const interval = this.pollingIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(taskId);
    }

    const abortController = this.abortControllers.get(taskId);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(taskId);
    }
  }

  /**
   * Stop processing for a task
   */
  async stopProcessing(taskId: string): Promise<void> {
    this.stopPolling(taskId);
    this.cleanup(taskId);
    endStream(taskId);
  }

  /**
   * Clean up tracking state for a task
   */
  private cleanup(taskId: string): void {
    // Clean up all message-specific tracking
    for (const key of this.lastSeenContent.keys()) {
      if (key.startsWith(taskId)) {
        this.lastSeenContent.delete(key);
      }
    }
    for (const key of this.lastSeenPartsCount.keys()) {
      if (key.startsWith(taskId)) {
        this.lastSeenPartsCount.delete(key);
      }
    }
  }

  /**
   * Execute a simple chat (no tools) using Convex Agent
   */
  async chat({
    taskId,
    message,
    model,
    threadId,
  }: {
    taskId: string;
    message: string;
    model?: string;
    threadId?: string;
  }): Promise<{
    success: boolean;
    threadId?: string;
    response?: string;
    error?: string;
  }> {
    const client = getConvexClient();
    const convexTaskId = toConvexId<"tasks">(taskId);

    try {
      startStream(taskId);

      const result = await client.action(api.agent.chat, {
        taskId: convexTaskId,
        message,
        model,
        threadId,
      });

      // Emit the response content
      if (result.response) {
        emitStreamChunk(
          {
            type: "content",
            content: result.response,
          },
          taskId
        );
      }

      // Emit usage if available
      if (result.usage) {
        emitStreamChunk(
          {
            type: "usage",
            usage: {
              promptTokens: result.usage.promptTokens || 0,
              completionTokens: result.usage.completionTokens || 0,
              totalTokens:
                (result.usage.promptTokens || 0) +
                (result.usage.completionTokens || 0),
            },
          },
          taskId
        );
      }

      endStream(taskId);

      return {
        success: true,
        threadId: result.threadId,
        response: result.response,
      };
    } catch (error) {
      console.error(`[AGENT_BRIDGE] Chat error:`, error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      emitStreamChunk(
        {
          type: "error",
          error: errorMessage,
          finishReason: "error",
        },
        taskId
      );

      endStream(taskId);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Generate text without task context
   */
  async generateText({
    prompt,
    model,
    systemPrompt,
    threadId,
  }: {
    prompt: string;
    model?: string;
    systemPrompt?: string;
    threadId?: string;
  }): Promise<{
    success: boolean;
    text?: string;
    threadId?: string;
    error?: string;
  }> {
    const client = getConvexClient();

    try {
      const result = await client.action(api.agent.generateText, {
        prompt,
        model,
        systemPrompt,
        threadId,
      });

      return {
        success: true,
        text: result.text,
        threadId: result.threadId,
      };
    } catch (error) {
      console.error(`[AGENT_BRIDGE] Generate text error:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Singleton instance
export const convexAgentBridge = new ConvexAgentBridge();
