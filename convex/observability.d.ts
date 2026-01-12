export declare function generateTraceId(): string;
export declare const startTrace: import("convex/server").RegisteredMutation<"public", {
    metadata?: string;
    messageId?: import("convex/values").GenericId<"chatMessages">;
    model?: string;
    provider?: string;
    taskId: import("convex/values").GenericId<"tasks">;
    traceId: string;
    workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
}, Promise<{
    traceDocId: import("convex/values").GenericId<"workflowTraces">;
    traceId: string;
}>>;
export declare const updateTrace: import("convex/server").RegisteredMutation<"public", {
    status?: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED";
    errorMessage?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    model?: string;
    errorType?: string;
    retryCount?: number;
    traceId: string;
}, Promise<{
    success: boolean;
}>>;
export declare const recordStep: import("convex/server").RegisteredMutation<"public", {
    errorMessage?: string;
    promptTokens?: number;
    completionTokens?: number;
    finishReason?: string;
    toolCallId?: string;
    toolName?: string;
    durationMs?: number;
    chunkCount?: number;
    totalChars?: number;
    status: "COMPLETED" | "FAILED" | "STARTED";
    taskId: import("convex/values").GenericId<"tasks">;
    traceId: string;
    stepNumber: number;
    stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
}, Promise<{
    stepId: import("convex/values").GenericId<"workflowSteps">;
}>>;
export declare const recordStreamingMetrics: import("convex/server").RegisteredMutation<"public", {
    traceId?: string;
    streamEndedAt?: number;
    taskId: import("convex/values").GenericId<"tasks">;
    messageId: import("convex/values").GenericId<"chatMessages">;
    totalChars: number;
    totalDeltas: number;
    throttleIntervalMs: number;
    streamStartedAt: number;
    dbWriteCount: number;
    streamStatus: "aborted" | "streaming" | "failed" | "completed";
}, Promise<{
    metricsId: import("convex/values").GenericId<"streamingMetrics">;
}>>;
export declare const getTaskTraces: import("convex/server").RegisteredQuery<"public", {
    limit?: number;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"workflowTraces">;
    _creationTime: number;
    metadata?: string;
    errorMessage?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    messageId?: import("convex/values").GenericId<"chatMessages">;
    completedAt?: number;
    totalDurationMs?: number;
    estimatedCostMillicents?: number;
    model?: string;
    provider?: string;
    errorType?: string;
    retryCount?: number;
    status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
    createdAt: number;
    updatedAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    startedAt: number;
    traceId: string;
    workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
}[]>>;
export declare const getTraceSteps: import("convex/server").RegisteredQuery<"public", {
    traceId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"workflowSteps">;
    _creationTime: number;
    errorMessage?: string;
    promptTokens?: number;
    completionTokens?: number;
    finishReason?: string;
    toolCallId?: string;
    toolName?: string;
    completedAt?: number;
    durationMs?: number;
    chunkCount?: number;
    totalChars?: number;
    status: "COMPLETED" | "FAILED" | "STARTED";
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    startedAt: number;
    traceId: string;
    stepNumber: number;
    stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
}[]>>;
export declare const getTaskMetrics: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    totalTraces: number;
    completedTraces: number;
    failedTraces: number;
    successRate: number;
    totalTokens: number;
    totalCostMillicents: number;
    totalCostDollars: number;
    avgDurationMs: number;
    avgCharsPerWrite: number;
    streamingMetricsCount: number;
}>>;
//# sourceMappingURL=observability.d.ts.map