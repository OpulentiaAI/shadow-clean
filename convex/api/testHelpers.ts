/**
 * Test Helpers for Workflow Integration Testing
 * These functions are used for automated testing of the workflow system.
 */

import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/**
 * Create a test user for workflow testing
 */
export const createTestUser = mutation({
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
export const createTestTask = mutation({
  args: {
    name: v.optional(v.string()),
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
      userId: testUser!._id,
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
export const deleteTestTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.taskId);
    return { deleted: true };
  },
});

// Explicit return type to break circular type inference
type TestRunAgentResult = 
  | { success: true; taskId: Id<"tasks">; result: unknown }
  | { success: false; taskId: Id<"tasks">; error: string };

/**
 * Test the runAgent API - creates a task, runs agent, and reports results
 */
export const testRunAgent = action({
  args: {
    prompt: v.string(),
    apiKeys: v.optional(
      v.object({
        anthropic: v.optional(v.string()),
        openai: v.optional(v.string()),
        openrouter: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args): Promise<TestRunAgentResult> => {
    // Create test task - use type assertion to break circular reference
    const createResult: { taskId: Id<"tasks">; name: string } = await ctx.runMutation(
      api.api.testHelpers.createTestTask,
      {
        name: `Test ${Date.now()}`,
      },
    );
    const taskId = createResult.taskId;

    try {
      // Run agent - use type assertion to break circular reference
      const result: unknown = await ctx.runAction(api.api.runAgent.runAgent, {
        taskId,
        prompt: args.prompt,
        apiKeys: args.apiKeys || {},
      });

      return {
        success: true as const,
        taskId,
        result,
      };
    } catch (error) {
      return {
        success: false as const,
        taskId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Check if workflow mode is enabled
 */
export const checkWorkflowMode = query({
  args: {},
  handler: async () => {
    const enabled = process.env.ENABLE_WORKFLOW === "true";
    return {
      ENABLE_WORKFLOW: enabled,
      mode: enabled ? "workflow" : "direct",
    };
  },
});

// Explicit return type to break circular type inference for testPromptMessageId
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
export const testPromptMessageId = action({
  args: {
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args): Promise<TestPromptMessageIdResult> => {
    const ENABLE_PROMPT_MESSAGE_ID =
      process.env.ENABLE_PROMPT_MESSAGE_ID !== "false";

    // Create test task if not provided
    let taskId = args.taskId;
    if (!taskId) {
      const result: { taskId: Id<"tasks">; name: string } = await ctx.runMutation(api.api.testHelpers.createTestTask, {
        name: `PromptMessageId Test ${Date.now()}`,
      });
      taskId = result.taskId;
    }

    if (!ENABLE_PROMPT_MESSAGE_ID) {
      return {
        success: true,
        flagEnabled: false,
        taskId,
        message:
          'ENABLE_PROMPT_MESSAGE_ID is disabled ("false") - legacy behavior active',
      };
    }

    // Test 1: Save prompt message
    const promptResult: { messageId: Id<"chatMessages"> } = await ctx.runMutation(api.messages.savePromptMessage, {
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
    const assistantResult: { messageId: Id<"chatMessages"> } = await ctx.runMutation(
      api.messages.createAssistantMessage,
      {
        taskId,
        promptMessageId: promptResult.messageId,
        llmModel: "test-model",
      },
    );

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
    const foundAssistant: { _id: Id<"chatMessages">; promptMessageId?: Id<"chatMessages"> } | null = await ctx.runQuery(
      api.messages.findAssistantForPrompt,
      {
        taskId,
        promptMessageId: promptResult.messageId,
      },
    );

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
        error:
          "promptMessageId field not properly persisted on assistant message",
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
