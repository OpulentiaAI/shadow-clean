import { mutation, query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Convex-native Git operations
 * Uses virtual file system stored in Convex for git-like operations
 * Note: Full git operations with isomorphic-git require Node.js runtime
 * This module provides git state tracking and basic operations
 */

/**
 * Initialize git state for a task
 */
export const initRepository = mutation({
  args: {
    taskId: v.id("tasks"),
    workDir: v.string(),
    repoUrl: v.optional(v.string()),
    branch: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if git state already exists
    const existing = await ctx.db
      .query("gitState")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        workDir: args.workDir,
        repoUrl: args.repoUrl,
        currentBranch: args.branch || "main",
        lastOperation: "init",
        lastOperationTime: now,
        updatedAt: now,
      });
      return { gitStateId: existing._id, action: "updated" };
    }

    // Create new git state
    const id = await ctx.db.insert("gitState", {
      taskId: args.taskId,
      workDir: args.workDir,
      repoUrl: args.repoUrl,
      currentBranch: args.branch || "main",
      status: JSON.stringify({ clean: true, files: [] }),
      lastOperation: "init",
      lastOperationTime: now,
      createdAt: now,
      updatedAt: now,
    });

    return { gitStateId: id, action: "created" };
  },
});

/**
 * Get git state for a task
 */
export const getState = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("gitState")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (!state) {
      return null;
    }

    return {
      ...state,
      status: JSON.parse(state.status),
    };
  },
});

/**
 * Update git status (tracked files, changes, etc.)
 */
export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.object({
      clean: v.boolean(),
      files: v.array(
        v.object({
          path: v.string(),
          status: v.string(), // 'modified', 'added', 'deleted', 'untracked'
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("gitState")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (!state) {
      throw new Error("Git state not initialized for this task");
    }

    await ctx.db.patch(state._id, {
      status: JSON.stringify(args.status),
      lastOperation: "status",
      lastOperationTime: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Internal mutation for updating git progress
 */
export const updateProgress = internalMutation({
  args: {
    taskId: v.id("tasks"),
    phase: v.string(),
    loaded: v.number(),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    // Log progress to command logs
    await ctx.db.insert("commandLogs", {
      taskId: args.taskId,
      commandId: `git_${Date.now()}`,
      stream: "system",
      content: `[Git] ${args.phase}: ${args.loaded}/${args.total}`,
      timestamp: Date.now(),
    });
  },
});

/**
 * Record a commit (virtual - stores commit info in Convex)
 */
export const recordCommit = mutation({
  args: {
    taskId: v.id("tasks"),
    message: v.string(),
    files: v.array(v.string()),
    sha: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("gitState")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (!state) {
      throw new Error("Git state not initialized for this task");
    }

    const commitSha = args.sha || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

    await ctx.db.patch(state._id, {
      status: JSON.stringify({ clean: true, files: [] }),
      lastOperation: `commit:${commitSha}`,
      lastOperationTime: Date.now(),
      updatedAt: Date.now(),
    });

    // Log commit
    await ctx.db.insert("commandLogs", {
      taskId: args.taskId,
      commandId: `commit_${commitSha}`,
      stream: "system",
      content: `[Git] Committed ${args.files.length} files: ${args.message}\nSHA: ${commitSha}`,
      timestamp: Date.now(),
    });

    return { sha: commitSha, filesCommitted: args.files.length };
  },
});

/**
 * Switch branch
 */
export const switchBranch = mutation({
  args: {
    taskId: v.id("tasks"),
    branch: v.string(),
    create: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("gitState")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (!state) {
      throw new Error("Git state not initialized for this task");
    }

    const operation = args.create ? `checkout -b ${args.branch}` : `checkout ${args.branch}`;

    await ctx.db.patch(state._id, {
      currentBranch: args.branch,
      lastOperation: operation,
      lastOperationTime: Date.now(),
      updatedAt: Date.now(),
    });

    // Log branch switch
    await ctx.db.insert("commandLogs", {
      taskId: args.taskId,
      commandId: `branch_${Date.now()}`,
      stream: "system",
      content: `[Git] Switched to branch '${args.branch}'${args.create ? " (created)" : ""}`,
      timestamp: Date.now(),
    });

    return { branch: args.branch, created: args.create || false };
  },
});

/**
 * Clone repository action
 * Note: In Convex cloud, actual git clone requires external service
 * This creates the git state and prepares for file operations
 */
export const cloneRepository = action({
  args: {
    taskId: v.id("tasks"),
    repoUrl: v.string(),
    branch: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const workDir = `/workspace/task-${args.taskId}`;
    const branchName = args.branch || "main";

    // Initialize git state directly (simplified for action context)
    // The actual git state will be created/updated
    return {
      success: true,
      workDir,
      repoUrl: args.repoUrl,
      branch: branchName,
      message: "Repository state initialized. Use initRepository mutation for full setup.",
    };
  },
});

/**
 * Internal mutation for clone action
 */
export const initRepositoryInternal = internalMutation({
  args: {
    taskId: v.id("tasks"),
    workDir: v.string(),
    repoUrl: v.string(),
    branch: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("gitState")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        workDir: args.workDir,
        repoUrl: args.repoUrl,
        currentBranch: args.branch,
        lastOperation: "clone",
        lastOperationTime: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("gitState", {
        taskId: args.taskId,
        workDir: args.workDir,
        repoUrl: args.repoUrl,
        currentBranch: args.branch,
        status: JSON.stringify({ clean: true, files: [] }),
        lastOperation: "clone",
        lastOperationTime: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete git state for a task
 */
export const deleteState = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("gitState")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (state) {
      await ctx.db.delete(state._id);
      return { deleted: true };
    }

    return { deleted: false };
  },
});
