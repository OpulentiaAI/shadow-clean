/**
 * Durable Agent Workflow
 * Best Practice BP008: Use @convex-dev/workflow for restart-resilient agent execution
 * Source: https://docs.convex.dev/agents/workflows
 *
 * This workflow wraps LLM execution with checkpointing - if the process crashes,
 * it resumes from the last completed step without duplicate side effects.
 */
import type { Id } from "../_generated/dataModel";
/**
 * Durable agent workflow that survives server restarts.
 * Each step is checkpointed - if the process crashes,
 * it resumes from the last completed step.
 */
export declare const durableAgentRun: any;
type StartAgentWorkflowResult = {
    workflowId: string;
    taskId: Id<"tasks">;
};
/**
 * Start the durable agent workflow
 * Called from runAgent.ts when ENABLE_WORKFLOW is true
 */
export declare const startAgentWorkflow: import("convex/server").RegisteredAction<"public", {
    llmModel?: string;
    systemPrompt?: string;
    taskId: import("convex/values").GenericId<"tasks">;
    model: string;
    prompt: string;
    apiKeys: {
        anthropic?: string;
        openai?: string;
        openrouter?: string;
    };
}, Promise<StartAgentWorkflowResult>>;
type WorkflowStatusResult = {
    workflowId: string;
    status: string;
    result?: unknown;
    error?: string;
};
/**
 * Get the status of a workflow
 */
export declare const getWorkflowStatus: import("convex/server").RegisteredQuery<"public", {
    workflowId: import("@convex-dev/workflow", { with: { "resolution-mode": "import" } }).WorkflowId;
}, Promise<WorkflowStatusResult>>;
export {};
//# sourceMappingURL=agentWorkflow.d.ts.map