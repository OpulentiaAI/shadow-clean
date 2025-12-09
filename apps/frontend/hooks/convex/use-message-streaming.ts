"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toConvexId } from "@/lib/convex/id";
import { useMemo } from "react";
import type { AssistantMessagePart } from "@repo/types";

/**
 * Real-time Convex subscription for chat message streaming
 * Replaces Socket.IO streaming with native Convex reactivity
 */
export function useMessageStreaming(taskId: string | undefined) {
  const convexTaskId = useMemo(() => {
    if (!taskId) return undefined;
    try {
      return toConvexId("tasks", taskId);
    } catch {
      return undefined;
    }
  }, [taskId]);

  // Subscribe to messages for this task (real-time)
  const messages = useQuery(
    api.messages.byTask,
    convexTaskId ? { taskId: convexTaskId } : "skip"
  );

  // Find the actively streaming message
  const streamingMessage = useMemo(() => {
    if (!messages) return null;

    // Look for message with isStreaming: true in metadata
    const found = messages.find((msg: { metadataJson?: string }) => {
      if (!msg.metadataJson) return false;
      try {
        const metadata = JSON.parse(msg.metadataJson);
        return metadata.isStreaming === true;
      } catch {
        return false;
      }
    });

    return found || null;
  }, [messages]);

  // Extract streaming parts from the streaming message
  const streamingParts = useMemo(() => {
    if (!streamingMessage?.metadataJson) return [];
    try {
      const metadata = JSON.parse(streamingMessage.metadataJson);
      return (metadata.parts || []) as AssistantMessagePart[];
    } catch {
      return [];
    }
  }, [streamingMessage]);

  // Map streaming parts to a Map for efficient lookup (matches Socket.IO format)
  const streamingPartsMap = useMemo(() => {
    const map = new Map<string, AssistantMessagePart>();
    streamingParts.forEach((part, index) => {
      // Generate IDs similar to Socket.IO format
      let id: string;
      if (part.type === "text") {
        id = `text-${index}`;
      } else if (part.type === "tool-call") {
        id = part.toolCallId;
      } else if (part.type === "tool-result") {
        id = `${part.toolCallId}-result`;
      } else if (part.type === "reasoning") {
        id = `reasoning-${index}`;
      } else if (part.type === "redacted-reasoning") {
        id = `redacted-reasoning-${index}`;
      } else {
        id = `unknown-${index}`;
      }
      map.set(id, part);
    });
    return map;
  }, [streamingParts]);

  // Generate parts order array
  const streamingPartsOrder = useMemo(() => {
    return Array.from(streamingPartsMap.keys());
  }, [streamingPartsMap]);

  return {
    // Raw messages from Convex
    messages: messages || [],

    // Streaming state
    isStreaming: !!streamingMessage,
    streamingMessage,

    // Streaming parts (compatible with Socket.IO format)
    streamingParts,
    streamingPartsMap,
    streamingPartsOrder,
  };
}

/**
 * Type for the return value of useMessageStreaming
 */
export type MessageStreamingData = ReturnType<typeof useMessageStreaming>;
