export declare const get: import("convex/server").RegisteredQuery<"public", {
    repoFullName: string;
}, Promise<{
    _id: import("convex/values").GenericId<"repositoryIndex">;
    _creationTime: number;
    lastCommitSha?: string;
    createdAt: number;
    updatedAt: number;
    repoFullName: string;
    lastIndexedAt: number;
}>>;
export declare const upsert: import("convex/server").RegisteredMutation<"public", {
    lastCommitSha?: string;
    repoFullName: string;
}, Promise<import("convex/values").GenericId<"repositoryIndex">>>;
export declare const updateLastIndexed: import("convex/server").RegisteredMutation<"public", {
    lastCommitSha?: string;
    repoFullName: string;
}, Promise<{
    success: boolean;
}>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    repoFullName: string;
}, Promise<{
    success: boolean;
}>>;
export declare const list: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"repositoryIndex">;
    _creationTime: number;
    lastCommitSha?: string;
    createdAt: number;
    updatedAt: number;
    repoFullName: string;
    lastIndexedAt: number;
}[]>>;
export declare const needsReindex: import("convex/server").RegisteredQuery<"public", {
    repoFullName: string;
    currentCommitSha: string;
}, Promise<boolean>>;
//# sourceMappingURL=repositoryIndex.d.ts.map