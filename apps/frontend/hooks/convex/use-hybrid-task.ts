"use client";

import { useTaskSocket } from "../socket/use-task-socket";
import { useTaskRealtime } from "./use-task-realtime";
import { toConvexId } from "@/lib/convex/id";
import { useMemo } from "react";
import { useMessageStreaming } from "./use-message-streaming";

/**
 * Feature flag to enable Convex-native real-time updates
 * Set to true to use Convex subscriptions, false to use Socket.IO
 */
const USE_CONVEX_REALTIME =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_CONVEX_REALTIME === "true";

/**
 * Hybrid hook that combines Socket.IO (chat streaming) with Convex (sidecar data)
 * Provides backward compatibility while migrating to Convex-native architecture
 *
 * Socket.IO handles:
 * - Chat message streaming
 * - Tool call streaming
 * - Real-time chat updates
 *
 * Convex handles:
 * - File changes from sidecar
 * - Tool execution logs
 * - Terminal output
 * - Workspace status
 */
export function useHybridTask(taskId: string | undefined) {
  // Socket.IO for chat streaming (always active)
  const socketData = useTaskSocket(taskId);

  // Convex message streaming (enabled via flag)
  const convexStreaming = useMessageStreaming(
    USE_CONVEX_REALTIME ? taskId : undefined
  );

  // Convex for sidecar data (conditionally active)
  const convexTaskId = useMemo(() => {
    if (!taskId || !USE_CONVEX_REALTIME) return undefined;
    try {
      return toConvexId("tasks", taskId);
    } catch {
      return undefined;
    }
  }, [taskId]);

  const convexData = useTaskRealtime(convexTaskId);

  const isConvexEnabled = USE_CONVEX_REALTIME && !!taskId;

  const streamingPartsMap = isConvexEnabled
    ? convexStreaming.streamingPartsMap
    : socketData.streamingPartsMap;

  const streamingPartsOrder = isConvexEnabled
    ? convexStreaming.streamingPartsOrder
    : socketData.streamingPartsOrder;

  const isStreaming = isConvexEnabled
    ? convexStreaming.isStreaming
    : socketData.isStreaming;

  // Merge data sources
  return {
    // Chat streaming (Convex when enabled, otherwise Socket.IO)
    messages: isConvexEnabled ? convexStreaming.messages : [],
    isConnected: socketData.isConnected,
    streamingPartsMap,
    streamingPartsOrder,
    isStreaming,
    setIsStreaming: socketData.setIsStreaming,
    isCompletionPending: isConvexEnabled
      ? false
      : socketData.isCompletionPending,
    autoPRStatus: socketData.autoPRStatus,
    sendMessage: socketData.sendMessage,
    stopStream: socketData.stopStream,
    clearQueuedAction: socketData.clearQueuedAction,
    createStackedPR: socketData.createStackedPR,

    // Sidecar data (Convex or Socket.IO fallback)
    fileChanges: isConvexEnabled ? convexData.fileChanges : [], // Socket.IO handles via fs-change events
    toolLogs: isConvexEnabled ? convexData.toolLogs : [],
    runningTools: isConvexEnabled ? convexData.runningTools : [],
    workspaceStatus: isConvexEnabled ? convexData.workspaceStatus : null,
    isWorkspaceHealthy: isConvexEnabled ? convexData.isHealthy : true,
    activeToolCount: isConvexEnabled ? convexData.activeToolCount : 0,

    // Mode indicator
    mode: (isConvexEnabled ? "convex-only" : "socket-only") as "convex-only" | "socket-only",
    isConvexEnabled,
  };
}

/**
 * Type-safe accessor for hybrid task data
 */
export type HybridTaskData = ReturnType<typeof useHybridTask>;
