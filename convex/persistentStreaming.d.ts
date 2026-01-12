export declare const createStream: import("convex/server").RegisteredMutation<"public", {
    taskId?: import("convex/values").GenericId<"tasks">;
}, Promise<{
    streamId: import("@convex-dev/persistent-text-streaming", { with: { "resolution-mode": "import" } }).StreamId;
    taskId: import("convex/values").GenericId<"tasks">;
}>>;
export declare const getStreamBody: import("convex/server").RegisteredQuery<"public", {
    streamId: string;
}, Promise<import("@convex-dev/persistent-text-streaming", { with: { "resolution-mode": "import" } }).StreamBody>>;
export declare const debugGetStream: import("convex/server").RegisteredQuery<"public", {
    streamIdStr: string;
}, Promise<{
    success: boolean;
    body: import("@convex-dev/persistent-text-streaming", { with: { "resolution-mode": "import" } }).StreamBody;
    error?: undefined;
} | {
    success: boolean;
    error: string;
    body?: undefined;
}>>;
export declare const streamPersistentDemo: import("convex/server").PublicHttpAction;
//# sourceMappingURL=persistentStreaming.d.ts.map