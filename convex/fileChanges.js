"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteByTask = exports.getStats = exports.byTaskSince = exports.byTask = exports.create = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const schema_1 = require("./schema");
/**
 * Create a new file change record
 * Called directly from sidecar in Convex-native mode
 */
exports.create = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        filePath: values_1.v.string(),
        operation: schema_1.FileOperation,
        additions: values_1.v.number(),
        deletions: values_1.v.number(),
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
exports.byTask = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
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
exports.byTaskSince = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
        since: values_1.v.number(),
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
exports.getStats = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
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
exports.deleteByTask = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
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
