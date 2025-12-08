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

function TaskPageContent() {
  const { taskId } = useParams<{ taskId: string }>();

  const queryClient = useQueryClient();

  const { task } = useTask(taskId);

  const { data: messages = [], error: taskMessagesError } =
    useTaskMessages(taskId);

  const sendMessageMutation = useSendMessage();

  const [isStreaming, setIsStreaming] = useState(false);

  const handleSendMessage = useCallback(
    async (message: string, model: ModelType, queue: boolean) => {
      if (!taskId || !message.trim()) return;
      if (queue) return; // queuing not supported

      // Optimistic user append
      sendMessageMutation.mutate({ taskId, message, model });

      // Fire backend message processing via frontend API route (proxies to backend with auth)
      setIsStreaming(true);
      try {
        const response = await fetch(`/api/tasks/${taskId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            model,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit message');
        }

        console.log(`[MESSAGE_SUBMIT] Message submitted successfully to task ${taskId}`);
      } catch (error) {
        console.error(`[MESSAGE_SUBMIT] Error submitting message:`, error);
        // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: ['task-messages', taskId] });
      } finally {
        setIsStreaming(false);
      }
    },
    [taskId, sendMessageMutation, queryClient]
  );

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
            onStopStream={undefined}
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
