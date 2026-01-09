/**
 * Test Helpers for Workflow Integration Testing
 * These functions are used for automated testing of the workflow system.
 */
import type { Id } from "../_generated/dataModel";
/**
 * Create a test user for workflow testing
 */
export declare const createTestUser: import("convex/server").RegisteredMutation<"public", {}, Promise<{
    userId: import("convex/values").GenericId<"users">;
}>>;
/**
 * Create a test task for workflow testing
 */
export declare const createTestTask: import("convex/server").RegisteredMutation<"public", {
    name?: string;
}, Promise<{
    taskId: import("convex/values").GenericId<"tasks">;
    name: string;
}>>;
/**
 * Delete a test task
 */
export declare const deleteTestTask: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    deleted: boolean;
}>>;
type TestRunAgentResult = {
    success: true;
    taskId: Id<"tasks">;
    result: unknown;
} | {
    success: false;
    taskId: Id<"tasks">;
    error: string;
};
/**
 * Test the runAgent API - creates a task, runs agent, and reports results
 */
export declare const testRunAgent: import("convex/server").RegisteredAction<"public", {
    apiKeys?: {
        anthropic?: string;
        openai?: string;
        openrouter?: string;
    };
    prompt: string;
}, Promise<TestRunAgentResult>>;
/**
 * Check if workflow mode is enabled
 */
export declare const checkWorkflowMode: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    ENABLE_WORKFLOW: boolean;
    mode: string;
}>>;
type TestPromptMessageIdResult = {
    success: boolean;
    flagEnabled: boolean;
    taskId: Id<"tasks">;
    message?: string;
    error?: string;
    promptMessageId?: Id<"chatMessages">;
    assistantMessageId?: Id<"chatMessages">;
    tests?: {
        savePromptMessage: string;
        createAssistantMessage: string;
        findAssistantForPrompt: string;
        fieldPersistence: string;
    };
};
/**
 * Test promptMessageId pattern (BP012)
 * Tests that promptMessageId is properly generated, persisted, and retrievable
 */
export declare const testPromptMessageId: import("convex/server").RegisteredAction<"public", {
    taskId?: import("convex/values").GenericId<"tasks">;
}, Promise<TestPromptMessageIdResult>>;
export {};
//# sourceMappingURL=testHelpers.d.ts.map