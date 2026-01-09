export declare const internalStartStreaming: import("convex/server").RegisteredMutation<"internal", {
    llmModel?: string;
    stackedTaskId?: import("convex/values").GenericId<"tasks">;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    messageId: import("convex/values").GenericId<"chatMessages">;
    sequence: number;
}>>;
export declare const internalAppendStreamDelta: import("convex/server").RegisteredMutation<"internal", {
    finishReason?: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
    parts?: any[];
    messageId: import("convex/values").GenericId<"chatMessages">;
    deltaText: string;
    isFinal: boolean;
}, Promise<{
    success: boolean;
}>>;
export declare const append: import("convex/server").RegisteredMutation<"public", {
    llmModel?: string;
    metadataJson?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    finishReason?: string;
    stackedTaskId?: import("convex/values").GenericId<"tasks">;
    clientMessageId?: string;
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
    role: "USER" | "ASSISTANT" | "SYSTEM";
}, Promise<{
    messageId: import("convex/values").GenericId<"chatMessages">;
    sequence: number;
}>>;
export declare const startStreaming: import("convex/server").RegisteredMutation<"public", {
    llmModel?: string;
    stackedTaskId?: import("convex/values").GenericId<"tasks">;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    messageId: import("convex/values").GenericId<"chatMessages">;
    sequence: number;
}>>;
export declare const appendStreamDelta: import("convex/server").RegisteredMutation<"public", {
    finishReason?: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
    parts?: any[];
    messageId: import("convex/values").GenericId<"chatMessages">;
    deltaText: string;
    isFinal: boolean;
}, Promise<{
    success: boolean;
}>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    content?: string;
    llmModel?: string;
    metadataJson?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    finishReason?: string;
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    success: boolean;
    messageId: import("convex/values").GenericId<"chatMessages">;
}>>;
export declare const edit: import("convex/server").RegisteredMutation<"public", {
    llmModel?: string;
    content: string;
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    success: boolean;
    messageId: import("convex/values").GenericId<"chatMessages">;
}>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    success: boolean;
}>>;
export declare const removeAfterSequence: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
    sequence: number;
}, Promise<{
    deleted: number;
}>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    _id: import("convex/values").GenericId<"chatMessages">;
    _creationTime: number;
    status?: "pending" | "streaming" | "complete" | "failed";
    llmModel?: string;
    metadataJson?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    finishReason?: string;
    editedAt?: number;
    stackedTaskId?: import("convex/values").GenericId<"tasks">;
    promptMessageId?: import("convex/values").GenericId<"chatMessages">;
    clientMessageId?: string;
    content: string;
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    sequence: number;
}>>;
export declare const byTask: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    pullRequestSnapshot: {
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
    };
    stackedTask: {
        id: import("convex/values").GenericId<"tasks">;
        title: string;
    };
    _id: import("convex/values").GenericId<"chatMessages">;
    _creationTime: number;
    status?: "pending" | "streaming" | "complete" | "failed";
    llmModel?: string;
    metadataJson?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    finishReason?: string;
    editedAt?: number;
    stackedTaskId?: import("convex/values").GenericId<"tasks">;
    promptMessageId?: import("convex/values").GenericId<"chatMessages">;
    clientMessageId?: string;
    content: string;
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    sequence: number;
}[]>>;
export declare const getLatestSequence: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<number>>;
/**
 * Save a prompt (user) message BEFORE starting LLM generation.
 * This enables retry-safe streaming - the message exists in DB before LLM call.
 *
 * Implements TRUE IDEMPOTENCY via clientMessageId:
 * 1. If clientMessageId provided, check index first (instant upsert behavior)
 * 2. Always returns existing message if found, never creates duplicates
 *
 * Usage pattern:
 * - Frontend generates clientMessageId (UUID) before sending
 * - On retry/refresh, same clientMessageId returns same message
 */
export declare const savePromptMessage: import("convex/server").RegisteredMutation<"public", {
    llmModel?: string;
    clientMessageId?: string;
    content: string;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    messageId: import("convex/values").GenericId<"chatMessages">;
    sequence: number;
}>>;
/**
 * Create an assistant message placeholder BEFORE LLM call.
 * Links to the prompt message for retry correlation.
 */
export declare const createAssistantMessage: import("convex/server").RegisteredMutation<"public", {
    llmModel?: string;
    promptMessageId?: import("convex/values").GenericId<"chatMessages">;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    messageId: import("convex/values").GenericId<"chatMessages">;
    sequence: number;
}>>;
/**
 * Get or create an assistant message for a prompt (BP012 idempotency).
 *
 * This prevents duplicate assistant messages when the client retries the same
 * prompt (e.g., network retries) with the same promptMessageId/clientMessageId.
 */
export declare const getOrCreateAssistantForPrompt: import("convex/server").RegisteredMutation<"public", {
    llmModel?: string;
    taskId: import("convex/values").GenericId<"tasks">;
    promptMessageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    messageId: import("convex/values").GenericId<"chatMessages">;
    sequence: number;
    status: string;
    content: string;
    reused: boolean;
}>>;
/**
 * Update message status during streaming lifecycle.
 * Status transitions: pending → streaming → complete | failed
 */
export declare const updateMessageStatus: import("convex/server").RegisteredMutation<"public", {
    content?: string;
    errorMessage?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    finishReason?: string;
    status: "pending" | "streaming" | "complete" | "failed";
    messageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    success: boolean;
}>>;
/**
 * Find existing assistant message for a prompt (for retry scenarios).
 * Returns the last assistant message linked to the given prompt.
 */
export declare const findAssistantForPrompt: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
    promptMessageId: import("convex/values").GenericId<"chatMessages">;
}, Promise<{
    _id: import("convex/values").GenericId<"chatMessages">;
    _creationTime: number;
    status?: "pending" | "streaming" | "complete" | "failed";
    llmModel?: string;
    metadataJson?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    finishReason?: string;
    editedAt?: number;
    stackedTaskId?: import("convex/values").GenericId<"tasks">;
    promptMessageId?: import("convex/values").GenericId<"chatMessages">;
    clientMessageId?: string;
    content: string;
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    sequence: number;
}>>;
/**
 * Get messages by status (useful for finding failed messages to retry).
 */
export declare const byStatus: import("convex/server").RegisteredQuery<"public", {
    status: "pending" | "streaming" | "complete" | "failed";
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"chatMessages">;
    _creationTime: number;
    status?: "pending" | "streaming" | "complete" | "failed";
    llmModel?: string;
    metadataJson?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    finishReason?: string;
    editedAt?: number;
    stackedTaskId?: import("convex/values").GenericId<"tasks">;
    promptMessageId?: import("convex/values").GenericId<"chatMessages">;
    clientMessageId?: string;
    content: string;
    createdAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    role: "USER" | "ASSISTANT" | "SYSTEM";
    sequence: number;
}[]>>;
//# sourceMappingURL=messages.d.ts.map