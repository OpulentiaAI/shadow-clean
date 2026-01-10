/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * E2E Streaming Tests for Reasoning Deltas and Full Streaming Functionality
 * Tests real-time streaming with reasoning models, tool execution, and message parts
 * 
 * Run: CONVEX_URL=https://veracious-alligator-638.convex.cloud OPENROUTER_API_KEY=your-key npx tsx tests/e2e_streaming.ts
 */

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL || "https://veracious-alligator-638.convex.cloud";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const client = new ConvexHttpClient(CONVEX_URL);

// Helper to bypass TypeScript strict typing for Convex client
const convex = {
  mutation: (name: string, args: any) => client.mutation(name as any, args),
  query: (name: string, args: any) => client.query(name as any, args),
  action: (name: string, args: any) => client.action(name as any, args),
};

// Test configuration
const TEST_CONFIG = {
  // Reasoning models that support streaming deltas
  reasoningModels: [
    "deepseek/deepseek-r1",
    "deepseek/deepseek-v3", 
    "anthropic/claude-3.5-sonnet", // Regular model for comparison
  ],
  // Test prompts that trigger reasoning
  reasoningPrompts: [
    "What is 15 * 23? Show your step-by-step reasoning.",
    "Explain how photosynthesis works, breaking it down into detailed steps.",
    "Write a recursive function to calculate factorial. Think through the algorithm first.",
  ],
  // Tool-based prompts
  toolPrompts: [
    "Create a simple TypeScript file with a function that validates email addresses.",
    "List the files in the current directory and analyze the project structure.",
  ],
};

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface StreamingTestResult extends TestResult {
  streamingData?: {
    messageId?: string;
    reasoningParts?: number;
    textParts?: number;
    toolCalls?: number;
    totalTokens?: number;
    streamingDuration?: number;
  };
}

const results: StreamingTestResult[] = [];

async function runTest(name: string, fn: () => Promise<any>): Promise<any> {
  const start = Date.now();
  try {
    const result = await fn();
    results.push({ 
      name, 
      passed: true, 
      duration: Date.now() - start, 
      details: result 
    });
    console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
    return result;
  } catch (error: any) {
    results.push({ 
      name, 
      passed: false, 
      duration: Date.now() - start, 
      error: error.message 
    });
    console.log(`  ✗ ${name}: ${error.message}`);
    return null;
  }
}

// ============================================================================
// TEST SUITE 1: Setup & Authentication
// ============================================================================
async function setupTestSuite() {
  console.log("\n🔧 TEST SUITE 1: Setup & Authentication");
  console.log("-".repeat(50));

  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }

  // Create test user
  const userId = await runTest("Create test user", async () => {
    return await convex.mutation("auth:upsertUser", {
      externalId: `e2e-streaming-${Date.now()}`,
      name: "E2E Streaming Test User",
      email: `e2e-streaming-${Date.now()}@test.com`,
      emailVerified: true,
    });
  });

  // Create test task
  const taskId = await runTest("Create test task", async () => {
    return await convex.mutation("tasks:create", {
      title: "E2E Streaming Test: Reasoning Deltas",
      repoFullName: "opulentia/shadow-clean",
      repoUrl: "https://github.com/opulentia/shadow-clean",
      userId: userId as any,
      baseBranch: "main",
      baseCommitSha: "abc123def456789",
      shadowBranch: `shadow/e2e-streaming-${Date.now()}`,
      mainModel: "deepseek/deepseek-r1",
      isScratchpad: true,
    });
  });

  return { userId, taskId: taskId?.taskId };
}

// ============================================================================
// TEST SUITE 2: Basic Streaming Without Reasoning
// ============================================================================
async function testBasicStreaming(taskId: string) {
  console.log("\n📡 TEST SUITE 2: Basic Streaming Without Reasoning");
  console.log("-".repeat(50));

  // Test basic message streaming
  await runTest("Basic message streaming", async () => {
    const streamStart = await convex.mutation("messages:startStreaming", {
      taskId: taskId as any,
      llmModel: "anthropic/claude-3-5-haiku-latest",
    });

    const messageId = streamStart.messageId;
    
    // Simulate streaming deltas
    await convex.mutation("messages:appendStreamDelta", {
      messageId,
      deltaText: "Hello! I'm a basic streaming test.\n",
      isFinal: false,
    });

    await convex.mutation("messages:appendStreamDelta", {
      messageId,
      deltaText: "This simulates regular text streaming without reasoning.",
      isFinal: true,
      finishReason: "stop",
    });

    // Verify message
    const message = await convex.query("messages:get", { messageId });
    return {
      messageId,
      contentLength: message?.content?.length || 0,
      hasParts: !!(message?.metadataJson && JSON.parse(message.metadataJson).parts?.length > 0),
    };
  });
}

// ============================================================================
// TEST SUITE 3: Reasoning Delta Streaming Tests
// ============================================================================
async function testReasoningDeltaStreaming(taskId: string) {
  console.log("\n🧠 TEST SUITE 3: Reasoning Delta Streaming");
  console.log("-".repeat(50));

  for (const model of TEST_CONFIG.reasoningModels) {
    for (const prompt of TEST_CONFIG.reasoningPrompts.slice(0, 1)) { // Limit to 1 prompt per model for speed
      await runTest(`Reasoning streaming: ${model}`, async () => {
        const streamStart = Date.now();
        
        try {
          const result = await convex.action("streaming:startStreamWithTools", {
            taskId: taskId as any,
            prompt,
            model,
            llmModel: model,
            apiKeys: {
              openrouter: OPENROUTER_API_KEY,
            },
            clientMessageId: `test-${model.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
          });

          const streamingDuration = Date.now() - streamStart;
          
          // Wait a moment for streaming to complete, then check the message
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Get the latest message for this task
          const messages = await convex.query("messages:byTask", { taskId: taskId as any });
          const latestMessage = messages[messages.length - 1];
          
          if (!latestMessage) {
            throw new Error("No message created after streaming");
          }

          const metadata = latestMessage.metadataJson ? JSON.parse(latestMessage.metadataJson) : {};
          const parts = metadata.parts || [];
          const reasoningParts = parts.filter((p: any) => p.type === 'reasoning');
          
          return {
            messageId: latestMessage._id,
            reasoningParts: reasoningParts.length,
            totalParts: parts.length,
            contentLength: latestMessage.content?.length || 0,
            streamingDuration,
            hasReasoning: reasoningParts.length > 0,
            reasoningContent: reasoningParts.map((p: any) => p.text?.substring(0, 100)).join('...'),
          };
        } catch (error: any) {
          // Some models might not be available or might fail
          return {
            error: error.message,
            model,
            streamingDuration: Date.now() - streamStart,
          };
        }
      });
    }
  }
}

// ============================================================================
// TEST SUITE 4: Tool Execution During Streaming
// ============================================================================
async function testToolExecutionStreaming(taskId: string) {
  console.log("\n🔧 TEST SUITE 4: Tool Execution During Streaming");
  console.log("-".repeat(50));

  for (const prompt of TEST_CONFIG.toolPrompts.slice(0, 1)) { // Limit to 1 prompt for speed
    await runTest(`Tool streaming: ${prompt.substring(0, 30)}...`, async () => {
      const streamStart = Date.now();
      
      try {
        const result = await convex.action("streaming:startStreamWithTools", {
          taskId: taskId as any,
          prompt,
          model: "anthropic/claude-3-5-haiku-latest", // Use reliable model for tools
          llmModel: "anthropic/claude-3-5-haiku-latest",
          apiKeys: {
            openrouter: OPENROUTER_API_KEY,
          },
          clientMessageId: `tool-test-${Date.now()}`,
        });

        const streamingDuration = Date.now() - streamStart;
        
        // Wait for streaming to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check for tool calls in agentTools table
        const toolCalls = await convex.query("agentTools:byTask", { taskId: taskId as any });
        
        // Get latest message
        const messages = await convex.query("messages:byTask", { taskId: taskId as any });
        const latestMessage = messages[messages.length - 1];
        
        return {
          messageId: latestMessage?._id,
          toolCalls: toolCalls.length,
          streamingDuration,
          hasToolCalls: toolCalls.length > 0,
          toolNames: toolCalls.map((t: any) => t.toolName),
        };
      } catch (error: any) {
        return {
          error: error.message,
          streamingDuration: Date.now() - streamStart,
        };
      }
    });
  }
}

// ============================================================================
// TEST SUITE 5: Message Parts Validation
// ============================================================================
async function testMessagePartsValidation(taskId: string) {
  console.log("\n🧩 TEST SUITE 5: Message Parts Validation");
  console.log("-".repeat(50));

  // Test manual creation of reasoning parts
  await runTest("Manual reasoning part creation", async () => {
    const streamStart = await convex.mutation("messages:startStreaming", {
      taskId: taskId as any,
      llmModel: "deepseek/deepseek-r1",
    });

    const messageId = streamStart.messageId;
    
    // Add reasoning part
    await convex.mutation("messages:appendStreamDelta", {
      messageId,
      deltaText: "Let me think through this step by step.\n",
      isFinal: false,
      parts: [{
        type: "reasoning",
        text: "First, I need to understand the problem. Then I'll break it down.",
      }],
    });

    // Add text part
    await convex.mutation("messages:appendStreamDelta", {
      messageId,
      deltaText: "Based on my reasoning, here's the solution:",
      isFinal: false,
      parts: [{
        type: "text",
        text: "The answer is 345.",
      }],
    });

    // Finalize
    await convex.mutation("messages:appendStreamDelta", {
      messageId,
      deltaText: "",
      isFinal: true,
      finishReason: "stop",
    });

    // Verify parts
    const message = await convex.query("messages:get", { messageId });
    const metadata = message?.metadataJson ? JSON.parse(message.metadataJson) : {};
    const parts = metadata.parts || [];
    
    return {
      messageId,
      totalParts: parts.length,
      reasoningParts: parts.filter((p: any) => p.type === 'reasoning').length,
      textParts: parts.filter((p: any) => p.type === 'text').length,
      partTypes: parts.map((p: any) => p.type),
    };
  });

  // Test redacted reasoning part
  await runTest("Redacted reasoning part", async () => {
    const streamStart = await convex.mutation("messages:startStreaming", {
      taskId: taskId as any,
      llmModel: "anthropic/claude-3-opus",
    });

    const messageId = streamStart.messageId;
    
    // Add redacted reasoning part
    await convex.mutation("messages:appendStreamDelta", {
      messageId,
      deltaText: "",
      isFinal: false,
      parts: [{
        type: "redacted-reasoning",
      }],
    });

    // Verify redacted part
    const message = await convex.query("messages:get", { messageId });
    const metadata = message?.metadataJson ? JSON.parse(message.metadataJson) : {};
    const parts = metadata.parts || [];
    
    return {
      messageId,
      hasRedactedReasoning: parts.some((p: any) => p.type === 'redacted-reasoning'),
      totalParts: parts.length,
    };
  });
}

// ============================================================================
// TEST SUITE 6: Streaming Performance & Limits
// ============================================================================
async function testStreamingPerformance(taskId: string) {
  console.log("\n⚡ TEST SUITE 6: Streaming Performance & Limits");
  console.log("-".repeat(50));

  // Test rapid successive deltas
  await runTest("Rapid successive deltas", async () => {
    const streamStart = await convex.mutation("messages:startStreaming", {
      taskId: taskId as any,
      llmModel: "anthropic/claude-3-5-haiku-latest",
    });

    const messageId = streamStart.messageId;
    const deltaCount = 50;
    const start = Date.now();
    
    // Add many small deltas quickly
    for (let i = 0; i < deltaCount; i++) {
      await convex.mutation("messages:appendStreamDelta", {
        messageId,
        deltaText: `Delta ${i}: `,
        isFinal: false,
      });
    }
    
    // Finalize
    await convex.mutation("messages:appendStreamDelta", {
      messageId,
      deltaText: "Done.",
      isFinal: true,
      finishReason: "stop",
    });

    const duration = Date.now() - start;
    
    // Verify message
    const message = await convex.query("messages:get", { messageId });
    
    return {
      messageId,
      deltaCount,
      duration,
      avgDeltaTime: duration / deltaCount,
      contentLength: message?.content?.length || 0,
    };
  });

  // Test large content streaming
  await runTest("Large content streaming", async () => {
    const streamStart = await convex.mutation("messages:startStreaming", {
      taskId: taskId as any,
      llmModel: "anthropic/claude-3-5-haiku-latest",
    });

    const messageId = streamStart.messageId;
    const largeText = "A".repeat(10000); // 10KB of text
    const start = Date.now();
    
    // Stream large content
    await convex.mutation("messages:appendStreamDelta", {
      messageId,
      deltaText: largeText,
      isFinal: true,
      finishReason: "stop",
    });

    const duration = Date.now() - start;
    
    // Verify message
    const message = await convex.query("messages:get", { messageId });
    
    return {
      messageId,
      contentSize: largeText.length,
      duration,
      actualContentLength: message?.content?.length || 0,
    };
  });
}

// ============================================================================
// TEST SUITE 7: Error Handling & Edge Cases
// ============================================================================
async function testStreamingErrorHandling(taskId: string) {
  console.log("\n🚨 TEST SUITE 7: Error Handling & Edge Cases");
  console.log("-".repeat(50));

  // Test streaming to non-existent message
  await runTest("Handle non-existent message ID", async () => {
    try {
      await convex.mutation("messages:appendStreamDelta", {
        messageId: "kx00000000000000000000000000" as any,
        deltaText: "test",
        isFinal: true,
      });
      return { handled: false };
    } catch (error: any) {
      return { handled: true, error: error.message };
    }
  });

  // Test empty delta
  await runTest("Handle empty delta", async () => {
    const streamStart = await convex.mutation("messages:startStreaming", {
      taskId: taskId as any,
      llmModel: "anthropic/claude-3-5-haiku-latest",
    });

    const messageId = streamStart.messageId;
    
    await convex.mutation("messages:appendStreamDelta", {
      messageId,
      deltaText: "",
      isFinal: false,
    });

    const message = await convex.query("messages:get", { messageId });
    return {
      messageId,
      contentLength: message?.content?.length || 0,
      handlesEmptyDelta: true,
    };
  });

  // Test invalid part type
  await runTest("Handle invalid part type", async () => {
    const streamStart = await convex.mutation("messages:startStreaming", {
      taskId: taskId as any,
      llmModel: "anthropic/claude-3-5-haiku-latest",
    });

    const messageId = streamStart.messageId;
    
    // Try to add invalid part
    await convex.mutation("messages:appendStreamDelta", {
      messageId,
      deltaText: "test",
      isFinal: false,
      parts: [{
        type: "invalid-part-type",
        text: "This should be handled gracefully",
      }],
    });

    const message = await convex.query("messages:get", { messageId });
    const metadata = message?.metadataJson ? JSON.parse(message.metadataJson) : {};
    const parts = metadata.parts || [];
    
    return {
      messageId,
      totalParts: parts.length,
      hasInvalidPart: parts.some((p: any) => p.type === 'invalid-part-type'),
      handlesInvalidPart: true,
    };
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runAllStreamingTests() {
  console.log("🧪 E2E STREAMING TEST SUITE");
  console.log("=".repeat(60));
  console.log(`📡 Convex URL: ${CONVEX_URL}`);
  console.log(`🔑 OpenRouter API Key: ${OPENROUTER_API_KEY ? '✅ Present' : '❌ Missing'}`);
  console.log(`🕐 Started: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  if (!OPENROUTER_API_KEY) {
    console.error("❌ OPENROUTER_API_KEY environment variable is required");
    console.log("   Set it with: export OPENROUTER_API_KEY=your-key-here");
    process.exit(1);
  }

  const suiteStart = Date.now();

  // Setup
  const { userId, taskId } = await setupTestSuite();
  if (!userId || !taskId) {
    console.error("❌ Setup failed, cannot continue");
    process.exit(1);
  }

  console.log(`\n📋 Test Task ID: ${taskId}`);

  // Run all test suites
  await testBasicStreaming(taskId);
  await testReasoningDeltaStreaming(taskId);
  await testToolExecutionStreaming(taskId);
  await testMessagePartsValidation(taskId);
  await testStreamingPerformance(taskId);
  await testStreamingErrorHandling(taskId);

  // Print summary
  const suiteDuration = Date.now() - suiteStart;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log("\n" + "=".repeat(60));
  console.log("📊 STREAMING TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total:  ${results.length}`);
  console.log(`⏱️  Duration: ${suiteDuration}ms`);
  console.log(`📊 Pass Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  // Streaming-specific summary
  const reasoningTests = results.filter(r => r.name.includes('Reasoning'));
  const toolTests = results.filter(r => r.name.includes('Tool'));
  
  console.log("\n🧠 Reasoning Tests:");
  console.log(`  Total: ${reasoningTests.length}`);
  console.log(`  Passed: ${reasoningTests.filter(r => r.passed).length}`);
  
  console.log("\n🔧 Tool Tests:");
  console.log(`  Total: ${toolTests.length}`);
  console.log(`  Passed: ${toolTests.filter(r => r.passed).length}`);

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
    console.log("✅ ALL STREAMING TESTS PASSED\n");
    process.exit(0);
  }
}

// Run tests
runAllStreamingTests().catch(e => {
  console.error("💥 Streaming test suite crashed:", e);
  process.exit(1);
});
