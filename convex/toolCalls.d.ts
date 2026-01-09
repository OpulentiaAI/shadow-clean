export declare const logRequest: import("convex/server").RegisteredMutation<"public", {
    messageId?: import("convex/values").GenericId<"chatMessages">;
    threadId?: string;
    taskId: import("convex/values").GenericId<"tasks">;
    toolCallId: string;
    toolName: string;
    argsJson: string;
}, Promise<{
    toolCallId: import("convex/values").GenericId<"toolCalls">;
}>>;
export declare const markRunning: import("convex/server").RegisteredMutation<"public", {
    toolCallId: import("convex/values").GenericId<"toolCalls">;
}, Promise<{
    success: boolean;
}>>;
export declare const logResult: import("convex/server").RegisteredMutation<"public", {
    error?: string;
    resultJson?: string;
    status: "FAILED" | "SUCCEEDED";
    toolCallId: import("convex/values").GenericId<"toolCalls">;
}, Promise<{
    success: boolean;
}>>;
export declare const listByTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"toolCalls">;
    _creationTime: number;
    error?: string;
    messageId?: import("convex/values").GenericId<"chatMessages">;
    threadId?: string;
    resultJson?: string;
    completedAt?: number;
    status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
    createdAt: number;
    updatedAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    toolCallId: string;
    toolName: string;
    argsJson: string;
    startedAt: number;
}[]>>;
export declare const listByMessage: import("convex/server").RegisteredQuery<"public", {
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    _id: import("convex/values").GenericId<"toolCalls">;
    _creationTime: number;
    error?: string;
    messageId?: import("convex/values").GenericId<"chatMessages">;
    threadId?: string;
    resultJson?: string;
    completedAt?: number;
    status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
    createdAt: number;
    updatedAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    toolCallId: string;
    toolName: string;
    argsJson: string;
    startedAt: number;
}[]>>;
//# sourceMappingURL=toolCalls.d.ts.map