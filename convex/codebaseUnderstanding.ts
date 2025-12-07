import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { id: v.id("codebaseUnderstanding") },
  handler: async (ctx, args) => {
    const codebase = await ctx.db.get(args.id);
    if (!codebase) return null;
    return {
      ...codebase,
      content: JSON.parse(codebase.contentJson),
    };
  },
});

export const getByRepo = query({
  args: { repoFullName: v.string() },
  handler: async (ctx, args) => {
    const codebase = await ctx.db
      .query("codebaseUnderstanding")
      .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
      .first();
    if (!codebase) return null;
    return {
      ...codebase,
      content: JSON.parse(codebase.contentJson),
    };
  },
});

export const getByTaskId = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task || !task.codebaseUnderstandingId) return null;
    const codebase = await ctx.db.get(task.codebaseUnderstandingId);
    if (!codebase) return null;
    return {
      ...codebase,
      content: JSON.parse(codebase.contentJson),
    };
  },
});

export const create = mutation({
  args: {
    repoFullName: v.string(),
    repoUrl: v.string(),
    content: v.any(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("codebaseUnderstanding")
      .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        contentJson: JSON.stringify(args.content),
        updatedAt: now,
      });
      return existing._id;
    }
    return ctx.db.insert("codebaseUnderstanding", {
      repoFullName: args.repoFullName,
      repoUrl: args.repoUrl,
      contentJson: JSON.stringify(args.content),
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("codebaseUnderstanding"),
    content: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Codebase understanding not found");
    }
    await ctx.db.patch(args.id, {
      contentJson: JSON.stringify(args.content),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const remove = mutation({
  args: { id: v.id("codebaseUnderstanding") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Codebase understanding not found");
    }
    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("codebaseUnderstandingId"), args.id))
      .collect();
    for (const task of tasks) {
      await ctx.db.patch(task._id, { codebaseUnderstandingId: undefined });
    }
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const codebases = await ctx.db
      .query("codebaseUnderstanding")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return codebases.map((c) => ({
      ...c,
      content: JSON.parse(c.contentJson),
    }));
  },
});
