/**
 * Run Agent API
 * Provides a unified interface for agent execution with feature-flagged workflow mode.
 * 
 * ENABLE_WORKFLOW=false (default): Direct streaming execution
 * ENABLE_WORKFLOW=true: Durable workflow execution (restart-resilient)
 */

import { action, query } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// Feature flag for workflow mode
const ENABLE_WORKFLOW = process.env.ENABLE_WORKFLOW === "true";

/**
 * Run an agent task - either via direct streaming or durable workflow
 */
export const runAgent = action({
  args: {
    taskId: v.id("tasks"),
    prompt: v.string(),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    apiKeys: v.object({
      anthropic: v.optional(v.string()),
      openai: v.optional(v.string()),
      openrouter: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const model = args.model || "anthropic/claude-sonnet-4-20250514";

    if (ENABLE_WORKFLOW) {
      // Use durable workflow for restart resilience
      console.log(`[RunAgent] Starting durable workflow for task ${args.taskId}`);

      const workflowResult = await ctx.runAction(
        api.workflows.agentWorkflow.startAgentWorkflow,
        {
          taskId: args.taskId,
          prompt: args.prompt,
          model,
          systemPrompt: args.systemPrompt,
          llmModel: args.llmModel,
          apiKeys: args.apiKeys,
        }
      );

      return {
        mode: "workflow" as const,
        workflowId: workflowResult.workflowId,
        taskId: args.taskId,
      };
    } else {
      // Use direct streaming (existing behavior)
      console.log(`[RunAgent] Starting direct streaming for task ${args.taskId}`);

      const result = await ctx.runAction(api.streaming.streamChatWithTools, {
        taskId: args.taskId,
        prompt: args.prompt,
        model,
        systemPrompt: args.systemPrompt,
        llmModel: args.llmModel,
        apiKeys: args.apiKeys,
      });

      return {
        mode: "direct" as const,
        messageId: result.messageId,
        text: result.text,
        toolCallIds: result.toolCallIds,
        usage: result.usage,
        taskId: args.taskId,
      };
    }
  },
});

/**
 * Get workflow status - returns status of a workflow execution
 */
export const getWorkflowStatus = action({
  args: {
    workflowId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!ENABLE_WORKFLOW) {
      return {
        error: "Workflow mode is not enabled. Set ENABLE_WORKFLOW=true to use workflows.",
      };
    }

    const status = await ctx.runQuery(
      api.workflows.agentWorkflow.getWorkflowStatus,
      { workflowId: args.workflowId }
    );

    return status;
  },
});

/**
 * Check if workflow mode is enabled
 */
export const isWorkflowEnabled = query({
  args: {},
  handler: async () => {
    return {
      enabled: ENABLE_WORKFLOW,
      mode: ENABLE_WORKFLOW ? "workflow" : "direct",
    };
  },
});
