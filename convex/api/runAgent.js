"use strict";
/**
 * Run Agent API
 * Provides a unified interface for agent execution with feature-flagged workflow mode.
 *
 * ENABLE_WORKFLOW=false (default): Direct streaming execution
 * ENABLE_WORKFLOW=true: Durable workflow execution (restart-resilient)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWorkflowEnabled = exports.getWorkflowStatus = exports.runAgent = void 0;
const server_1 = require("../_generated/server");
const values_1 = require("convex/values");
const api_1 = require("../_generated/api");
// Feature flag for workflow mode - disabled until agentWorkflow is fully wired
const ENABLE_WORKFLOW = false; // process.env.ENABLE_WORKFLOW === "true";
/**
 * Run an agent task - either via direct streaming or durable workflow
 */
exports.runAgent = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        prompt: values_1.v.string(),
        model: values_1.v.optional(values_1.v.string()),
        systemPrompt: values_1.v.optional(values_1.v.string()),
        llmModel: values_1.v.optional(values_1.v.string()),
        apiKeys: values_1.v.object({
            anthropic: values_1.v.optional(values_1.v.string()),
            openai: values_1.v.optional(values_1.v.string()),
            openrouter: values_1.v.optional(values_1.v.string()),
        }),
    },
    handler: async (ctx, args) => {
        const model = args.model || "anthropic/claude-sonnet-4-20250514";
        if (ENABLE_WORKFLOW) {
            // Use durable workflow for restart resilience
            // NOTE: Workflow mode is disabled until agentWorkflow is properly wired into Convex api types
            console.log(`[RunAgent] Starting durable workflow for task ${args.taskId}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const workflowResult = await ctx.runAction(api_1.api.workflows.agentWorkflow.startAgentWorkflow, {
                taskId: args.taskId,
                prompt: args.prompt,
                model,
                systemPrompt: args.systemPrompt,
                llmModel: args.llmModel,
                apiKeys: args.apiKeys,
            });
            return {
                mode: "workflow",
                workflowId: workflowResult.workflowId,
                taskId: args.taskId,
            };
        }
        else {
            // Use direct streaming (existing behavior)
            console.log(`[RunAgent] Starting direct streaming for task ${args.taskId}`);
            const result = await ctx.runAction(api_1.api.streaming.streamChatWithTools, {
                taskId: args.taskId,
                prompt: args.prompt,
                model,
                systemPrompt: args.systemPrompt,
                llmModel: args.llmModel,
                apiKeys: args.apiKeys,
            });
            return {
                mode: "direct",
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
exports.getWorkflowStatus = (0, server_1.action)({
    args: {
        workflowId: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        if (!ENABLE_WORKFLOW) {
            return {
                error: "Workflow mode is not enabled. Set ENABLE_WORKFLOW=true to use workflows.",
            };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const status = await ctx.runQuery(api_1.api.workflows.agentWorkflow.getWorkflowStatus, { workflowId: args.workflowId });
        return status;
    },
});
/**
 * Check if workflow mode is enabled
 */
exports.isWorkflowEnabled = (0, server_1.query)({
    args: {},
    handler: async () => {
        return {
            enabled: ENABLE_WORKFLOW,
            mode: ENABLE_WORKFLOW ? "workflow" : "direct",
        };
    },
});
