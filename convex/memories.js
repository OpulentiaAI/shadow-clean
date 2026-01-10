"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkCreate = exports.search = exports.byUserRepoAndCategory = exports.byCategory = exports.byUserAndRepo = exports.byTask = exports.get = exports.remove = exports.update = exports.create = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const schema_1 = require("./schema");
exports.create = (0, server_1.mutation)({
    args: {
        content: values_1.v.string(),
        category: schema_1.MemoryCategory,
        repoFullName: values_1.v.string(),
        repoUrl: values_1.v.string(),
        userId: values_1.v.id("users"),
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const memoryId = await ctx.db.insert("memories", {
            content: args.content,
            category: args.category,
            repoFullName: args.repoFullName,
            repoUrl: args.repoUrl,
            userId: args.userId,
            taskId: args.taskId,
            createdAt: now,
            updatedAt: now,
        });
        return { memoryId };
    },
});
exports.update = (0, server_1.mutation)({
    args: {
        memoryId: values_1.v.id("memories"),
        content: values_1.v.optional(values_1.v.string()),
        category: values_1.v.optional(schema_1.MemoryCategory),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.memoryId);
        if (!existing) {
            throw new Error("Memory not found");
        }
        const patchData = { updatedAt: Date.now() };
        if (args.content !== undefined)
            patchData.content = args.content;
        if (args.category !== undefined)
            patchData.category = args.category;
        await ctx.db.patch(args.memoryId, patchData);
        return { success: true };
    },
});
exports.remove = (0, server_1.mutation)({
    args: { memoryId: values_1.v.id("memories") },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.memoryId);
        if (!existing) {
            throw new Error("Memory not found");
        }
        await ctx.db.delete(args.memoryId);
        return { success: true };
    },
});
exports.get = (0, server_1.query)({
    args: { memoryId: values_1.v.id("memories") },
    handler: async (ctx, args) => {
        return ctx.db.get(args.memoryId);
    },
});
exports.byTask = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("memories")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .collect();
    },
});
exports.byUserAndRepo = (0, server_1.query)({
    args: {
        userId: values_1.v.id("users"),
        repoFullName: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query("memories")
            .withIndex("by_user_repo", (q) => q.eq("userId", args.userId).eq("repoFullName", args.repoFullName))
            .order("desc")
            .collect();
    },
});
exports.byCategory = (0, server_1.query)({
    args: { category: schema_1.MemoryCategory },
    handler: async (ctx, args) => {
        return ctx.db
            .query("memories")
            .withIndex("by_category", (q) => q.eq("category", args.category))
            .order("desc")
            .collect();
    },
});
exports.byUserRepoAndCategory = (0, server_1.query)({
    args: {
        userId: values_1.v.id("users"),
        repoFullName: values_1.v.string(),
        category: schema_1.MemoryCategory,
    },
    handler: async (ctx, args) => {
        const all = await ctx.db
            .query("memories")
            .withIndex("by_user_repo", (q) => q.eq("userId", args.userId).eq("repoFullName", args.repoFullName))
            .collect();
        return all.filter((m) => m.category === args.category);
    },
});
exports.search = (0, server_1.query)({
    args: {
        userId: values_1.v.id("users"),
        repoFullName: values_1.v.string(),
        searchTerm: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const memories = await ctx.db
            .query("memories")
            .withIndex("by_user_repo", (q) => q.eq("userId", args.userId).eq("repoFullName", args.repoFullName))
            .order("desc")
            .collect();
        if (!args.searchTerm) {
            return memories;
        }
        const term = args.searchTerm.toLowerCase();
        return memories.filter((m) => m.content.toLowerCase().includes(term));
    },
});
exports.bulkCreate = (0, server_1.mutation)({
    args: {
        memories: values_1.v.array(values_1.v.object({
            content: values_1.v.string(),
            category: schema_1.MemoryCategory,
            repoFullName: values_1.v.string(),
            repoUrl: values_1.v.string(),
            userId: values_1.v.id("users"),
            taskId: values_1.v.id("tasks"),
        })),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const ids = [];
        for (const memory of args.memories) {
            const memoryId = await ctx.db.insert("memories", {
                ...memory,
                createdAt: now,
                updatedAt: now,
            });
            ids.push(memoryId);
        }
        return { memoryIds: ids };
    },
});
