"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkspaceStatus = exports.updateWorkspaceStatus = exports.initiate = exports.createPullRequest = exports.getDetails = exports.listByPrNumberAndRepo = exports.countActiveByUser = exports.listByUserExcludeArchived = exports.listScheduledForCleanup = exports.listByUser = exports.getStackedPRInfo = exports.getStatus = exports.getTitle = exports.getWithDetails = exports.get = exports.remove = exports.archive = exports.updateTitle = exports.update = exports.create = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const schema_1 = require("./schema");
const api_1 = require("./_generated/api");
exports.create = (0, server_1.mutation)({
    args: {
        title: values_1.v.string(),
        repoFullName: values_1.v.string(),
        repoUrl: values_1.v.string(),
        userId: values_1.v.id("users"),
        isScratchpad: values_1.v.optional(values_1.v.boolean()),
        baseBranch: values_1.v.optional(values_1.v.string()),
        baseCommitSha: values_1.v.optional(values_1.v.string()),
        shadowBranch: values_1.v.optional(values_1.v.string()),
        mainModel: values_1.v.optional(values_1.v.string()),
        githubIssueId: values_1.v.optional(values_1.v.string()),
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
exports.update = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        title: values_1.v.optional(values_1.v.string()),
        status: values_1.v.optional(schema_1.TaskStatus),
        initStatus: values_1.v.optional(schema_1.InitStatus),
        mainModel: values_1.v.optional(values_1.v.string()),
        workspacePath: values_1.v.optional(values_1.v.string()),
        errorMessage: values_1.v.optional(values_1.v.string()),
        initializationError: values_1.v.optional(values_1.v.string()),
        workspaceCleanedUp: values_1.v.optional(values_1.v.boolean()),
        hasBeenInitialized: values_1.v.optional(values_1.v.boolean()),
        pullRequestNumber: values_1.v.optional(values_1.v.number()),
        scheduledCleanupAt: values_1.v.optional(values_1.v.number()),
        shadowBranch: values_1.v.optional(values_1.v.string()),
        baseCommitSha: values_1.v.optional(values_1.v.string()),
        codebaseUnderstandingId: values_1.v.optional(values_1.v.id("codebaseUnderstanding")),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.taskId);
        if (!existing) {
            throw new Error("Task not found");
        }
        const { taskId, ...updates } = args;
        const patchData = { updatedAt: Date.now() };
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                patchData[key] = value;
            }
        }
        await ctx.db.patch(taskId, patchData);
        return { taskId };
    },
});
exports.updateTitle = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        title: values_1.v.string(),
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
exports.archive = (0, server_1.mutation)({
    args: { taskId: values_1.v.id("tasks") },
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
exports.remove = (0, server_1.mutation)({
    args: { taskId: values_1.v.id("tasks") },
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
exports.get = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        return ctx.db.get(args.taskId);
    },
});
exports.getWithDetails = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
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
exports.getTitle = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        return task?.title ?? "";
    },
});
exports.getStatus = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
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
exports.getStackedPRInfo = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
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
exports.listByUser = (0, server_1.query)({
    args: { userId: values_1.v.id("users") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("tasks")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
    },
});
exports.listScheduledForCleanup = (0, server_1.query)({
    args: { now: values_1.v.number() },
    handler: async (ctx, args) => {
        return ctx.db
            .query("tasks")
            .withIndex("by_scheduled_cleanup", (q) => q.lte("scheduledCleanupAt", args.now))
            .filter((q) => q.gt(q.field("scheduledCleanupAt"), 0))
            .collect();
    },
});
exports.listByUserExcludeArchived = (0, server_1.query)({
    args: { userId: values_1.v.id("users") },
    handler: async (ctx, args) => {
        const all = await ctx.db
            .query("tasks")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
        return all.filter((t) => t.status !== "ARCHIVED");
    },
});
exports.countActiveByUser = (0, server_1.query)({
    args: { userId: values_1.v.id("users") },
    handler: async (ctx, args) => {
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        return tasks.filter((t) => t.status !== "ARCHIVED" &&
            t.status !== "COMPLETED" &&
            t.status !== "FAILED").length;
    },
});
exports.listByPrNumberAndRepo = (0, server_1.query)({
    args: {
        pullRequestNumber: values_1.v.number(),
        repoFullName: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        // Get all tasks for this repo, then filter by PR number and non-archived status
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_repo", (q) => q.eq("repoFullName", args.repoFullName))
            .collect();
        return tasks.filter((t) => t.pullRequestNumber === args.pullRequestNumber &&
            t.status !== "ARCHIVED");
    },
});
// ----- Actions for rich task data and side-effectful operations -----
// These actions call the backend and require env vars to be set on the deployment.
const getBackendBaseUrl = () => {
    const base = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!base) {
        throw new Error("BACKEND_BASE_URL or NEXT_PUBLIC_APP_URL must be set for file changes/PR actions.");
    }
    return base.replace(/\/$/, "");
};
// Add type annotation to avoid circular type reference
exports.getDetails = (0, server_1.action)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        const [task, todos, messages] = await Promise.all([
            ctx.runQuery(api_1.api.tasks.get, { taskId: args.taskId }),
            ctx.runQuery(api_1.api.todos.byTask, { taskId: args.taskId }),
            ctx.runQuery(api_1.api.messages.byTask, { taskId: args.taskId }),
        ]);
        let fileData = {
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
                fileData = (await res.json());
            }
            else {
                console.warn(`file-changes fetch failed (${res.status}): ${res.statusText}`);
            }
        }
        catch (err) {
            console.warn("file-changes fetch errored or config missing", err);
        }
        return {
            task,
            todos,
            messages,
            fileChanges: fileData.fileChanges ?? [],
            diffStats: fileData.diffStats ?? { additions: 0, deletions: 0, totalFiles: 0 },
        };
    },
});
exports.createPullRequest = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        userId: values_1.v.optional(values_1.v.string()),
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
            const err = (await res.json().catch(() => ({})));
            throw new Error(err.error || `Failed to create pull request (${res.status})`);
        }
        return res.json();
    },
});
exports.initiate = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        message: values_1.v.string(),
        model: values_1.v.string(),
        userId: values_1.v.id("users"),
    },
    handler: async (ctx, args) => {
        const task = await ctx.runQuery(api_1.api.tasks.get, { taskId: args.taskId });
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
            const err = (await res.json().catch(() => ({})));
            throw new Error(err.error || `Task initialization failed (${res.status})`);
        }
        return res.json();
    },
});
/**
 * Update workspace status from sidecar (Convex-native mode)
 * Creates or updates the workspace status record for a task
 */
exports.updateWorkspaceStatus = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        isHealthy: values_1.v.boolean(),
        lastHeartbeat: values_1.v.number(),
        activeProcessCount: values_1.v.optional(values_1.v.number()),
        diskUsageBytes: values_1.v.optional(values_1.v.number()),
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
        }
        else {
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
exports.getWorkspaceStatus = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("workspaceStatus")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .unique();
    },
});
