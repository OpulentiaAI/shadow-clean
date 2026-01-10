"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listByUser = exports.remove = exports.update = exports.create = exports.getByTaskId = exports.getByRepo = exports.get = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
exports.get = (0, server_1.query)({
    args: { id: values_1.v.id("codebaseUnderstanding") },
    handler: async (ctx, args) => {
        const codebase = await ctx.db.get(args.id);
        if (!codebase)
            return null;
        return {
            ...codebase,
            content: JSON.parse(codebase.contentJson),
        };
    },
});
exports.getByRepo = (0, server_1.query)({
    args: { repoFullName: values_1.v.string() },
    handler: async (ctx, args) => {
        const codebase = await ctx.db
            .query("codebaseUnderstanding")
            .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
            .first();
        if (!codebase)
            return null;
        return {
            ...codebase,
            content: JSON.parse(codebase.contentJson),
        };
    },
});
exports.getByTaskId = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task || !task.codebaseUnderstandingId)
            return null;
        const codebase = await ctx.db.get(task.codebaseUnderstandingId);
        if (!codebase)
            return null;
        return {
            ...codebase,
            content: JSON.parse(codebase.contentJson),
        };
    },
});
exports.create = (0, server_1.mutation)({
    args: {
        repoFullName: values_1.v.string(),
        repoUrl: values_1.v.string(),
        content: values_1.v.any(),
        userId: values_1.v.id("users"),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const existing = await ctx.db
            .query("codebaseUnderstanding")
            .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                contentJson: JSON.stringify(args.content),
                updatedAt: now,
            });
            return existing._id;
        }
        return ctx.db.insert("codebaseUnderstanding", {
            repoFullName: args.repoFullName,
            repoUrl: args.repoUrl,
            contentJson: JSON.stringify(args.content),
            userId: args.userId,
            createdAt: now,
            updatedAt: now,
        });
    },
});
exports.update = (0, server_1.mutation)({
    args: {
        id: values_1.v.id("codebaseUnderstanding"),
        content: values_1.v.any(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);
        if (!existing) {
            throw new Error("Codebase understanding not found");
        }
        await ctx.db.patch(args.id, {
            contentJson: JSON.stringify(args.content),
            updatedAt: Date.now(),
        });
        return { success: true };
    },
});
exports.remove = (0, server_1.mutation)({
    args: { id: values_1.v.id("codebaseUnderstanding") },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);
        if (!existing) {
            throw new Error("Codebase understanding not found");
        }
        const tasks = await ctx.db
            .query("tasks")
            .filter((q) => q.eq(q.field("codebaseUnderstandingId"), args.id))
            .collect();
        for (const task of tasks) {
            await ctx.db.patch(task._id, { codebaseUnderstandingId: undefined });
        }
        await ctx.db.delete(args.id);
        return { success: true };
    },
});
exports.listByUser = (0, server_1.query)({
    args: { userId: values_1.v.id("users") },
    handler: async (ctx, args) => {
        const codebases = await ctx.db
            .query("codebaseUnderstanding")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
        return codebases.map((c) => ({
            ...c,
            content: JSON.parse(c.contentJson),
        }));
    },
});
