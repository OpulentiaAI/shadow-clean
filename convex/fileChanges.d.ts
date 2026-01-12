/**
 * Create a new file change record
 * Called directly from sidecar in Convex-native mode
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    additions: number;
    deletions: number;
    taskId: import("convex/values").GenericId<"tasks">;
    operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
    filePath: string;
}, Promise<{
    fileChangeId: import("convex/values").GenericId<"fileChanges">;
}>>;
/**
 * Get all file changes for a task
 */
export declare const byTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"fileChanges">;
    _creationTime: number;
    additions: number;
    deletions: number;
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
    filePath: string;
}[]>>;
/**
 * Get file changes for a task since a given timestamp
 */
export declare const byTaskSince: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
    since: number;
}, Promise<{
    _id: import("convex/values").GenericId<"fileChanges">;
    _creationTime: number;
    additions: number;
    deletions: number;
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
    filePath: string;
}[]>>;
/**
 * Get file change statistics for a task
 */
export declare const getStats: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    totalChanges: number;
    creates: number;
    updates: number;
    deletes: number;
    renames: number;
    totalAdditions: number;
    totalDeletions: number;
}>>;
/**
 * Delete all file changes for a task (cleanup)
 */
export declare const deleteByTask: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    deleted: number;
}>>;
//# sourceMappingURL=fileChanges.d.ts.map