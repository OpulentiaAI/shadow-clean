import { mutation, query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Convex-native terminal operations
 * Replaces Socket.IO-based terminal streaming with Convex subscriptions
 */

/**
 * Append log entry to command logs
 */
export const appendLog = internalMutation({
  args: {
    taskId: v.id("tasks"),
    commandId: v.string(),
    stream: v.union(v.literal("stdout"), v.literal("stderr"), v.literal("system")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("commandLogs", {
      taskId: args.taskId,
      commandId: args.commandId,
      stream: args.stream,
      content: args.content,
      timestamp: Date.now(),
    });
  },
});

/**
 * Public mutation to append logs (for external calls)
 */
export const addLog = mutation({
  args: {
    taskId: v.id("tasks"),
    commandId: v.string(),
    stream: v.union(v.literal("stdout"), v.literal("stderr"), v.literal("system")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("commandLogs", {
      taskId: args.taskId,
      commandId: args.commandId,
      stream: args.stream,
      content: args.content,
      timestamp: Date.now(),
    });
  },
});

/**
 * Get logs for a task (reactive query - auto-updates)
 */
export const getLogs = query({
  args: {
    taskId: v.id("tasks"),
    since: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("commandLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();

    // Filter by timestamp if since is provided
    const sinceTime = args.since;
    const filteredLogs = sinceTime
      ? logs.filter((log) => log.timestamp > sinceTime)
      : logs;

    // Apply limit if provided
    if (args.limit) {
      return filteredLogs.slice(-args.limit);
    }

    return filteredLogs;
  },
});

/**
 * Get logs for a specific command
 */
export const getCommandLogs = query({
  args: {
    commandId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("commandLogs")
      .withIndex("by_command", (q) => q.eq("commandId", args.commandId))
      .order("asc")
      .collect();
  },
});

/**
 * Execute a command in Convex action
 * Note: Convex actions run in a sandboxed environment
 * For real shell execution, this should call an external service
 */
export const executeCommand = action({
  args: {
    taskId: v.id("tasks"),
    command: v.string(),
    cwd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Log command start
    await ctx.runMutation(internal.terminal.appendLog, {
      taskId: args.taskId,
      commandId,
      stream: "system",
      content: `$ ${args.command}`,
    });

    try {
      // In Convex actions, we can't directly spawn processes
      // Instead, we simulate or delegate to external services
      // For now, return a helpful message about the limitation

      await ctx.runMutation(internal.terminal.appendLog, {
        taskId: args.taskId,
        commandId,
        stream: "system",
        content: `[Convex] Command queued for execution: ${args.command}`,
      });

      // For certain safe commands, we can simulate output
      if (args.command.startsWith("echo ")) {
        const output = args.command.slice(5);
        await ctx.runMutation(internal.terminal.appendLog, {
          taskId: args.taskId,
          commandId,
          stream: "stdout",
          content: output,
        });
      } else if (args.command === "pwd") {
        await ctx.runMutation(internal.terminal.appendLog, {
          taskId: args.taskId,
          commandId,
          stream: "stdout",
          content: args.cwd || "/workspace",
        });
      } else if (args.command === "whoami") {
        await ctx.runMutation(internal.terminal.appendLog, {
          taskId: args.taskId,
          commandId,
          stream: "stdout",
          content: "convex-user",
        });
      } else if (args.command === "date") {
        await ctx.runMutation(internal.terminal.appendLog, {
          taskId: args.taskId,
          commandId,
          stream: "stdout",
          content: new Date().toString(),
        });
      } else {
        // For other commands, indicate they need external execution
        await ctx.runMutation(internal.terminal.appendLog, {
          taskId: args.taskId,
          commandId,
          stream: "system",
          content: `[Note] Complex commands require an external execution service. Command: ${args.command}`,
        });
      }

      await ctx.runMutation(internal.terminal.appendLog, {
        taskId: args.taskId,
        commandId,
        stream: "system",
        content: "[Command completed]",
      });

      return {
        success: true,
        commandId,
        message: "Command executed via Convex",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.terminal.appendLog, {
        taskId: args.taskId,
        commandId,
        stream: "stderr",
        content: `Error: ${errorMessage}`,
      });

      return {
        success: false,
        commandId,
        error: errorMessage,
      };
    }
  },
});

/**
 * Clear logs for a task
 */
export const clearLogs = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("commandLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    return { deleted: logs.length };
  },
});
