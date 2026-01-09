/**
 * Run Agent API
 * Provides a unified interface for agent execution with feature-flagged workflow mode.
 *
 * ENABLE_WORKFLOW=false (default): Direct streaming execution
 * ENABLE_WORKFLOW=true: Durable workflow execution (restart-resilient)
 */
import type { Id } from "../_generated/dataModel";
type RunAgentResult = {
    mode: "workflow";
    workflowId: string;
    taskId: Id<"tasks">;
} | {
    mode: "direct";
    messageId: Id<"chatMessages">;
    text: string;
    toolCallIds: string[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    } | undefined;
    taskId: Id<"tasks">;
};
/**
 * Run an agent task - either via direct streaming or durable workflow
 */
export declare const runAgent: import("convex/server").RegisteredAction<"public", {
    llmModel?: string;
    model?: string;
    systemPrompt?: string;
    taskId: import("convex/values").GenericId<"tasks">;
    prompt: string;
    apiKeys: {
        anthropic?: string;
        openai?: string;
        openrouter?: string;
    };
}, Promise<RunAgentResult>>;
type WorkflowStatusResult = {
    error: string;
} | {
    workflowId: string;
    status: string;
    taskId: Id<"tasks">;
    startedAt: number;
    completedAt?: number;
    error?: string;
} | null;
/**
 * Get workflow status - returns status of a workflow execution
 */
export declare const getWorkflowStatus: import("convex/server").RegisteredAction<"public", {
    workflowId: string;
}, Promise<WorkflowStatusResult>>;
/**
 * Check if workflow mode is enabled
 */
export declare const isWorkflowEnabled: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    enabled: boolean;
    mode: string;
}>>;
export {};
//# sourceMappingURL=runAgent.d.ts.map