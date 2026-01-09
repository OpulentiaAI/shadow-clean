export declare const get: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"codebaseUnderstanding">;
}, Promise<{
    content: any;
    _id: import("convex/values").GenericId<"codebaseUnderstanding">;
    _creationTime: number;
    repoUrl: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    contentJson: string;
}>>;
export declare const getByRepo: import("convex/server").RegisteredQuery<"public", {
    repoFullName: string;
}, Promise<{
    content: any;
    _id: import("convex/values").GenericId<"codebaseUnderstanding">;
    _creationTime: number;
    repoUrl: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    contentJson: string;
}>>;
export declare const getByTaskId: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    content: any;
    _id: import("convex/values").GenericId<"codebaseUnderstanding">;
    _creationTime: number;
    repoUrl: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    contentJson: string;
}>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    content: any;
    repoUrl: string;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
}, Promise<import("convex/values").GenericId<"codebaseUnderstanding">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    content: any;
    id: import("convex/values").GenericId<"codebaseUnderstanding">;
}, Promise<{
    success: boolean;
}>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"codebaseUnderstanding">;
}, Promise<{
    success: boolean;
}>>;
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    content: any;
    _id: import("convex/values").GenericId<"codebaseUnderstanding">;
    _creationTime: number;
    repoUrl: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    contentJson: string;
}[]>>;
//# sourceMappingURL=codebaseUnderstanding.d.ts.map