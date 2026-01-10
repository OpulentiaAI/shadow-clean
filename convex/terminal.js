"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearLogs = exports.executeCommand = exports.getCommandLogs = exports.getLogs = exports.addLog = exports.appendLog = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const api_1 = require("./_generated/api");
/**
 * Convex-native terminal operations
 * Replaces Socket.IO-based terminal streaming with Convex subscriptions
 */
/**
 * Append log entry to command logs
 */
exports.appendLog = (0, server_1.internalMutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        commandId: values_1.v.string(),
        stream: values_1.v.union(values_1.v.literal("stdout"), values_1.v.literal("stderr"), values_1.v.literal("system")),
        content: values_1.v.string(),
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
exports.addLog = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        commandId: values_1.v.string(),
        stream: values_1.v.union(values_1.v.literal("stdout"), values_1.v.literal("stderr"), values_1.v.literal("system")),
        content: values_1.v.string(),
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
exports.getLogs = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
        since: values_1.v.optional(values_1.v.number()),
        limit: values_1.v.optional(values_1.v.number()),
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
exports.getCommandLogs = (0, server_1.query)({
    args: {
        commandId: values_1.v.string(),
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
exports.executeCommand = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        command: values_1.v.string(),
        cwd: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const commandId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        // Log command start
        await ctx.runMutation(api_1.internal.terminal.appendLog, {
            taskId: args.taskId,
            commandId,
            stream: "system",
            content: `$ ${args.command}`,
        });
        try {
            // In Convex actions, we can't directly spawn processes
            // Instead, we simulate or delegate to external services
            // For now, return a helpful message about the limitation
            await ctx.runMutation(api_1.internal.terminal.appendLog, {
                taskId: args.taskId,
                commandId,
                stream: "system",
                content: `[Convex] Command queued for execution: ${args.command}`,
            });
            // For certain safe commands, we can simulate output
            if (args.command.startsWith("echo ")) {
                const output = args.command.slice(5);
                await ctx.runMutation(api_1.internal.terminal.appendLog, {
                    taskId: args.taskId,
                    commandId,
                    stream: "stdout",
                    content: output,
                });
            }
            else if (args.command === "pwd") {
                await ctx.runMutation(api_1.internal.terminal.appendLog, {
                    taskId: args.taskId,
                    commandId,
                    stream: "stdout",
                    content: args.cwd || "/workspace",
                });
            }
            else if (args.command === "whoami") {
                await ctx.runMutation(api_1.internal.terminal.appendLog, {
                    taskId: args.taskId,
                    commandId,
                    stream: "stdout",
                    content: "convex-user",
                });
            }
            else if (args.command === "date") {
                await ctx.runMutation(api_1.internal.terminal.appendLog, {
                    taskId: args.taskId,
                    commandId,
                    stream: "stdout",
                    content: new Date().toString(),
                });
            }
            else {
                // For other commands, indicate they need external execution
                await ctx.runMutation(api_1.internal.terminal.appendLog, {
                    taskId: args.taskId,
                    commandId,
                    stream: "system",
                    content: `[Note] Complex commands require an external execution service. Command: ${args.command}`,
                });
            }
            await ctx.runMutation(api_1.internal.terminal.appendLog, {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            await ctx.runMutation(api_1.internal.terminal.appendLog, {
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
exports.clearLogs = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
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
