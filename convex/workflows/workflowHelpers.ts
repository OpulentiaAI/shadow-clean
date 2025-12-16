/**
 * Internal Workflow Helper Functions
 * These are internal mutations/actions that can be called by workflow steps.
 * They are checkpointed by the workflow system.
 */

import { internalMutation, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// ============================================================================
// Observability Helpers
// ============================================================================

/**
 * Start a workflow trace for observability
 */
export const startWorkflowTrace = internalMutation({
  args: {
    taskId: v.id("tasks"),
    workflowType: v.string(),
    model: v.string(),
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
export const completeWorkflowTrace = internalMutation({
  args: {
    traceId: v.string(),
    totalTokens: v.number(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    durationMs: v.number(),
    toolCallCount: v.number(),
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
export const failWorkflowTrace = internalMutation({
  args: {
    traceId: v.string(),
    errorType: v.string(),
    errorMessage: v.string(),
    durationMs: v.number(),
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
export const saveUserMessage = internalMutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
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
export const createAssistantPlaceholder = internalMutation({
  args: {
    taskId: v.id("tasks"),
    promptMessageId: v.id("chatMessages"),
    llmModel: v.string(),
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
export const recordApprovalRequest = internalMutation({
  args: {
    taskId: v.id("tasks"),
    traceId: v.string(),
    toolCallIds: v.array(v.string()),
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
export const markMessageFailed = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
    errorMessage: v.string(),
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
export const executeStreaming = internalAction({
  args: {
    taskId: v.id("tasks"),
    prompt: v.string(),
    model: v.string(),
    systemPrompt: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    apiKeys: v.object({
      anthropic: v.optional(v.string()),
      openai: v.optional(v.string()),
      openrouter: v.optional(v.string()),
    }),
    assistantMessageId: v.id("chatMessages"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId: string;
    text: string;
    toolCallIds: string[];
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  }> => {
    // Call the existing streamChatWithTools action
    const result = await ctx.runAction(api.streaming.streamChatWithTools, {
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
