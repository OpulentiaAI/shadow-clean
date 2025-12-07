import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { repoFullName: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("repositoryIndex")
      .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
      .first();
  },
});

export const upsert = mutation({
  args: {
    repoFullName: v.string(),
    lastCommitSha: v.optional(v.string()),
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

export const updateLastIndexed = mutation({
  args: {
    repoFullName: v.string(),
    lastCommitSha: v.optional(v.string()),
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

export const remove = mutation({
  args: { repoFullName: v.string() },
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

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("repositoryIndex").order("desc").collect();
  },
});

export const needsReindex = query({
  args: {
    repoFullName: v.string(),
    currentCommitSha: v.string(),
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
