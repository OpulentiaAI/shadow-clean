import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Real-time presence system for collaborative editing
 * Tracks active users, cursors, selections, and activities
 */

/**
 * Update user presence (heartbeat every 30s)
 */
export const updatePresence = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
    userName: v.string(),
    userImage: v.optional(v.string()),
    cursor: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
      })
    ),
    selection: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
        filePath: v.optional(v.string()),
      })
    ),
    activity: v.optional(
      v.union(
        v.literal("viewing"),
        v.literal("typing"),
        v.literal("editing-file"),
        v.literal("running-command"),
        v.literal("idle")
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if presence exists
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_task_user", (q) =>
        q.eq("taskId", args.taskId).eq("userId", args.userId)
      )
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
    } else {
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
export const getActiveUsers = query({
  args: {
    taskId: v.id("tasks"),
    timeoutMs: v.optional(v.number()),
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
export const removePresence = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("presence")
      .withIndex("by_task_user", (q) =>
        q.eq("taskId", args.taskId).eq("userId", args.userId)
      )
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
export const cleanupStalePresence = internalMutation({
  args: {
    timeoutMs: v.number(),
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
export const broadcastActivity = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
    activityType: v.union(
      v.literal("user-joined"),
      v.literal("user-left"),
      v.literal("file-opened"),
      v.literal("file-saved"),
      v.literal("command-started"),
      v.literal("command-completed")
    ),
    metadata: v.optional(v.any()),
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
export const getRecentActivities = query({
  args: {
    taskId: v.id("tasks"),
    limit: v.optional(v.number()),
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
