/**
 * Test script for new Convex-native sidecar functions
 * Run with: npx tsx test-convex-functions.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api";

const CONVEX_URL = process.env.CONVEX_URL || "https://fiery-iguana-603.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function testConvexFunctions() {
  console.log("🧪 Testing Convex-native sidecar functions...\n");

  try {
    // 0. Create a test task first
    console.log("0️⃣ Creating test task...");
    const userId = await client.mutation(api.auth.upsertUser, {
      externalId: "test-user-123",
      name: "Test User",
      email: "test@example.com",
    });
    console.log("✅ Test user created/found:", userId);

    const testTask = await client.mutation(api.tasks.create, {
      title: "Test Task for Convex Functions",
      repoFullName: "test/repo",
      repoUrl: "https://github.com/test/repo",
      userId,
      baseBranch: "main",
      shadowBranch: "shadow-test",
      baseCommitSha: "abc123",
    });
    console.log("✅ Test task created:", testTask.taskId);

    const taskId = testTask.taskId;

    // 1. Test fileChanges.create
    console.log("\n1️⃣ Testing fileChanges.create...");
    const fileChangeResult = await client.mutation(api.fileChanges.create, {
      taskId,
      filePath: "/test/file.ts",
      operation: "UPDATE",
      additions: 10,
      deletions: 5,
    });
    console.log("✅ File change created:", fileChangeResult);

    // 2. Test toolLogs.create
    console.log("\n2️⃣ Testing toolLogs.create...");
    const toolLogResult = await client.mutation(api.toolLogs.create, {
      taskId,
      toolName: "read_file",
      args: { file_path: "/test/file.ts" },
      status: "RUNNING",
    });
    console.log("✅ Tool log created:", toolLogResult);

    // 3. Test toolLogs.update (complete)
    console.log("\n3️⃣ Testing toolLogs.update (complete)...");
    await client.mutation(api.toolLogs.update, {
      logId: toolLogResult.logId,
      status: "COMPLETED",
      result: { content: "test content", lines: 100 },
      durationMs: 150,
    });
    console.log("✅ Tool log completed");

    // 4. Test terminalOutput.append
    console.log("\n4️⃣ Testing terminalOutput.append...");
    await client.mutation(api.terminalOutput.append, {
      taskId,
      commandId: "cmd-123",
      content: "Hello from terminal!",
      streamType: "stdout",
      timestamp: Date.now(),
    });
    console.log("✅ Terminal output appended");

    // 5. Query recent file changes
    console.log("\n5️⃣ Testing fileChanges.byTask...");
    const recentChanges = await client.query(api.fileChanges.byTask, {
      taskId,
    });
    console.log(`✅ Found ${recentChanges.length} file changes`);

    // 6. Query tool logs by task (with limit)
    console.log("\n6️⃣ Testing toolLogs.recentByTask...");
    const toolLogs = await client.query(api.toolLogs.recentByTask, {
      taskId,
      limit: 10,
    });
    console.log(`✅ Found ${toolLogs.length} tool logs`);

    // 7. Query terminal output by command
    console.log("\n7️⃣ Testing terminalOutput.byCommand...");
    const terminalOutput = await client.query(api.terminalOutput.byCommand, {
      commandId: "cmd-123",
    });
    console.log(`✅ Found ${terminalOutput.length} terminal output entries`);

    console.log("\n✅ All Convex function tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testConvexFunctions();
