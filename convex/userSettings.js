"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.upsert = exports.update = exports.create = exports.getOrCreate = exports.get = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
exports.get = (0, server_1.query)({
    args: { userId: values_1.v.id("users") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();
    },
});
exports.getOrCreate = (0, server_1.query)({
    args: { userId: values_1.v.id("users") },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();
        if (existing) {
            return existing;
        }
        return {
            _id: null,
            userId: args.userId,
            memoriesEnabled: true,
            autoPullRequest: false,
            enableShadowWiki: false,
            enableIndexing: false,
            selectedModels: [],
            rules: undefined,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
    },
});
exports.create = (0, server_1.mutation)({
    args: {
        userId: values_1.v.id("users"),
        memoriesEnabled: values_1.v.optional(values_1.v.boolean()),
        autoPullRequest: values_1.v.optional(values_1.v.boolean()),
        enableShadowWiki: values_1.v.optional(values_1.v.boolean()),
        enableIndexing: values_1.v.optional(values_1.v.boolean()),
        selectedModels: values_1.v.optional(values_1.v.array(values_1.v.string())),
        rules: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();
        if (existing) {
            throw new Error("User settings already exist");
        }
        const now = Date.now();
        const settingsId = await ctx.db.insert("userSettings", {
            userId: args.userId,
            memoriesEnabled: args.memoriesEnabled ?? true,
            autoPullRequest: args.autoPullRequest ?? false,
            enableShadowWiki: args.enableShadowWiki ?? false,
            enableIndexing: args.enableIndexing ?? false,
            selectedModels: args.selectedModels ?? [],
            rules: args.rules,
            createdAt: now,
            updatedAt: now,
        });
        return { settingsId };
    },
});
exports.update = (0, server_1.mutation)({
    args: {
        userId: values_1.v.id("users"),
        memoriesEnabled: values_1.v.optional(values_1.v.boolean()),
        autoPullRequest: values_1.v.optional(values_1.v.boolean()),
        enableShadowWiki: values_1.v.optional(values_1.v.boolean()),
        enableIndexing: values_1.v.optional(values_1.v.boolean()),
        selectedModels: values_1.v.optional(values_1.v.array(values_1.v.string())),
        rules: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();
        const now = Date.now();
        if (existing) {
            const patchData = { updatedAt: now };
            if (args.memoriesEnabled !== undefined)
                patchData.memoriesEnabled = args.memoriesEnabled;
            if (args.autoPullRequest !== undefined)
                patchData.autoPullRequest = args.autoPullRequest;
            if (args.enableShadowWiki !== undefined)
                patchData.enableShadowWiki = args.enableShadowWiki;
            if (args.enableIndexing !== undefined)
                patchData.enableIndexing = args.enableIndexing;
            if (args.selectedModels !== undefined)
                patchData.selectedModels = args.selectedModels;
            if (args.rules !== undefined)
                patchData.rules = args.rules;
            await ctx.db.patch(existing._id, patchData);
            return { settingsId: existing._id, created: false };
        }
        const settingsId = await ctx.db.insert("userSettings", {
            userId: args.userId,
            memoriesEnabled: args.memoriesEnabled ?? true,
            autoPullRequest: args.autoPullRequest ?? false,
            enableShadowWiki: args.enableShadowWiki ?? false,
            enableIndexing: args.enableIndexing ?? false,
            selectedModels: args.selectedModels ?? [],
            rules: args.rules,
            createdAt: now,
            updatedAt: now,
        });
        return { settingsId, created: true };
    },
});
exports.upsert = (0, server_1.mutation)({
    args: {
        userId: values_1.v.id("users"),
        memoriesEnabled: values_1.v.optional(values_1.v.boolean()),
        autoPullRequest: values_1.v.optional(values_1.v.boolean()),
        enableShadowWiki: values_1.v.optional(values_1.v.boolean()),
        enableIndexing: values_1.v.optional(values_1.v.boolean()),
        selectedModels: values_1.v.optional(values_1.v.array(values_1.v.string())),
        rules: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();
        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, {
                memoriesEnabled: args.memoriesEnabled ?? existing.memoriesEnabled,
                autoPullRequest: args.autoPullRequest ?? existing.autoPullRequest,
                enableShadowWiki: args.enableShadowWiki ?? existing.enableShadowWiki,
                enableIndexing: args.enableIndexing ?? existing.enableIndexing,
                selectedModels: args.selectedModels ?? existing.selectedModels,
                rules: args.rules !== undefined ? args.rules : existing.rules,
                updatedAt: now,
            });
            return existing._id;
        }
        return ctx.db.insert("userSettings", {
            userId: args.userId,
            memoriesEnabled: args.memoriesEnabled ?? true,
            autoPullRequest: args.autoPullRequest ?? false,
            enableShadowWiki: args.enableShadowWiki ?? false,
            enableIndexing: args.enableIndexing ?? false,
            selectedModels: args.selectedModels ?? [],
            rules: args.rules,
            createdAt: now,
            updatedAt: now,
        });
    },
});
exports.remove = (0, server_1.mutation)({
    args: { userId: values_1.v.id("users") },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();
        if (existing) {
            await ctx.db.delete(existing._id);
        }
        return { success: true };
    },
});
