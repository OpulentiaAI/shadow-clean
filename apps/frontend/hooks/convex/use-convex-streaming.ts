import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, useCallback } from "react";

/**
 * Hook for streaming chat with Convex actions
 * Alternative to Socket.IO streaming using Convex's native streaming support
 */
export function useConvexChatStreaming() {
  const streamChatAction = useAction(api.streaming.streamChat);
  const streamChatWithToolsAction = useAction(api.streaming.streamChatWithTools);
  const cancelStreamAction = useAction(api.streaming.cancelStream);
  const resumeStreamAction = useAction(api.streaming.resumeStream);

  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<Id<"chatMessages"> | null>(null);

  /**
   * Start a basic chat stream (text only)
   */
  const startStream = useCallback(
    async (args: {
      taskId: Id<"tasks">;
      prompt: string;
      model: string;
      systemPrompt?: string;
      llmModel?: string;
      apiKeys: {
        anthropic?: string;
        openai?: string;
        openrouter?: string;
      };
    }) => {
      setIsStreaming(true);

      try {
        const result = await streamChatAction(args);
        setCurrentMessageId(result.messageId);
        return result;
      } catch (error) {
        console.error("Stream error:", error);
        throw error;
      } finally {
        setIsStreaming(false);
        setCurrentMessageId(null);
      }
    },
    [streamChatAction]
  );

  /**
   * Start a chat stream with tool calling support
   */
  const startStreamWithTools = useCallback(
    async (args: {
      taskId: Id<"tasks">;
      prompt: string;
      model: string;
      systemPrompt?: string;
      llmModel?: string;
      tools?: Array<{
        name: string;
        description: string;
        parameters: any;
      }>;
      apiKeys: {
        anthropic?: string;
        openai?: string;
        openrouter?: string;
      };
    }) => {
      setIsStreaming(true);

      try {
        const result = await streamChatWithToolsAction(args);
        setCurrentMessageId(result.messageId);
        return result;
      } catch (error) {
        console.error("Stream with tools error:", error);
        throw error;
      } finally {
        setIsStreaming(false);
        setCurrentMessageId(null);
      }
    },
    [streamChatWithToolsAction]
  );

  /**
   * Cancel the current stream
   */
  const cancelStream = useCallback(async () => {
    if (!currentMessageId) {
      console.warn("No active stream to cancel");
      return;
    }

    try {
      await cancelStreamAction({ messageId: currentMessageId });
      setIsStreaming(false);
      setCurrentMessageId(null);
    } catch (error) {
      console.error("Cancel stream error:", error);
      throw error;
    }
  }, [currentMessageId, cancelStreamAction]);

  /**
   * Resume streaming from a previous message
   */
  const resumeStream = useCallback(
    async (args: {
      taskId: Id<"tasks">;
      fromMessageId: Id<"chatMessages">;
      prompt: string;
      model: string;
      systemPrompt?: string;
      llmModel?: string;
      apiKeys: {
        anthropic?: string;
        openai?: string;
        openrouter?: string;
      };
    }) => {
      setIsStreaming(true);

      try {
        const result = await resumeStreamAction(args);
        setCurrentMessageId(result.messageId);
        return result;
      } catch (error) {
        console.error("Resume stream error:", error);
        throw error;
      } finally {
        setIsStreaming(false);
        setCurrentMessageId(null);
      }
    },
    [resumeStreamAction]
  );

  return {
    isStreaming,
    currentMessageId,
    startStream,
    startStreamWithTools,
    cancelStream,
    resumeStream,
  };
}

/**
 * Hook for subscribing to streaming message updates
 * Use this in combination with useConvexChatStreaming to show real-time updates
 */
export function useStreamingMessage(messageId: Id<"chatMessages"> | undefined) {
  const message = useQuery(
    api.messages.get,
    messageId ? { messageId } : "skip"
  );

  return message;
}

/**
 * Hook for getting tool calls for a streaming message
 */
export function useStreamingToolCalls(messageId: Id<"chatMessages"> | undefined) {
  const toolCalls = useQuery(
    api.toolCallTracking.byMessage,
    messageId ? { messageId } : "skip"
  );

  return toolCalls ?? [];
}
