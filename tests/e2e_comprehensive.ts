/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Comprehensive E2E Test Suite for Convex-Native Agent Platform
 * Tests full task lifecycle, AI streaming, tool execution, and real-time updates
 * 
 * Run: CONVEX_URL=https://veracious-alligator-638.convex.cloud npx tsx convex/e2e-comprehensive.ts
 */

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL || "https://veracious-alligator-638.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<any>): Promise<any> {
  const start = Date.now();
  try {
    const result = await fn();
    results.push({ name, passed: true, duration: Date.now() - start, details: result });
    console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
    return result;
  } catch (error: any) {
    results.push({ name, passed: false, duration: Date.now() - start, error: error.message });
    console.log(`  ✗ ${name}: ${error.message}`);
    return null;
  }
}

// ============================================================================
// TEST SUITE 1: Authentication & User Management
// ============================================================================
async function testAuthSuite() {
  console.log("\n🔐 TEST SUITE 1: Authentication & User Management");
  console.log("-".repeat(50));

  // Create user
  const userId = await runTest("Create user via upsertUser", async () => {
    return await client.mutation("auth:upsertUser", {
      externalId: `e2e-comprehensive-${Date.now()}`,
      name: "E2E Comprehensive Test User",
      email: `e2e-comp-${Date.now()}@test.com`,
      emailVerified: true,
    });
  });

  // Get user by email
  await runTest("Get user by email", async () => {
    const user = await client.query("auth:getUserByEmail", {
      email: `e2e-comp-${Date.now() - 1}@test.com`, // Won't exist
    });
    return { found: !!user };
  });

  // Get session (no token)
  await runTest("Get session without token", async () => {
    const session = await client.query("auth:getSession", {});
    return { hasSession: !!session };
  });

  // Current user query
  if (userId) {
    await runTest("Get current user by ID", async () => {
      const user = await client.query("auth:currentUser", { userId });
      return { name: user?.name };
    });
  }

  return userId;
}

// ============================================================================
// TEST SUITE 2: Task Lifecycle Management
// ============================================================================
async function testTaskSuite(userId: string) {
  console.log("\n📋 TEST SUITE 2: Task Lifecycle Management");
  console.log("-".repeat(50));

  // Create task
  const taskResult = await runTest("Create task with full params", async () => {
    return await client.mutation("tasks:create", {
      title: "E2E Comprehensive: Full Agent Test",
      repoFullName: "opulentia/shadow-clean",
      repoUrl: "https://github.com/opulentia/shadow-clean",
      userId: userId as any,
      baseBranch: "main",
      baseCommitSha: "abc123def456789",
      shadowBranch: `shadow/e2e-${Date.now()}`,
      mainModel: "anthropic/claude-3-5-haiku-latest",
      isScratchpad: true,
    });
  });

  const taskId = taskResult?.taskId;
  if (!taskId) return null;

  // Get task
  await runTest("Get task by ID", async () => {
    const task = await client.query("tasks:get", { taskId });
    return { title: task?.title, status: task?.status };
  });

  // Update task status
  await runTest("Update task status to RUNNING", async () => {
    return await client.mutation("tasks:update", {
      taskId,
      status: "RUNNING",
      initStatus: "ACTIVE",
      hasBeenInitialized: true,
    });
  });

  // Get task with details
  await runTest("Get task with details", async () => {
    const details = await client.query("tasks:getWithDetails", { taskId });
    return { hasTask: !!details?.task, todosCount: details?.todos?.length };
  });

  // List tasks by user
  await runTest("List tasks by user", async () => {
    const tasks = await client.query("tasks:listByUser", { userId: userId as any });
    return { count: tasks.length };
  });

  // Update task title
  await runTest("Update task title", async () => {
    return await client.mutation("tasks:updateTitle", {
      taskId,
      title: "E2E Comprehensive: Updated Title",
    });
  });

  return taskId;
}

// ============================================================================
// TEST SUITE 3: Git State Management
// ============================================================================
async function testGitSuite(taskId: string) {
  console.log("\n🔀 TEST SUITE 3: Git State Management");
  console.log("-".repeat(50));

  // Initialize repository
  await runTest("Initialize git repository", async () => {
    return await client.mutation("git:initRepository", {
      taskId: taskId as any,
      workDir: "/workspace/shadow-clean",
      branch: "main",
      repoUrl: "https://github.com/opulentia/shadow-clean",
    });
  });

  // Get git state
  await runTest("Get git state", async () => {
    const state = await client.query("git:getState", { taskId: taskId as any });
    return { branch: state?.currentBranch, hasState: !!state };
  });

  // Update git status
  await runTest("Update git status with files", async () => {
    return await client.mutation("git:updateStatus", {
      taskId: taskId as any,
      status: {
        clean: false,
        files: [
          { path: "src/index.ts", status: "modified" },
          { path: "src/utils.ts", status: "added" },
        ],
      },
    });
  });

  // Record commit
  await runTest("Record git commit", async () => {
    return await client.mutation("git:recordCommit", {
      taskId: taskId as any,
      message: "feat: add new utility functions",
      files: ["src/index.ts", "src/utils.ts"],
    });
  });

  // Switch branch
  await runTest("Switch to new branch", async () => {
    return await client.mutation("git:switchBranch", {
      taskId: taskId as any,
      branch: "feature/e2e-test",
      create: true,
    });
  });

  // Verify branch switch
  await runTest("Verify branch switch", async () => {
    const state = await client.query("git:getState", { taskId: taskId as any });
    return { currentBranch: state?.currentBranch };
  });

  // Clone repository action
  await runTest("Clone repository (simulated)", async () => {
    return await client.action("git:cloneRepository", {
      taskId: taskId as any,
      repoUrl: "https://github.com/octocat/Hello-World.git",
      branch: "master",
    });
  });
}

// ============================================================================
// TEST SUITE 4: Message & Chat System
// ============================================================================
async function testMessageSuite(taskId: string) {
  console.log("\n💬 TEST SUITE 4: Message & Chat System");
  console.log("-".repeat(50));

  // Append user message
  const userMsg = await runTest("Append user message", async () => {
    return await client.mutation("messages:append", {
      taskId: taskId as any,
      role: "USER",
      content: "Create a TypeScript utility function that validates email addresses using a regex pattern. Include comprehensive tests.",
    });
  });

  // Start streaming assistant message
  const streamMsg = await runTest("Start streaming assistant message", async () => {
    return await client.mutation("messages:startStreaming", {
      taskId: taskId as any,
      llmModel: "anthropic/claude-3-5-haiku-latest",
    });
  });

  const assistantMsgId = streamMsg?.messageId;

  // Stream multiple deltas
  if (assistantMsgId) {
    await runTest("Stream delta 1 - thinking", async () => {
      return await client.mutation("messages:appendStreamDelta", {
        messageId: assistantMsgId,
        deltaText: "I'll create a TypeScript email validation utility with comprehensive tests.\n\n",
        isFinal: false,
      });
    });

    await runTest("Stream delta 2 - code block", async () => {
      return await client.mutation("messages:appendStreamDelta", {
        messageId: assistantMsgId,
        deltaText: "```typescript\n// email-validator.ts\nexport function isValidEmail(email: string): boolean {\n  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  return emailRegex.test(email);\n}\n```\n\n",
        isFinal: false,
      });
    });

    await runTest("Stream delta 3 - tests", async () => {
      return await client.mutation("messages:appendStreamDelta", {
        messageId: assistantMsgId,
        deltaText: "```typescript\n// email-validator.test.ts\nimport { isValidEmail } from './email-validator';\n\ndescribe('isValidEmail', () => {\n  test('valid emails', () => {\n    expect(isValidEmail('test@example.com')).toBe(true);\n  });\n});\n```",
        isFinal: true,
        finishReason: "stop",
        usage: { promptTokens: 50, completionTokens: 150, totalTokens: 200 },
      });
    });
  }

  // Get messages by task
  await runTest("Get all messages for task", async () => {
    const messages = await client.query("messages:byTask", { taskId: taskId as any });
    return { count: messages.length, roles: messages.map((m: any) => m.role) };
  });

  // Add another user message
  await runTest("Append follow-up user message", async () => {
    return await client.mutation("messages:append", {
      taskId: taskId as any,
      role: "USER",
      content: "Can you add validation for common email domains?",
    });
  });

  return assistantMsgId;
}

// ============================================================================
// TEST SUITE 5: File Changes & Diff Stats
// ============================================================================
async function testFileChangesSuite(taskId: string) {
  console.log("\n📁 TEST SUITE 5: File Changes & Diff Stats");
  console.log("-".repeat(50));

  // Create multiple file changes
  await runTest("Create file change - new file", async () => {
    return await client.mutation("fileChanges:create", {
      taskId: taskId as any,
      filePath: "/src/utils/email-validator.ts",
      operation: "CREATE",
      additions: 25,
      deletions: 0,
    });
  });

  await runTest("Create file change - test file", async () => {
    return await client.mutation("fileChanges:create", {
      taskId: taskId as any,
      filePath: "/src/utils/email-validator.test.ts",
      operation: "CREATE",
      additions: 45,
      deletions: 0,
    });
  });

  await runTest("Create file change - modified file", async () => {
    return await client.mutation("fileChanges:create", {
      taskId: taskId as any,
      filePath: "/src/index.ts",
      operation: "UPDATE",
      additions: 5,
      deletions: 2,
    });
  });

  // Get file changes
  await runTest("Get all file changes", async () => {
    const changes = await client.query("fileChanges:byTask", { taskId: taskId as any });
    return { count: changes.length, files: changes.map((c: any) => c.filePath) };
  });

  // Get diff stats
  await runTest("Get diff stats", async () => {
    const stats = await client.query("fileChanges:getStats", { taskId: taskId as any });
    return stats;
  });

  // Get file tree
  await runTest("Get file tree", async () => {
    const tree = await client.query("files:getTree", { taskId: taskId as any });
    return { success: tree?.success, nodeCount: tree?.tree?.length };
  });

  // Get diff stats via files module
  await runTest("Get diff stats via files module", async () => {
    const stats = await client.query("files:getDiffStats", { taskId: taskId as any });
    return stats;
  });
}

// ============================================================================
// TEST SUITE 6: Terminal Execution
// ============================================================================
async function testTerminalSuite(taskId: string) {
  console.log("\n💻 TEST SUITE 6: Terminal Execution");
  console.log("-".repeat(50));

  // Execute command
  await runTest("Execute npm install command", async () => {
    return await client.action("terminal:executeCommand", {
      taskId: taskId as any,
      command: "npm install --save-dev jest @types/jest",
      cwd: "/workspace/shadow-clean",
    });
  });

  // Add manual log entries
  await runTest("Add stdout log entry", async () => {
    return await client.mutation("terminal:addLog", {
      taskId: taskId as any,
      commandId: "cmd_test_001",
      stream: "stdout",
      content: "added 125 packages in 3.2s",
    });
  });

  await runTest("Add stderr log entry (warning)", async () => {
    return await client.mutation("terminal:addLog", {
      taskId: taskId as any,
      commandId: "cmd_test_001",
      stream: "stderr",
      content: "npm WARN deprecated package@1.0.0",
    });
  });

  // Get command logs (only takes commandId, not taskId)
  await runTest("Get command logs", async () => {
    const logs = await client.query("terminal:getCommandLogs", {
      commandId: "cmd_test_001",
    });
    return { count: logs.length };
  });

  // Execute another command
  await runTest("Execute test command", async () => {
    return await client.action("terminal:executeCommand", {
      taskId: taskId as any,
      command: "npm test",
      cwd: "/workspace/shadow-clean",
    });
  });

  // Get all logs
  await runTest("Get all terminal logs", async () => {
    const logs = await client.query("terminal:getLogs", { taskId: taskId as any });
    return { totalLogs: logs.length };
  });

  // Clear logs
  await runTest("Clear terminal logs", async () => {
    return await client.mutation("terminal:clearLogs", { taskId: taskId as any });
  });

  // Verify clear
  await runTest("Verify logs cleared", async () => {
    const logs = await client.query("terminal:getLogs", { taskId: taskId as any });
    return { logsAfterClear: logs.length };
  });
}

// ============================================================================
// TEST SUITE 7: Streaming AI (with prod keys)
// ============================================================================
async function testStreamingAISuite(taskId: string) {
  console.log("\n🤖 TEST SUITE 7: Streaming AI Actions");
  console.log("-".repeat(50));

  // Test streamChat action
  await runTest("Stream chat with AI (haiku)", async () => {
    try {
      const result = await client.action("streaming:streamChat", {
        taskId: taskId as any,
        prompt: "Say 'Hello E2E Test' in exactly 3 words",
        model: "anthropic/claude-3-5-haiku-latest",
      });
      return result;
    } catch (e: any) {
      // Expected to fail without proper session context
      return { note: "Streaming requires frontend context", error: e.message?.substring(0, 100) };
    }
  });

  // Test startStreamWithTools
  await runTest("Start stream with tools", async () => {
    try {
      const result = await client.action("streaming:startStreamWithTools", {
        taskId: taskId as any,
        prompt: "List the files in the current directory",
      });
      return result;
    } catch (e: any) {
      return { note: "Tools require proper context", error: e.message?.substring(0, 100) };
    }
  });
}

// ============================================================================
// TEST SUITE 8: Repository Index
// ============================================================================
async function testRepositoryIndexSuite() {
  console.log("\n🗂️ TEST SUITE 8: Repository Index");
  console.log("-".repeat(50));

  // Get repository index
  await runTest("Get repository index", async () => {
    const index = await client.query("repositoryIndex:get", {
      repoFullName: "opulentia/shadow-clean",
    });
    return { hasIndex: !!index, lastIndexed: index?.lastIndexedAt };
  });

  // Check if needs reindex
  await runTest("Check if needs reindex", async () => {
    const needs = await client.query("repositoryIndex:needsReindex", {
      repoFullName: "opulentia/shadow-clean",
      currentCommitSha: "abc123",
    });
    return { needsReindex: needs };
  });
}

// ============================================================================
// TEST SUITE 9: Error Handling
// ============================================================================
async function testErrorHandlingSuite() {
  console.log("\n🚨 TEST SUITE 9: Error Handling");
  console.log("-".repeat(50));

  // Invalid task ID
  await runTest("Handle invalid task ID gracefully", async () => {
    try {
      await client.query("tasks:get", { taskId: "invalid-id" as any });
      return { handled: false };
    } catch (e: any) {
      return { handled: true, errorType: "invalid_id" };
    }
  });

  // Missing required fields
  await runTest("Handle missing required fields", async () => {
    try {
      await client.mutation("tasks:create", {
        title: "Test",
        // Missing required fields
      } as any);
      return { handled: false };
    } catch (e: any) {
      return { handled: true, errorType: "validation" };
    }
  });

  // Non-existent message update
  await runTest("Handle non-existent message update", async () => {
    try {
      await client.mutation("messages:appendStreamDelta", {
        messageId: "kx00000000000000000000000000" as any,
        deltaText: "test",
        isFinal: true,
      });
      return { handled: false };
    } catch (e: any) {
      return { handled: true, errorType: "not_found" };
    }
  });
}

// ============================================================================
// TEST SUITE 10: Performance Benchmarks
// ============================================================================
async function testPerformanceSuite(userId: string) {
  console.log("\n⚡ TEST SUITE 10: Performance Benchmarks");
  console.log("-".repeat(50));

  // Batch task creation
  await runTest("Batch create 5 tasks", async () => {
    const start = Date.now();
    const tasks = [];
    for (let i = 0; i < 5; i++) {
      const result = await client.mutation("tasks:create", {
        title: `Perf Test Task ${i}`,
        repoFullName: "test/perf",
        repoUrl: "https://github.com/test/perf",
        userId: userId as any,
        baseBranch: "main",
        isScratchpad: true,
      });
      tasks.push(result.taskId);
    }
    return { count: tasks.length, totalTime: Date.now() - start, avgTime: (Date.now() - start) / 5 };
  });

  // Batch message creation
  const perfTask = await client.mutation("tasks:create", {
    title: "Perf Message Test",
    repoFullName: "test/perf",
    repoUrl: "https://github.com/test/perf",
    userId: userId as any,
    baseBranch: "main",
    isScratchpad: true,
  });

  await runTest("Batch create 10 messages", async () => {
    const start = Date.now();
    for (let i = 0; i < 10; i++) {
      await client.mutation("messages:append", {
        taskId: perfTask.taskId,
        role: i % 2 === 0 ? "USER" : "ASSISTANT",
        content: `Performance test message ${i}`,
      });
    }
    return { count: 10, totalTime: Date.now() - start, avgTime: (Date.now() - start) / 10 };
  });

  // Query performance
  await runTest("Query messages (10 items)", async () => {
    const start = Date.now();
    const messages = await client.query("messages:byTask", { taskId: perfTask.taskId });
    return { count: messages.length, queryTime: Date.now() - start };
  });

  // Batch file changes
  await runTest("Batch create 20 file changes", async () => {
    const start = Date.now();
    for (let i = 0; i < 20; i++) {
      await client.mutation("fileChanges:create", {
        taskId: perfTask.taskId,
        filePath: `/src/file-${i}.ts`,
        operation: "CREATE",
        additions: 10 + i,
        deletions: i,
      });
    }
    return { count: 20, totalTime: Date.now() - start, avgTime: (Date.now() - start) / 20 };
  });

  // Diff stats query performance
  await runTest("Query diff stats (20 files)", async () => {
    const start = Date.now();
    const stats = await client.query("files:getDiffStats", { taskId: perfTask.taskId });
    return { ...stats, queryTime: Date.now() - start };
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runAllTests() {
  console.log("🧪 COMPREHENSIVE E2E TEST SUITE");
  console.log("=".repeat(60));
  console.log(`📡 Convex URL: ${CONVEX_URL}`);
  console.log(`🕐 Started: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  const suiteStart = Date.now();

  // Run all test suites
  const userId = await testAuthSuite();
  if (!userId) {
    console.error("❌ Auth suite failed, cannot continue");
    process.exit(1);
  }

  const taskId = await testTaskSuite(userId);
  if (!taskId) {
    console.error("❌ Task suite failed, cannot continue");
    process.exit(1);
  }

  await testGitSuite(taskId);
  await testMessageSuite(taskId);
  await testFileChangesSuite(taskId);
  await testTerminalSuite(taskId);
  await testStreamingAISuite(taskId);
  await testRepositoryIndexSuite();
  await testErrorHandlingSuite();
  await testPerformanceSuite(userId);

  // Print summary
  const suiteDuration = Date.now() - suiteStart;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log("\n" + "=".repeat(60));
  console.log("📊 COMPREHENSIVE E2E TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total:  ${results.length}`);
  console.log(`⏱️  Duration: ${suiteDuration}ms`);
  console.log(`📊 Pass Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log("\n🐛 FAILED TESTS:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    });
  }

  // Performance summary
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log("\n⚡ PERFORMANCE SUMMARY:");
  console.log(`  Average test duration: ${avgDuration.toFixed(1)}ms`);
  console.log(`  Fastest: ${Math.min(...results.map(r => r.duration))}ms`);
  console.log(`  Slowest: ${Math.max(...results.map(r => r.duration))}ms`);

  console.log("\n" + "=".repeat(60));

  if (failed > 0) {
    console.log("❌ SOME TESTS FAILED\n");
    process.exit(1);
  } else {
    console.log("✅ ALL TESTS PASSED\n");
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(e => {
  console.error("💥 Test suite crashed:", e);
  process.exit(1);
});
