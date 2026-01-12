"use strict";
/**
 * Durable Agent Workflow
 * Best Practice BP008: Use @convex-dev/workflow for restart-resilient agent execution
 * Source: https://docs.convex.dev/agents/workflows
 *
 * This workflow wraps LLM execution with checkpointing - if the process crashes,
 * it resumes from the last completed step without duplicate side effects.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkflowStatus = exports.startAgentWorkflow = exports.durableAgentRun = void 0;
const values_1 = require("convex/values");
const server_1 = require("../_generated/server");
const index_1 = require("./index");
const api_1 = require("../_generated/api");
const workflow_1 = require("@convex-dev/workflow");
/**
 * Durable agent workflow that survives server restarts.
 * Each step is checkpointed - if the process crashes,
 * it resumes from the last completed step.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.durableAgentRun = index_1.workflowManager.define({
    args: {
        taskId: values_1.v.id("tasks"),
        prompt: values_1.v.string(),
        model: values_1.v.string(),
        systemPrompt: values_1.v.optional(values_1.v.string()),
        llmModel: values_1.v.optional(values_1.v.string()),
        apiKeys: values_1.v.object({
            anthropic: values_1.v.optional(values_1.v.string()),
            openai: values_1.v.optional(values_1.v.string()),
            openrouter: values_1.v.optional(values_1.v.string()),
        }),
    },
    handler: async (step, args) => {
        const startTime = Date.now();
        // Step 1: Initialize observability trace (checkpointed)
        const traceId = await step.runMutation(api_1.internal.workflows.workflowHelpers.startWorkflowTrace, {
            taskId: args.taskId,
            workflowType: "durableAgentRun",
            model: args.model,
        });
        console.log(`[Workflow] Started trace: ${traceId}`);
        // Step 2: Save user prompt message (BP012 pattern - checkpointed)
        const promptResult = await step.runMutation(api_1.internal.workflows.workflowHelpers.saveUserMessage, {
            taskId: args.taskId,
            content: args.prompt,
        });
        const promptMessageId = promptResult.messageId;
        console.log(`[Workflow] Saved prompt message: ${promptMessageId}`);
        // Step 3: Create assistant message placeholder (checkpointed)
        const assistantResult = await step.runMutation(api_1.internal.workflows.workflowHelpers.createAssistantPlaceholder, {
            taskId: args.taskId,
            promptMessageId,
            llmModel: args.model,
        });
        const assistantMessageId = assistantResult.messageId;
        console.log(`[Workflow] Created assistant placeholder: ${assistantMessageId}`);
        // Step 4: Execute LLM streaming (the main work - checkpointed)
        let llmResult;
        try {
            llmResult = await step.runAction(api_1.internal.workflows.workflowHelpers.executeStreaming, {
                taskId: args.taskId,
                prompt: args.prompt,
                model: args.model,
                systemPrompt: args.systemPrompt,
                llmModel: args.llmModel,
                apiKeys: args.apiKeys,
                assistantMessageId,
            });
            console.log(`[Workflow] LLM execution completed: ${llmResult.text.length} chars`);
        }
        catch (error) {
            // Step 4a: Mark trace as failed (checkpointed)
            await step.runMutation(api_1.internal.workflows.workflowHelpers.failWorkflowTrace, {
                traceId,
                errorType: error instanceof Error ? error.name : "UnknownError",
                errorMessage: error instanceof Error ? error.message : String(error),
                durationMs: Date.now() - startTime,
            });
            // Step 4b: Update assistant message to failed (checkpointed)
            await step.runMutation(api_1.internal.workflows.workflowHelpers.markMessageFailed, {
                messageId: assistantMessageId,
                errorMessage: error instanceof Error ? error.message : String(error),
            });
            console.error(`[Workflow] Failed:`, error);
            throw error; // Re-throw to mark workflow as failed
        }
        // Step 5: Update trace with success metrics (checkpointed)
        await step.runMutation(api_1.internal.workflows.workflowHelpers.completeWorkflowTrace, {
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
/**
 * Start the durable agent workflow
 * Called from runAgent.ts when ENABLE_WORKFLOW is true
 */
exports.startAgentWorkflow = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        prompt: values_1.v.string(),
        model: values_1.v.string(),
        systemPrompt: values_1.v.optional(values_1.v.string()),
        llmModel: values_1.v.optional(values_1.v.string()),
        apiKeys: values_1.v.object({
            anthropic: values_1.v.optional(values_1.v.string()),
            openai: values_1.v.optional(values_1.v.string()),
            openrouter: values_1.v.optional(values_1.v.string()),
        }),
    },
    handler: async (ctx, args) => {
        // Reference the workflow directly to avoid circular type reference
        const workflowId = await index_1.workflowManager.start(ctx, exports.durableAgentRun, {
            taskId: args.taskId,
            prompt: args.prompt,
            model: args.model,
            systemPrompt: args.systemPrompt,
            llmModel: args.llmModel,
            apiKeys: args.apiKeys,
        });
        return {
            workflowId: workflowId,
            taskId: args.taskId,
        };
    },
});
/**
 * Get the status of a workflow
 */
exports.getWorkflowStatus = (0, server_1.query)({
    args: {
        workflowId: workflow_1.vWorkflowId,
    },
    handler: async (ctx, args) => {
        const status = await index_1.workflowManager.status(ctx, args.workflowId);
        return {
            workflowId: args.workflowId,
            status: status.type,
            result: status.type === "completed" ? status.result : undefined,
            error: status.type === "failed" ? status.error : undefined,
        };
    },
});
