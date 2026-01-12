"use strict";
/**
 * Test Helpers for Workflow Integration Testing
 * These functions are used for automated testing of the workflow system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPromptMessageId = exports.checkWorkflowMode = exports.testRunAgent = exports.deleteTestTask = exports.createTestTask = exports.createTestUser = void 0;
const server_1 = require("../_generated/server");
const values_1 = require("convex/values");
const api_1 = require("../_generated/api");
/**
 * Create a test user for workflow testing
 */
exports.createTestUser = (0, server_1.mutation)({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const testEmail = `test-${now}@test.local`;
        // Check if test user exists
        const existing = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("email"), testEmail))
            .first();
        if (existing) {
            return { userId: existing._id };
        }
        const userId = await ctx.db.insert("users", {
            email: testEmail,
            name: "Test User",
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
        });
        return { userId };
    },
});
/**
 * Create a test task for workflow testing
 */
exports.createTestTask = (0, server_1.mutation)({
    args: {
        name: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        // First create or get a test user
        const testEmail = `workflow-test@test.local`;
        let testUser = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("email"), testEmail))
            .first();
        if (!testUser) {
            const userId = await ctx.db.insert("users", {
                email: testEmail,
                name: "Workflow Test User",
                emailVerified: true,
                createdAt: now,
                updatedAt: now,
            });
            testUser = await ctx.db.get(userId);
        }
        const taskId = await ctx.db.insert("tasks", {
            title: args.name || `Test Task ${now}`,
            status: "RUNNING",
            repoFullName: "test/test-repo",
            repoUrl: "https://github.com/test/test-repo",
            isScratchpad: true,
            mainModel: "gpt-4o",
            workspacePath: "/tmp/test",
            initStatus: "ACTIVE",
            scheduledCleanupAt: undefined,
            initializationError: undefined,
            errorMessage: undefined,
            workspaceCleanedUp: false,
            hasBeenInitialized: true,
            createdAt: now,
            updatedAt: now,
            userId: testUser._id,
            baseBranch: "main",
            baseCommitSha: "",
            shadowBranch: "",
            pullRequestNumber: undefined,
            githubIssueId: undefined,
            codebaseUnderstandingId: undefined,
        });
        return { taskId, name: args.name || `Test Task ${now}` };
    },
});
/**
 * Delete a test task
 */
exports.deleteTestTask = (0, server_1.mutation)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.taskId);
        return { deleted: true };
    },
});
/**
 * Test the runAgent API - creates a task, runs agent, and reports results
 */
exports.testRunAgent = (0, server_1.action)({
    args: {
        prompt: values_1.v.string(),
        apiKeys: values_1.v.optional(values_1.v.object({
            anthropic: values_1.v.optional(values_1.v.string()),
            openai: values_1.v.optional(values_1.v.string()),
            openrouter: values_1.v.optional(values_1.v.string()),
        })),
    },
    handler: async (ctx, args) => {
        // Create test task - use type assertion to break circular reference
        const createResult = await ctx.runMutation(api_1.api.api.testHelpers.createTestTask, {
            name: `Test ${Date.now()}`,
        });
        const taskId = createResult.taskId;
        try {
            // Run agent - use type assertion to break circular reference
            const result = await ctx.runAction(api_1.api.api.runAgent.runAgent, {
                taskId,
                prompt: args.prompt,
                apiKeys: args.apiKeys || {},
            });
            return {
                success: true,
                taskId,
                result,
            };
        }
        catch (error) {
            return {
                success: false,
                taskId,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
});
/**
 * Check if workflow mode is enabled
 */
exports.checkWorkflowMode = (0, server_1.query)({
    args: {},
    handler: async () => {
        const enabled = process.env.ENABLE_WORKFLOW === "true";
        return {
            ENABLE_WORKFLOW: enabled,
            mode: enabled ? "workflow" : "direct",
        };
    },
});
/**
 * Test promptMessageId pattern (BP012)
 * Tests that promptMessageId is properly generated, persisted, and retrievable
 */
exports.testPromptMessageId = (0, server_1.action)({
    args: {
        taskId: values_1.v.optional(values_1.v.id("tasks")),
    },
    handler: async (ctx, args) => {
        const ENABLE_PROMPT_MESSAGE_ID = process.env.ENABLE_PROMPT_MESSAGE_ID !== "false";
        // Create test task if not provided
        let taskId = args.taskId;
        if (!taskId) {
            const result = await ctx.runMutation(api_1.api.api.testHelpers.createTestTask, {
                name: `PromptMessageId Test ${Date.now()}`,
            });
            taskId = result.taskId;
        }
        if (!ENABLE_PROMPT_MESSAGE_ID) {
            return {
                success: true,
                flagEnabled: false,
                taskId,
                message: 'ENABLE_PROMPT_MESSAGE_ID is disabled ("false") - legacy behavior active',
            };
        }
        // Test 1: Save prompt message
        const promptResult = await ctx.runMutation(api_1.api.messages.savePromptMessage, {
            taskId,
            content: "Test prompt for promptMessageId verification",
            llmModel: "test-model",
        });
        if (!promptResult.messageId) {
            return {
                success: false,
                flagEnabled: true,
                taskId,
                error: "Failed to create prompt message",
            };
        }
        // Test 2: Create assistant message linked to prompt
        const assistantResult = await ctx.runMutation(api_1.api.messages.createAssistantMessage, {
            taskId,
            promptMessageId: promptResult.messageId,
            llmModel: "test-model",
        });
        if (!assistantResult.messageId) {
            return {
                success: false,
                flagEnabled: true,
                taskId,
                promptMessageId: promptResult.messageId,
                error: "Failed to create assistant message",
            };
        }
        // Test 3: Find assistant for prompt
        const foundAssistant = await ctx.runQuery(api_1.api.messages.findAssistantForPrompt, {
            taskId,
            promptMessageId: promptResult.messageId,
        });
        if (!foundAssistant || foundAssistant._id !== assistantResult.messageId) {
            return {
                success: false,
                flagEnabled: true,
                taskId,
                promptMessageId: promptResult.messageId,
                assistantMessageId: assistantResult.messageId,
                error: "Failed to find assistant message by promptMessageId",
            };
        }
        // Test 4: Verify promptMessageId field is persisted
        if (foundAssistant.promptMessageId !== promptResult.messageId) {
            return {
                success: false,
                flagEnabled: true,
                taskId,
                error: "promptMessageId field not properly persisted on assistant message",
            };
        }
        return {
            success: true,
            flagEnabled: true,
            taskId,
            promptMessageId: promptResult.messageId,
            assistantMessageId: assistantResult.messageId,
            message: "promptMessageId pattern working correctly",
            tests: {
                savePromptMessage: "PASS",
                createAssistantMessage: "PASS",
                findAssistantForPrompt: "PASS",
                fieldPersistence: "PASS",
            },
        };
    },
});
