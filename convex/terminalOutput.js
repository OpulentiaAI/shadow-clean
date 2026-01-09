"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteByTask = exports.deleteByCommand = exports.getCombinedOutput = exports.byTaskSince = exports.byCommand = exports.byTask = exports.append = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const schema_1 = require("./schema");
/**
 * Append terminal output chunk
 * Called from sidecar during command execution streaming
 */
exports.append = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        commandId: values_1.v.string(),
        content: values_1.v.string(),
        streamType: schema_1.StreamType,
        timestamp: values_1.v.number(),
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
exports.byTask = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
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
exports.byCommand = (0, server_1.query)({
    args: {
        commandId: values_1.v.string(),
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
exports.byTaskSince = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
        since: values_1.v.number(),
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
exports.getCombinedOutput = (0, server_1.query)({
    args: {
        commandId: values_1.v.string(),
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
exports.deleteByCommand = (0, server_1.mutation)({
    args: {
        commandId: values_1.v.string(),
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
exports.deleteByTask = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
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
