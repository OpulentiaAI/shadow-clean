/**
 * Append terminal output chunk
 * Called from sidecar during command execution streaming
 */
export declare const append: import("convex/server").RegisteredMutation<"public", {
    timestamp: number;
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
    streamType: "stdout" | "stderr";
    commandId: string;
}, Promise<{
    outputId: import("convex/values").GenericId<"terminalOutput">;
}>>;
/**
 * Get all terminal output for a task
 */
export declare const byTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"terminalOutput">;
    _creationTime: number;
    timestamp: number;
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
    streamType: "stdout" | "stderr";
    commandId: string;
}[]>>;
/**
 * Get terminal output for a specific command
 */
export declare const byCommand: import("convex/server").RegisteredQuery<"public", {
    commandId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"terminalOutput">;
    _creationTime: number;
    timestamp: number;
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
    streamType: "stdout" | "stderr";
    commandId: string;
}[]>>;
/**
 * Get terminal output for a task since a given timestamp
 * Used for real-time streaming subscriptions
 */
export declare const byTaskSince: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
    since: number;
}, Promise<{
    _id: import("convex/values").GenericId<"terminalOutput">;
    _creationTime: number;
    timestamp: number;
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
    streamType: "stdout" | "stderr";
    commandId: string;
}[]>>;
/**
 * Get combined terminal output as a single string
 */
export declare const getCombinedOutput: import("convex/server").RegisteredQuery<"public", {
    commandId: string;
}, Promise<{
    stdout: string;
    stderr: string;
}>>;
/**
 * Delete terminal output for a command (cleanup after command completes)
 */
export declare const deleteByCommand: import("convex/server").RegisteredMutation<"public", {
    commandId: string;
}, Promise<{
    deleted: number;
}>>;
/**
 * Delete all terminal output for a task (cleanup)
 */
export declare const deleteByTask: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    deleted: number;
}>>;
//# sourceMappingURL=terminalOutput.d.ts.map