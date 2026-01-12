/**
 * Workflow Manager Configuration
 * Best Practice BP008: Use @convex-dev/workflow for durable agent execution
 * Source: https://docs.convex.dev/agents/workflows
 */
import { WorkflowManager } from "@convex-dev/workflow";
/**
 * WorkflowManager instance for durable agent execution.
 * Workflows survive server restarts and are checkpointed after each step.
 *
 * Configuration is passed via workpoolOptions for the underlying workpool.
 */
export declare const workflowManager: WorkflowManager;
export type { WorkflowManager };
//# sourceMappingURL=index.d.ts.map