import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const TaskStatus = v.union(
  v.literal("STOPPED"),
  v.literal("INITIALIZING"),
  v.literal("ARCHIVED"),
  v.literal("RUNNING"),
  v.literal("COMPLETED"),
  v.literal("FAILED"),
);

const InitStatus = v.union(
  v.literal("INACTIVE"),
  v.literal("PREPARE_WORKSPACE"),
  v.literal("CREATE_VM"),
  v.literal("WAIT_VM_READY"),
  v.literal("VERIFY_VM_WORKSPACE"),
  v.literal("START_BACKGROUND_SERVICES"),
  v.literal("INSTALL_DEPENDENCIES"),
  v.literal("COMPLETE_SHADOW_WIKI"),
  v.literal("ACTIVE"),
);

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
      githubIssueId: undefined,
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
    workspaceCleanedUp: v.optional(v.boolean()),
    hasBeenInitialized: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.taskId);
    if (!existing) {
      throw new Error("Task not found");
    }

    await ctx.db.patch(args.taskId, {
      ...(args.title ? { title: args.title } : {}),
      ...(args.status ? { status: args.status } : {}),
      ...(args.initStatus ? { initStatus: args.initStatus } : {}),
      ...(args.mainModel ? { mainModel: args.mainModel } : {}),
      ...(args.workspacePath ? { workspacePath: args.workspacePath } : {}),
      ...(args.errorMessage ? { errorMessage: args.errorMessage } : {}),
      ...(args.initializationError
        ? { initializationError: args.initializationError }
        : {}),
      ...(args.workspaceCleanedUp !== undefined
        ? { workspaceCleanedUp: args.workspaceCleanedUp }
        : {}),
      ...(args.hasBeenInitialized !== undefined
        ? { hasBeenInitialized: args.hasBeenInitialized }
        : {}),
      updatedAt: Date.now(),
    });

    return { taskId: args.taskId };
  },
});

export const get = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.taskId);
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

