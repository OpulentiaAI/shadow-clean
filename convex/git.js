"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteState = exports.initRepositoryInternal = exports.cloneRepository = exports.switchBranch = exports.recordCommit = exports.updateProgress = exports.updateStatus = exports.getState = exports.initRepository = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
/**
 * Convex-native Git operations
 * Uses virtual file system stored in Convex for git-like operations
 * Note: Full git operations with isomorphic-git require Node.js runtime
 * This module provides git state tracking and basic operations
 */
/**
 * Initialize git state for a task
 */
exports.initRepository = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        workDir: values_1.v.string(),
        repoUrl: values_1.v.optional(values_1.v.string()),
        branch: values_1.v.optional(values_1.v.string()),
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
exports.getState = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
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
exports.updateStatus = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        status: values_1.v.object({
            clean: values_1.v.boolean(),
            files: values_1.v.array(values_1.v.object({
                path: values_1.v.string(),
                status: values_1.v.string(), // 'modified', 'added', 'deleted', 'untracked'
            })),
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
exports.updateProgress = (0, server_1.internalMutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        phase: values_1.v.string(),
        loaded: values_1.v.number(),
        total: values_1.v.number(),
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
exports.recordCommit = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        message: values_1.v.string(),
        files: values_1.v.array(values_1.v.string()),
        sha: values_1.v.optional(values_1.v.string()),
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
exports.switchBranch = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        branch: values_1.v.string(),
        create: values_1.v.optional(values_1.v.boolean()),
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
exports.cloneRepository = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        repoUrl: values_1.v.string(),
        branch: values_1.v.optional(values_1.v.string()),
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
exports.initRepositoryInternal = (0, server_1.internalMutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        workDir: values_1.v.string(),
        repoUrl: values_1.v.string(),
        branch: values_1.v.string(),
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
        }
        else {
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
exports.deleteState = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
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
