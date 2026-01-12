"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentActivities = exports.broadcastActivity = exports.cleanupStalePresence = exports.removePresence = exports.getActiveUsers = exports.updatePresence = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
/**
 * Real-time presence system for collaborative editing
 * Tracks active users, cursors, selections, and activities
 */
/**
 * Update user presence (heartbeat every 30s)
 */
exports.updatePresence = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        userId: values_1.v.id("users"),
        userName: values_1.v.string(),
        userImage: values_1.v.optional(values_1.v.string()),
        cursor: values_1.v.optional(values_1.v.object({
            x: values_1.v.number(),
            y: values_1.v.number(),
        })),
        selection: values_1.v.optional(values_1.v.object({
            start: values_1.v.number(),
            end: values_1.v.number(),
            filePath: values_1.v.optional(values_1.v.string()),
        })),
        activity: values_1.v.optional(values_1.v.union(values_1.v.literal("viewing"), values_1.v.literal("typing"), values_1.v.literal("editing-file"), values_1.v.literal("running-command"), values_1.v.literal("idle"))),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        // Check if presence exists
        const existing = await ctx.db
            .query("presence")
            .withIndex("by_task_user", (q) => q.eq("taskId", args.taskId).eq("userId", args.userId))
            .unique();
        if (existing) {
            // Update existing presence
            await ctx.db.patch(existing._id, {
                userName: args.userName,
                userImage: args.userImage,
                cursor: args.cursor,
                selection: args.selection,
                activity: args.activity || "viewing",
                lastSeenAt: now,
                updatedAt: now,
            });
            return { presenceId: existing._id, action: "updated" };
        }
        else {
            // Create new presence
            const presenceId = await ctx.db.insert("presence", {
                taskId: args.taskId,
                userId: args.userId,
                userName: args.userName,
                userImage: args.userImage,
                cursor: args.cursor,
                selection: args.selection,
                activity: args.activity || "viewing",
                lastSeenAt: now,
                createdAt: now,
                updatedAt: now,
            });
            return { presenceId, action: "created" };
        }
    },
});
/**
 * Get all active users for a task
 */
exports.getActiveUsers = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
        timeoutMs: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const timeout = args.timeoutMs ?? 60000; // 60s default
        const cutoff = Date.now() - timeout;
        const allPresence = await ctx.db
            .query("presence")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .collect();
        // Filter to only active users (seen within timeout)
        const activeUsers = allPresence.filter((p) => p.lastSeenAt >= cutoff);
        return activeUsers.map((p) => ({
            userId: p.userId,
            userName: p.userName,
            userImage: p.userImage,
            cursor: p.cursor,
            selection: p.selection,
            activity: p.activity,
            lastSeenAt: p.lastSeenAt,
            isActive: true,
        }));
    },
});
/**
 * Remove user presence (on disconnect)
 */
exports.removePresence = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        userId: values_1.v.id("users"),
    },
    handler: async (ctx, args) => {
        const presence = await ctx.db
            .query("presence")
            .withIndex("by_task_user", (q) => q.eq("taskId", args.taskId).eq("userId", args.userId))
            .unique();
        if (presence) {
            await ctx.db.delete(presence._id);
            return { success: true, presenceId: presence._id };
        }
        return { success: false };
    },
});
/**
 * Cleanup stale presence records (run periodically)
 */
exports.cleanupStalePresence = (0, server_1.internalMutation)({
    args: {
        timeoutMs: values_1.v.number(),
    },
    handler: async (ctx, args) => {
        const cutoff = Date.now() - args.timeoutMs;
        const staleRecords = await ctx.db
            .query("presence")
            .filter((q) => q.lt(q.field("lastSeenAt"), cutoff))
            .collect();
        for (const record of staleRecords) {
            await ctx.db.delete(record._id);
        }
        return { deleted: staleRecords.length };
    },
});
/**
 * Broadcast activity to all users in a task
 */
exports.broadcastActivity = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        userId: values_1.v.id("users"),
        activityType: values_1.v.union(values_1.v.literal("user-joined"), values_1.v.literal("user-left"), values_1.v.literal("file-opened"), values_1.v.literal("file-saved"), values_1.v.literal("command-started"), values_1.v.literal("command-completed")),
        metadata: values_1.v.optional(values_1.v.any()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const activityId = await ctx.db.insert("activities", {
            taskId: args.taskId,
            userId: args.userId,
            activityType: args.activityType,
            metadata: args.metadata ? JSON.stringify(args.metadata) : undefined,
            timestamp: now,
        });
        return { activityId };
    },
});
/**
 * Get recent activities for a task
 */
exports.getRecentActivities = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
        limit: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        const activities = await ctx.db
            .query("activities")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .take(limit);
        return activities.map((a) => ({
            ...a,
            metadata: a.metadata ? JSON.parse(a.metadata) : undefined,
        }));
    },
});
