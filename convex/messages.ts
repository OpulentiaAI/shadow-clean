import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MessageRole } from "./schema";

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
    stackedTaskId: v.optional(v.id("tasks")),
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
      stackedTaskId: args.stackedTaskId,
      sequence,
      createdAt,
      editedAt: undefined,
    });
    return { messageId, sequence };
  },
});

export const update = mutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    metadataJson: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.messageId);
    if (!existing) {
      throw new Error("Message not found");
    }
    const { messageId, ...updates } = args;
    const patchData: Record<string, unknown> = { editedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patchData[key] = value;
      }
    }
    await ctx.db.patch(messageId, patchData);
    return { success: true, messageId };
  },
});

export const edit = mutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.string(),
    llmModel: v.optional(v.string()),
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

export const remove = mutation({
  args: { messageId: v.id("chatMessages") },
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

export const removeAfterSequence = mutation({
  args: {
    taskId: v.id("tasks"),
    sequence: v.number(),
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

export const get = query({
  args: { messageId: v.id("chatMessages") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.messageId);
  },
});

export const byTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
    const messagesWithSnapshots = await Promise.all(
      messages.map(async (msg) => {
        const pullRequestSnapshot = await ctx.db
          .query("pullRequestSnapshots")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .first();
        let stackedTask = null;
        if (msg.stackedTaskId) {
          stackedTask = await ctx.db.get(msg.stackedTaskId);
        }
        return {
          ...msg,
          pullRequestSnapshot,
          stackedTask: stackedTask
            ? { id: stackedTask._id, title: stackedTask.title }
            : null,
        };
      })
    );
    return messagesWithSnapshots;
  },
});

export const getLatestSequence = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();
    return latest?.sequence ?? -1;
  },
});
