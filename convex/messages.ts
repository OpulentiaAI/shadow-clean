import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MessageRole = v.union(
  v.literal("USER"),
  v.literal("ASSISTANT"),
  v.literal("SYSTEM"),
);

export const append = mutation({
  args: {
    taskId: v.id("tasks"),
    role: MessageRole,
    content: v.string(),
    llmModel: v.optional(v.string()),
    metadataJson: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
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
      role: args.role,
      content: args.content,
      llmModel: args.llmModel,
      metadataJson: args.metadataJson,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      finishReason: args.finishReason,
      sequence,
      createdAt,
      editedAt: undefined,
    });

    return { messageId, sequence };
  },
});

export const byTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
  },
});

