/**
 * Agent-based streaming hook
 * 
 * Uses @convex-dev/agent primitives for:
 * - Thread-based conversation history
 * - Automatic message persistence
 * - Proper status lifecycle (pending → streaming → complete)
 */

import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useState, useCallback, useRef, useEffect } from "react";

interface UseAgentStreamingOptions {
  taskId: Id<"tasks"> | null;
  userId?: string;
}

interface StreamResponseArgs {
  prompt: string;
  model?: string;
  systemPrompt?: string;
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    openrouter?: string;
    exa?: string;
  };
}

/**
 * Hook for Agent-based streaming using Convex Agent primitives
 * 
 * Features:
 * - Automatic thread creation per task
 * - Conversation history from thread
 * - Message persistence with status lifecycle
 * - Abort/resume support
 */
export function useAgentStreaming({ taskId, userId }: UseAgentStreamingOptions) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Agent actions
  const createThreadAction = useAction(api.shadowAgent.actions.createThread);
  const streamResponseAction = useAction(api.shadowAgent.actions.streamResponse);
  const stopTaskAction = useAction(api.shadowAgent.actions.stopTask);
  const listMessagesAction = useAction(api.shadowAgent.actions.listMessages);

  // Thread ref to avoid stale closure issues
  const threadIdRef = useRef<string | null>(null);

  // Update ref when threadId changes
  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  /**
   * Get or create a thread for the current task
   */
  const ensureThread = useCallback(async (): Promise<string> => {
    if (threadIdRef.current) {
      return threadIdRef.current;
    }

    if (!taskId) {
      throw new Error("Task ID is required to create a thread");
    }

    console.log("[AGENT_HOOK] Creating thread for task:", taskId);
    const result = await createThreadAction({ taskId, userId });
    const newThreadId = result.threadId;

    setThreadId(newThreadId);
    threadIdRef.current = newThreadId;

    console.log("[AGENT_HOOK] Created thread:", newThreadId);
    return newThreadId;
  }, [taskId, userId, createThreadAction]);

  /**
   * Send a message and stream the response
   */
  const sendMessage = useCallback(
    async (args: StreamResponseArgs) => {
      if (!taskId) {
        throw new Error("Task ID is required");
      }

      setIsStreaming(true);
      setError(null);

      try {
        // Ensure we have a thread
        const currentThreadId = await ensureThread();

        console.log("[AGENT_HOOK] Streaming response for thread:", currentThreadId);

        // Stream the response
        const result = await streamResponseAction({
          taskId,
          threadId: currentThreadId,
          prompt: args.prompt,
          model: args.model,
          systemPrompt: args.systemPrompt,
          userId,
          apiKeys: args.apiKeys,
        });

        console.log("[AGENT_HOOK] Stream completed:", {
          textLength: result.text?.length,
          finishReason: result.finishReason,
        });

        return result;
      } catch (err) {
        console.error("[AGENT_HOOK] Stream error:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setIsStreaming(false);
      }
    },
    [taskId, userId, ensureThread, streamResponseAction]
  );

  /**
   * Stop the current streaming response
   */
  const stopStreaming = useCallback(async () => {
    if (!taskId) {
      return;
    }

    console.log("[AGENT_HOOK] Stopping task:", taskId);
    await stopTaskAction({ taskId });
    setIsStreaming(false);
  }, [taskId, stopTaskAction]);

  /**
   * Get messages from the thread
   */
  const getMessages = useCallback(
    async (cursor?: string, numItems?: number) => {
      if (!threadIdRef.current) {
        return { page: [], isDone: true, continueCursor: "" };
      }

      return await listMessagesAction({
        threadId: threadIdRef.current,
        paginationOpts: { cursor, numItems },
      });
    },
    [listMessagesAction]
  );

  /**
   * Reset the thread (for starting a new conversation)
   */
  const resetThread = useCallback(() => {
    setThreadId(null);
    threadIdRef.current = null;
  }, []);

  return {
    // State
    threadId,
    isStreaming,
    error,

    // Actions
    sendMessage,
    stopStreaming,
    getMessages,
    ensureThread,
    resetThread,
  };
}

export default useAgentStreaming;
