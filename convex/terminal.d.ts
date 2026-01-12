/**
 * Convex-native terminal operations
 * Replaces Socket.IO-based terminal streaming with Convex subscriptions
 */
/**
 * Append log entry to command logs
 */
export declare const appendLog: import("convex/server").RegisteredMutation<"internal", {
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
    commandId: string;
    stream: "stdout" | "stderr" | "system";
}, Promise<void>>;
/**
 * Public mutation to append logs (for external calls)
 */
export declare const addLog: import("convex/server").RegisteredMutation<"public", {
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
    commandId: string;
    stream: "stdout" | "stderr" | "system";
}, Promise<void>>;
/**
 * Get logs for a task (reactive query - auto-updates)
 */
export declare const getLogs: import("convex/server").RegisteredQuery<"public", {
    limit?: number;
    since?: number;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"commandLogs">;
    _creationTime: number;
    timestamp: number;
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
    commandId: string;
    stream: "stdout" | "stderr" | "system";
}[]>>;
/**
 * Get logs for a specific command
 */
export declare const getCommandLogs: import("convex/server").RegisteredQuery<"public", {
    commandId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"commandLogs">;
    _creationTime: number;
    timestamp: number;
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
    commandId: string;
    stream: "stdout" | "stderr" | "system";
}[]>>;
/**
 * Execute a command in Convex action
 * Note: Convex actions run in a sandboxed environment
 * For real shell execution, this should call an external service
 */
export declare const executeCommand: import("convex/server").RegisteredAction<"public", {
    cwd?: string;
    command: string;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    commandId: string;
    message: string;
    error?: undefined;
} | {
    success: boolean;
    commandId: string;
    error: string;
    message?: undefined;
}>>;
/**
 * Clear logs for a task
 */
export declare const clearLogs: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    deleted: number;
}>>;
//# sourceMappingURL=terminal.d.ts.map