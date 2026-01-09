/**
 * Tool call tracking for streaming chat
 * Tracks tool calls made during AI streaming sessions
 */
/**
 * Create a new tool call record (when LLM requests tool execution)
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
    args: any;
    taskId: import("convex/values").GenericId<"tasks">;
    messageId: import("convex/values").GenericId<"chatMessages">;
    toolCallId: string;
    toolName: string;
}, Promise<{
    toolId: import("convex/values").GenericId<"agentTools">;
}>>;
/**
 * Update tool call result (when tool execution completes)
 */
export declare const updateResult: import("convex/server").RegisteredMutation<"public", {
    error?: string;
    result?: any;
    status: "COMPLETED" | "FAILED";
    toolCallId: string;
}, Promise<{
    success: boolean;
}>>;
/**
 * Get all tool calls for a message
 */
export declare const byMessage: import("convex/server").RegisteredQuery<"public", {
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    _id: import("convex/values").GenericId<"agentTools">;
    _creationTime: number;
    error?: string;
    completedAt?: number;
    result?: any;
    status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
    args: any;
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    messageId: import("convex/values").GenericId<"chatMessages">;
    toolCallId: string;
    toolName: string;
}[]>>;
/**
 * Get all tool calls for a task
 */
export declare const byTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"agentTools">;
    _creationTime: number;
    error?: string;
    completedAt?: number;
    result?: any;
    status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
    args: any;
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    messageId: import("convex/values").GenericId<"chatMessages">;
    toolCallId: string;
    toolName: string;
}[]>>;
/**
 * Get tool call by ID
 */
export declare const byToolCallId: import("convex/server").RegisteredQuery<"public", {
    toolCallId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"agentTools">;
    _creationTime: number;
    error?: string;
    completedAt?: number;
    result?: any;
    status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
    args: any;
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    messageId: import("convex/values").GenericId<"chatMessages">;
    toolCallId: string;
    toolName: string;
}>>;
/**
 * Mark all RUNNING tool calls for a message as FAILED (cleanup after streaming completes)
 */
export declare const failStaleRunning: import("convex/server").RegisteredMutation<"public", {
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    marked: number;
}>>;
/**
 * Delete all tool calls for a task (cleanup)
 */
export declare const deleteByTask: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    deleted: number;
}>>;
//# sourceMappingURL=toolCallTracking.d.ts.map