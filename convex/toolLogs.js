"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteByTask = exports.getStats = exports.runningByTask = exports.recentByTask = exports.byTask = exports.update = exports.create = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const schema_1 = require("./schema");
/**
 * Create a new tool execution log
 * Called from sidecar when tool execution starts
 */
exports.create = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        toolName: values_1.v.string(),
        args: values_1.v.any(),
        status: schema_1.ToolLogStatus,
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
exports.update = (0, server_1.mutation)({
    args: {
        logId: values_1.v.id("toolLogs"),
        status: schema_1.ToolLogStatus,
        result: values_1.v.optional(values_1.v.any()),
        error: values_1.v.optional(values_1.v.string()),
        durationMs: values_1.v.optional(values_1.v.number()),
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
exports.byTask = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
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
exports.recentByTask = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
        limit: values_1.v.optional(values_1.v.number()),
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
exports.runningByTask = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
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
exports.getStats = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
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
            byTool: {},
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
exports.deleteByTask = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
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
