import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Tool call tracking for streaming chat
 * Tracks tool calls made during AI streaming sessions
 */

/**
 * Create a new tool call record (when LLM requests tool execution)
 */
export const create = mutation({
  args: {
    messageId: v.id("chatMessages"),
    taskId: v.id("tasks"),
    toolName: v.string(),
    args: v.any(),
    toolCallId: v.string(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("RUNNING"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const toolId = await ctx.db.insert("agentTools", {
      messageId: args.messageId,
      taskId: args.taskId,
      toolName: args.toolName,
      args: args.args,
      toolCallId: args.toolCallId,
      status: args.status,
      createdAt: now,
    });

    return { toolId };
  },
});

/**
 * Update tool call result (when tool execution completes)
 */
export const updateResult = mutation({
  args: {
    toolCallId: v.string(),
    result: v.optional(v.any()),
    status: v.union(v.literal("COMPLETED"), v.literal("FAILED")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tool = await ctx.db
      .query("agentTools")
      .withIndex("by_tool_call_id", (q) => q.eq("toolCallId", args.toolCallId))
      .unique();

    if (!tool) {
      throw new Error(`Tool call not found: ${args.toolCallId}`);
    }

    await ctx.db.patch(tool._id, {
      result: args.result,
      status: args.status,
      error: args.error,
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get all tool calls for a message
 */
export const byMessage = query({
  args: {
    messageId: v.id("chatMessages"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("agentTools")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();
  },
});

/**
 * Get all tool calls for a task
 */
export const byTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("agentTools")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

/**
 * Get tool call by ID
 */
export const byToolCallId = query({
  args: {
    toolCallId: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("agentTools")
      .withIndex("by_tool_call_id", (q) => q.eq("toolCallId", args.toolCallId))
      .unique();
  },
});

/**
 * Mark all RUNNING tool calls for a message as FAILED (cleanup after streaming completes)
 */
export const failStaleRunning = mutation({
  args: {
    messageId: v.id("chatMessages"),
  },
  handler: async (ctx, args) => {
    const tools = await ctx.db
      .query("agentTools")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    const stale = tools.filter((t) => t.status === "RUNNING" || t.status === "PENDING");
    for (const tool of stale) {
      await ctx.db.patch(tool._id, {
        status: "FAILED",
        error: "Tool call did not complete before streaming ended",
        completedAt: Date.now(),
      });
    }

    return { marked: stale.length };
  },
});

/**
 * Delete all tool calls for a task (cleanup)
 */
export const deleteByTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const tools = await ctx.db
      .query("agentTools")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const tool of tools) {
      await ctx.db.delete(tool._id);
    }

    return { deleted: tools.length };
  },
});
