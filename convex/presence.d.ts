/**
 * Real-time presence system for collaborative editing
 * Tracks active users, cursors, selections, and activities
 */
/**
 * Update user presence (heartbeat every 30s)
 */
export declare const updatePresence: import("convex/server").RegisteredMutation<"public", {
    userImage?: string;
    cursor?: {
        x: number;
        y: number;
    };
    selection?: {
        filePath?: string;
        start: number;
        end: number;
    };
    activity?: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
    userId: import("convex/values").GenericId<"users">;
    taskId: import("convex/values").GenericId<"tasks">;
    userName: string;
}, Promise<{
    presenceId: import("convex/values").GenericId<"presence">;
    action: string;
}>>;
/**
 * Get all active users for a task
 */
export declare const getActiveUsers: import("convex/server").RegisteredQuery<"public", {
    timeoutMs?: number;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    userId: import("convex/values").GenericId<"users">;
    userName: string;
    userImage: string;
    cursor: {
        x: number;
        y: number;
    };
    selection: {
        filePath?: string;
        start: number;
        end: number;
    };
    activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
    lastSeenAt: number;
    isActive: boolean;
}[]>>;
/**
 * Remove user presence (on disconnect)
 */
export declare const removePresence: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    presenceId: import("convex/values").GenericId<"presence">;
} | {
    success: boolean;
    presenceId?: undefined;
}>>;
/**
 * Cleanup stale presence records (run periodically)
 */
export declare const cleanupStalePresence: import("convex/server").RegisteredMutation<"internal", {
    timeoutMs: number;
}, Promise<{
    deleted: number;
}>>;
/**
 * Broadcast activity to all users in a task
 */
export declare const broadcastActivity: import("convex/server").RegisteredMutation<"public", {
    metadata?: any;
    userId: import("convex/values").GenericId<"users">;
    taskId: import("convex/values").GenericId<"tasks">;
    activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
}, Promise<{
    activityId: import("convex/values").GenericId<"activities">;
}>>;
/**
 * Get recent activities for a task
 */
export declare const getRecentActivities: import("convex/server").RegisteredQuery<"public", {
    limit?: number;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    metadata: any;
    _id: import("convex/values").GenericId<"activities">;
    _creationTime: number;
    timestamp: number;
    userId: import("convex/values").GenericId<"users">;
    taskId: import("convex/values").GenericId<"tasks">;
    activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
}[]>>;
//# sourceMappingURL=presence.d.ts.map