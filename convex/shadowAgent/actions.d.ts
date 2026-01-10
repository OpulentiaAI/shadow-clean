/**
 * Create a new Agent thread for a task
 * Returns the threadId which should be stored on the task
 */
export declare const createThread: any;
/**
 * Stream a response using Agent primitives
 * This is the main entry point for chat streaming
 */
export declare const streamResponse: import("convex/server").RegisteredAction<"public", {
    userId?: string;
    model?: string;
    systemPrompt?: string;
    apiKeys?: {
        anthropic?: string;
        openai?: string;
        openrouter?: string;
        exa?: string;
    };
    taskId: import("convex/values").GenericId<"tasks">;
    threadId: string;
    prompt: string;
}, Promise<{
    success: boolean;
    threadId: string;
    text: string;
    usage: {
        promptTokens: any;
        completionTokens: any;
        totalTokens: any;
    };
    finishReason: any;
}>>;
/**
 * Generate text (non-streaming) using Agent primitives
 */
export declare const generateResponse: import("convex/server").RegisteredAction<"public", {
    userId?: string;
    model?: string;
    systemPrompt?: string;
    taskId: import("convex/values").GenericId<"tasks">;
    threadId: string;
    prompt: string;
}, Promise<{
    success: boolean;
    threadId: string;
    text: any;
    usage: {
        promptTokens: any;
        completionTokens: any;
        totalTokens: any;
    };
    finishReason: any;
}>>;
/**
 * Stop a running task
 * Marks the task as STOPPED so the next message can start fresh
 */
export declare const stopTask: import("convex/server").RegisteredAction<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
}>>;
/**
 * List messages from a thread
 * Uses Agent's listMessages exported function
 */
export declare const listMessages: import("convex/server").RegisteredAction<"public", {
    paginationOpts?: {
        cursor?: string;
        numItems?: number;
    };
    threadId: string;
}, Promise<any>>;
//# sourceMappingURL=actions.d.ts.map