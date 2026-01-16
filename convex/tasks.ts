import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { TaskStatus, InitStatus, ErrorCode, ErrorSource } from "./schema";
import { api } from "./_generated/api";

export const create = mutation({
  args: {
    title: v.string(),
    repoFullName: v.string(),
    repoUrl: v.string(),
    userId: v.id("users"),
    isScratchpad: v.optional(v.boolean()),
    baseBranch: v.optional(v.string()),
    baseCommitSha: v.optional(v.string()),
    shadowBranch: v.optional(v.string()),
    mainModel: v.optional(v.string()),
    githubIssueId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      status: "INITIALIZING",
      repoFullName: args.repoFullName,
      repoUrl: args.repoUrl,
      isScratchpad: args.isScratchpad ?? false,
      mainModel: args.mainModel,
      workspacePath: undefined,
      initStatus: "INACTIVE",
      scheduledCleanupAt: undefined,
      initializationError: undefined,
      errorMessage: undefined,
      workspaceCleanedUp: false,
      hasBeenInitialized: false,
      createdAt: now,
      updatedAt: now,
      userId: args.userId,
      baseBranch: args.baseBranch ?? "main",
      baseCommitSha: args.baseCommitSha ?? "",
      shadowBranch: args.shadowBranch ?? "",
      pullRequestNumber: undefined,
      githubIssueId: args.githubIssueId,
      codebaseUnderstandingId: undefined,
    });
    return { taskId };
  },
});

export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    status: v.optional(TaskStatus),
    initStatus: v.optional(InitStatus),
    mainModel: v.optional(v.string()),
    workspacePath: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    initializationError: v.optional(v.string()),
    // Structured error fields for failure taxonomy
    errorCode: v.optional(ErrorCode),
    errorSource: v.optional(ErrorSource),
    errorDetails: v.optional(v.string()),
    failedAt: v.optional(v.number()),
    failedStep: v.optional(v.string()),
    failureTraceId: v.optional(v.string()),
    workspaceCleanedUp: v.optional(v.boolean()),
    hasBeenInitialized: v.optional(v.boolean()),
    pullRequestNumber: v.optional(v.number()),
    scheduledCleanupAt: v.optional(v.number()),
    shadowBranch: v.optional(v.string()),
    baseCommitSha: v.optional(v.string()),
    codebaseUnderstandingId: v.optional(v.id("codebaseUnderstanding")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.taskId);
    if (!existing) {
      throw new Error("Task not found");
    }
    const { taskId, ...updates } = args;
    const patchData: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patchData[key] = value;
      }
    }
    await ctx.db.patch(taskId, patchData);
    return { taskId };
  },
});

export const updateTitle = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.taskId);
    if (!existing) {
      throw new Error("Task not found");
    }
    await ctx.db.patch(args.taskId, {
      title: args.title,
      updatedAt: Date.now(),
    });
    return { success: true, task: { ...existing, title: args.title } };
  },
});

export const archive = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.taskId);
    if (!existing) {
      throw new Error("Task not found");
    }
    await ctx.db.patch(args.taskId, {
      status: "ARCHIVED",
      updatedAt: Date.now(),
    });
    return { success: true, task: { ...existing, status: "ARCHIVED" } };
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.taskId);
    if (!existing) {
      throw new Error("Task not found");
    }
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .collect();
    for (const msg of messages) {
      const snapshot = await ctx.db
        .query("pullRequestSnapshots")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .first();
      if (snapshot) {
        await ctx.db.delete(snapshot._id);
      }
      await ctx.db.delete(msg._id);
    }
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    for (const todo of todos) {
      await ctx.db.delete(todo._id);
    }
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    for (const memory of memories) {
      await ctx.db.delete(memory._id);
    }
    const sessions = await ctx.db
      .query("taskSessions")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
    await ctx.db.delete(args.taskId);
    return { success: true, task: existing };
  },
});

export const get = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.taskId);
  },
});

export const getWithDetails = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return { task: null, todos: [], messages: [] };
    }
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
    return { task, todos, messages };
  },
});

export const getTitle = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    return task?.title ?? "";
  },
});

export const getStatus = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }
    return {
      status: task.status,
      initStatus: task.initStatus,
      initializationError: task.initializationError ?? null,
      hasBeenInitialized: task.hasBeenInitialized,
    };
  },
});

export const getStackedPRInfo = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }
    return {
      id: task._id,
      title: task.title,
      status: task.status,
      shadowBranch: task.shadowBranch || null,
    };
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const listScheduledForCleanup = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tasks")
      .withIndex("by_scheduled_cleanup", (q) =>
        q.lte("scheduledCleanupAt", args.now)
      )
      .filter((q) => q.gt(q.field("scheduledCleanupAt"), 0))
      .collect();
  },
});

export const listByUserExcludeArchived = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return all.filter((t) => t.status !== "ARCHIVED");
  },
});

export const countActiveByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return tasks.filter(
      (t) =>
        t.status !== "ARCHIVED" &&
        t.status !== "COMPLETED" &&
        t.status !== "FAILED"
    ).length;
  },
});

export const listByPrNumberAndRepo = query({
  args: {
    pullRequestNumber: v.number(),
    repoFullName: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all tasks for this repo, then filter by PR number and non-archived status
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
      .collect();
    return tasks.filter(
      (t) =>
        t.pullRequestNumber === args.pullRequestNumber &&
        t.status !== "ARCHIVED"
    );
  },
});

// ----- Actions for rich task data and side-effectful operations -----
// These actions call the backend and require env vars to be set on the deployment.

const getBackendBaseUrl = () => {
  const base = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!base) {
    throw new Error(
      "BACKEND_BASE_URL or NEXT_PUBLIC_APP_URL must be set for file changes/PR actions."
    );
  }
  return base.replace(/\/$/, "");
};

// Add type annotation to avoid circular type reference
export const getDetails: ReturnType<typeof action> = action({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const [task, todos, messages] = await Promise.all([
      ctx.runQuery(api.tasks.get, { taskId: args.taskId }),
      ctx.runQuery(api.todos.byTask, { taskId: args.taskId }),
      ctx.runQuery(api.messages.byTask, { taskId: args.taskId }),
    ]);

    let fileData: {
      fileChanges: unknown[];
      diffStats: { additions: number; deletions: number; totalFiles: number };
    } = {
      fileChanges: [],
      diffStats: { additions: 0, deletions: 0, totalFiles: 0 },
    };

    try {
      const baseUrl = getBackendBaseUrl();
      const authToken = process.env.CONVEX_TASK_AUTH_TOKEN;
      const res = await fetch(`${baseUrl}/api/tasks/${args.taskId}/file-changes`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (res.ok) {
        fileData = (await res.json()) as typeof fileData;
      } else {
        console.warn(`file-changes fetch failed (${res.status}): ${res.statusText}`);
      }
    } catch (err) {
      console.warn("file-changes fetch errored or config missing", err);
    }

    return {
      task,
      todos,
      messages,
      fileChanges: fileData.fileChanges ?? [],
      diffStats:
        fileData.diffStats ?? { additions: 0, deletions: 0, totalFiles: 0 },
    };
  },
});

export const createPullRequest = action({
  args: {
    taskId: v.id("tasks"),
    userId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const baseUrl = getBackendBaseUrl();
    const authToken = process.env.CONVEX_TASK_AUTH_TOKEN;
    const res = await fetch(`${baseUrl}/api/tasks/${args.taskId}/pull-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ ...(args.userId ? { userId: args.userId } : {}) }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || `Failed to create pull request (${res.status})`);
    }
    return res.json();
  },
});

export const initiate = action({
  args: {
    taskId: v.id("tasks"),
    message: v.string(),
    model: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
    if (!task) {
      throw new Error("Task not found");
    }

    const baseUrl = getBackendBaseUrl();
    const res = await fetch(`${baseUrl}/api/tasks/${args.taskId}/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: args.message,
        model: args.model,
        userId: args.userId,
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || `Task initialization failed (${res.status})`);
    }

    return res.json();
  },
});

/**
 * Update workspace status from sidecar (Convex-native mode)
 * Creates or updates the workspace status record for a task
 */
export const updateWorkspaceStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    isHealthy: v.boolean(),
    lastHeartbeat: v.number(),
    activeProcessCount: v.optional(v.number()),
    diskUsageBytes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if workspace status already exists for this task
    const existing = await ctx.db
      .query("workspaceStatus")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        isHealthy: args.isHealthy,
        lastHeartbeat: args.lastHeartbeat,
        activeProcessCount: args.activeProcessCount,
        diskUsageBytes: args.diskUsageBytes,
        updatedAt: now,
      });
      return { statusId: existing._id };
    } else {
      // Create new record
      const statusId = await ctx.db.insert("workspaceStatus", {
        taskId: args.taskId,
        isHealthy: args.isHealthy,
        lastHeartbeat: args.lastHeartbeat,
        activeProcessCount: args.activeProcessCount,
        diskUsageBytes: args.diskUsageBytes,
        createdAt: now,
        updatedAt: now,
      });
      return { statusId };
    }
  },
});

/**
 * Get workspace status for a task
 */
export const getWorkspaceStatus = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workspaceStatus")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .unique();
  },
});
