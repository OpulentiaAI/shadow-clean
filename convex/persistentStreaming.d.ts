export declare const createStream: import("convex/server").RegisteredMutation<"public", {
    taskId?: import("convex/values").GenericId<"tasks">;
}, Promise<{
    streamId: any;
    taskId: import("convex/values").GenericId<"tasks">;
}>>;
export declare const getStreamBody: import("convex/server").RegisteredQuery<"public", {
    streamId: string;
}, Promise<any>>;
export declare const debugGetStream: import("convex/server").RegisteredQuery<"public", {
    streamIdStr: string;
}, Promise<{
    success: boolean;
    body: any;
    error?: undefined;
} | {
    success: boolean;
    error: string;
    body?: undefined;
}>>;
export declare const streamPersistentDemo: import("convex/server").PublicHttpAction;
//# sourceMappingURL=persistentStreaming.d.ts.map