/**
 * Daytona SDK integration for terminal streaming
 * Queries and mutations for sandbox state management
 *
 * Actions are in daytonaActions.ts (Node.js runtime)
 */
/**
 * Store sandbox info for a task
 */
export declare const storeSandboxInfo: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
    sandboxId: string;
    sessionId: string;
}, Promise<{
    id: import("convex/values").GenericId<"daytonaSandboxes">;
}>>;
/**
 * Get sandbox info for a task
 */
export declare const getSandboxInfo: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"daytonaSandboxes">;
    _creationTime: number;
    status: "error" | "creating" | "active" | "stopped";
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    sandboxId: string;
    sessionId: string;
    lastActivityAt: number;
}>>;
/**
 * Update sandbox last activity timestamp
 */
export declare const updateActivity: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<void>>;
/**
 * Update sandbox status
 */
export declare const updateSandboxStatus: import("convex/server").RegisteredMutation<"public", {
    status: "error" | "creating" | "active" | "stopped";
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<void>>;
//# sourceMappingURL=daytona.d.ts.map