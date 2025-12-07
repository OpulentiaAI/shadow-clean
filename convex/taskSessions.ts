import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    podName: v.optional(v.string()),
    podNamespace: v.optional(v.string()),
    connectionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionId = await ctx.db.insert("taskSessions", {
      taskId: args.taskId,
      podName: args.podName,
      podNamespace: args.podNamespace,
      connectionId: args.connectionId,
      isActive: true,
      createdAt: now,
      endedAt: undefined,
    });
    return { sessionId };
  },
});

export const end = mutation({
  args: { sessionId: v.id("taskSessions") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.sessionId);
    if (!existing) {
      throw new Error("Task session not found");
    }
    await ctx.db.patch(args.sessionId, {
      isActive: false,
      endedAt: Date.now(),
    });
    return { success: true };
  },
});

export const endAllForTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("taskSessions")
      .withIndex("by_task_active", (q) =>
        q.eq("taskId", args.taskId).eq("isActive", true)
      )
      .collect();
    const now = Date.now();
    for (const session of sessions) {
      await ctx.db.patch(session._id, {
        isActive: false,
        endedAt: now,
      });
    }
    return { ended: sessions.length };
  },
});

export const updateConnection = mutation({
  args: {
    sessionId: v.id("taskSessions"),
    connectionId: v.optional(v.string()),
    podName: v.optional(v.string()),
    podNamespace: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.sessionId);
    if (!existing) {
      throw new Error("Task session not found");
    }
    const patchData: Record<string, unknown> = {};
    if (args.connectionId !== undefined) patchData.connectionId = args.connectionId;
    if (args.podName !== undefined) patchData.podName = args.podName;
    if (args.podNamespace !== undefined) patchData.podNamespace = args.podNamespace;
    await ctx.db.patch(args.sessionId, patchData);
    return { success: true };
  },
});

export const get = query({
  args: { sessionId: v.id("taskSessions") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.sessionId);
  },
});

export const getActiveByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("taskSessions")
      .withIndex("by_task_active", (q) =>
        q.eq("taskId", args.taskId).eq("isActive", true)
      )
      .first();
  },
});

export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("taskSessions")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();
  },
});

export const remove = mutation({
  args: { sessionId: v.id("taskSessions") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.sessionId);
    if (!existing) {
      throw new Error("Task session not found");
    }
    await ctx.db.delete(args.sessionId);
    return { success: true };
  },
});

export const removeAllForTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("taskSessions")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
    return { deleted: sessions.length };
  },
});
