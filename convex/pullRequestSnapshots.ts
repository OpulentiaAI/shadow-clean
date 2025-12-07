import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { PullRequestStatus } from "./schema";

export const create = mutation({
  args: {
    messageId: v.id("chatMessages"),
    status: PullRequestStatus,
    title: v.string(),
    description: v.string(),
    filesChanged: v.number(),
    linesAdded: v.number(),
    linesRemoved: v.number(),
    commitSha: v.string(),
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

export const update = mutation({
  args: {
    snapshotId: v.id("pullRequestSnapshots"),
    status: v.optional(PullRequestStatus),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    filesChanged: v.optional(v.number()),
    linesAdded: v.optional(v.number()),
    linesRemoved: v.optional(v.number()),
    commitSha: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.snapshotId);
    if (!existing) {
      throw new Error("Pull request snapshot not found");
    }
    const { snapshotId, ...updates } = args;
    const patchData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patchData[key] = value;
      }
    }
    await ctx.db.patch(snapshotId, patchData);
    return { success: true };
  },
});

export const get = query({
  args: { snapshotId: v.id("pullRequestSnapshots") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.snapshotId);
  },
});

export const getByMessage = query({
  args: { messageId: v.id("chatMessages") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("pullRequestSnapshots")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .first();
  },
});

export const remove = mutation({
  args: { snapshotId: v.id("pullRequestSnapshots") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.snapshotId);
    if (!existing) {
      throw new Error("Pull request snapshot not found");
    }
    await ctx.db.delete(args.snapshotId);
    return { success: true };
  },
});

export const removeByMessage = mutation({
  args: { messageId: v.id("chatMessages") },
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
