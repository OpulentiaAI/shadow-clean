"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAllForTask = exports.remove = exports.listByTask = exports.getActiveByTask = exports.get = exports.updateConnection = exports.endAllForTask = exports.end = exports.create = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
exports.create = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        podName: values_1.v.optional(values_1.v.string()),
        podNamespace: values_1.v.optional(values_1.v.string()),
        connectionId: values_1.v.optional(values_1.v.string()),
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
exports.end = (0, server_1.mutation)({
    args: { sessionId: values_1.v.id("taskSessions") },
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
exports.endAllForTask = (0, server_1.mutation)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("taskSessions")
            .withIndex("by_task_active", (q) => q.eq("taskId", args.taskId).eq("isActive", true))
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
exports.updateConnection = (0, server_1.mutation)({
    args: {
        sessionId: values_1.v.id("taskSessions"),
        connectionId: values_1.v.optional(values_1.v.string()),
        podName: values_1.v.optional(values_1.v.string()),
        podNamespace: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.sessionId);
        if (!existing) {
            throw new Error("Task session not found");
        }
        const patchData = {};
        if (args.connectionId !== undefined)
            patchData.connectionId = args.connectionId;
        if (args.podName !== undefined)
            patchData.podName = args.podName;
        if (args.podNamespace !== undefined)
            patchData.podNamespace = args.podNamespace;
        await ctx.db.patch(args.sessionId, patchData);
        return { success: true };
    },
});
exports.get = (0, server_1.query)({
    args: { sessionId: values_1.v.id("taskSessions") },
    handler: async (ctx, args) => {
        return ctx.db.get(args.sessionId);
    },
});
exports.getActiveByTask = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("taskSessions")
            .withIndex("by_task_active", (q) => q.eq("taskId", args.taskId).eq("isActive", true))
            .first();
    },
});
exports.listByTask = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("taskSessions")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .collect();
    },
});
exports.remove = (0, server_1.mutation)({
    args: { sessionId: values_1.v.id("taskSessions") },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.sessionId);
        if (!existing) {
            throw new Error("Task session not found");
        }
        await ctx.db.delete(args.sessionId);
        return { success: true };
    },
});
exports.removeAllForTask = (0, server_1.mutation)({
    args: { taskId: values_1.v.id("tasks") },
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
