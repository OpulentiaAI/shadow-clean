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
        totalTokens: number;
    };
    finishReason: import("@ai-sdk/provider").LanguageModelV2FinishReason;
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
    text: string;
    usage: {
        promptTokens: any;
        completionTokens: any;
        totalTokens: number;
    };
    finishReason: import("@ai-sdk/provider").LanguageModelV2FinishReason;
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
}, Promise<import("convex/server", { with: { "resolution-mode": "import" } }).PaginationResult<{
    id?: string | undefined;
    userId?: string | undefined;
    embeddingId?: string | undefined;
    fileIds?: string[] | undefined;
    error?: string | undefined;
    agentName?: string | undefined;
    model?: string | undefined;
    provider?: string | undefined;
    providerOptions?: Record<string, Record<string, any>> | undefined;
    message?: {
        providerOptions?: Record<string, Record<string, any>> | undefined;
        role: "user";
        content: string | ({
            providerOptions?: Record<string, Record<string, any>> | undefined;
            providerMetadata?: Record<string, Record<string, any>> | undefined;
            type: "text";
            text: string;
        } | {
            providerOptions?: Record<string, Record<string, any>> | undefined;
            mimeType?: string | undefined;
            type: "image";
            image: string | ArrayBuffer;
        } | {
            providerOptions?: Record<string, Record<string, any>> | undefined;
            providerMetadata?: Record<string, Record<string, any>> | undefined;
            filename?: string | undefined;
            type: "file";
            mimeType: string;
            data: string | ArrayBuffer;
        })[];
    } | {
        providerOptions?: Record<string, Record<string, any>> | undefined;
        role: "assistant";
        content: string | ({
            providerOptions?: Record<string, Record<string, any>> | undefined;
            providerMetadata?: Record<string, Record<string, any>> | undefined;
            type: "text";
            text: string;
        } | {
            providerOptions?: Record<string, Record<string, any>> | undefined;
            providerMetadata?: Record<string, Record<string, any>> | undefined;
            filename?: string | undefined;
            type: "file";
            mimeType: string;
            data: string | ArrayBuffer;
        } | {
            providerOptions?: Record<string, Record<string, any>> | undefined;
            providerMetadata?: Record<string, Record<string, any>> | undefined;
            signature?: string | undefined;
            type: "reasoning";
            text: string;
        } | {
            providerOptions?: Record<string, Record<string, any>> | undefined;
            providerMetadata?: Record<string, Record<string, any>> | undefined;
            type: "redacted-reasoning";
            data: string;
        } | {
            providerOptions?: Record<string, Record<string, any>> | undefined;
            providerMetadata?: Record<string, Record<string, any>> | undefined;
            providerExecuted?: boolean | undefined;
            type: "tool-call";
            toolCallId: string;
            toolName: string;
            args: any;
        } | {
            providerOptions?: Record<string, Record<string, any>> | undefined;
            providerMetadata?: Record<string, Record<string, any>> | undefined;
            args?: any;
            providerExecuted?: boolean | undefined;
            output?: {
                type: "text";
                value: string;
            } | {
                type: "json";
                value: any;
            } | {
                type: "error-text";
                value: string;
            } | {
                type: "error-json";
                value: any;
            } | {
                type: "content";
                value: ({
                    type: "text";
                    text: string;
                } | {
                    type: "media";
                    data: string;
                    mediaType: string;
                })[];
            } | undefined;
            result?: any;
            isError?: boolean | undefined;
            experimental_content?: ({
                type: "text";
                text: string;
            } | {
                mimeType?: string | undefined;
                type: "image";
                data: string;
            })[] | undefined;
            type: "tool-result";
            toolCallId: string;
            toolName: string;
        } | {
            title?: string | undefined;
            providerOptions?: Record<string, Record<string, any>> | undefined;
            providerMetadata?: Record<string, Record<string, any>> | undefined;
            id: string;
            type: "source";
            sourceType: "url";
            url: string;
        } | {
            providerOptions?: Record<string, Record<string, any>> | undefined;
            providerMetadata?: Record<string, Record<string, any>> | undefined;
            filename?: string | undefined;
            id: string;
            title: string;
            type: "source";
            mediaType: string;
            sourceType: "document";
        })[];
    } | {
        providerOptions?: Record<string, Record<string, any>> | undefined;
        role: "tool";
        content: {
            providerOptions?: Record<string, Record<string, any>> | undefined;
            providerMetadata?: Record<string, Record<string, any>> | undefined;
            args?: any;
            providerExecuted?: boolean | undefined;
            output?: {
                type: "text";
                value: string;
            } | {
                type: "json";
                value: any;
            } | {
                type: "error-text";
                value: string;
            } | {
                type: "error-json";
                value: any;
            } | {
                type: "content";
                value: ({
                    type: "text";
                    text: string;
                } | {
                    type: "media";
                    data: string;
                    mediaType: string;
                })[];
            } | undefined;
            result?: any;
            isError?: boolean | undefined;
            experimental_content?: ({
                type: "text";
                text: string;
            } | {
                mimeType?: string | undefined;
                type: "image";
                data: string;
            })[] | undefined;
            type: "tool-result";
            toolCallId: string;
            toolName: string;
        }[];
    } | {
        providerOptions?: Record<string, Record<string, any>> | undefined;
        role: "system";
        content: string;
    } | undefined;
    text?: string | undefined;
    providerMetadata?: Record<string, Record<string, any>> | undefined;
    reasoning?: string | undefined;
    usage?: {
        reasoningTokens?: number | undefined;
        cachedInputTokens?: number | undefined;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    } | undefined;
    sources?: ({
        title?: string | undefined;
        type?: "source" | undefined;
        providerOptions?: Record<string, Record<string, any>> | undefined;
        providerMetadata?: Record<string, Record<string, any>> | undefined;
        id: string;
        sourceType: "url";
        url: string;
    } | {
        providerOptions?: Record<string, Record<string, any>> | undefined;
        providerMetadata?: Record<string, Record<string, any>> | undefined;
        filename?: string | undefined;
        id: string;
        title: string;
        type: "source";
        mediaType: string;
        sourceType: "document";
    })[] | undefined;
    warnings?: ({
        details?: string | undefined;
        type: "unsupported-setting";
        setting: string;
    } | {
        details?: string | undefined;
        type: "unsupported-tool";
        tool: any;
    } | {
        type: "other";
        message: string;
    })[] | undefined;
    finishReason?: "length" | "error" | "other" | "stop" | "content-filter" | "tool-calls" | "unknown" | undefined;
    reasoningDetails?: ({
        providerOptions?: Record<string, Record<string, any>> | undefined;
        providerMetadata?: Record<string, Record<string, any>> | undefined;
        signature?: string | undefined;
        type: "reasoning";
        text: string;
    } | {
        signature?: string | undefined;
        type: "text";
        text: string;
    } | {
        type: "redacted";
        data: string;
    })[] | undefined;
    _id: string;
    _creationTime: number;
    status: "pending" | "success" | "failed";
    order: number;
    threadId: string;
    stepOrder: number;
    tool: boolean;
}>>>;
//# sourceMappingURL=actions.d.ts.map