import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useEffect, useRef } from "react";

/**
 * Hook for managing user presence in a task
 * Automatically sends heartbeats every 30 seconds
 */
export function usePresence(
  taskId: Id<"tasks"> | undefined,
  userId: Id<"users"> | undefined,
  userName: string,
  userImage?: string
) {
  const updatePresence = useMutation(api.presence.updatePresence);
  const removePresence = useMutation(api.presence.removePresence);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!taskId || !userId) return;

    // Send initial presence update
    const sendPresenceUpdate = () => {
      updatePresence({
        taskId,
        userId,
        userName,
        userImage,
        activity: "viewing",
      }).catch((error) => {
        console.error("Failed to update presence:", error);
      });
    };

    sendPresenceUpdate();

    // Set up heartbeat interval (every 30 seconds)
    heartbeatIntervalRef.current = setInterval(sendPresenceUpdate, 30000);

    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      // Remove presence on unmount
      if (taskId && userId) {
        removePresence({ taskId, userId }).catch((error) => {
          console.error("Failed to remove presence:", error);
        });
      }
    };
  }, [taskId, userId, userName, userImage, updatePresence, removePresence]);

  return {
    updateActivity: (
      activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle",
      cursor?: { x: number; y: number },
      selection?: { start: number; end: number; filePath?: string }
    ) => {
      if (!taskId || !userId) return;

      updatePresence({
        taskId,
        userId,
        userName,
        userImage,
        activity,
        cursor,
        selection,
      }).catch((error) => {
        console.error("Failed to update activity:", error);
      });
    },
  };
}

/**
 * Hook for getting active users in a task
 */
export function useActiveUsers(taskId: Id<"tasks"> | undefined, timeoutMs?: number) {
  const activeUsers = useQuery(
    api.presence.getActiveUsers,
    taskId ? { taskId, timeoutMs } : "skip"
  );

  return activeUsers ?? [];
}

/**
 * Hook for broadcasting activity events
 */
export function useActivityBroadcast(taskId: Id<"tasks"> | undefined, userId: Id<"users"> | undefined) {
  const broadcastActivity = useMutation(api.presence.broadcastActivity);

  return {
    broadcast: (
      activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed",
      metadata?: any
    ) => {
      if (!taskId || !userId) return;

      broadcastActivity({
        taskId,
        userId,
        activityType,
        metadata,
      }).catch((error) => {
        console.error("Failed to broadcast activity:", error);
      });
    },
  };
}

/**
 * Hook for getting recent activities in a task
 */
export function useRecentActivities(taskId: Id<"tasks"> | undefined, limit?: number) {
  const activities = useQuery(
    api.presence.getRecentActivities,
    taskId ? { taskId, limit } : "skip"
  );

  return activities ?? [];
}
