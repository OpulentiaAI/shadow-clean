import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ToolLogStatus } from "./schema";

/**
 * Create a new tool execution log
 * Called from sidecar when tool execution starts
 */
export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    toolName: v.string(),
    args: v.any(),
    status: ToolLogStatus,
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const id = await ctx.db.insert("toolLogs", {
      taskId: args.taskId,
      toolName: args.toolName,
      argsJson: JSON.stringify(args.args),
      status: args.status,
      createdAt: now,
    });

    return { logId: id };
  },
});

/**
 * Update tool log with completion status
 */
export const update = mutation({
  args: {
    logId: v.id("toolLogs"),
    status: ToolLogStatus,
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.logId, {
      status: args.status,
      resultJson: args.result ? JSON.stringify(args.result) : undefined,
      error: args.error,
      durationMs: args.durationMs,
      completedAt: now,
    });

    return { success: true };
  },
});

/**
 * Get all tool logs for a task
 */
export const byTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("toolLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();

    return logs.map((log) => ({
      ...log,
      args: log.argsJson ? JSON.parse(log.argsJson) : {},
      result: log.resultJson ? JSON.parse(log.resultJson) : undefined,
    }));
  },
});

/**
 * Get recent tool logs for a task (limited)
 */
export const recentByTask = query({
  args: {
    taskId: v.id("tasks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const logs = await ctx.db
      .query("toolLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .take(limit);

    return logs.map((log) => ({
      ...log,
      args: log.argsJson ? JSON.parse(log.argsJson) : {},
      result: log.resultJson ? JSON.parse(log.resultJson) : undefined,
    }));
  },
});

/**
 * Get running tool executions for a task
 */
export const runningByTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("toolLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .filter((q) => q.eq(q.field("status"), "RUNNING"))
      .collect();

    return logs.map((log) => ({
      ...log,
      args: log.argsJson ? JSON.parse(log.argsJson) : {},
    }));
  },
});

/**
 * Get tool execution statistics for a task
 */
export const getStats = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("toolLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    const stats = {
      total: logs.length,
      running: 0,
      completed: 0,
      failed: 0,
      avgDurationMs: 0,
      byTool: {} as Record<string, number>,
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const log of logs) {
      switch (log.status) {
        case "RUNNING":
          stats.running++;
          break;
        case "COMPLETED":
          stats.completed++;
          break;
        case "FAILED":
          stats.failed++;
          break;
      }

      stats.byTool[log.toolName] = (stats.byTool[log.toolName] || 0) + 1;

      if (log.durationMs) {
        totalDuration += log.durationMs;
        durationCount++;
      }
    }

    if (durationCount > 0) {
      stats.avgDurationMs = Math.round(totalDuration / durationCount);
    }

    return stats;
  },
});

/**
 * Delete all tool logs for a task (cleanup)
 */
export const deleteByTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("toolLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    return { deleted: logs.length };
  },
});
