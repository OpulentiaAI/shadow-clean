"use strict";
/**
 * Internal Workflow Helper Functions
 * These are internal mutations/actions that can be called by workflow steps.
 * They are checkpointed by the workflow system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeStreaming = exports.markMessageFailed = exports.recordApprovalRequest = exports.createAssistantPlaceholder = exports.saveUserMessage = exports.failWorkflowTrace = exports.completeWorkflowTrace = exports.startWorkflowTrace = void 0;
const server_1 = require("../_generated/server");
const values_1 = require("convex/values");
const api_1 = require("../_generated/api");
// ============================================================================
// Observability Helpers
// ============================================================================
/**
 * Start a workflow trace for observability
 */
exports.startWorkflowTrace = (0, server_1.internalMutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        workflowType: values_1.v.string(),
        model: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const traceId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        await ctx.db.insert("workflowTraces", {
            traceId,
            taskId: args.taskId,
            workflowType: "streamChatWithTools",
            model: args.model,
            provider: "openrouter",
            status: "STARTED",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            startedAt: Date.now(),
        });
        return traceId;
    },
});
/**
 * Mark workflow trace as completed
 */
exports.completeWorkflowTrace = (0, server_1.internalMutation)({
    args: {
        traceId: values_1.v.string(),
        totalTokens: values_1.v.number(),
        promptTokens: values_1.v.number(),
        completionTokens: values_1.v.number(),
        durationMs: values_1.v.number(),
        toolCallCount: values_1.v.number(),
    },
    handler: async (ctx, args) => {
        const trace = await ctx.db
            .query("workflowTraces")
            .withIndex("by_trace_id", (q) => q.eq("traceId", args.traceId))
            .first();
        if (!trace) {
            console.warn(`[WorkflowHelpers] Trace not found: ${args.traceId}`);
            return;
        }
        await ctx.db.patch(trace._id, {
            status: "COMPLETED",
            completedAt: Date.now(),
            totalTokens: args.totalTokens,
            promptTokens: args.promptTokens,
            completionTokens: args.completionTokens,
            totalDurationMs: args.durationMs,
        });
    },
});
/**
 * Mark workflow trace as failed
 */
exports.failWorkflowTrace = (0, server_1.internalMutation)({
    args: {
        traceId: values_1.v.string(),
        errorType: values_1.v.string(),
        errorMessage: values_1.v.string(),
        durationMs: values_1.v.number(),
    },
    handler: async (ctx, args) => {
        const trace = await ctx.db
            .query("workflowTraces")
            .withIndex("by_trace_id", (q) => q.eq("traceId", args.traceId))
            .first();
        if (!trace) {
            console.warn(`[WorkflowHelpers] Trace not found: ${args.traceId}`);
            return;
        }
        await ctx.db.patch(trace._id, {
            status: "FAILED",
            completedAt: Date.now(),
            totalDurationMs: args.durationMs,
            errorType: args.errorType,
            errorMessage: args.errorMessage,
        });
    },
});
// ============================================================================
// Message Helpers
// ============================================================================
/**
 * Save user prompt message (BP012 pattern)
 */
exports.saveUserMessage = (0, server_1.internalMutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        content: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        // Get next sequence number
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
            sequence,
            status: "complete",
            createdAt: Date.now(),
        });
        return { messageId, sequence };
    },
});
/**
 * Create assistant message placeholder (BP012 pattern)
 */
exports.createAssistantPlaceholder = (0, server_1.internalMutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        promptMessageId: values_1.v.id("chatMessages"),
        llmModel: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        // Get next sequence number
        const latest = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .first();
        const sequence = latest ? latest.sequence + 1 : 0;
        const messageId = await ctx.db.insert("chatMessages", {
            taskId: args.taskId,
            role: "ASSISTANT",
            content: "",
            llmModel: args.llmModel,
            metadataJson: JSON.stringify({ isStreaming: true, parts: [] }),
            sequence,
            status: "pending",
            promptMessageId: args.promptMessageId,
            createdAt: Date.now(),
        });
        return { messageId, sequence };
    },
});
/**
 * Record an approval request for human-in-the-loop workflows
 */
exports.recordApprovalRequest = (0, server_1.internalMutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        traceId: values_1.v.string(),
        toolCallIds: values_1.v.array(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        // Record the approval request in the trace metadata
        const trace = await ctx.db
            .query("workflowTraces")
            .withIndex("by_trace_id", (q) => q.eq("traceId", args.traceId))
            .first();
        if (trace) {
            await ctx.db.patch(trace._id, {
                status: "IN_PROGRESS",
                metadata: JSON.stringify({
                    awaitingApproval: true,
                    pendingToolCalls: args.toolCallIds,
                    approvalRequestedAt: Date.now(),
                }),
            });
        }
        console.log(`[WorkflowHelpers] Recorded approval request for ${args.toolCallIds.length} tool calls`);
    },
});
/**
 * Mark message as failed
 */
exports.markMessageFailed = (0, server_1.internalMutation)({
    args: {
        messageId: values_1.v.id("chatMessages"),
        errorMessage: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.messageId);
        if (!existing) {
            console.warn(`[WorkflowHelpers] Message not found: ${args.messageId}`);
            return;
        }
        const currentMetadata = existing.metadataJson
            ? JSON.parse(existing.metadataJson)
            : {};
        await ctx.db.patch(args.messageId, {
            status: "failed",
            metadataJson: JSON.stringify({
                ...currentMetadata,
                isStreaming: false,
                errorMessage: args.errorMessage,
            }),
            editedAt: Date.now(),
        });
    },
});
// ============================================================================
// Streaming Execution Helper
// ============================================================================
/**
 * Execute LLM streaming - wraps the main streaming action for workflow use
 */
exports.executeStreaming = (0, server_1.internalAction)({
    args: {
        taskId: values_1.v.id("tasks"),
        prompt: values_1.v.string(),
        model: values_1.v.string(),
        systemPrompt: values_1.v.optional(values_1.v.string()),
        llmModel: values_1.v.optional(values_1.v.string()),
        apiKeys: values_1.v.object({
            anthropic: values_1.v.optional(values_1.v.string()),
            openai: values_1.v.optional(values_1.v.string()),
            openrouter: values_1.v.optional(values_1.v.string()),
        }),
        assistantMessageId: values_1.v.id("chatMessages"),
    },
    handler: async (ctx, args) => {
        // Call the existing streamChatWithTools action
        const result = await ctx.runAction(api_1.api.streaming.streamChatWithTools, {
            taskId: args.taskId,
            prompt: args.prompt,
            model: args.model,
            systemPrompt: args.systemPrompt,
            llmModel: args.llmModel,
            apiKeys: args.apiKeys,
        });
        return {
            success: result.success,
            messageId: result.messageId,
            text: result.text || "",
            toolCallIds: result.toolCallIds || [],
            usage: result.usage,
        };
    },
});
