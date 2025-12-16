/**
 * Workflow Manager Configuration
 * Best Practice BP008: Use @convex-dev/workflow for durable agent execution
 * Source: https://docs.convex.dev/agents/workflows
 */

import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "../_generated/api";

/**
 * WorkflowManager instance for durable agent execution.
 * Workflows survive server restarts and are checkpointed after each step.
 * 
 * Configuration is passed via workpoolOptions for the underlying workpool.
 */
export const workflowManager = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    // Max concurrent workflow executions (Free: 20, Pro: 100)
    maxParallelism: parseInt(process.env.WORKFLOW_MAX_PARALLELISM || "10", 10),
  },
});

// Re-export types for convenience
export type { WorkflowManager };
