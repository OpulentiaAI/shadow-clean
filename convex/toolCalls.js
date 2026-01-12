"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listByMessage = exports.listByTask = exports.logResult = exports.markRunning = exports.logRequest = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
exports.logRequest = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        messageId: values_1.v.optional(values_1.v.id("chatMessages")), // optional - may not have message context
        toolCallId: values_1.v.string(),
        toolName: values_1.v.string(),
        argsJson: values_1.v.string(),
        threadId: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const toolCallId = await ctx.db.insert("toolCalls", {
            taskId: args.taskId,
            messageId: args.messageId, // will be undefined if not provided
            toolCallId: args.toolCallId,
            toolName: args.toolName,
            argsJson: args.argsJson,
            status: "REQUESTED",
            resultJson: undefined,
            error: undefined,
            startedAt: now,
            completedAt: undefined,
            threadId: args.threadId,
            createdAt: now,
            updatedAt: now,
        });
        return { toolCallId };
    },
});
exports.markRunning = (0, server_1.mutation)({
    args: {
        toolCallId: values_1.v.id("toolCalls"),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.toolCallId);
        if (!existing)
            throw new Error("Tool call not found");
        await ctx.db.patch(args.toolCallId, {
            status: "RUNNING",
            updatedAt: Date.now(),
        });
        return { success: true };
    },
});
exports.logResult = (0, server_1.mutation)({
    args: {
        toolCallId: values_1.v.id("toolCalls"),
        status: values_1.v.union(values_1.v.literal("SUCCEEDED"), values_1.v.literal("FAILED")),
        resultJson: values_1.v.optional(values_1.v.string()),
        error: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.toolCallId);
        if (!existing)
            throw new Error("Tool call not found");
        await ctx.db.patch(args.toolCallId, {
            status: args.status,
            resultJson: args.resultJson,
            error: args.error,
            completedAt: Date.now(),
            updatedAt: Date.now(),
        });
        return { success: true };
    },
});
exports.listByTask = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("toolCalls")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .collect();
    },
});
exports.listByMessage = (0, server_1.query)({
    args: { messageId: values_1.v.id("chatMessages") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("toolCalls")
            .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
            .order("asc")
            .collect();
    },
});
