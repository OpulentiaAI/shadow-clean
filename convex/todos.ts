import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { TodoStatus } from "./schema";

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
    status: v.optional(TodoStatus),
    sequence: v.optional(v.number()),
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

export const update = mutation({
  args: {
    todoId: v.id("todos"),
    content: v.optional(v.string()),
    status: v.optional(TodoStatus),
    sequence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.todoId);
    if (!existing) {
      throw new Error("Todo not found");
    }
    const patchData: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.content !== undefined) patchData.content = args.content;
    if (args.status !== undefined) patchData.status = args.status;
    if (args.sequence !== undefined) patchData.sequence = args.sequence;
    await ctx.db.patch(args.todoId, patchData);
    return { success: true, todoId: args.todoId };
  },
});

export const updateStatus = mutation({
  args: {
    todoId: v.id("todos"),
    status: TodoStatus,
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

export const remove = mutation({
  args: { todoId: v.id("todos") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.todoId);
    if (!existing) {
      throw new Error("Todo not found");
    }
    await ctx.db.delete(args.todoId);
    return { success: true };
  },
});

export const removeAllByTask = mutation({
  args: { taskId: v.id("tasks") },
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

export const get = query({
  args: { todoId: v.id("todos") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.todoId);
  },
});

export const byTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("todos")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
  },
});

export const byTaskAndStatus = query({
  args: {
    taskId: v.id("tasks"),
    status: TodoStatus,
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("todos")
      .withIndex("by_task_status", (q) =>
        q.eq("taskId", args.taskId).eq("status", args.status)
      )
      .collect();
  },
});

export const reorder = mutation({
  args: {
    todoId: v.id("todos"),
    newSequence: v.number(),
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
      } else if (oldSequence < args.newSequence) {
        if (t.sequence > oldSequence && t.sequence <= args.newSequence) {
          await ctx.db.patch(t._id, { sequence: t.sequence - 1, updatedAt: now });
        }
      } else if (oldSequence > args.newSequence) {
        if (t.sequence >= args.newSequence && t.sequence < oldSequence) {
          await ctx.db.patch(t._id, { sequence: t.sequence + 1, updatedAt: now });
        }
      }
    }
    return { success: true };
  },
});

export const bulkCreate = mutation({
  args: {
    taskId: v.id("tasks"),
    todos: v.array(
      v.object({
        content: v.string(),
        status: v.optional(TodoStatus),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const latest = await ctx.db
      .query("todos")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();
    let sequence = latest ? latest.sequence + 1 : 0;
    const ids: string[] = [];
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
