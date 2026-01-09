"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.byStatus = exports.findAssistantForPrompt = exports.updateMessageStatus = exports.getOrCreateAssistantForPrompt = exports.createAssistantMessage = exports.savePromptMessage = exports.getLatestSequence = exports.byTask = exports.get = exports.removeAfterSequence = exports.remove = exports.edit = exports.update = exports.appendStreamDelta = exports.startStreaming = exports.append = exports.internalAppendStreamDelta = exports.internalStartStreaming = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const schema_1 = require("./schema");
// Internal mutations for use by other Convex functions (avoids circular type references)
exports.internalStartStreaming = (0, server_1.internalMutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        llmModel: values_1.v.optional(values_1.v.string()),
        stackedTaskId: values_1.v.optional(values_1.v.id("tasks")),
    },
    handler: async (ctx, args) => {
        const latest = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .first();
        const sequence = latest ? latest.sequence + 1 : 0;
        const createdAt = Date.now();
        const messageId = await ctx.db.insert("chatMessages", {
            taskId: args.taskId,
            role: "ASSISTANT",
            content: "",
            llmModel: args.llmModel,
            metadataJson: JSON.stringify({ isStreaming: true, parts: [] }),
            promptTokens: undefined,
            completionTokens: undefined,
            totalTokens: undefined,
            finishReason: undefined,
            stackedTaskId: args.stackedTaskId,
            sequence,
            createdAt,
            editedAt: undefined,
        });
        return { messageId, sequence };
    },
});
exports.internalAppendStreamDelta = (0, server_1.internalMutation)({
    args: {
        messageId: values_1.v.id("chatMessages"),
        deltaText: values_1.v.string(),
        usage: values_1.v.optional(values_1.v.object({
            promptTokens: values_1.v.optional(values_1.v.number()),
            completionTokens: values_1.v.optional(values_1.v.number()),
            totalTokens: values_1.v.optional(values_1.v.number()),
        })),
        finishReason: values_1.v.optional(values_1.v.string()),
        isFinal: values_1.v.boolean(),
        parts: values_1.v.optional(values_1.v.array(values_1.v.any())),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.messageId);
        if (!existing) {
            throw new Error("Message not found for streaming");
        }
        const currentMetadata = existing.metadataJson
            ? JSON.parse(existing.metadataJson)
            : {};
        const currentContent = existing.content || "";
        const updatedContent = currentContent + args.deltaText;
        const currentParts = currentMetadata.parts || [];
        const updatedParts = args.parts ? [...currentParts, ...args.parts] : currentParts;
        const updatedMetadata = {
            ...currentMetadata,
            isStreaming: !args.isFinal,
            parts: updatedParts,
            usage: args.usage ? { ...currentMetadata.usage, ...args.usage } : currentMetadata.usage,
            finishReason: args.finishReason ?? currentMetadata.finishReason,
        };
        await ctx.db.patch(args.messageId, {
            content: updatedContent,
            metadataJson: JSON.stringify(updatedMetadata),
            editedAt: Date.now(),
        });
        return { success: true };
    },
});
exports.append = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        role: schema_1.MessageRole,
        content: values_1.v.string(),
        llmModel: values_1.v.optional(values_1.v.string()),
        metadataJson: values_1.v.optional(values_1.v.string()),
        promptTokens: values_1.v.optional(values_1.v.number()),
        completionTokens: values_1.v.optional(values_1.v.number()),
        totalTokens: values_1.v.optional(values_1.v.number()),
        finishReason: values_1.v.optional(values_1.v.string()),
        stackedTaskId: values_1.v.optional(values_1.v.id("tasks")),
        // Client-generated UUID for true idempotency across retries
        clientMessageId: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const createdAt = Date.now();
        // TRUE IDEMPOTENCY: Check by clientMessageId index first (instant O(1) lookup)
        if (args.clientMessageId) {
            const existingByClientId = await ctx.db
                .query("chatMessages")
                .withIndex("by_task_clientMessageId", (q) => q.eq("taskId", args.taskId).eq("clientMessageId", args.clientMessageId))
                .first();
            if (existingByClientId) {
                console.log(`[MESSAGES] Idempotent hit in append: clientMessageId=${args.clientMessageId} → ` +
                    `existing message ${existingByClientId._id} (sequence=${existingByClientId.sequence})`);
                return { messageId: existingByClientId._id, sequence: existingByClientId.sequence };
            }
        }
        const latest = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .first();
        const sequence = latest ? latest.sequence + 1 : 0;
        const messageId = await ctx.db.insert("chatMessages", {
            taskId: args.taskId,
            role: args.role,
            content: args.content,
            llmModel: args.llmModel,
            metadataJson: args.metadataJson,
            promptTokens: args.promptTokens,
            completionTokens: args.completionTokens,
            totalTokens: args.totalTokens,
            finishReason: args.finishReason,
            stackedTaskId: args.stackedTaskId,
            clientMessageId: args.clientMessageId,
            sequence,
            createdAt,
            editedAt: undefined,
        });
        return { messageId, sequence };
    },
});
exports.startStreaming = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        llmModel: values_1.v.optional(values_1.v.string()),
        stackedTaskId: values_1.v.optional(values_1.v.id("tasks")),
    },
    handler: async (ctx, args) => {
        const latest = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .first();
        const sequence = latest ? latest.sequence + 1 : 0;
        const createdAt = Date.now();
        const messageId = await ctx.db.insert("chatMessages", {
            taskId: args.taskId,
            role: "ASSISTANT",
            content: "",
            llmModel: args.llmModel,
            metadataJson: JSON.stringify({ isStreaming: true, parts: [] }),
            promptTokens: undefined,
            completionTokens: undefined,
            totalTokens: undefined,
            finishReason: undefined,
            stackedTaskId: args.stackedTaskId,
            sequence,
            createdAt,
            editedAt: undefined,
        });
        return { messageId, sequence };
    },
});
exports.appendStreamDelta = (0, server_1.mutation)({
    args: {
        messageId: values_1.v.id("chatMessages"),
        deltaText: values_1.v.string(),
        usage: values_1.v.optional(values_1.v.object({
            promptTokens: values_1.v.optional(values_1.v.number()),
            completionTokens: values_1.v.optional(values_1.v.number()),
            totalTokens: values_1.v.optional(values_1.v.number()),
        })),
        finishReason: values_1.v.optional(values_1.v.string()),
        isFinal: values_1.v.boolean(),
        parts: values_1.v.optional(values_1.v.array(values_1.v.any())),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.messageId);
        if (!existing) {
            throw new Error("Message not found for streaming");
        }
        const currentMetadata = existing.metadataJson
            ? JSON.parse(existing.metadataJson)
            : {};
        const currentContent = existing.content || "";
        const updatedContent = currentContent + args.deltaText;
        const currentParts = currentMetadata.parts || [];
        const updatedParts = args.parts ? [...currentParts, ...args.parts] : currentParts;
        const updatedMetadata = {
            ...currentMetadata,
            isStreaming: !args.isFinal,
            parts: updatedParts,
            usage: args.usage ? { ...currentMetadata.usage, ...args.usage } : currentMetadata.usage,
            finishReason: args.finishReason ?? currentMetadata.finishReason,
        };
        await ctx.db.patch(args.messageId, {
            content: updatedContent,
            metadataJson: JSON.stringify(updatedMetadata),
            editedAt: Date.now(),
        });
        return { success: true };
    },
});
exports.update = (0, server_1.mutation)({
    args: {
        messageId: values_1.v.id("chatMessages"),
        content: values_1.v.optional(values_1.v.string()),
        llmModel: values_1.v.optional(values_1.v.string()),
        metadataJson: values_1.v.optional(values_1.v.string()),
        promptTokens: values_1.v.optional(values_1.v.number()),
        completionTokens: values_1.v.optional(values_1.v.number()),
        totalTokens: values_1.v.optional(values_1.v.number()),
        finishReason: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.messageId);
        if (!existing) {
            throw new Error("Message not found");
        }
        const { messageId, ...updates } = args;
        const patchData = { editedAt: Date.now() };
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                patchData[key] = value;
            }
        }
        await ctx.db.patch(messageId, patchData);
        return { success: true, messageId };
    },
});
exports.edit = (0, server_1.mutation)({
    args: {
        messageId: values_1.v.id("chatMessages"),
        content: values_1.v.string(),
        llmModel: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.messageId);
        if (!existing) {
            throw new Error("Message not found");
        }
        if (existing.role !== "USER") {
            throw new Error("Can only edit user messages");
        }
        await ctx.db.patch(args.messageId, {
            content: args.content,
            llmModel: args.llmModel ?? existing.llmModel,
            editedAt: Date.now(),
        });
        return { success: true, messageId: args.messageId };
    },
});
exports.remove = (0, server_1.mutation)({
    args: { messageId: values_1.v.id("chatMessages") },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.messageId);
        if (!existing) {
            throw new Error("Message not found");
        }
        const snapshot = await ctx.db
            .query("pullRequestSnapshots")
            .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
            .first();
        if (snapshot) {
            await ctx.db.delete(snapshot._id);
        }
        await ctx.db.delete(args.messageId);
        return { success: true };
    },
});
exports.removeAfterSequence = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        sequence: values_1.v.number(),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .collect();
        const toDelete = messages.filter((m) => m.sequence > args.sequence);
        for (const msg of toDelete) {
            const snapshot = await ctx.db
                .query("pullRequestSnapshots")
                .withIndex("by_message", (q) => q.eq("messageId", msg._id))
                .first();
            if (snapshot) {
                await ctx.db.delete(snapshot._id);
            }
            await ctx.db.delete(msg._id);
        }
        return { deleted: toDelete.length };
    },
});
exports.get = (0, server_1.query)({
    args: { messageId: values_1.v.id("chatMessages") },
    handler: async (ctx, args) => {
        return ctx.db.get(args.messageId);
    },
});
exports.byTask = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("asc")
            .collect();
        const messagesWithSnapshots = await Promise.all(messages.map(async (msg) => {
            const pullRequestSnapshot = await ctx.db
                .query("pullRequestSnapshots")
                .withIndex("by_message", (q) => q.eq("messageId", msg._id))
                .first();
            const stackedTask = msg.stackedTaskId
                ? await ctx.db.get(msg.stackedTaskId)
                : null;
            return {
                ...msg,
                pullRequestSnapshot,
                stackedTask: stackedTask
                    ? { id: stackedTask._id, title: stackedTask.title }
                    : null,
            };
        }));
        return messagesWithSnapshots;
    },
});
exports.getLatestSequence = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        const latest = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .first();
        return latest?.sequence ?? -1;
    },
});
// ============================================================================
// BP012: promptMessageId Pattern - Retry-safe streaming
// Source: https://docs.convex.dev/agents/messages#saving-messages
// ============================================================================
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
exports.savePromptMessage = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        content: values_1.v.string(),
        llmModel: values_1.v.optional(values_1.v.string()),
        // Client-generated UUID for true idempotency across retries
        clientMessageId: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        // TRUE IDEMPOTENCY: Check by clientMessageId index first (instant O(1) lookup)
        if (args.clientMessageId) {
            const existingByClientId = await ctx.db
                .query("chatMessages")
                .withIndex("by_task_clientMessageId", (q) => q.eq("taskId", args.taskId).eq("clientMessageId", args.clientMessageId))
                .first();
            if (existingByClientId) {
                console.log(`[MESSAGES] Idempotent hit: clientMessageId=${args.clientMessageId} → ` +
                    `existing message ${existingByClientId._id} (sequence=${existingByClientId.sequence})`);
                return { messageId: existingByClientId._id, sequence: existingByClientId.sequence };
            }
        }
        // No existing message found, create new one
        const latest = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .first();
        const sequence = latest ? latest.sequence + 1 : 0;
        const messageId = await ctx.db.insert("chatMessages", {
            taskId: args.taskId,
            role: "USER",
            content: args.content,
            llmModel: args.llmModel,
            clientMessageId: args.clientMessageId,
            sequence,
            status: "complete", // User messages are immediately complete
            createdAt: now,
        });
        console.log(`[MESSAGES] Created new prompt message ${messageId} ` +
            `(clientMessageId=${args.clientMessageId}, sequence=${sequence})`);
        return { messageId, sequence };
    },
});
/**
 * Create an assistant message placeholder BEFORE LLM call.
 * Links to the prompt message for retry correlation.
 */
exports.createAssistantMessage = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        promptMessageId: values_1.v.optional(values_1.v.id("chatMessages")),
        llmModel: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const latest = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .first();
        const sequence = latest ? latest.sequence + 1 : 0;
        const now = Date.now();
        const messageId = await ctx.db.insert("chatMessages", {
            taskId: args.taskId,
            role: "ASSISTANT",
            content: "",
            llmModel: args.llmModel,
            metadataJson: JSON.stringify({ isStreaming: true, parts: [] }),
            sequence,
            status: "pending", // Will transition: pending → streaming → complete/failed
            promptMessageId: args.promptMessageId,
            createdAt: now,
        });
        return { messageId, sequence };
    },
});
/**
 * Get or create an assistant message for a prompt (BP012 idempotency).
 *
 * This prevents duplicate assistant messages when the client retries the same
 * prompt (e.g., network retries) with the same promptMessageId/clientMessageId.
 */
exports.getOrCreateAssistantForPrompt = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        promptMessageId: values_1.v.id("chatMessages"),
        llmModel: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .collect();
        const existing = messages.find((m) => m.role === "ASSISTANT" && m.promptMessageId === args.promptMessageId);
        if (existing) {
            return {
                messageId: existing._id,
                sequence: existing.sequence,
                status: existing.status ?? null,
                content: existing.content ?? "",
                reused: true,
            };
        }
        const latest = messages[0];
        const sequence = latest ? latest.sequence + 1 : 0;
        const now = Date.now();
        const messageId = await ctx.db.insert("chatMessages", {
            taskId: args.taskId,
            role: "ASSISTANT",
            content: "",
            llmModel: args.llmModel,
            metadataJson: JSON.stringify({ isStreaming: true, parts: [] }),
            sequence,
            status: "pending",
            promptMessageId: args.promptMessageId,
            createdAt: now,
        });
        return { messageId, sequence, status: "pending", content: "", reused: false };
    },
});
/**
 * Update message status during streaming lifecycle.
 * Status transitions: pending → streaming → complete | failed
 */
exports.updateMessageStatus = (0, server_1.mutation)({
    args: {
        messageId: values_1.v.id("chatMessages"),
        status: values_1.v.union(values_1.v.literal("pending"), values_1.v.literal("streaming"), values_1.v.literal("complete"), values_1.v.literal("failed")),
        content: values_1.v.optional(values_1.v.string()),
        promptTokens: values_1.v.optional(values_1.v.number()),
        completionTokens: values_1.v.optional(values_1.v.number()),
        totalTokens: values_1.v.optional(values_1.v.number()),
        finishReason: values_1.v.optional(values_1.v.string()),
        errorMessage: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.messageId);
        if (!existing) {
            throw new Error(`Message not found: ${args.messageId}`);
        }
        const updates = {
            status: args.status,
            editedAt: Date.now(),
        };
        if (args.content !== undefined) {
            updates.content = args.content;
        }
        if (args.promptTokens !== undefined) {
            updates.promptTokens = args.promptTokens;
        }
        if (args.completionTokens !== undefined) {
            updates.completionTokens = args.completionTokens;
        }
        if (args.totalTokens !== undefined) {
            updates.totalTokens = args.totalTokens;
        }
        if (args.finishReason !== undefined) {
            updates.finishReason = args.finishReason;
        }
        // Update metadata with streaming state
        const currentMetadata = existing.metadataJson
            ? JSON.parse(existing.metadataJson)
            : {};
        const updatedMetadata = {
            ...currentMetadata,
            isStreaming: args.status === "streaming",
            errorMessage: args.errorMessage,
        };
        updates.metadataJson = JSON.stringify(updatedMetadata);
        await ctx.db.patch(args.messageId, updates);
        return { success: true };
    },
});
/**
 * Find existing assistant message for a prompt (for retry scenarios).
 * Returns the last assistant message linked to the given prompt.
 */
exports.findAssistantForPrompt = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
        promptMessageId: values_1.v.id("chatMessages"),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .collect();
        // Find assistant message linked to this prompt
        const assistant = messages.find((m) => m.role === "ASSISTANT" &&
            m.promptMessageId === args.promptMessageId);
        return assistant ?? null;
    },
});
/**
 * Get messages by status (useful for finding failed messages to retry).
 */
exports.byStatus = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
        status: values_1.v.union(values_1.v.literal("pending"), values_1.v.literal("streaming"), values_1.v.literal("complete"), values_1.v.literal("failed")),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("chatMessages")
            .withIndex("by_status", (q) => q.eq("taskId", args.taskId).eq("status", args.status))
            .collect();
    },
});
