"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestByTask = exports.removeByMessage = exports.remove = exports.getByMessage = exports.get = exports.update = exports.create = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const schema_1 = require("./schema");
exports.create = (0, server_1.mutation)({
    args: {
        messageId: values_1.v.id("chatMessages"),
        status: schema_1.PullRequestStatus,
        title: values_1.v.string(),
        description: values_1.v.string(),
        filesChanged: values_1.v.number(),
        linesAdded: values_1.v.number(),
        linesRemoved: values_1.v.number(),
        commitSha: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("pullRequestSnapshots")
            .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                status: args.status,
                title: args.title,
                description: args.description,
                filesChanged: args.filesChanged,
                linesAdded: args.linesAdded,
                linesRemoved: args.linesRemoved,
                commitSha: args.commitSha,
            });
            return existing._id;
        }
        return ctx.db.insert("pullRequestSnapshots", {
            messageId: args.messageId,
            status: args.status,
            title: args.title,
            description: args.description,
            filesChanged: args.filesChanged,
            linesAdded: args.linesAdded,
            linesRemoved: args.linesRemoved,
            commitSha: args.commitSha,
            createdAt: Date.now(),
        });
    },
});
exports.update = (0, server_1.mutation)({
    args: {
        snapshotId: values_1.v.id("pullRequestSnapshots"),
        status: values_1.v.optional(schema_1.PullRequestStatus),
        title: values_1.v.optional(values_1.v.string()),
        description: values_1.v.optional(values_1.v.string()),
        filesChanged: values_1.v.optional(values_1.v.number()),
        linesAdded: values_1.v.optional(values_1.v.number()),
        linesRemoved: values_1.v.optional(values_1.v.number()),
        commitSha: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.snapshotId);
        if (!existing) {
            throw new Error("Pull request snapshot not found");
        }
        const { snapshotId, ...updates } = args;
        const patchData = {};
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                patchData[key] = value;
            }
        }
        await ctx.db.patch(snapshotId, patchData);
        return { success: true };
    },
});
exports.get = (0, server_1.query)({
    args: { snapshotId: values_1.v.id("pullRequestSnapshots") },
    handler: async (ctx, args) => {
        return ctx.db.get(args.snapshotId);
    },
});
exports.getByMessage = (0, server_1.query)({
    args: { messageId: values_1.v.id("chatMessages") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("pullRequestSnapshots")
            .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
            .first();
    },
});
exports.remove = (0, server_1.mutation)({
    args: { snapshotId: values_1.v.id("pullRequestSnapshots") },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.snapshotId);
        if (!existing) {
            throw new Error("Pull request snapshot not found");
        }
        await ctx.db.delete(args.snapshotId);
        return { success: true };
    },
});
exports.removeByMessage = (0, server_1.mutation)({
    args: { messageId: values_1.v.id("chatMessages") },
    handler: async (ctx, args) => {
        const snapshot = await ctx.db
            .query("pullRequestSnapshots")
            .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
            .first();
        if (snapshot) {
            await ctx.db.delete(snapshot._id);
        }
        return { success: true };
    },
});
exports.getLatestByTask = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        // Get all messages for the task
        const messages = await ctx.db
            .query("chatMessages")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .collect();
        if (messages.length === 0) {
            return null;
        }
        // Find all snapshots for these messages
        let latestSnapshot = null;
        let latestCreatedAt = 0;
        for (const message of messages) {
            const snapshot = await ctx.db
                .query("pullRequestSnapshots")
                .withIndex("by_message", (q) => q.eq("messageId", message._id))
                .first();
            if (snapshot && snapshot.createdAt > latestCreatedAt) {
                latestSnapshot = snapshot;
                latestCreatedAt = snapshot.createdAt;
            }
        }
        return latestSnapshot;
    },
});
