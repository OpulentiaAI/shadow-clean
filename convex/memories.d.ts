export declare const create: import("convex/server").RegisteredMutation<"public", {
    content: string;
    repoUrl: string;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    taskId: import("convex/values").GenericId<"tasks">;
    category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
}, Promise<{
    memoryId: import("convex/values").GenericId<"memories">;
}>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    content?: string;
    category?: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
    memoryId: import("convex/values").GenericId<"memories">;
}, Promise<{
    success: boolean;
}>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    memoryId: import("convex/values").GenericId<"memories">;
}, Promise<{
    success: boolean;
}>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    memoryId: import("convex/values").GenericId<"memories">;
}, Promise<{
    _id: import("convex/values").GenericId<"memories">;
    _creationTime: number;
    content: string;
    repoUrl: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    taskId: import("convex/values").GenericId<"tasks">;
    category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
}>>;
export declare const byTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"memories">;
    _creationTime: number;
    content: string;
    repoUrl: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    taskId: import("convex/values").GenericId<"tasks">;
    category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
}[]>>;
export declare const byUserAndRepo: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
}, Promise<{
    _id: import("convex/values").GenericId<"memories">;
    _creationTime: number;
    content: string;
    repoUrl: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    taskId: import("convex/values").GenericId<"tasks">;
    category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
}[]>>;
export declare const byCategory: import("convex/server").RegisteredQuery<"public", {
    category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
}, Promise<{
    _id: import("convex/values").GenericId<"memories">;
    _creationTime: number;
    content: string;
    repoUrl: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    taskId: import("convex/values").GenericId<"tasks">;
    category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
}[]>>;
export declare const byUserRepoAndCategory: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
}, Promise<{
    _id: import("convex/values").GenericId<"memories">;
    _creationTime: number;
    content: string;
    repoUrl: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    taskId: import("convex/values").GenericId<"tasks">;
    category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
}[]>>;
export declare const search: import("convex/server").RegisteredQuery<"public", {
    searchTerm?: string;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
}, Promise<{
    _id: import("convex/values").GenericId<"memories">;
    _creationTime: number;
    content: string;
    repoUrl: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    repoFullName: string;
    taskId: import("convex/values").GenericId<"tasks">;
    category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
}[]>>;
export declare const bulkCreate: import("convex/server").RegisteredMutation<"public", {
    memories: {
        content: string;
        repoUrl: string;
        userId: import("convex/values").GenericId<"users">;
        repoFullName: string;
        taskId: import("convex/values").GenericId<"tasks">;
        category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
    }[];
}, Promise<{
    memoryIds: string[];
}>>;
//# sourceMappingURL=memories.d.ts.map