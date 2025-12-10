import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const logRequest = mutation({
  args: {
    taskId: v.id("tasks"),
    messageId: v.optional(v.id("chatMessages")), // optional - may not have message context
    toolCallId: v.string(),
    toolName: v.string(),
    argsJson: v.string(),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const toolCallId = await ctx.db.insert("toolCalls", {
      taskId: args.taskId,
      messageId: args.messageId, // will be undefined if not provided
      toolCallId: args.toolCallId,
      toolName: args.toolName,
      argsJson: args.argsJson,
      status: "REQUESTED",
      resultJson: undefined,
      error: undefined,
      startedAt: now,
      completedAt: undefined,
      threadId: args.threadId,
      createdAt: now,
      updatedAt: now,
    });
    return { toolCallId };
  },
});

export const markRunning = mutation({
  args: {
    toolCallId: v.id("toolCalls"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.toolCallId);
    if (!existing) throw new Error("Tool call not found");
    await ctx.db.patch(args.toolCallId, {
      status: "RUNNING",
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const logResult = mutation({
  args: {
    toolCallId: v.id("toolCalls"),
    status: v.union(
      v.literal("SUCCEEDED"),
      v.literal("FAILED")
    ),
    resultJson: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.toolCallId);
    if (!existing) throw new Error("Tool call not found");
    await ctx.db.patch(args.toolCallId, {
      status: args.status,
      resultJson: args.resultJson,
      error: args.error,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("toolCalls")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();
  },
});

export const listByMessage = query({
  args: { messageId: v.id("chatMessages") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("toolCalls")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .order("asc")
      .collect();
  },
});






