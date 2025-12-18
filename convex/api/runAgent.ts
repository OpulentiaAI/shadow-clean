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
import type { Id } from "../_generated/dataModel";

// Feature flag for workflow mode - disabled until agentWorkflow is fully wired
const ENABLE_WORKFLOW = false; // process.env.ENABLE_WORKFLOW === "true";

// Explicit return type to break circular type inference
type RunAgentResult = 
  | { mode: "workflow"; workflowId: string; taskId: Id<"tasks"> }
  | { mode: "direct"; messageId: Id<"chatMessages">; text: string; toolCallIds: string[]; usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined; taskId: Id<"tasks"> };

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
  handler: async (ctx, args): Promise<RunAgentResult> => {
    const model = args.model || "anthropic/claude-sonnet-4-20250514";

    if (ENABLE_WORKFLOW) {
      // Use durable workflow for restart resilience
      // NOTE: Workflow mode is disabled until agentWorkflow is properly wired into Convex api types
      console.log(`[RunAgent] Starting durable workflow for task ${args.taskId}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workflowResult = await ctx.runAction(
        (api.workflows as any).agentWorkflow.startAgentWorkflow,
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

// Explicit return type for getWorkflowStatus
type WorkflowStatusResult = 
  | { error: string }
  | { workflowId: string; status: string; taskId: Id<"tasks">; startedAt: number; completedAt?: number; error?: string } 
  | null;

/**
 * Get workflow status - returns status of a workflow execution
 */
export const getWorkflowStatus = action({
  args: {
    workflowId: v.string(),
  },
  handler: async (ctx, args): Promise<WorkflowStatusResult> => {
    if (!ENABLE_WORKFLOW) {
      return {
        error: "Workflow mode is not enabled. Set ENABLE_WORKFLOW=true to use workflows.",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status: WorkflowStatusResult = await ctx.runQuery(
      (api.workflows as any).agentWorkflow.getWorkflowStatus,
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
