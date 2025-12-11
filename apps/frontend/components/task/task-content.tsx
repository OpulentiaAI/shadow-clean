"use client";

import { Messages } from "@/components/chat/messages/messages";
import { PromptForm } from "@/components/chat/prompt-form/prompt-form";
import { useSendMessage } from "@/hooks/chat/use-send-message";
import { useTaskMessages } from "@/hooks/tasks/use-task-messages";
import { useParams } from "next/navigation";
import { ScrollToBottom } from "./scroll-to-bottom";
import { useCallback, memo, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ModelType } from "@repo/types";
import { useTask } from "@/hooks/tasks/use-task";
import { useConvexChatStreaming } from "@/hooks/convex";
import { asConvexId } from "@/lib/convex/id";

const USE_CONVEX_STREAMING =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_CONVEX_REALTIME === "true";

// Immediate log on module load - verifies this code is deployed
console.log("[TASK_CONTENT_MODULE] Loaded, USE_CONVEX_STREAMING:", USE_CONVEX_STREAMING, "ENV:", process.env.NEXT_PUBLIC_USE_CONVEX_REALTIME);

function TaskPageContent() {
  const { taskId } = useParams<{ taskId: string }>();

  const queryClient = useQueryClient();

  const { task } = useTask(taskId);

  const { data: messages = [], error: taskMessagesError } =
    useTaskMessages(taskId);

  const sendMessageMutation = useSendMessage();

  const {
    startStreamWithTools,
    cancelStream,
    isStreaming: convexStreaming,
  } = useConvexChatStreaming();

  const [legacyStreaming, setLegacyStreaming] = useState(false);
  const convexTaskId = useMemo(
    () => (taskId ? asConvexId<"tasks">(taskId) : null),
    [taskId]
  );

  const isStreaming = USE_CONVEX_STREAMING ? convexStreaming : legacyStreaming;

  const handleSendMessage = useCallback(
    async (message: string, model: ModelType, queue: boolean) => {
      if (!taskId || !message.trim()) return;
      if (queue) return; // queuing not supported

      // Optimistic user append
      sendMessageMutation.mutate({ taskId, message, model });

      // Debug logging
      console.log("[TASK_CONTENT] handleSendMessage", {
        taskId,
        model,
        USE_CONVEX_STREAMING,
        convexTaskId,
      });

      if (USE_CONVEX_STREAMING) {
        console.log("[TASK_CONTENT] Using Convex streaming");
        if (!convexTaskId) {
          console.warn("[TASK_CONTENT] No convexTaskId");
          return;
        }

        try {
          console.log("[TASK_CONTENT] Calling startStreamWithTools");
          await startStreamWithTools({
            taskId: convexTaskId,
            prompt: message,
            model,
            llmModel: model,
            // Allow server to select all available tools via createAgentTools
            tools: undefined,
            apiKeys: {
              // Prefer server-side keys; leave empty for server-side resolution.
              anthropic: undefined,
              openai: undefined,
              openrouter: undefined,
            },
          });
          console.log("[TASK_CONTENT] Stream completed");
        } catch (error) {
          console.error("[TASK_CONTENT] Stream error:", error);
        }
        return;
      }

      console.log("[TASK_CONTENT] Using legacy path");

      // Legacy Socket.IO / REST path
      setLegacyStreaming(true);
      try {
        const response = await fetch(`/api/tasks/${taskId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            model,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to submit message");
        }

        console.log(
          `[MESSAGE_SUBMIT] Message submitted successfully to task ${taskId}`
        );
      } catch (error) {
        console.error(`[MESSAGE_SUBMIT] Error submitting message:`, error);
        // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: ["task-messages", taskId] });
      } finally {
        setLegacyStreaming(false);
      }
    },
    [taskId, sendMessageMutation, queryClient, convexTaskId, startStreamWithTools]
  );

  const handleStopStream = useCallback(async () => {
    if (!USE_CONVEX_STREAMING) return;
    try {
      await cancelStream();
    } catch (error) {
      console.error("[CONVEX_STREAMING] Error cancelling stream:", error);
    }
  }, [cancelStream]);

  const displayMessages = useMemo(() => {
    // Messages from Convex include metadata.isStreaming; render as-is.
    // If we ever add client-side partials, we can merge here using parts helpers.
    return messages;
  }, [messages]);

  if (taskMessagesError) {
    return (
      <div className="mx-auto flex w-full max-w-xl grow flex-col items-center justify-center">
        <div className="text-destructive">
          Error fetching messages: {taskMessagesError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-0 mx-auto flex w-full max-w-xl grow flex-col items-center px-4 sm:px-6">
      <Messages
        taskId={taskId}
        messages={displayMessages}
        disableEditing={
          task?.status === "ARCHIVED" || task?.status === "INITIALIZING"
        }
        isStreamPending={task?.status === "RUNNING" && isStreaming}
        isStreaming={isStreaming}
        isReInitializing={
          task?.status === "INITIALIZING" && task?.hasBeenInitialized
        }
      />

      {task?.status !== "ARCHIVED" && (
        <>
          <ScrollToBottom />

          <PromptForm
            onSubmit={handleSendMessage}
            onCreateStackedPR={undefined}
            onStopStream={USE_CONVEX_STREAMING ? handleStopStream : undefined}
            isStreaming={isStreaming || sendMessageMutation.isPending}
            initialSelectedModel={task?.mainModel as ModelType | null}
            onFocus={() => {
              queryClient.setQueryData(["edit-message-id", taskId], null);
            }}
            isInitializing={task?.status === "INITIALIZING"}
          />
        </>
      )}
    </div>
  );
}

export const MemoizedTaskPageContent = memo(TaskPageContent);
