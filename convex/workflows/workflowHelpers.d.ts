/**
 * Internal Workflow Helper Functions
 * These are internal mutations/actions that can be called by workflow steps.
 * They are checkpointed by the workflow system.
 */
/**
 * Start a workflow trace for observability
 */
export declare const startWorkflowTrace: import("convex/server").RegisteredMutation<"internal", {
    taskId: import("convex/values").GenericId<"tasks">;
    workflowType: string;
    model: string;
}, Promise<string>>;
/**
 * Mark workflow trace as completed
 */
export declare const completeWorkflowTrace: import("convex/server").RegisteredMutation<"internal", {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    durationMs: number;
    traceId: string;
    toolCallCount: number;
}, Promise<void>>;
/**
 * Mark workflow trace as failed
 */
export declare const failWorkflowTrace: import("convex/server").RegisteredMutation<"internal", {
    errorMessage: string;
    durationMs: number;
    traceId: string;
    errorType: string;
}, Promise<void>>;
/**
 * Save user prompt message (BP012 pattern)
 */
export declare const saveUserMessage: import("convex/server").RegisteredMutation<"internal", {
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    messageId: import("convex/values").GenericId<"chatMessages">;
    sequence: number;
}>>;
/**
 * Create assistant message placeholder (BP012 pattern)
 */
export declare const createAssistantPlaceholder: import("convex/server").RegisteredMutation<"internal", {
    taskId: import("convex/values").GenericId<"tasks">;
    llmModel: string;
    promptMessageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    messageId: import("convex/values").GenericId<"chatMessages">;
    sequence: number;
}>>;
/**
 * Record an approval request for human-in-the-loop workflows
 */
export declare const recordApprovalRequest: import("convex/server").RegisteredMutation<"internal", {
    taskId: import("convex/values").GenericId<"tasks">;
    traceId: string;
    toolCallIds: string[];
}, Promise<void>>;
/**
 * Mark message as failed
 */
export declare const markMessageFailed: import("convex/server").RegisteredMutation<"internal", {
    errorMessage: string;
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<void>>;
/**
 * Execute LLM streaming - wraps the main streaming action for workflow use
 */
export declare const executeStreaming: import("convex/server").RegisteredAction<"internal", {
    llmModel?: string;
    systemPrompt?: string;
    taskId: import("convex/values").GenericId<"tasks">;
    model: string;
    prompt: string;
    apiKeys: {
        anthropic?: string;
        openai?: string;
        openrouter?: string;
    };
    assistantMessageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    success: boolean;
    messageId: string;
    text: string;
    toolCallIds: string[];
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
}>>;
//# sourceMappingURL=workflowHelpers.d.ts.map