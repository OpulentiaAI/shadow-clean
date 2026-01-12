"use strict";
/**
 * Workflow Manager Configuration
 * Best Practice BP008: Use @convex-dev/workflow for durable agent execution
 * Source: https://docs.convex.dev/agents/workflows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowManager = void 0;
const workflow_1 = require("@convex-dev/workflow");
const api_1 = require("../_generated/api");
/**
 * WorkflowManager instance for durable agent execution.
 * Workflows survive server restarts and are checkpointed after each step.
 *
 * Configuration is passed via workpoolOptions for the underlying workpool.
 */
exports.workflowManager = new workflow_1.WorkflowManager(api_1.components.workflow, {
    workpoolOptions: {
        // Max concurrent workflow executions (Free: 20, Pro: 100)
        maxParallelism: parseInt(process.env.WORKFLOW_MAX_PARALLELISM || "10", 10),
    },
});
