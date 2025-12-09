import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { StreamType } from "./schema";

/**
 * Append terminal output chunk
 * Called from sidecar during command execution streaming
 */
export const append = mutation({
  args: {
    taskId: v.id("tasks"),
    commandId: v.string(),
    content: v.string(),
    streamType: StreamType,
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("terminalOutput", {
      taskId: args.taskId,
      commandId: args.commandId,
      content: args.content,
      streamType: args.streamType,
      timestamp: args.timestamp,
    });

    return { outputId: id };
  },
});

/**
 * Get all terminal output for a task
 */
export const byTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("terminalOutput")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
  },
});

/**
 * Get terminal output for a specific command
 */
export const byCommand = query({
  args: {
    commandId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("terminalOutput")
      .withIndex("by_command", (q) => q.eq("commandId", args.commandId))
      .order("asc")
      .collect();
  },
});

/**
 * Get terminal output for a task since a given timestamp
 * Used for real-time streaming subscriptions
 */
export const byTaskSince = query({
  args: {
    taskId: v.id("tasks"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const allOutput = await ctx.db
      .query("terminalOutput")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();

    return allOutput.filter((output) => output.timestamp >= args.since);
  },
});

/**
 * Get combined terminal output as a single string
 */
export const getCombinedOutput = query({
  args: {
    commandId: v.string(),
  },
  handler: async (ctx, args) => {
    const outputs = await ctx.db
      .query("terminalOutput")
      .withIndex("by_command", (q) => q.eq("commandId", args.commandId))
      .order("asc")
      .collect();

    const stdout = outputs
      .filter((o) => o.streamType === "stdout")
      .map((o) => o.content)
      .join("");

    const stderr = outputs
      .filter((o) => o.streamType === "stderr")
      .map((o) => o.content)
      .join("");

    return { stdout, stderr };
  },
});

/**
 * Delete terminal output for a command (cleanup after command completes)
 */
export const deleteByCommand = mutation({
  args: {
    commandId: v.string(),
  },
  handler: async (ctx, args) => {
    const outputs = await ctx.db
      .query("terminalOutput")
      .withIndex("by_command", (q) => q.eq("commandId", args.commandId))
      .collect();

    for (const output of outputs) {
      await ctx.db.delete(output._id);
    }

    return { deleted: outputs.length };
  },
});

/**
 * Delete all terminal output for a task (cleanup)
 */
export const deleteByTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const outputs = await ctx.db
      .query("terminalOutput")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const output of outputs) {
      await ctx.db.delete(output._id);
    }

    return { deleted: outputs.length };
  },
});
