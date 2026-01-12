export declare const create: import("convex/server").RegisteredMutation<"public", {
    status?: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
    sequence?: number;
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    todoId: import("convex/values").GenericId<"todos">;
    sequence: number;
}>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    status?: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
    content?: string;
    sequence?: number;
    todoId: import("convex/values").GenericId<"todos">;
}, Promise<{
    success: boolean;
    todoId: import("convex/values").GenericId<"todos">;
}>>;
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
    todoId: import("convex/values").GenericId<"todos">;
}, Promise<{
    success: boolean;
}>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    todoId: import("convex/values").GenericId<"todos">;
}, Promise<{
    success: boolean;
}>>;
export declare const removeAllByTask: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    deleted: number;
}>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    todoId: import("convex/values").GenericId<"todos">;
}, Promise<{
    _id: import("convex/values").GenericId<"todos">;
    _creationTime: number;
    status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
    content: string;
    createdAt: number;
    updatedAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    sequence: number;
}>>;
export declare const byTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"todos">;
    _creationTime: number;
    status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
    content: string;
    createdAt: number;
    updatedAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    sequence: number;
}[]>>;
export declare const byTaskAndStatus: import("convex/server").RegisteredQuery<"public", {
    status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"todos">;
    _creationTime: number;
    status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
    content: string;
    createdAt: number;
    updatedAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    sequence: number;
}[]>>;
export declare const reorder: import("convex/server").RegisteredMutation<"public", {
    todoId: import("convex/values").GenericId<"todos">;
    newSequence: number;
}, Promise<{
    success: boolean;
}>>;
export declare const bulkCreate: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
    todos: {
        status?: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
        content: string;
    }[];
}, Promise<{
    todoIds: string[];
}>>;
//# sourceMappingURL=todos.d.ts.map