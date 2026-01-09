import { Id } from "./_generated/dataModel";
type StreamChatResult = {
    success: boolean;
    messageId: Id<"chatMessages">;
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
};
type StreamChatWithToolsResult = {
    success: boolean;
    messageId: Id<"chatMessages">;
    text: string;
    toolCallIds: string[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
};
/**
 * Streaming chat action using Convex's native streaming support
 * Replaces Socket.IO streaming with Convex actions + subscriptions
 */
export declare const streamChat: import("convex/server").RegisteredAction<"public", {
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
}, Promise<StreamChatResult>>;
/**
 * Streaming chat with tool calling support
 * Full replacement for Socket.IO agent streaming
 */
export declare const streamChatWithTools: import("convex/server").RegisteredAction<"public", {
    llmModel?: string;
    promptMessageId?: import("convex/values").GenericId<"chatMessages">;
    clientMessageId?: string;
    systemPrompt?: string;
    tools?: {
        name: string;
        description: string;
        parameters: any;
    }[];
    taskId: import("convex/values").GenericId<"tasks">;
    model: string;
    prompt: string;
    apiKeys: {
        anthropic?: string;
        openai?: string;
        openrouter?: string;
        exa?: string;
    };
}, Promise<StreamChatWithToolsResult>>;
/**
 * Cancel streaming action by message ID
 */
export declare const cancelStream: import("convex/server").RegisteredAction<"public", {
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Stop a running task - sets task status to STOPPED and aborts any active streams.
 * Also marks any streaming/pending messages as failed to prevent blocking next request.
 */
export declare const stopTask: import("convex/server").RegisteredAction<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    abortedStreams: number;
    markedFailed: number;
}>>;
/**
 * Resume streaming from a previous message
 */
export declare const resumeStream: import("convex/server").RegisteredAction<"public", {
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
    fromMessageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<StreamChatResult>>;
export {};
//# sourceMappingURL=streaming.d.ts.map