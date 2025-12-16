/**
 * Test Helpers for Workflow Integration Testing
 * These functions are used for automated testing of the workflow system.
 */

import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

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

/**
 * Test the runAgent API - creates a task, runs agent, and reports results
 */
export const testRunAgent = action({
  args: {
    prompt: v.string(),
    apiKeys: v.optional(v.object({
      anthropic: v.optional(v.string()),
      openai: v.optional(v.string()),
      openrouter: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Create test task
    const { taskId } = await ctx.runMutation(api.api.testHelpers.createTestTask, {
      name: `Test ${Date.now()}`,
    });

    try {
      // Run agent
      const result = await ctx.runAction(api.api.runAgent.runAgent, {
        taskId,
        prompt: args.prompt,
        apiKeys: args.apiKeys || {},
      });

      return {
        success: true,
        taskId,
        result,
      };
    } catch (error) {
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
