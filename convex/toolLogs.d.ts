/**
 * Create a new tool execution log
 * Called from sidecar when tool execution starts
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    status: "RUNNING" | "COMPLETED" | "FAILED";
    args: any;
    taskId: import("convex/values").GenericId<"tasks">;
    toolName: string;
}, Promise<{
    logId: import("convex/values").GenericId<"toolLogs">;
}>>;
/**
 * Update tool log with completion status
 */
export declare const update: import("convex/server").RegisteredMutation<"public", {
    error?: string;
    durationMs?: number;
    result?: any;
    status: "RUNNING" | "COMPLETED" | "FAILED";
    logId: import("convex/values").GenericId<"toolLogs">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Get all tool logs for a task
 */
export declare const byTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    args: any;
    result: any;
    _id: import("convex/values").GenericId<"toolLogs">;
    _creationTime: number;
    error?: string;
    resultJson?: string;
    completedAt?: number;
    durationMs?: number;
    status: "RUNNING" | "COMPLETED" | "FAILED";
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    toolName: string;
    argsJson: string;
}[]>>;
/**
 * Get recent tool logs for a task (limited)
 */
export declare const recentByTask: import("convex/server").RegisteredQuery<"public", {
    limit?: number;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    args: any;
    result: any;
    _id: import("convex/values").GenericId<"toolLogs">;
    _creationTime: number;
    error?: string;
    resultJson?: string;
    completedAt?: number;
    durationMs?: number;
    status: "RUNNING" | "COMPLETED" | "FAILED";
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    toolName: string;
    argsJson: string;
}[]>>;
/**
 * Get running tool executions for a task
 */
export declare const runningByTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    args: any;
    _id: import("convex/values").GenericId<"toolLogs">;
    _creationTime: number;
    error?: string;
    resultJson?: string;
    completedAt?: number;
    durationMs?: number;
    status: "RUNNING" | "COMPLETED" | "FAILED";
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    toolName: string;
    argsJson: string;
}[]>>;
/**
 * Get tool execution statistics for a task
 */
export declare const getStats: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    total: number;
    running: number;
    completed: number;
    failed: number;
    avgDurationMs: number;
    byTool: Record<string, number>;
}>>;
/**
 * Delete all tool logs for a task (cleanup)
 */
export declare const deleteByTask: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    deleted: number;
}>>;
//# sourceMappingURL=toolLogs.d.ts.map