"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskMetrics = exports.getTraceSteps = exports.getTaskTraces = exports.recordStreamingMetrics = exports.recordStep = exports.updateTrace = exports.startTrace = void 0;
exports.generateTraceId = generateTraceId;
/**
 * Observability functions for workflow traces and streaming metrics
 * Implements best practices BP002, BP005, BP018, BP019
 *
 * @see docs/_extracted/best_practices.all.json for full context
 */
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
// Generate a unique trace ID for end-to-end correlation
function generateTraceId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `trace_${timestamp}_${random}`;
}
// Cost estimation per 1M tokens (in millicents) - update as pricing changes
const MODEL_COSTS = {
    // OpenRouter models
    "moonshotai/kimi-k2": { input: 60, output: 60 }, // $0.60/1M
    "moonshotai/kimi-k2-thinking": { input: 60, output: 60 },
    "anthropic/claude-sonnet-4": { input: 300, output: 1500 },
    "anthropic/claude-opus-4": { input: 1500, output: 7500 },
    "openai/gpt-4o": { input: 250, output: 1000 },
    "openai/gpt-4o-mini": { input: 15, output: 60 },
    "deepseek/deepseek-chat-v3-0324": { input: 14, output: 28 },
    "mistralai/devstral-2505": { input: 0, output: 0 }, // Free
    "z-ai/glm-4.7": { input: 44, output: 174 }, // $0.44/M input, $1.74/M output
    "minimax/minimax-m2.1": { input: 30, output: 120 }, // $0.30/M input, $1.20/M output
    // Direct provider models
    "claude-sonnet-4-20250514": { input: 300, output: 1500 },
    "gpt-4o": { input: 250, output: 1000 },
};
function estimateCostMillicents(model, promptTokens, completionTokens) {
    const costs = MODEL_COSTS[model] || { input: 100, output: 100 }; // Default fallback
    const inputCost = (promptTokens / 1_000_000) * costs.input * 100; // Convert to millicents
    const outputCost = (completionTokens / 1_000_000) * costs.output * 100;
    return Math.round(inputCost + outputCost);
}
// Start a new workflow trace
exports.startTrace = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        traceId: values_1.v.string(),
        workflowType: values_1.v.union(values_1.v.literal("streamChat"), values_1.v.literal("streamChatWithTools"), values_1.v.literal("generateText"), values_1.v.literal("toolExecution")),
        model: values_1.v.optional(values_1.v.string()),
        provider: values_1.v.optional(values_1.v.string()),
        messageId: values_1.v.optional(values_1.v.id("chatMessages")),
        metadata: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const traceDocId = await ctx.db.insert("workflowTraces", {
            taskId: args.taskId,
            traceId: args.traceId,
            messageId: args.messageId,
            workflowType: args.workflowType,
            status: "STARTED",
            startedAt: now,
            model: args.model,
            provider: args.provider,
            metadata: args.metadata,
            createdAt: now,
            updatedAt: now,
        });
        return { traceDocId, traceId: args.traceId };
    },
});
// Update trace status (in-progress, completed, failed)
exports.updateTrace = (0, server_1.mutation)({
    args: {
        traceId: values_1.v.string(),
        status: values_1.v.optional(values_1.v.union(values_1.v.literal("IN_PROGRESS"), values_1.v.literal("COMPLETED"), values_1.v.literal("FAILED"), values_1.v.literal("CANCELLED"))),
        promptTokens: values_1.v.optional(values_1.v.number()),
        completionTokens: values_1.v.optional(values_1.v.number()),
        totalTokens: values_1.v.optional(values_1.v.number()),
        errorType: values_1.v.optional(values_1.v.string()),
        errorMessage: values_1.v.optional(values_1.v.string()),
        retryCount: values_1.v.optional(values_1.v.number()),
        model: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const trace = await ctx.db
            .query("workflowTraces")
            .withIndex("by_trace_id", (q) => q.eq("traceId", args.traceId))
            .first();
        if (!trace) {
            console.warn(`[OBSERVABILITY] Trace not found: ${args.traceId}`);
            return { success: false };
        }
        const now = Date.now();
        const updates = { updatedAt: now };
        if (args.status) {
            updates.status = args.status;
            if (args.status === "COMPLETED" || args.status === "FAILED" || args.status === "CANCELLED") {
                updates.completedAt = now;
                updates.totalDurationMs = now - trace.startedAt;
            }
        }
        if (args.promptTokens !== undefined)
            updates.promptTokens = args.promptTokens;
        if (args.completionTokens !== undefined)
            updates.completionTokens = args.completionTokens;
        if (args.totalTokens !== undefined)
            updates.totalTokens = args.totalTokens;
        if (args.errorType !== undefined)
            updates.errorType = args.errorType;
        if (args.errorMessage !== undefined)
            updates.errorMessage = args.errorMessage;
        if (args.retryCount !== undefined)
            updates.retryCount = args.retryCount;
        if (args.model !== undefined)
            updates.model = args.model;
        // Calculate cost if we have token data
        if (args.promptTokens && args.completionTokens && (args.model || trace.model)) {
            const model = args.model || trace.model || "";
            updates.estimatedCostMillicents = estimateCostMillicents(model, args.promptTokens, args.completionTokens);
        }
        await ctx.db.patch(trace._id, updates);
        return { success: true };
    },
});
// Record a workflow step (for onStepFinish callback - BP002)
exports.recordStep = (0, server_1.mutation)({
    args: {
        traceId: values_1.v.string(),
        taskId: values_1.v.id("tasks"),
        stepNumber: values_1.v.number(),
        stepType: values_1.v.union(values_1.v.literal("llm_call"), values_1.v.literal("tool_call"), values_1.v.literal("tool_result"), values_1.v.literal("text_delta"), values_1.v.literal("retry")),
        toolName: values_1.v.optional(values_1.v.string()),
        toolCallId: values_1.v.optional(values_1.v.string()),
        promptTokens: values_1.v.optional(values_1.v.number()),
        completionTokens: values_1.v.optional(values_1.v.number()),
        finishReason: values_1.v.optional(values_1.v.string()),
        status: values_1.v.union(values_1.v.literal("STARTED"), values_1.v.literal("COMPLETED"), values_1.v.literal("FAILED")),
        errorMessage: values_1.v.optional(values_1.v.string()),
        chunkCount: values_1.v.optional(values_1.v.number()),
        totalChars: values_1.v.optional(values_1.v.number()),
        durationMs: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const stepId = await ctx.db.insert("workflowSteps", {
            traceId: args.traceId,
            taskId: args.taskId,
            stepNumber: args.stepNumber,
            stepType: args.stepType,
            startedAt: now,
            completedAt: args.status !== "STARTED" ? now : undefined,
            durationMs: args.durationMs,
            toolName: args.toolName,
            toolCallId: args.toolCallId,
            promptTokens: args.promptTokens,
            completionTokens: args.completionTokens,
            finishReason: args.finishReason,
            status: args.status,
            errorMessage: args.errorMessage,
            chunkCount: args.chunkCount,
            totalChars: args.totalChars,
            createdAt: now,
        });
        return { stepId };
    },
});
// Record streaming metrics (for throttle optimization - BP005)
exports.recordStreamingMetrics = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        messageId: values_1.v.id("chatMessages"),
        traceId: values_1.v.optional(values_1.v.string()),
        totalDeltas: values_1.v.number(),
        totalChars: values_1.v.number(),
        throttleIntervalMs: values_1.v.number(),
        dbWriteCount: values_1.v.number(),
        streamStatus: values_1.v.union(values_1.v.literal("streaming"), values_1.v.literal("completed"), values_1.v.literal("aborted"), values_1.v.literal("failed")),
        streamStartedAt: values_1.v.number(),
        streamEndedAt: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const avgChunkSize = args.totalDeltas > 0 ? Math.round(args.totalChars / args.totalDeltas) : 0;
        const charsPerWrite = args.dbWriteCount > 0 ? Math.round(args.totalChars / args.dbWriteCount) : 0;
        const totalDurationMs = args.streamEndedAt ? args.streamEndedAt - args.streamStartedAt : undefined;
        const metricsId = await ctx.db.insert("streamingMetrics", {
            taskId: args.taskId,
            messageId: args.messageId,
            traceId: args.traceId,
            totalDeltas: args.totalDeltas,
            totalChars: args.totalChars,
            avgChunkSize,
            throttleIntervalMs: args.throttleIntervalMs,
            streamStartedAt: args.streamStartedAt,
            streamEndedAt: args.streamEndedAt,
            totalDurationMs,
            dbWriteCount: args.dbWriteCount,
            charsPerWrite,
            streamStatus: args.streamStatus,
            createdAt: now,
        });
        return { metricsId };
    },
});
// Query traces for a task
exports.getTaskTraces = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
        limit: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;
        const traces = await ctx.db
            .query("workflowTraces")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .take(limit);
        return traces;
    },
});
// Query steps for a trace
exports.getTraceSteps = (0, server_1.query)({
    args: {
        traceId: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const steps = await ctx.db
            .query("workflowSteps")
            .withIndex("by_trace", (q) => q.eq("traceId", args.traceId))
            .collect();
        return steps.sort((a, b) => a.stepNumber - b.stepNumber);
    },
});
// Get aggregated metrics for a task (for dashboard/optimization)
exports.getTaskMetrics = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        const traces = await ctx.db
            .query("workflowTraces")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .collect();
        const streamingMetrics = await ctx.db
            .query("streamingMetrics")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .collect();
        // Aggregate metrics
        const completedTraces = traces.filter((t) => t.status === "COMPLETED");
        const failedTraces = traces.filter((t) => t.status === "FAILED");
        const totalTokens = completedTraces.reduce((sum, t) => sum + (t.totalTokens || 0), 0);
        const totalCostMillicents = completedTraces.reduce((sum, t) => sum + (t.estimatedCostMillicents || 0), 0);
        const avgDurationMs = completedTraces.length > 0
            ? completedTraces.reduce((sum, t) => sum + (t.totalDurationMs || 0), 0) /
                completedTraces.length
            : 0;
        // Streaming efficiency
        const avgCharsPerWrite = streamingMetrics.length > 0
            ? streamingMetrics.reduce((sum, m) => sum + (m.charsPerWrite || 0), 0) /
                streamingMetrics.length
            : 0;
        return {
            totalTraces: traces.length,
            completedTraces: completedTraces.length,
            failedTraces: failedTraces.length,
            successRate: traces.length > 0 ? (completedTraces.length / traces.length) * 100 : 0,
            totalTokens,
            totalCostMillicents,
            totalCostDollars: totalCostMillicents / 100000, // Convert millicents to dollars
            avgDurationMs: Math.round(avgDurationMs),
            avgCharsPerWrite: Math.round(avgCharsPerWrite),
            streamingMetricsCount: streamingMetrics.length,
        };
    },
});
