"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.needsReindex = exports.list = exports.remove = exports.updateLastIndexed = exports.upsert = exports.get = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
exports.get = (0, server_1.query)({
    args: { repoFullName: values_1.v.string() },
    handler: async (ctx, args) => {
        return ctx.db
            .query("repositoryIndex")
            .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
            .first();
    },
});
exports.upsert = (0, server_1.mutation)({
    args: {
        repoFullName: values_1.v.string(),
        lastCommitSha: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const existing = await ctx.db
            .query("repositoryIndex")
            .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                lastIndexedAt: now,
                lastCommitSha: args.lastCommitSha ?? existing.lastCommitSha,
                updatedAt: now,
            });
            return existing._id;
        }
        return ctx.db.insert("repositoryIndex", {
            repoFullName: args.repoFullName,
            lastIndexedAt: now,
            lastCommitSha: args.lastCommitSha,
            createdAt: now,
            updatedAt: now,
        });
    },
});
exports.updateLastIndexed = (0, server_1.mutation)({
    args: {
        repoFullName: values_1.v.string(),
        lastCommitSha: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const existing = await ctx.db
            .query("repositoryIndex")
            .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
            .first();
        if (!existing) {
            throw new Error("Repository index not found");
        }
        await ctx.db.patch(existing._id, {
            lastIndexedAt: now,
            lastCommitSha: args.lastCommitSha ?? existing.lastCommitSha,
            updatedAt: now,
        });
        return { success: true };
    },
});
exports.remove = (0, server_1.mutation)({
    args: { repoFullName: values_1.v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("repositoryIndex")
            .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
            .first();
        if (existing) {
            await ctx.db.delete(existing._id);
        }
        return { success: true };
    },
});
exports.list = (0, server_1.query)({
    args: {},
    handler: async (ctx) => {
        return ctx.db.query("repositoryIndex").order("desc").collect();
    },
});
exports.needsReindex = (0, server_1.query)({
    args: {
        repoFullName: values_1.v.string(),
        currentCommitSha: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("repositoryIndex")
            .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
            .first();
        if (!existing) {
            return true;
        }
        if (!existing.lastCommitSha) {
            return true;
        }
        return existing.lastCommitSha !== args.currentCommitSha;
    },
});
