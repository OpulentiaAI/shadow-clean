/**
 * Durable Agent Workflow
 * Best Practice BP008: Use @convex-dev/workflow for restart-resilient agent execution
 * Source: https://docs.convex.dev/agents/workflows
 * 
 * This workflow wraps LLM execution with checkpointing - if the process crashes,
 * it resumes from the last completed step without duplicate side effects.
 */

import { v } from "convex/values";
import { workflowManager } from "./index";
import { internal } from "../_generated/api";

/**
 * Durable agent workflow that survives server restarts.
 * Each step is checkpointed - if the process crashes,
 * it resumes from the last completed step.
 */
export const durableAgentRun = workflowManager.define({
  args: {
    taskId: v.id("tasks"),
    prompt: v.string(),
    model: v.string(),
    systemPrompt: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    apiKeys: v.object({
      anthropic: v.optional(v.string()),
      openai: v.optional(v.string()),
      openrouter: v.optional(v.string()),
    }),
  },
  handler: async (step, args) => {
    const startTime = Date.now();

    // Step 1: Initialize observability trace (checkpointed)
    const traceId = await step.runMutation(internal.workflows.workflowHelpers.startWorkflowTrace, {
      taskId: args.taskId,
      workflowType: "durableAgentRun",
      model: args.model,
    });

    console.log(`[Workflow] Started trace: ${traceId}`);

    // Step 2: Save user prompt message (BP012 pattern - checkpointed)
    const promptResult = await step.runMutation(internal.workflows.workflowHelpers.saveUserMessage, {
      taskId: args.taskId,
      content: args.prompt,
    });
    const promptMessageId = promptResult.messageId;

    console.log(`[Workflow] Saved prompt message: ${promptMessageId}`);

    // Step 3: Create assistant message placeholder (checkpointed)
    const assistantResult = await step.runMutation(internal.workflows.workflowHelpers.createAssistantPlaceholder, {
      taskId: args.taskId,
      promptMessageId,
      llmModel: args.model,
    });
    const assistantMessageId = assistantResult.messageId;

    console.log(`[Workflow] Created assistant placeholder: ${assistantMessageId}`);

    // Step 4: Execute LLM streaming (the main work - checkpointed)
    let llmResult: {
      success: boolean;
      messageId: string;
      text: string;
      toolCallIds: string[];
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
    };

    try {
      llmResult = await step.runAction(internal.workflows.workflowHelpers.executeStreaming, {
        taskId: args.taskId,
        prompt: args.prompt,
        model: args.model,
        systemPrompt: args.systemPrompt,
        llmModel: args.llmModel,
        apiKeys: args.apiKeys,
        assistantMessageId,
      });

      console.log(`[Workflow] LLM execution completed: ${llmResult.text.length} chars`);
    } catch (error) {
      // Step 4a: Mark trace as failed (checkpointed)
      await step.runMutation(internal.workflows.workflowHelpers.failWorkflowTrace, {
        traceId,
        errorType: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      });

      // Step 4b: Update assistant message to failed (checkpointed)
      await step.runMutation(internal.workflows.workflowHelpers.markMessageFailed, {
        messageId: assistantMessageId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      console.error(`[Workflow] Failed:`, error);
      throw error; // Re-throw to mark workflow as failed
    }

    // Step 5: Update trace with success metrics (checkpointed)
    await step.runMutation(internal.workflows.workflowHelpers.completeWorkflowTrace, {
      traceId,
      totalTokens: llmResult.usage?.totalTokens || 0,
      promptTokens: llmResult.usage?.promptTokens || 0,
      completionTokens: llmResult.usage?.completionTokens || 0,
      durationMs: Date.now() - startTime,
      toolCallCount: llmResult.toolCallIds?.length || 0,
    });

    console.log(`[Workflow] Completed successfully in ${Date.now() - startTime}ms`);

    return {
      traceId,
      promptMessageId,
      assistantMessageId,
      text: llmResult.text,
      toolCallIds: llmResult.toolCallIds || [],
      usage: llmResult.usage,
      durationMs: Date.now() - startTime,
    };
  },
});

// Export the start action for triggering workflows
export const startAgentWorkflow = workflowManager.start(durableAgentRun);

// Export status query for checking workflow progress
export const getWorkflowStatus = workflowManager.status(durableAgentRun);
