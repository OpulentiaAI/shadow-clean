export declare const get: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"userSettings">;
    _creationTime: number;
    rules?: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    memoriesEnabled: boolean;
    autoPullRequest: boolean;
    enableShadowWiki: boolean;
    enableIndexing: boolean;
    selectedModels: string[];
}>>;
export declare const getOrCreate: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"userSettings">;
    _creationTime: number;
    rules?: string;
    createdAt: number;
    updatedAt: number;
    userId: import("convex/values").GenericId<"users">;
    memoriesEnabled: boolean;
    autoPullRequest: boolean;
    enableShadowWiki: boolean;
    enableIndexing: boolean;
    selectedModels: string[];
} | {
    _id: any;
    userId: import("convex/values").GenericId<"users">;
    memoriesEnabled: boolean;
    autoPullRequest: boolean;
    enableShadowWiki: boolean;
    enableIndexing: boolean;
    selectedModels: any[];
    rules: any;
    createdAt: number;
    updatedAt: number;
}>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    memoriesEnabled?: boolean;
    autoPullRequest?: boolean;
    enableShadowWiki?: boolean;
    enableIndexing?: boolean;
    selectedModels?: string[];
    rules?: string;
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    settingsId: import("convex/values").GenericId<"userSettings">;
}>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    memoriesEnabled?: boolean;
    autoPullRequest?: boolean;
    enableShadowWiki?: boolean;
    enableIndexing?: boolean;
    selectedModels?: string[];
    rules?: string;
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    settingsId: import("convex/values").GenericId<"userSettings">;
    created: boolean;
}>>;
export declare const upsert: import("convex/server").RegisteredMutation<"public", {
    memoriesEnabled?: boolean;
    autoPullRequest?: boolean;
    enableShadowWiki?: boolean;
    enableIndexing?: boolean;
    selectedModels?: string[];
    rules?: string;
    userId: import("convex/values").GenericId<"users">;
}, Promise<import("convex/values").GenericId<"userSettings">>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    success: boolean;
}>>;
//# sourceMappingURL=userSettings.d.ts.map