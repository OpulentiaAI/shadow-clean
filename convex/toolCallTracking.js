"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteByTask = exports.failStaleRunning = exports.byToolCallId = exports.byTask = exports.byMessage = exports.updateResult = exports.create = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
/**
 * Tool call tracking for streaming chat
 * Tracks tool calls made during AI streaming sessions
 */
/**
 * Create a new tool call record (when LLM requests tool execution)
 */
exports.create = (0, server_1.mutation)({
    args: {
        messageId: values_1.v.id("chatMessages"),
        taskId: values_1.v.id("tasks"),
        toolName: values_1.v.string(),
        args: values_1.v.any(),
        toolCallId: values_1.v.string(),
        status: values_1.v.union(values_1.v.literal("PENDING"), values_1.v.literal("RUNNING"), values_1.v.literal("COMPLETED"), values_1.v.literal("FAILED")),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const toolId = await ctx.db.insert("agentTools", {
            messageId: args.messageId,
            taskId: args.taskId,
            toolName: args.toolName,
            args: args.args,
            toolCallId: args.toolCallId,
            status: args.status,
            createdAt: now,
        });
        return { toolId };
    },
});
/**
 * Update tool call result (when tool execution completes)
 */
exports.updateResult = (0, server_1.mutation)({
    args: {
        toolCallId: values_1.v.string(),
        result: values_1.v.optional(values_1.v.any()),
        status: values_1.v.union(values_1.v.literal("COMPLETED"), values_1.v.literal("FAILED")),
        error: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const tool = await ctx.db
            .query("agentTools")
            .withIndex("by_tool_call_id", (q) => q.eq("toolCallId", args.toolCallId))
            .unique();
        if (!tool) {
            throw new Error(`Tool call not found: ${args.toolCallId}`);
        }
        await ctx.db.patch(tool._id, {
            result: args.result,
            status: args.status,
            error: args.error,
            completedAt: Date.now(),
        });
        return { success: true };
    },
});
/**
 * Get all tool calls for a message
 */
exports.byMessage = (0, server_1.query)({
    args: {
        messageId: values_1.v.id("chatMessages"),
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query("agentTools")
            .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
            .collect();
    },
});
/**
 * Get all tool calls for a task
 */
exports.byTask = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query("agentTools")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .collect();
    },
});
/**
 * Get tool call by ID
 */
exports.byToolCallId = (0, server_1.query)({
    args: {
        toolCallId: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query("agentTools")
            .withIndex("by_tool_call_id", (q) => q.eq("toolCallId", args.toolCallId))
            .unique();
    },
});
/**
 * Mark all RUNNING tool calls for a message as FAILED (cleanup after streaming completes)
 */
exports.failStaleRunning = (0, server_1.mutation)({
    args: {
        messageId: values_1.v.id("chatMessages"),
    },
    handler: async (ctx, args) => {
        const tools = await ctx.db
            .query("agentTools")
            .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
            .collect();
        const stale = tools.filter((t) => t.status === "RUNNING" || t.status === "PENDING");
        for (const tool of stale) {
            await ctx.db.patch(tool._id, {
                status: "FAILED",
                error: "Tool call did not complete before streaming ended",
                completedAt: Date.now(),
            });
        }
        return { marked: stale.length };
    },
});
/**
 * Delete all tool calls for a task (cleanup)
 */
exports.deleteByTask = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        const tools = await ctx.db
            .query("agentTools")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .collect();
        for (const tool of tools) {
            await ctx.db.delete(tool._id);
        }
        return { deleted: tools.length };
    },
});
