// @ts-nocheck
"use node";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMessages = exports.stopTask = exports.generateResponse = exports.streamResponse = exports.createThread = void 0;
/**
 * Shadow Agent Actions
 *
 * This file contains all Node.js actions for the Agent.
 * CONSTRAINT: Only actions can be exported from Node runtime files.
 */
const server_1 = require("../_generated/server");
const values_1 = require("convex/values");
const api_1 = require("../_generated/api");
const index_1 = require("./index");
const agentTools_1 = require("../agentTools");
const agent_1 = require("@convex-dev/agent");
// Maximum tool execution steps to prevent infinite loops
const MAX_AGENT_STEPS = 64;
/**
 * Create a new Agent thread for a task
 * Returns the threadId which should be stored on the task
 */
exports.createThread = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        userId: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        // Get task info for thread metadata
        const task = await ctx.runQuery(api_1.api.tasks.get, { taskId: args.taskId });
        if (!task) {
            throw new Error(`Task not found: ${args.taskId}`);
        }
        // Create thread using Agent primitives
        const { threadId, thread } = await index_1.shadowAgent.createThread(ctx, {
            userId: args.userId,
            title: task.title || `Task ${args.taskId}`,
            summary: task.repoFullName ? `Repository: ${task.repoFullName}` : undefined,
        });
        console.log(`[AGENT] Created thread ${threadId} for task ${args.taskId}`);
        return { threadId };
    },
});
/**
 * Stream a response using Agent primitives
 * This is the main entry point for chat streaming
 */
exports.streamResponse = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        threadId: values_1.v.string(),
        prompt: values_1.v.string(),
        model: values_1.v.optional(values_1.v.string()),
        systemPrompt: values_1.v.optional(values_1.v.string()),
        userId: values_1.v.optional(values_1.v.string()),
        apiKeys: values_1.v.optional(values_1.v.object({
            anthropic: values_1.v.optional(values_1.v.string()),
            openai: values_1.v.optional(values_1.v.string()),
            openrouter: values_1.v.optional(values_1.v.string()),
            exa: values_1.v.optional(values_1.v.string()),
        })),
    },
    handler: async (ctx, args) => {
        console.log(`[AGENT] streamResponse called for task ${args.taskId}, thread ${args.threadId}`);
        // Get task details
        const task = await ctx.runQuery(api_1.api.tasks.get, { taskId: args.taskId });
        if (!task) {
            throw new Error("Task not found");
        }
        // Set task to RUNNING status
        if (task.status !== "RUNNING") {
            await ctx.runMutation(api_1.api.tasks.update, {
                taskId: args.taskId,
                status: "RUNNING",
            });
        }
        // Continue the thread
        const { thread } = await index_1.shadowAgent.continueThread(ctx, {
            threadId: args.threadId,
            userId: args.userId,
        });
        // Build tools
        const availableTools = (0, agentTools_1.createAgentTools)(ctx, args.taskId, task?.workspacePath);
        // Add Exa web search if available
        const exaTools = args.apiKeys?.exa ? (0, agentTools_1.createExaWebSearchTool)(args.apiKeys.exa) : null;
        const allTools = exaTools ? { ...availableTools, ...exaTools } : availableTools;
        // Build system prompt
        const effectiveSystemPrompt = args.apiKeys?.exa
            ? `${args.systemPrompt || ""}\n\n${agentTools_1.WEB_SEARCH_SYSTEM_PROMPT}`
            : args.systemPrompt;
        try {
            // Use Agent's streamText for automatic message persistence and context
            const result = await thread.streamText({ prompt: args.prompt }, {
                system: effectiveSystemPrompt,
                tools: allTools,
                maxSteps: MAX_AGENT_STEPS,
                stopWhen: (0, agent_1.stepCountIs)(MAX_AGENT_STEPS),
            });
            // Collect the streamed text
            let fullText = "";
            for await (const delta of result.textStream) {
                fullText += delta;
            }
            // Get final stats
            const usage = await result.usage;
            const finishReason = await result.finishReason;
            console.log(`[AGENT] Stream completed: ${fullText.length} chars, reason: ${finishReason}`);
            // Update task status
            await ctx.runMutation(api_1.api.tasks.update, {
                taskId: args.taskId,
                status: "STOPPED",
            });
            return {
                success: true,
                threadId: args.threadId,
                text: fullText,
                usage: usage ? {
                    promptTokens: usage.promptTokens,
                    completionTokens: usage.completionTokens,
                    totalTokens: usage.totalTokens,
                } : undefined,
                finishReason,
            };
        }
        catch (error) {
            console.error(`[AGENT] Error streaming:`, error);
            await ctx.runMutation(api_1.api.tasks.update, {
                taskId: args.taskId,
                status: "FAILED",
            });
            throw error;
        }
    },
});
/**
 * Generate text (non-streaming) using Agent primitives
 */
exports.generateResponse = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        threadId: values_1.v.string(),
        prompt: values_1.v.string(),
        model: values_1.v.optional(values_1.v.string()),
        systemPrompt: values_1.v.optional(values_1.v.string()),
        userId: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const task = await ctx.runQuery(api_1.api.tasks.get, { taskId: args.taskId });
        if (!task) {
            throw new Error("Task not found");
        }
        // Continue the thread
        const { thread } = await index_1.shadowAgent.continueThread(ctx, {
            threadId: args.threadId,
            userId: args.userId,
        });
        // Build tools
        const availableTools = (0, agentTools_1.createAgentTools)(ctx, args.taskId, task?.workspacePath);
        // Use Agent's generateText
        const result = await thread.generateText({ prompt: args.prompt }, {
            system: args.systemPrompt,
            tools: availableTools,
            maxSteps: MAX_AGENT_STEPS,
        });
        return {
            success: true,
            threadId: args.threadId,
            text: result.text,
            usage: result.usage ? {
                promptTokens: result.usage.promptTokens,
                completionTokens: result.usage.completionTokens,
                totalTokens: result.usage.totalTokens,
            } : undefined,
            finishReason: result.finishReason,
        };
    },
});
/**
 * Stop a running task
 * Marks the task as STOPPED so the next message can start fresh
 */
exports.stopTask = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        console.log(`[AGENT] Stopping task ${args.taskId}`);
        await ctx.runMutation(api_1.api.tasks.update, {
            taskId: args.taskId,
            status: "STOPPED",
        });
        return { success: true };
    },
});
/**
 * List messages from a thread
 * Uses Agent's listMessages exported function
 */
exports.listMessages = (0, server_1.action)({
    args: {
        threadId: values_1.v.string(),
        paginationOpts: values_1.v.optional(values_1.v.object({
            cursor: values_1.v.optional(values_1.v.string()),
            numItems: values_1.v.optional(values_1.v.number()),
        })),
    },
    handler: async (ctx, args) => {
        // Import and use the listMessages function from Agent
        const { listMessages: agentListMessages } = await import("@convex-dev/agent");
        const paginationOpts = {
            cursor: args.paginationOpts?.cursor ?? null,
            numItems: args.paginationOpts?.numItems ?? 50,
        };
        const result = await agentListMessages(ctx, index_1.shadowAgent.component, {
            threadId: args.threadId,
            paginationOpts,
        });
        return result;
    },
});
