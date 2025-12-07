import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MemoryCategory } from "./schema";

export const create = mutation({
  args: {
    content: v.string(),
    category: MemoryCategory,
    repoFullName: v.string(),
    repoUrl: v.string(),
    userId: v.id("users"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const memoryId = await ctx.db.insert("memories", {
      content: args.content,
      category: args.category,
      repoFullName: args.repoFullName,
      repoUrl: args.repoUrl,
      userId: args.userId,
      taskId: args.taskId,
      createdAt: now,
      updatedAt: now,
    });
    return { memoryId };
  },
});

export const update = mutation({
  args: {
    memoryId: v.id("memories"),
    content: v.optional(v.string()),
    category: v.optional(MemoryCategory),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.memoryId);
    if (!existing) {
      throw new Error("Memory not found");
    }
    const patchData: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.content !== undefined) patchData.content = args.content;
    if (args.category !== undefined) patchData.category = args.category;
    await ctx.db.patch(args.memoryId, patchData);
    return { success: true };
  },
});

export const remove = mutation({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.memoryId);
    if (!existing) {
      throw new Error("Memory not found");
    }
    await ctx.db.delete(args.memoryId);
    return { success: true };
  },
});

export const get = query({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.memoryId);
  },
});

export const byTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("memories")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();
  },
});

export const byUserAndRepo = query({
  args: {
    userId: v.id("users"),
    repoFullName: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("memories")
      .withIndex("by_user_repo", (q) =>
        q.eq("userId", args.userId).eq("repoFullName", args.repoFullName)
      )
      .order("desc")
      .collect();
  },
});

export const byCategory = query({
  args: { category: MemoryCategory },
  handler: async (ctx, args) => {
    return ctx.db
      .query("memories")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .order("desc")
      .collect();
  },
});

export const byUserRepoAndCategory = query({
  args: {
    userId: v.id("users"),
    repoFullName: v.string(),
    category: MemoryCategory,
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("memories")
      .withIndex("by_user_repo", (q) =>
        q.eq("userId", args.userId).eq("repoFullName", args.repoFullName)
      )
      .collect();
    return all.filter((m) => m.category === args.category);
  },
});

export const search = query({
  args: {
    userId: v.id("users"),
    repoFullName: v.string(),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_user_repo", (q) =>
        q.eq("userId", args.userId).eq("repoFullName", args.repoFullName)
      )
      .order("desc")
      .collect();
    if (!args.searchTerm) {
      return memories;
    }
    const term = args.searchTerm.toLowerCase();
    return memories.filter((m) => m.content.toLowerCase().includes(term));
  },
});

export const bulkCreate = mutation({
  args: {
    memories: v.array(
      v.object({
        content: v.string(),
        category: MemoryCategory,
        repoFullName: v.string(),
        repoUrl: v.string(),
        userId: v.id("users"),
        taskId: v.id("tasks"),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids: string[] = [];
    for (const memory of args.memories) {
      const memoryId = await ctx.db.insert("memories", {
        ...memory,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(memoryId);
    }
    return { memoryIds: ids };
  },
});
