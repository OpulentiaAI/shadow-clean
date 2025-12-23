/**
 * Observability functions for workflow traces and streaming metrics
 * Implements best practices BP002, BP005, BP018, BP019
 * 
 * @see docs/_extracted/best_practices.all.json for full context
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a unique trace ID for end-to-end correlation
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `trace_${timestamp}_${random}`;
}

// Cost estimation per 1M tokens (in millicents) - update as pricing changes
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
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

function estimateCostMillicents(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const costs = MODEL_COSTS[model] || { input: 100, output: 100 }; // Default fallback
  const inputCost = (promptTokens / 1_000_000) * costs.input * 100; // Convert to millicents
  const outputCost = (completionTokens / 1_000_000) * costs.output * 100;
  return Math.round(inputCost + outputCost);
}

// Start a new workflow trace
export const startTrace = mutation({
  args: {
    taskId: v.id("tasks"),
    traceId: v.string(),
    workflowType: v.union(
      v.literal("streamChat"),
      v.literal("streamChatWithTools"),
      v.literal("generateText"),
      v.literal("toolExecution")
    ),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    messageId: v.optional(v.id("chatMessages")),
    metadata: v.optional(v.string()),
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
export const updateTrace = mutation({
  args: {
    traceId: v.string(),
    status: v.optional(
      v.union(
        v.literal("IN_PROGRESS"),
        v.literal("COMPLETED"),
        v.literal("FAILED"),
        v.literal("CANCELLED")
      )
    ),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    errorType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    model: v.optional(v.string()),
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
    const updates: Record<string, unknown> = { updatedAt: now };

    if (args.status) {
      updates.status = args.status;
      if (args.status === "COMPLETED" || args.status === "FAILED" || args.status === "CANCELLED") {
        updates.completedAt = now;
        updates.totalDurationMs = now - trace.startedAt;
      }
    }

    if (args.promptTokens !== undefined) updates.promptTokens = args.promptTokens;
    if (args.completionTokens !== undefined) updates.completionTokens = args.completionTokens;
    if (args.totalTokens !== undefined) updates.totalTokens = args.totalTokens;
    if (args.errorType !== undefined) updates.errorType = args.errorType;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;
    if (args.retryCount !== undefined) updates.retryCount = args.retryCount;
    if (args.model !== undefined) updates.model = args.model;

    // Calculate cost if we have token data
    if (args.promptTokens && args.completionTokens && (args.model || trace.model)) {
      const model = args.model || trace.model || "";
      updates.estimatedCostMillicents = estimateCostMillicents(
        model,
        args.promptTokens,
        args.completionTokens
      );
    }

    await ctx.db.patch(trace._id, updates);
    return { success: true };
  },
});

// Record a workflow step (for onStepFinish callback - BP002)
export const recordStep = mutation({
  args: {
    traceId: v.string(),
    taskId: v.id("tasks"),
    stepNumber: v.number(),
    stepType: v.union(
      v.literal("llm_call"),
      v.literal("tool_call"),
      v.literal("tool_result"),
      v.literal("text_delta"),
      v.literal("retry")
    ),
    toolName: v.optional(v.string()),
    toolCallId: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
    status: v.union(
      v.literal("STARTED"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
    errorMessage: v.optional(v.string()),
    chunkCount: v.optional(v.number()),
    totalChars: v.optional(v.number()),
    durationMs: v.optional(v.number()),
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
export const recordStreamingMetrics = mutation({
  args: {
    taskId: v.id("tasks"),
    messageId: v.id("chatMessages"),
    traceId: v.optional(v.string()),
    totalDeltas: v.number(),
    totalChars: v.number(),
    throttleIntervalMs: v.number(),
    dbWriteCount: v.number(),
    streamStatus: v.union(
      v.literal("streaming"),
      v.literal("completed"),
      v.literal("aborted"),
      v.literal("failed")
    ),
    streamStartedAt: v.number(),
    streamEndedAt: v.optional(v.number()),
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
export const getTaskTraces = query({
  args: {
    taskId: v.id("tasks"),
    limit: v.optional(v.number()),
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
export const getTraceSteps = query({
  args: {
    traceId: v.string(),
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
export const getTaskMetrics = query({
  args: {
    taskId: v.id("tasks"),
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
    const totalCostMillicents = completedTraces.reduce(
      (sum, t) => sum + (t.estimatedCostMillicents || 0),
      0
    );
    const avgDurationMs =
      completedTraces.length > 0
        ? completedTraces.reduce((sum, t) => sum + (t.totalDurationMs || 0), 0) /
          completedTraces.length
        : 0;

    // Streaming efficiency
    const avgCharsPerWrite =
      streamingMetrics.length > 0
        ? streamingMetrics.reduce((sum, m) => sum + (m.charsPerWrite || 0), 0) /
          streamingMetrics.length
        : 0;

    return {
      totalTraces: traces.length,
      completedTraces: completedTraces.length,
      failedTraces: failedTraces.length,
      successRate:
        traces.length > 0 ? (completedTraces.length / traces.length) * 100 : 0,
      totalTokens,
      totalCostMillicents,
      totalCostDollars: totalCostMillicents / 100000, // Convert millicents to dollars
      avgDurationMs: Math.round(avgDurationMs),
      avgCharsPerWrite: Math.round(avgCharsPerWrite),
      streamingMetricsCount: streamingMetrics.length,
    };
  },
});
