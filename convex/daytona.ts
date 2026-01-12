import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Daytona SDK integration for terminal streaming
 * Queries and mutations for sandbox state management
 * 
 * Actions are in daytonaActions.ts (Node.js runtime)
 */

/**
 * Store sandbox info for a task
 */
export const storeSandboxInfo = mutation({
  args: {
    taskId: v.id("tasks"),
    sandboxId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if sandbox info already exists
    const existing = await ctx.db
      .query("daytonaSandboxes")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        sandboxId: args.sandboxId,
        sessionId: args.sessionId,
        status: "active",
        lastActivityAt: Date.now(),
      });
      return { id: existing._id };
    }

    // Create new
    const id = await ctx.db.insert("daytonaSandboxes", {
      taskId: args.taskId,
      sandboxId: args.sandboxId,
      sessionId: args.sessionId,
      status: "active",
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    return { id };
  },
});

/**
 * Get sandbox info for a task
 */
export const getSandboxInfo = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("daytonaSandboxes")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .first();
  },
});

/**
 * Update sandbox last activity timestamp
 */
export const updateActivity = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db
      .query("daytonaSandboxes")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .first();

    if (sandbox) {
      await ctx.db.patch(sandbox._id, {
        lastActivityAt: Date.now(),
      });
    }
  },
});

/**
 * Update sandbox status
 */
export const updateSandboxStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("creating"), v.literal("active"), v.literal("stopped"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db
      .query("daytonaSandboxes")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .first();

    if (sandbox) {
      await ctx.db.patch(sandbox._id, {
        status: args.status,
        lastActivityAt: Date.now(),
      });
    }
  },
});
