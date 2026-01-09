/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Convex Module Test Suite
 * Tests all Convex-native functionality
 * Run with: CONVEX_URL=https://veracious-alligator-638.convex.cloud npx tsx convex/test-runner.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const CONVEX_URL = process.env.CONVEX_URL || "https://veracious-alligator-638.convex.cloud";
const DEBUG = process.env.DEBUG === "true";

const client = new ConvexHttpClient(CONVEX_URL);

interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface TestContext {
  userId: Id<"users">;
  taskId: Id<"tasks">;
}

function debug(...args: unknown[]) {
  if (DEBUG) console.log("  [DEBUG]", ...args);
}

function log(msg: string) {
  console.log(msg);
}

// ============================================================================
// SETUP: Create test user and task
// ============================================================================
async function setupTestContext(): Promise<TestContext> {
  log("\n🔧 Setting up test context...");

  // Create test user
  const userId = await client.mutation(api.auth.upsertUser, {
    externalId: `test-user-${Date.now()}`,
    name: "Test User",
    email: `test-${Date.now()}@example.com`,
    emailVerified: true,
  });
  log(`  ✓ Created test user: ${userId}`);

  // Create test task
  const result = await client.mutation(api.tasks.create, {
    title: "Test Task",
    repoFullName: "test/repo",
    repoUrl: "https://github.com/test/repo",
    userId: userId,
    baseBranch: "main",
    baseCommitSha: "abc123",
    shadowBranch: "shadow-test",
  });
  log(`  ✓ Created test task: ${result.taskId}`);

  return { userId, taskId: result.taskId };
}

// ============================================================================
// TEST: Files Module
// ============================================================================
async function testFilesModule(ctx: TestContext, results: TestResults) {
  log("\n📁 Testing Files Module...");

  // Test 1.1: Get file tree
  try {
    const tree = await client.query(api.files.getTree, {
      taskId: ctx.taskId,
    });
    debug("File tree result:", tree);
    log(`  ✓ getTree returns result (success: ${tree.success})`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ getTree failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Files.getTree: ${error.message}`);
  }

  // Test 1.2: Get diff stats
  try {
    const stats = await client.query(api.files.getDiffStats, {
      taskId: ctx.taskId,
    });
    debug("Diff stats result:", stats);
    log(`  ✓ getDiffStats returns: ${JSON.stringify(stats)}`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ getDiffStats failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Files.getDiffStats: ${error.message}`);
  }

  // Test 1.3: Store file metadata
  try {
    await client.mutation(api.files.storeFileMetadata, {
      taskId: ctx.taskId,
      filePath: "/test/file.txt",
    });
    log("  ✓ storeFileMetadata mutation works");
    results.passed++;
  } catch (error: any) {
    log(`  ❌ storeFileMetadata failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Files.storeFileMetadata: ${error.message}`);
  }
}

// ============================================================================
// TEST: Terminal Module
// ============================================================================
async function testTerminalModule(ctx: TestContext, results: TestResults) {
  log("\n💻 Testing Terminal Module...");

  // Test 2.1: Execute command action
  try {
    const result = await client.action(api.terminal.executeCommand, {
      taskId: ctx.taskId,
      command: "echo 'Hello from Convex test'",
      cwd: "/tmp",
    });
    debug("Execute command result:", result);
    log(`  ✓ executeCommand action works: ${JSON.stringify(result)}`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ executeCommand failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Terminal.executeCommand: ${error.message}`);
  }

  // Test 2.2: Get logs query
  try {
    const logs = await client.query(api.terminal.getLogs, {
      taskId: ctx.taskId,
    });
    debug("Logs result:", logs);
    log(`  ✓ getLogs returns array (${logs.length} entries)`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ getLogs failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Terminal.getLogs: ${error.message}`);
  }

  // Test 2.3: Add log mutation
  try {
    await client.mutation(api.terminal.addLog, {
      taskId: ctx.taskId,
      commandId: "cmd_test_123",
      stream: "stdout",
      content: "Test log entry",
    });
    log("  ✓ addLog mutation works");
    results.passed++;
  } catch (error: any) {
    log(`  ❌ addLog failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Terminal.addLog: ${error.message}`);
  }

  // Test 2.4: Clear logs mutation
  try {
    const result = await client.mutation(api.terminal.clearLogs, {
      taskId: ctx.taskId,
    });
    debug("Clear logs result:", result);
    log(`  ✓ clearLogs mutation works`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ clearLogs failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Terminal.clearLogs: ${error.message}`);
  }
}

// ============================================================================
// TEST: Git Module
// ============================================================================
async function testGitModule(ctx: TestContext, results: TestResults) {
  log("\n🔀 Testing Git Module...");

  // Test 3.1: Initialize repository
  try {
    const result = await client.mutation(api.git.initRepository, {
      taskId: ctx.taskId,
      workDir: "/tmp/git-test",
      branch: "main",
    });
    debug("Init repo result:", result);
    log(`  ✓ initRepository mutation works`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ initRepository failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Git.initRepository: ${error.message}`);
  }

  // Test 3.2: Get git state
  try {
    const state = await client.query(api.git.getState, {
      taskId: ctx.taskId,
    });
    debug("Git state result:", state);
    log(`  ✓ getState query works: branch=${state?.currentBranch || "none"}`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ getState failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Git.getState: ${error.message}`);
  }

  // Test 3.3: Update status
  try {
    await client.mutation(api.git.updateStatus, {
      taskId: ctx.taskId,
      status: {
        clean: true,
        files: [{ path: "test.txt", status: "modified" }],
      },
    });
    log("  ✓ updateStatus mutation works");
    results.passed++;
  } catch (error: any) {
    log(`  ❌ updateStatus failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Git.updateStatus: ${error.message}`);
  }

  // Test 3.4: Record commit
  try {
    const result = await client.mutation(api.git.recordCommit, {
      taskId: ctx.taskId,
      message: "Test commit",
      files: ["test.txt"],
    });
    debug("Record commit result:", result);
    log(`  ✓ recordCommit mutation works`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ recordCommit failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Git.recordCommit: ${error.message}`);
  }

  // Test 3.5: Switch branch
  try {
    const result = await client.mutation(api.git.switchBranch, {
      taskId: ctx.taskId,
      branch: "feature-test",
      create: true,
    });
    debug("Switch branch result:", result);
    log("  ✓ switchBranch mutation works");
    results.passed++;
  } catch (error: any) {
    log(`  ❌ switchBranch failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Git.switchBranch: ${error.message}`);
  }

  // Test 3.6: Clone repository action
  try {
    const result = await client.action(api.git.cloneRepository, {
      taskId: ctx.taskId,
      repoUrl: "https://github.com/octocat/Hello-World.git",
      branch: "master",
    });
    debug("Clone result:", result);
    log(`  ✓ cloneRepository action works: ${result.message}`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ cloneRepository failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Git.cloneRepository: ${error.message}`);
  }
}

// ============================================================================
// TEST: Auth Module
// ============================================================================
async function testAuthModule(ctx: TestContext, results: TestResults) {
  log("\n🔐 Testing Auth Module...");

  // Test 4.1: Get session (no token - should return null)
  try {
    const session = await client.query(api.auth.getSession, {});
    debug("Session result:", session);
    log(`  ✓ getSession returns: ${session ? "session" : "null (expected for no token)"}`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ getSession failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Auth.getSession: ${error.message}`);
  }

  // Test 4.2: Get user by email
  try {
    const user = await client.query(api.auth.getUserByEmail, {
      email: "test@example.com",
    });
    debug("User by email result:", user);
    log(`  ✓ getUserByEmail returns: ${user ? "user found" : "null (no user)"}`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ getUserByEmail failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Auth.getUserByEmail: ${error.message}`);
  }

  // Test 4.3: Current user query
  try {
    const user = await client.query(api.auth.currentUser, { userId: ctx.userId });
    debug("Current user result:", user);
    log(`  ✓ currentUser returns: ${user ? user.name : "null"}`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ currentUser failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Auth.currentUser: ${error.message}`);
  }
}

// ============================================================================
// TEST: Messages Module
// ============================================================================
async function testMessagesModule(ctx: TestContext, results: TestResults) {
  log("\n💬 Testing Messages Module...");

  // Test 5.1: Append message
  try {
    const result = await client.mutation(api.messages.append, {
      taskId: ctx.taskId,
      content: "Test message from test suite",
      role: "USER",
    });
    debug("Append message result:", result);
    log(`  ✓ append mutation works: ${result.messageId}`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ append failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Messages.append: ${error.message}`);
  }

  // Test 5.2: Get messages by task
  try {
    const messages = await client.query(api.messages.byTask, {
      taskId: ctx.taskId,
    });
    debug("Messages by task result:", messages);
    log(`  ✓ byTask query returns ${messages.length} messages`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ byTask failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Messages.byTask: ${error.message}`);
  }
}

// ============================================================================
// TEST: Tasks Module
// ============================================================================
async function testTasksModule(ctx: TestContext, results: TestResults) {
  log("\n📋 Testing Tasks Module...");

  // Test 6.1: Get task
  try {
    const task = await client.query(api.tasks.get, {
      taskId: ctx.taskId,
    });
    debug("Get task result:", task);
    log(`  ✓ get query returns: ${task ? task.title : "null"}`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ get failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Tasks.get: ${error.message}`);
  }

  // Test 6.2: Get with details
  try {
    const details = await client.query(api.tasks.getWithDetails, {
      taskId: ctx.taskId,
    });
    debug("Get with details result:", details);
    log(`  ✓ getWithDetails query returns: ${details ? "details" : "null"}`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ getWithDetails failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Tasks.getWithDetails: ${error.message}`);
  }

  // Test 6.3: List by user
  try {
    const tasks = await client.query(api.tasks.listByUser, {
      userId: ctx.userId,
    });
    debug("List by user result:", tasks);
    log(`  ✓ listByUser query returns ${tasks.length} tasks`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ listByUser failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Tasks.listByUser: ${error.message}`);
  }

  // Test 6.4: Update task
  try {
    await client.mutation(api.tasks.update, {
      taskId: ctx.taskId,
      status: "RUNNING",
    });
    log("  ✓ update mutation works");
    results.passed++;
  } catch (error: any) {
    log(`  ❌ update failed: ${error.message}`);
    results.failed++;
    results.errors.push(`Tasks.update: ${error.message}`);
  }
}

// ============================================================================
// TEST: FileChanges Module
// ============================================================================
async function testFileChangesModule(ctx: TestContext, results: TestResults) {
  log("\n📝 Testing FileChanges Module...");

  // Test 7.1: Create file change
  try {
    await client.mutation(api.fileChanges.create, {
      taskId: ctx.taskId,
      filePath: "/test/new-file.ts",
      operation: "CREATE",
      additions: 10,
      deletions: 0,
    });
    log("  ✓ create mutation works");
    results.passed++;
  } catch (error: any) {
    log(`  ❌ create failed: ${error.message}`);
    results.failed++;
    results.errors.push(`FileChanges.create: ${error.message}`);
  }

  // Test 7.2: Get file changes by task
  try {
    const changes = await client.query(api.fileChanges.byTask, {
      taskId: ctx.taskId,
    });
    debug("File changes result:", changes);
    log(`  ✓ byTask query returns ${changes.length} changes`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ byTask failed: ${error.message}`);
    results.failed++;
    results.errors.push(`FileChanges.byTask: ${error.message}`);
  }

  // Test 7.3: Get stats
  try {
    const stats = await client.query(api.fileChanges.getStats, {
      taskId: ctx.taskId,
    });
    debug("File changes stats:", stats);
    log(`  ✓ getStats query returns: ${JSON.stringify(stats)}`);
    results.passed++;
  } catch (error: any) {
    log(`  ❌ getStats failed: ${error.message}`);
    results.failed++;
    results.errors.push(`FileChanges.getStats: ${error.message}`);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runTestSuite() {
  console.log("🧪 Convex Native Test Suite");
  console.log("=".repeat(60));
  console.log(`📡 Convex URL: ${CONVEX_URL}`);
  console.log(`🔍 Debug mode: ${DEBUG}`);
  console.log("=".repeat(60));

  const results: TestResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const startTime = Date.now();

  // Setup test context (create user and task)
  let ctx: TestContext;
  try {
    ctx = await setupTestContext();
  } catch (error: any) {
    console.error("❌ Failed to setup test context:", error.message);
    process.exit(1);
  }

  // Run all test modules
  await testFilesModule(ctx, results);
  await testTerminalModule(ctx, results);
  await testGitModule(ctx, results);
  await testAuthModule(ctx, results);
  await testMessagesModule(ctx, results);
  await testTasksModule(ctx, results);
  await testFileChangesModule(ctx, results);

  const duration = Date.now() - startTime;

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Passed:  ${results.passed}`);
  console.log(`❌ Failed:  ${results.failed}`);
  console.log(`⚠️  Skipped: ${results.skipped}`);
  console.log(`⏱️  Duration: ${duration}ms`);

  if (results.errors.length > 0) {
    console.log("\n🐛 ERRORS:");
    for (const e of results.errors) {
      console.log(`  - ${e}`);
    }
  }

  console.log("=".repeat(60));

  // Exit with code based on failures
  if (results.failed > 0) {
    console.log("\n❌ TEST SUITE FAILED - Fixes required\n");
    process.exit(1);
  } else {
    console.log("\n✅ TEST SUITE PASSED\n");
    process.exit(0);
  }
}

// Run tests
runTestSuite().catch((error) => {
  console.error("💥 Test suite crashed:", error);
  process.exit(1);
});
