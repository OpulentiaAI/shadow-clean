export declare const create: import("convex/server").RegisteredMutation<"public", {
    status: "CREATED" | "UPDATED";
    linesAdded: number;
    linesRemoved: number;
    commitSha: string;
    title: string;
    description: string;
    filesChanged: number;
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<import("convex/values").GenericId<"pullRequestSnapshots">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    status?: "CREATED" | "UPDATED";
    linesAdded?: number;
    linesRemoved?: number;
    commitSha?: string;
    title?: string;
    description?: string;
    filesChanged?: number;
    snapshotId: import("convex/values").GenericId<"pullRequestSnapshots">;
}, Promise<{
    success: boolean;
}>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    snapshotId: import("convex/values").GenericId<"pullRequestSnapshots">;
}, Promise<{
    _id: import("convex/values").GenericId<"pullRequestSnapshots">;
    _creationTime: number;
    status: "CREATED" | "UPDATED";
    linesAdded: number;
    linesRemoved: number;
    commitSha: string;
    createdAt: number;
    title: string;
    description: string;
    filesChanged: number;
    messageId: import("convex/values").GenericId<"chatMessages">;
}>>;
export declare const getByMessage: import("convex/server").RegisteredQuery<"public", {
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    _id: import("convex/values").GenericId<"pullRequestSnapshots">;
    _creationTime: number;
    status: "CREATED" | "UPDATED";
    linesAdded: number;
    linesRemoved: number;
    commitSha: string;
    createdAt: number;
    title: string;
    description: string;
    filesChanged: number;
    messageId: import("convex/values").GenericId<"chatMessages">;
}>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    snapshotId: import("convex/values").GenericId<"pullRequestSnapshots">;
}, Promise<{
    success: boolean;
}>>;
export declare const removeByMessage: import("convex/server").RegisteredMutation<"public", {
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    success: boolean;
}>>;
export declare const getLatestByTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"pullRequestSnapshots">;
    _creationTime: number;
    status: "CREATED" | "UPDATED";
    linesAdded: number;
    linesRemoved: number;
    commitSha: string;
    createdAt: number;
    title: string;
    description: string;
    filesChanged: number;
    messageId: import("convex/values").GenericId<"chatMessages">;
}>>;
//# sourceMappingURL=pullRequestSnapshots.d.ts.map