"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkCreate = exports.reorder = exports.byTaskAndStatus = exports.byTask = exports.get = exports.removeAllByTask = exports.remove = exports.updateStatus = exports.update = exports.create = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const schema_1 = require("./schema");
exports.create = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        content: values_1.v.string(),
        status: values_1.v.optional(schema_1.TodoStatus),
        sequence: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        let sequence = args.sequence;
        if (sequence === undefined) {
            const latest = await ctx.db
                .query("todos")
                .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
                .order("desc")
                .first();
            sequence = latest ? latest.sequence + 1 : 0;
        }
        const todoId = await ctx.db.insert("todos", {
            taskId: args.taskId,
            content: args.content,
            status: args.status ?? "PENDING",
            sequence,
            createdAt: now,
            updatedAt: now,
        });
        return { todoId, sequence };
    },
});
exports.update = (0, server_1.mutation)({
    args: {
        todoId: values_1.v.id("todos"),
        content: values_1.v.optional(values_1.v.string()),
        status: values_1.v.optional(schema_1.TodoStatus),
        sequence: values_1.v.optional(values_1.v.number()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.todoId);
        if (!existing) {
            throw new Error("Todo not found");
        }
        const patchData = { updatedAt: Date.now() };
        if (args.content !== undefined)
            patchData.content = args.content;
        if (args.status !== undefined)
            patchData.status = args.status;
        if (args.sequence !== undefined)
            patchData.sequence = args.sequence;
        await ctx.db.patch(args.todoId, patchData);
        return { success: true, todoId: args.todoId };
    },
});
exports.updateStatus = (0, server_1.mutation)({
    args: {
        todoId: values_1.v.id("todos"),
        status: schema_1.TodoStatus,
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.todoId);
        if (!existing) {
            throw new Error("Todo not found");
        }
        await ctx.db.patch(args.todoId, {
            status: args.status,
            updatedAt: Date.now(),
        });
        return { success: true };
    },
});
exports.remove = (0, server_1.mutation)({
    args: { todoId: values_1.v.id("todos") },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.todoId);
        if (!existing) {
            throw new Error("Todo not found");
        }
        await ctx.db.delete(args.todoId);
        return { success: true };
    },
});
exports.removeAllByTask = (0, server_1.mutation)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        const todos = await ctx.db
            .query("todos")
            .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
            .collect();
        for (const todo of todos) {
            await ctx.db.delete(todo._id);
        }
        return { deleted: todos.length };
    },
});
exports.get = (0, server_1.query)({
    args: { todoId: values_1.v.id("todos") },
    handler: async (ctx, args) => {
        return ctx.db.get(args.todoId);
    },
});
exports.byTask = (0, server_1.query)({
    args: { taskId: values_1.v.id("tasks") },
    handler: async (ctx, args) => {
        return ctx.db
            .query("todos")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("asc")
            .collect();
    },
});
exports.byTaskAndStatus = (0, server_1.query)({
    args: {
        taskId: values_1.v.id("tasks"),
        status: schema_1.TodoStatus,
    },
    handler: async (ctx, args) => {
        return ctx.db
            .query("todos")
            .withIndex("by_task_status", (q) => q.eq("taskId", args.taskId).eq("status", args.status))
            .collect();
    },
});
exports.reorder = (0, server_1.mutation)({
    args: {
        todoId: values_1.v.id("todos"),
        newSequence: values_1.v.number(),
    },
    handler: async (ctx, args) => {
        const todo = await ctx.db.get(args.todoId);
        if (!todo) {
            throw new Error("Todo not found");
        }
        const oldSequence = todo.sequence;
        const taskId = todo.taskId;
        const allTodos = await ctx.db
            .query("todos")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", taskId))
            .order("asc")
            .collect();
        const now = Date.now();
        for (const t of allTodos) {
            if (t._id === args.todoId) {
                await ctx.db.patch(t._id, { sequence: args.newSequence, updatedAt: now });
            }
            else if (oldSequence < args.newSequence) {
                if (t.sequence > oldSequence && t.sequence <= args.newSequence) {
                    await ctx.db.patch(t._id, { sequence: t.sequence - 1, updatedAt: now });
                }
            }
            else if (oldSequence > args.newSequence) {
                if (t.sequence >= args.newSequence && t.sequence < oldSequence) {
                    await ctx.db.patch(t._id, { sequence: t.sequence + 1, updatedAt: now });
                }
            }
        }
        return { success: true };
    },
});
exports.bulkCreate = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
        todos: values_1.v.array(values_1.v.object({
            content: values_1.v.string(),
            status: values_1.v.optional(schema_1.TodoStatus),
        })),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        const latest = await ctx.db
            .query("todos")
            .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
            .order("desc")
            .first();
        let sequence = latest ? latest.sequence + 1 : 0;
        const ids = [];
        for (const todo of args.todos) {
            const todoId = await ctx.db.insert("todos", {
                taskId: args.taskId,
                content: todo.content,
                status: todo.status ?? "PENDING",
                sequence,
                createdAt: now,
                updatedAt: now,
            });
            ids.push(todoId);
            sequence++;
        }
        return { todoIds: ids };
    },
});
