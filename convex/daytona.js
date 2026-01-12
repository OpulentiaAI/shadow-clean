"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSandboxStatus = exports.updateActivity = exports.getSandboxInfo = exports.storeSandboxInfo = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
/**
 * Daytona SDK integration for terminal streaming
 * Queries and mutations for sandbox state management
 *
 * Actions are in daytonaActions.ts (Node.js runtime)
 */
/**
 * Store sandbox info for a task
 */
exports.storeSandboxInfo = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        sandboxId: values_1.v.string(),
        sessionId: values_1.v.string(),
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
exports.getSandboxInfo = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
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
exports.updateActivity = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
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
exports.updateSandboxStatus = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        status: values_1.v.union(values_1.v.literal("creating"), values_1.v.literal("active"), values_1.v.literal("stopped"), values_1.v.literal("error")),
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
