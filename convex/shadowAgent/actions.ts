"use node";

/**
 * Shadow Agent Actions
 * 
 * This file contains all Node.js actions for the Agent.
 * CONSTRAINT: Only actions can be exported from Node runtime files.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { shadowAgent } from "./index";
import { createAgentTools, createExaWebSearchTool, WEB_SEARCH_SYSTEM_PROMPT } from "../agentTools";
import { stepCountIs } from "@convex-dev/agent";

// Maximum tool execution steps to prevent infinite loops
const MAX_AGENT_STEPS = 64;

/**
 * Create a new Agent thread for a task
 * Returns the threadId which should be stored on the task
 */
export const createThread = action({
  args: {
    taskId: v.id("tasks"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get task info for thread metadata
    const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    // Create thread using Agent primitives
    const { threadId, thread } = await shadowAgent.createThread(ctx, {
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
export const streamResponse = action({
  args: {
    taskId: v.id("tasks"),
    threadId: v.string(),
    prompt: v.string(),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    userId: v.optional(v.string()),
    apiKeys: v.optional(v.object({
      anthropic: v.optional(v.string()),
      openai: v.optional(v.string()),
      openrouter: v.optional(v.string()),
      exa: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    console.log(`[AGENT] streamResponse called for task ${args.taskId}, thread ${args.threadId}`);

    // Get task details
    const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
    if (!task) {
      throw new Error("Task not found");
    }

    // Set task to RUNNING status
    if (task.status !== "RUNNING") {
      await ctx.runMutation(api.tasks.update, {
        taskId: args.taskId,
        status: "RUNNING",
      });
    }

    // Continue the thread
    const { thread } = await shadowAgent.continueThread(ctx, {
      threadId: args.threadId,
      userId: args.userId,
    });

    // Build tools
    const availableTools = createAgentTools(
      ctx as any,
      args.taskId,
      (task as any)?.workspacePath
    );

    // Add Exa web search if available
    const exaTools = args.apiKeys?.exa ? createExaWebSearchTool(args.apiKeys.exa) : null;
    const allTools = exaTools ? { ...availableTools, ...exaTools } : availableTools;

    // Build system prompt
    const effectiveSystemPrompt = args.apiKeys?.exa
      ? `${args.systemPrompt || ""}\n\n${WEB_SEARCH_SYSTEM_PROMPT}`
      : args.systemPrompt;

    try {
      // Use Agent's streamText for automatic message persistence and context
      const result = await thread.streamText(
        { prompt: args.prompt },
        {
          system: effectiveSystemPrompt,
          tools: allTools,
          maxSteps: MAX_AGENT_STEPS,
          stopWhen: stepCountIs(MAX_AGENT_STEPS),
        }
      );

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
      await ctx.runMutation(api.tasks.update, {
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
    } catch (error) {
      console.error(`[AGENT] Error streaming:`, error);

      await ctx.runMutation(api.tasks.update, {
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
export const generateResponse = action({
  args: {
    taskId: v.id("tasks"),
    threadId: v.string(),
    prompt: v.string(),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
    if (!task) {
      throw new Error("Task not found");
    }

    // Continue the thread
    const { thread } = await shadowAgent.continueThread(ctx, {
      threadId: args.threadId,
      userId: args.userId,
    });

    // Build tools
    const availableTools = createAgentTools(
      ctx as any,
      args.taskId,
      (task as any)?.workspacePath
    );

    // Use Agent's generateText
    const result = await thread.generateText(
      { prompt: args.prompt },
      {
        system: args.systemPrompt,
        tools: availableTools,
        maxSteps: MAX_AGENT_STEPS,
      }
    );

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
export const stopTask = action({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    console.log(`[AGENT] Stopping task ${args.taskId}`);

    await ctx.runMutation(api.tasks.update, {
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
export const listMessages = action({
  args: {
    threadId: v.string(),
    paginationOpts: v.optional(v.object({
      cursor: v.optional(v.string()),
      numItems: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    // Import and use the listMessages function from Agent
    const { listMessages: agentListMessages } = await import("@convex-dev/agent");
    
    const paginationOpts = {
      cursor: args.paginationOpts?.cursor ?? null,
      numItems: args.paginationOpts?.numItems ?? 50,
    };

    const result = await agentListMessages(ctx, shadowAgent.component, {
      threadId: args.threadId,
      paginationOpts,
    });

    return result;
  },
});
