export declare const create: import("convex/server").RegisteredMutation<"public", {
    podName?: string;
    podNamespace?: string;
    connectionId?: string;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    sessionId: import("convex/values").GenericId<"taskSessions">;
}>>;
export declare const end: import("convex/server").RegisteredMutation<"public", {
    sessionId: import("convex/values").GenericId<"taskSessions">;
}, Promise<{
    success: boolean;
}>>;
export declare const endAllForTask: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    ended: number;
}>>;
export declare const updateConnection: import("convex/server").RegisteredMutation<"public", {
    podName?: string;
    podNamespace?: string;
    connectionId?: string;
    sessionId: import("convex/values").GenericId<"taskSessions">;
}, Promise<{
    success: boolean;
}>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    sessionId: import("convex/values").GenericId<"taskSessions">;
}, Promise<{
    _id: import("convex/values").GenericId<"taskSessions">;
    _creationTime: number;
    podName?: string;
    podNamespace?: string;
    connectionId?: string;
    endedAt?: number;
    createdAt: number;
    isActive: boolean;
    taskId: import("convex/values").GenericId<"tasks">;
}>>;
export declare const getActiveByTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"taskSessions">;
    _creationTime: number;
    podName?: string;
    podNamespace?: string;
    connectionId?: string;
    endedAt?: number;
    createdAt: number;
    isActive: boolean;
    taskId: import("convex/values").GenericId<"tasks">;
}>>;
export declare const listByTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"taskSessions">;
    _creationTime: number;
    podName?: string;
    podNamespace?: string;
    connectionId?: string;
    endedAt?: number;
    createdAt: number;
    isActive: boolean;
    taskId: import("convex/values").GenericId<"tasks">;
}[]>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    sessionId: import("convex/values").GenericId<"taskSessions">;
}, Promise<{
    success: boolean;
}>>;
export declare const removeAllForTask: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    deleted: number;
}>>;
//# sourceMappingURL=taskSessions.d.ts.map