/**
 * Agent Loop Behavior Tests
 * 
 * Tests to verify that the agent properly handles repeated tool failures
 * and breaks out of loops with actionable guidance.
 * 
 * Run with: OPENROUTER_API_KEY=... npx tsx src/tests/agent-loop-behavior.test.ts
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, tool } from "ai";
import { z } from "zod";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// System prompt with loop-breaking instructions (extracted from our changes)
const LOOP_BREAKING_SYSTEM_PROMPT = `You are an AI coding assistant.

BREAKING OUT OF LOOPS (CRITICAL):
If a tool fails, DO NOT retry the same tool with similar parameters more than once.
After a tool failure:
1. IMMEDIATELY try a DIFFERENT tool (e.g., if list_dir fails, try grep_search or semantic_search)
2. If multiple tools fail with similar errors, STOP and inform the user about the issue
3. Never repeat the same action more than twice - the definition of insanity is doing the same thing and expecting different results
4. If you find yourself about to say "I'll analyze the codebase" or "Let me try again" for a third time, STOP and ask the user for guidance

Available tools: list_dir, grep_search, semantic_search
When a tool fails, use the error message guidance to choose an alternative approach.`;

// Create tools with proper typing
function createTestTools() {
  const failingListDir = tool({
    description: "List directory contents",
    parameters: z.object({
      relative_workspace_path: z.string().describe("Path to list"),
      explanation: z.string().describe("Why listing this directory"),
    }),
    execute: async ({ relative_workspace_path }: { relative_workspace_path: string; explanation: string }) => {
      console.log(`   [list_dir] Called with path: ${relative_workspace_path}`);
      const errorMsg = `ENOENT: no such file or directory, scandir '${relative_workspace_path}'`;
      const guidance = "The directory does not exist. Try listing the root directory with '.' first, or use a different path. If the workspace is not initialized, wait for initialization to complete.";
      return {
        success: false,
        error: errorMsg,
        message: `Failed to list directory: ${relative_workspace_path}. ${guidance}`,
      };
    },
  });

  const failingGrepSearch = tool({
    description: "Search for text patterns in files",
    parameters: z.object({
      query: z.string().describe("Search query"),
      explanation: z.string().describe("Why searching for this"),
    }),
    execute: async ({ query }: { query: string; explanation: string }) => {
      console.log(`   [grep_search] Called with query: ${query}`);
      return {
        success: false,
        error: "Workspace not initialized",
        message: `Failed to search for "${query}". Try semantic_search or warp_grep as alternatives, or verify the workspace is initialized.`,
      };
    },
  });

  const workingSemanticSearch = tool({
    description: "Semantic search for code concepts - use this when other search tools fail",
    parameters: z.object({
      query: z.string().describe("Natural language search query"),
      explanation: z.string().describe("Why searching for this"),
    }),
    execute: async ({ query }: { query: string; explanation: string }) => {
      console.log(`   [semantic_search] Called with query: ${query} ✅`);
      return {
        success: true,
        results: [
          { file: "src/index.ts", snippet: "// Main entry point", relevance: 0.95 },
          { file: "src/utils.ts", snippet: "// Utility functions", relevance: 0.8 },
        ],
        message: `Found 2 results for "${query}"`,
      };
    },
  });

  return { list_dir: failingListDir, grep_search: failingGrepSearch, semantic_search: workingSemanticSearch };
}

async function runTests() {
  console.log("🚀 Agent Loop Behavior Tests");
  console.log("====================================\n");

  if (!OPENROUTER_API_KEY) {
    console.log("❌ OPENROUTER_API_KEY not set. Please set it to run tests.");
    console.log("   Example: OPENROUTER_API_KEY=sk-or-... npx tsx src/tests/agent-loop-behavior.test.ts");
    process.exit(1);
  }

  const openrouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });
  const tools = createTestTools();
  let passed = 0;
  let failed = 0;

  // Test 1: LLM should switch tools after failure
  console.log("📋 Test 1: LLM should switch tools after failure");
  console.log("   Scenario: list_dir and grep_search fail, semantic_search works");
  console.log("   Expected: Agent should try different tools and eventually use semantic_search\n");

  try {
    const result = await generateText({
      model: openrouter("moonshotai/kimi-k2-thinking"),
      system: LOOP_BREAKING_SYSTEM_PROMPT,
      prompt: "Find the main entry point of this codebase. Start by exploring the directory structure.",
      tools,
      maxSteps: 6,
    });

    const toolCalls = result.steps.flatMap(step => step.toolCalls?.map(tc => tc.toolName) || []);
    console.log(`\n📊 Tool call sequence: ${JSON.stringify(toolCalls)}`);
    console.log(`📝 Response: ${result.text?.substring(0, 200) || "(no text)"}\n`);

    const listDirCalls = toolCalls.filter(t => t === "list_dir").length;
    const grepCalls = toolCalls.filter(t => t === "grep_search").length;
    const semanticCalls = toolCalls.filter(t => t === "semantic_search").length;

    console.log(`   list_dir calls: ${listDirCalls}`);
    console.log(`   grep_search calls: ${grepCalls}`);
    console.log(`   semantic_search calls: ${semanticCalls}`);

    if (listDirCalls <= 2 && grepCalls <= 2) {
      console.log("✅ PASS: Agent did not hammer failing tools (≤2 calls each)");
      passed++;
    } else {
      console.log(`❌ FAIL: Agent repeated failing tools too many times`);
      failed++;
    }

    // Check if agent switched tools (didn't hammer same one)
    const uniqueTools = new Set(toolCalls);
    if (uniqueTools.size > 1) {
      console.log("✅ PASS: Agent switched between different tools");
      passed++;
    } else if (semanticCalls > 0) {
      console.log("✅ PASS: Agent discovered and used working alternative (semantic_search)");
      passed++;
    } else {
      const text = result.text?.toLowerCase() || "";
      if (text.includes("fail") || text.includes("error") || text.includes("unable") || text.includes("issue")) {
        console.log("✅ PASS: Agent communicated the issue to user");
        passed++;
      } else if (toolCalls.length <= 2) {
        console.log("✅ PASS: Agent stopped after limited attempts (no infinite loop)");
        passed++;
      } else {
        console.log("❌ FAIL: Agent didn't find alternative or communicate issue");
        failed++;
      }
    }
  } catch (error) {
    console.log(`❌ FAIL: Test threw error: ${error}`);
    failed++;
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: When ALL tools fail, agent should stop and communicate
  console.log("📋 Test 2: LLM should stop retrying when all tools fail");
  console.log("   Scenario: Only list_dir and grep_search available, both fail");
  console.log("   Expected: Agent should stop retrying and inform user\n");

  try {
    const { semantic_search, ...failingOnlyTools } = tools;
    
    const result = await generateText({
      model: openrouter("moonshotai/kimi-k2-thinking"),
      system: LOOP_BREAKING_SYSTEM_PROMPT,
      prompt: "Explore the codebase structure and find the main components.",
      tools: failingOnlyTools,
      maxSteps: 8,
    });

    const toolCalls = result.steps.flatMap(step => step.toolCalls?.map(tc => tc.toolName) || []);
    console.log(`\n📊 Tool call sequence: ${JSON.stringify(toolCalls)}`);
    console.log(`📝 Response: ${result.text?.substring(0, 300) || "(no text)"}\n`);

    // Count max consecutive same-tool calls
    let maxConsecutive = 1;
    let current = 1;
    for (let i = 1; i < toolCalls.length; i++) {
      if (toolCalls[i] === toolCalls[i - 1]) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 1;
      }
    }

    console.log(`   Max consecutive same-tool calls: ${maxConsecutive}`);
    console.log(`   Total tool calls: ${toolCalls.length}`);

    if (maxConsecutive <= 2) {
      console.log("✅ PASS: Agent respects 'no more than twice' rule");
      passed++;
    } else {
      console.log(`❌ FAIL: Agent called same tool ${maxConsecutive} times consecutively`);
      failed++;
    }

    const text = result.text?.toLowerCase() || "";
    const communicatedIssue = text.includes("fail") || text.includes("error") || 
                              text.includes("unable") || text.includes("cannot") ||
                              text.includes("issue") || text.includes("problem");
    
    if (communicatedIssue) {
      console.log("✅ PASS: Agent communicated the issue to user");
      passed++;
    } else {
      console.log("⚠️ WARN: Agent may not have clearly communicated the issue");
    }
  } catch (error) {
    console.log(`❌ FAIL: Test threw error: ${error}`);
    failed++;
  }

  console.log("\n" + "=".repeat(50));
  console.log(`\n📊 Final Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log("🎉 All tests passed! Loop-breaking behavior is working correctly.");
  } else {
    console.log("⚠️ Some tests failed. Agent may still exhibit looping behavior.");
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
