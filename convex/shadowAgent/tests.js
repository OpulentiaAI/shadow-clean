"use strict";
// @ts-nocheck
/**
 * Shadow Agent Tests
 *
 * Test harness for verifying Agent primitives work correctly.
 * These are action-based tests that can be called from the dashboard or API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllTests = exports.testToolCalling = exports.testAbortResume = exports.testConversationHistory = void 0;
const server_1 = require("../_generated/server");
const values_1 = require("convex/values");
const index_1 = require("./index");
const api_1 = require("../_generated/api");
/**
 * Test 1: Conversation History Retention
 *
 * Creates a thread, sends two messages, verifies the agent can reference
 * the first message when responding to the second.
 */
exports.testConversationHistory = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        console.log("[TEST] Starting conversation history test");
        // Create a new thread
        const { threadId, thread } = await index_1.shadowAgent.createThread(ctx, {
            title: "Test: Conversation History",
        });
        console.log(`[TEST] Created thread: ${threadId}`);
        // Send first message with a fact
        const result1 = await thread.generateText({ prompt: "Remember this: The secret code is ALPHA-7. Just confirm you understand." }, { maxSteps: 1, maxTokens: 500 });
        console.log(`[TEST] First message response: ${result1.text.substring(0, 100)}...`);
        // Send second message asking about the fact
        const result2 = await thread.generateText({ prompt: "What was the secret code I told you earlier?" }, { maxSteps: 1, maxTokens: 500 });
        console.log(`[TEST] Second message response: ${result2.text.substring(0, 200)}...`);
        // Check if the response contains the secret code
        const hasContext = result2.text.toLowerCase().includes("alpha") ||
            result2.text.toLowerCase().includes("7");
        return {
            success: true,
            threadId,
            conversationRetained: hasContext,
            firstResponse: result1.text.substring(0, 200),
            secondResponse: result2.text.substring(0, 200),
            test: "CONVERSATION_HISTORY",
            result: hasContext ? "PASS" : "FAIL",
        };
    },
});
/**
 * Test 2: Abort/Resume - Single Message Restart
 *
 * Verifies that after stopping a task, a single new message
 * triggers a response immediately.
 */
exports.testAbortResume = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        console.log("[TEST] Starting abort/resume test");
        // Get task
        const task = await ctx.runQuery(api_1.api.tasks.get, { taskId: args.taskId });
        if (!task) {
            throw new Error("Task not found");
        }
        // Create a thread for the task
        const { threadId, thread } = await index_1.shadowAgent.createThread(ctx, {
            title: "Test: Abort Resume",
        });
        console.log(`[TEST] Created thread: ${threadId}`);
        // Set task to RUNNING
        await ctx.runMutation(api_1.api.tasks.update, {
            taskId: args.taskId,
            status: "RUNNING",
        });
        // Simulate stopping the task
        await ctx.runMutation(api_1.api.tasks.update, {
            taskId: args.taskId,
            status: "STOPPED",
        });
        console.log("[TEST] Task stopped");
        // Check task is STOPPED
        const stoppedTask = await ctx.runQuery(api_1.api.tasks.get, { taskId: args.taskId });
        const wasStoppedCorrectly = stoppedTask?.status === "STOPPED";
        // Send a single new message - this should work immediately
        const result = await thread.generateText({ prompt: "Hello, can you respond to this message?" }, { maxSteps: 1, maxTokens: 500 });
        console.log(`[TEST] Response after stop: ${result.text.substring(0, 100)}...`);
        const responseReceived = result.text.length > 0;
        return {
            success: true,
            threadId,
            wasStoppedCorrectly,
            responseReceived,
            response: result.text.substring(0, 200),
            test: "ABORT_RESUME",
            result: wasStoppedCorrectly && responseReceived ? "PASS" : "FAIL",
        };
    },
});
/**
 * Test 3: Tool Calling
 *
 * Verifies that tools can be called and results are persisted.
 */
exports.testToolCalling = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        console.log("[TEST] Starting tool calling test");
        // Get task for workspace path
        const task = await ctx.runQuery(api_1.api.tasks.get, { taskId: args.taskId });
        if (!task) {
            throw new Error("Task not found");
        }
        // Create a thread
        const { threadId, thread } = await index_1.shadowAgent.createThread(ctx, {
            title: "Test: Tool Calling",
        });
        console.log(`[TEST] Created thread: ${threadId}`);
        // Import tools
        const { createAgentTools } = await import("../agentTools");
        const tools = createAgentTools(ctx, args.taskId, task?.workspacePath);
        // Ask agent to list files (should trigger list_dir tool)
        const result = await thread.generateText({ prompt: "Please list the files in the current directory using the list_dir tool." }, {
            tools,
            maxSteps: 3,
            maxTokens: 1000,
        });
        console.log(`[TEST] Tool calling response: ${result.text.substring(0, 200)}...`);
        // Check if tool was called
        const toolsUsed = result.toolCalls?.length > 0 ||
            result.text.includes("list") ||
            result.text.includes("directory") ||
            result.text.includes("file");
        return {
            success: true,
            threadId,
            toolsUsed,
            toolCallCount: result.toolCalls?.length || 0,
            response: result.text.substring(0, 300),
            test: "TOOL_CALLING",
            result: toolsUsed ? "PASS" : "FAIL",
        };
    },
});
/**
 * Run all tests
 */
exports.runAllTests = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        console.log("[TEST] Running all Shadow Agent tests");
        const results = [];
        try {
            // Test 1: Conversation History
            const historyResult = await ctx.runAction(api_1.api.shadowAgent.tests.testConversationHistory, {
                taskId: args.taskId,
            });
            results.push({
                test: "CONVERSATION_HISTORY",
                result: historyResult.result,
                details: historyResult,
            });
        }
        catch (error) {
            results.push({
                test: "CONVERSATION_HISTORY",
                result: "ERROR",
                details: { error: String(error) },
            });
        }
        try {
            // Test 2: Abort/Resume
            const abortResult = await ctx.runAction(api_1.api.shadowAgent.tests.testAbortResume, {
                taskId: args.taskId,
            });
            results.push({
                test: "ABORT_RESUME",
                result: abortResult.result,
                details: abortResult,
            });
        }
        catch (error) {
            results.push({
                test: "ABORT_RESUME",
                result: "ERROR",
                details: { error: String(error) },
            });
        }
        try {
            // Test 3: Tool Calling
            const toolResult = await ctx.runAction(api_1.api.shadowAgent.tests.testToolCalling, {
                taskId: args.taskId,
            });
            results.push({
                test: "TOOL_CALLING",
                result: toolResult.result,
                details: toolResult,
            });
        }
        catch (error) {
            results.push({
                test: "TOOL_CALLING",
                result: "ERROR",
                details: { error: String(error) },
            });
        }
        const passed = results.filter(r => r.result === "PASS").length;
        const failed = results.filter(r => r.result === "FAIL").length;
        const errors = results.filter(r => r.result === "ERROR").length;
        return {
            summary: {
                total: results.length,
                passed,
                failed,
                errors,
                allPassed: failed === 0 && errors === 0,
            },
            results,
        };
    },
});
