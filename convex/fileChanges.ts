import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { FileOperation } from "./schema";

/**
 * Create a new file change record
 * Called directly from sidecar in Convex-native mode
 */
export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    filePath: v.string(),
    operation: FileOperation,
    additions: v.number(),
    deletions: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const id = await ctx.db.insert("fileChanges", {
      taskId: args.taskId,
      filePath: args.filePath,
      operation: args.operation,
      additions: args.additions,
      deletions: args.deletions,
      createdAt: now,
    });

    return { fileChangeId: id };
  },
});

/**
 * Get all file changes for a task
 */
export const byTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fileChanges")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();
  },
});

/**
 * Get file changes for a task since a given timestamp
 */
export const byTaskSince = query({
  args: {
    taskId: v.id("tasks"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const allChanges = await ctx.db
      .query("fileChanges")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();

    return allChanges.filter((change) => change.createdAt >= args.since);
  },
});

/**
 * Get file change statistics for a task
 */
export const getStats = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const changes = await ctx.db
      .query("fileChanges")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const stats = {
      totalChanges: changes.length,
      creates: 0,
      updates: 0,
      deletes: 0,
      renames: 0,
      totalAdditions: 0,
      totalDeletions: 0,
    };

    for (const change of changes) {
      switch (change.operation) {
        case "CREATE":
          stats.creates++;
          break;
        case "UPDATE":
          stats.updates++;
          break;
        case "DELETE":
          stats.deletes++;
          break;
        case "RENAME":
          stats.renames++;
          break;
      }
      stats.totalAdditions += change.additions;
      stats.totalDeletions += change.deletions;
    }

    return stats;
  },
});

/**
 * Delete all file changes for a task (cleanup)
 */
export const deleteByTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const changes = await ctx.db
      .query("fileChanges")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const change of changes) {
      await ctx.db.delete(change._id);
    }

    return { deleted: changes.length };
  },
});
