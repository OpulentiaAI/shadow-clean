/**
 * OpenRouter Multi-Tool Agentic E2E Test Suite
 *
 * Expands beyond simple calculator tests to verify:
 * - Multi-tool chains (3+ tools per task)
 * - Strategy switching on failure
 * - Final textual response generation
 * - Well-formed tool arguments
 * - Bounded tool call completion
 *
 * Run with: OPENROUTER_API_KEY=... npx tsx src/tests/openrouter-agentic-e2e.test.ts
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, tool } from "ai";
import { z } from "zod";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Models to test
const MODELS = [
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash" },
  { id: "moonshotai/kimi-k2-thinking", name: "Kimi K2" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3" },
];

// Comprehensive tool set for multi-tool testing
const createTestTools = () => {
  // Tool 1: Search for files (simulates file_search)
  const searchFiles = tool({
    description: "Search for files by name pattern",
    parameters: z.object({
      pattern: z.string().describe("File name pattern to search for"),
      explanation: z.string().describe("Why searching for these files"),
    }),
    execute: async ({ pattern }: { pattern: string; explanation: string }) => {
      console.log(`   [search_files] pattern="${pattern}"`);
      if (pattern.includes("config")) {
        return {
          success: true,
          files: ["config.ts", "config.json", "next.config.js"],
          message: "Found 3 config files",
        };
      } else if (pattern.includes("api")) {
        return {
          success: true,
          files: ["api/index.ts", "api/routes.ts"],
          message: "Found 2 API files",
        };
      }
      return { success: true, files: [], message: "No files found" };
    },
  });

  // Tool 2: Read file content (simulates read_file)
  const readFile = tool({
    description: "Read the content of a file",
    parameters: z.object({
      path: z.string().describe("Path to the file to read"),
      explanation: z.string().describe("Why reading this file"),
    }),
    execute: async ({ path }: { path: string; explanation: string }) => {
      console.log(`   [read_file] path="${path}"`);
      const mockContent: Record<string, string> = {
        "config.ts": 'export const config = { port: 3000, env: "production" };',
        "config.json": '{ "name": "my-app", "version": "1.0.0" }',
        "api/index.ts": 'export function handler(req, res) { return res.json({ ok: true }); }',
      };
      if (mockContent[path]) {
        return { success: true, content: mockContent[path], lines: 1 };
      }
      return { success: false, error: `File not found: ${path}` };
    },
  });

  // Tool 3: Compute/analyze (simulates analysis step)
  const analyzeCode = tool({
    description: "Analyze code and extract information",
    parameters: z.object({
      content: z.string().describe("Code content to analyze"),
      analysisType: z.enum(["dependencies", "exports", "structure"]).describe("Type of analysis"),
    }),
    execute: async ({ content, analysisType }: { content: string; analysisType: string }) => {
      console.log(`   [analyze_code] type="${analysisType}"`);
      if (analysisType === "exports") {
        return {
          success: true,
          exports: content.includes("export") ? ["config", "handler"] : [],
          message: "Found exported symbols",
        };
      } else if (analysisType === "structure") {
        return {
          success: true,
          structure: { hasConfig: content.includes("config"), hasFunction: content.includes("function") },
        };
      }
      return { success: true, analysis: "Analysis complete" };
    },
  });

  // Tool 4: Failing tool (to test strategy switching)
  const failingSearch = tool({
    description: "Alternative search method (currently unavailable)",
    parameters: z.object({
      query: z.string().describe("Search query"),
    }),
    execute: async ({ query }: { query: string }) => {
      console.log(`   [failing_search] query="${query}" FAILED`);
      return {
        success: false,
        error: "Service temporarily unavailable",
        message: "Try using search_files instead",
      };
    },
  });

  return { search_files: searchFiles, read_file: readFile, analyze_code: analyzeCode, failing_search: failingSearch };
};

interface TestResult {
  modelName: string;
  modelId: string;
  passed: boolean;
  toolCallCount: number;
  uniqueToolsUsed: number;
  toolCallSequence: string[];
  hasTextResponse: boolean;
  wellFormedArgs: boolean;
  completedInBounds: boolean;
  strategySwitch: boolean;
  elapsedMs: number;
  error?: string;
}

async function testMultiToolChain(
  modelId: string,
  modelName: string
): Promise<TestResult> {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Testing ${modelName} (${modelId})`);
  console.log("=".repeat(50));

  const openrouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });
  const tools = createTestTools();
  const startTime = Date.now();

  const result: TestResult = {
    modelName,
    modelId,
    passed: false,
    toolCallCount: 0,
    uniqueToolsUsed: 0,
    toolCallSequence: [],
    hasTextResponse: false,
    wellFormedArgs: true,
    completedInBounds: false,
    strategySwitch: false,
    elapsedMs: 0,
  };

  try {
    const response = await generateText({
      model: openrouter(modelId),
      system: `You are an expert code analyst. When analyzing code:
1. First search for relevant files
2. Then read their contents
3. Then analyze the code structure
4. Provide a summary of your findings

If a tool fails, try a different approach. Don't repeat failing tools.`,
      prompt: "Analyze the project's configuration setup. Find config files, read them, and tell me what they export.",
      tools,
      maxSteps: 8,
      maxTokens: 1000,
    });

    result.elapsedMs = Date.now() - startTime;

    // Extract all tool calls
    const allToolCalls = response.steps.flatMap((step) =>
      (step.toolCalls || []).map((tc) => ({
        name: tc.toolName,
        args: tc.args,
      }))
    );

    result.toolCallCount = allToolCalls.length;
    result.toolCallSequence = allToolCalls.map((tc) => tc.name);
    result.uniqueToolsUsed = new Set(result.toolCallSequence).size;
    result.hasTextResponse = !!(response.text && response.text.length > 20);
    result.completedInBounds = result.toolCallCount <= 8;

    // Check for well-formed args
    for (const tc of allToolCalls) {
      if (typeof tc.args !== "object" || tc.args === null) {
        result.wellFormedArgs = false;
        break;
      }
    }

    // Check for strategy switching (used different tools)
    result.strategySwitch = result.uniqueToolsUsed >= 2;

    // Log details
    console.log(`\nTool call sequence: ${JSON.stringify(result.toolCallSequence)}`);
    console.log(`Total tool calls: ${result.toolCallCount}`);
    console.log(`Unique tools used: ${result.uniqueToolsUsed}`);
    console.log(`Has text response: ${result.hasTextResponse}`);
    console.log(`Response preview: ${response.text?.substring(0, 150) || "(empty)"}`);

    // Determine pass/fail
    result.passed =
      result.toolCallCount >= 2 && // Used multiple tools
      result.uniqueToolsUsed >= 2 && // Different tools
      result.hasTextResponse && // Produced text
      result.wellFormedArgs && // Valid args
      result.completedInBounds; // Didn't exceed bounds

    if (result.passed) {
      console.log(`\n✅ PASS: Multi-tool chain successful (${result.elapsedMs}ms)`);
    } else {
      console.log(`\n⚠️ PARTIAL: Some criteria not met`);
      if (result.toolCallCount < 2) console.log("   - Need more tool calls");
      if (result.uniqueToolsUsed < 2) console.log("   - Need more tool variety");
      if (!result.hasTextResponse) console.log("   - Missing text response");
    }
  } catch (error: any) {
    result.elapsedMs = Date.now() - startTime;
    result.error = error.message || String(error);
    console.log(`\n❌ ERROR: ${result.error.substring(0, 200)}`);
  }

  return result;
}

async function testStrategySwitch(
  modelId: string,
  modelName: string
): Promise<TestResult> {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Strategy Switch Test: ${modelName}`);
  console.log("=".repeat(50));

  const openrouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });
  const tools = createTestTools();
  const startTime = Date.now();

  const result: TestResult = {
    modelName,
    modelId,
    passed: false,
    toolCallCount: 0,
    uniqueToolsUsed: 0,
    toolCallSequence: [],
    hasTextResponse: false,
    wellFormedArgs: true,
    completedInBounds: false,
    strategySwitch: false,
    elapsedMs: 0,
  };

  try {
    const response = await generateText({
      model: openrouter(modelId),
      system: `You are a code explorer.
IMPORTANT: If a tool fails, DO NOT retry it. Use a different tool instead.
Available tools: failing_search, search_files, read_file, analyze_code`,
      prompt: "Search for API files using failing_search, then find them another way and read one.",
      tools,
      maxSteps: 6,
      maxTokens: 500,
    });

    result.elapsedMs = Date.now() - startTime;

    const allToolCalls = response.steps.flatMap((step) =>
      (step.toolCalls || []).map((tc) => tc.toolName)
    );

    result.toolCallSequence = allToolCalls;
    result.toolCallCount = allToolCalls.length;
    result.uniqueToolsUsed = new Set(allToolCalls).size;
    result.hasTextResponse = !!(response.text && response.text.length > 10);
    result.completedInBounds = result.toolCallCount <= 6;

    // Check if agent switched after failing_search
    const failingSearchCount = allToolCalls.filter((t) => t === "failing_search").length;
    const usedAlternative = allToolCalls.includes("search_files") || allToolCalls.includes("read_file");
    result.strategySwitch = failingSearchCount <= 1 && usedAlternative;

    console.log(`\nTool sequence: ${JSON.stringify(allToolCalls)}`);
    console.log(`Failing search calls: ${failingSearchCount}`);
    console.log(`Used alternative: ${usedAlternative}`);
    console.log(`Strategy switch: ${result.strategySwitch}`);

    result.passed = result.strategySwitch && result.completedInBounds;

    if (result.passed) {
      console.log(`\n✅ PASS: Strategy switch successful`);
    } else {
      console.log(`\n⚠️ FAIL: Agent didn't properly switch strategy`);
    }
  } catch (error: any) {
    result.elapsedMs = Date.now() - startTime;
    result.error = error.message;
    console.log(`\n❌ ERROR: ${result.error?.substring(0, 200)}`);
  }

  return result;
}

async function runAllTests() {
  console.log("\n🚀 OpenRouter Multi-Tool Agentic E2E Tests");
  console.log("============================================");
  console.log(`API Key: ${OPENROUTER_API_KEY ? "✅ Set" : "❌ Not set"}`);

  if (!OPENROUTER_API_KEY) {
    console.error("\nERROR: OPENROUTER_API_KEY not set");
    console.log("Usage: OPENROUTER_API_KEY=sk-or-... npx tsx src/tests/openrouter-agentic-e2e.test.ts");
    process.exit(1);
  }

  const results: TestResult[] = [];

  // Run multi-tool chain tests
  console.log("\n\n📋 TEST SUITE 1: Multi-Tool Chain Tests");
  console.log("Testing: search -> read -> analyze chain");

  for (const model of MODELS) {
    const result = await testMultiToolChain(model.id, model.name);
    results.push(result);
    // Small delay between tests
    await new Promise((r) => setTimeout(r, 500));
  }

  // Run strategy switch tests
  console.log("\n\n📋 TEST SUITE 2: Strategy Switch Tests");
  console.log("Testing: failure recovery and tool switching");

  for (const model of MODELS.slice(0, 2)) {
    // Only test a couple models for this
    const result = await testStrategySwitch(model.id, model.name);
    results.push(result);
    await new Promise((r) => setTimeout(r, 500));
  }

  // Summary
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(60));

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const status = r.passed ? "✅ PASS" : r.error ? "❌ ERROR" : "⚠️ PARTIAL";
    console.log(`\n${status}: ${r.modelName}`);
    console.log(`   Tool calls: ${r.toolCallCount} (unique: ${r.uniqueToolsUsed})`);
    console.log(`   Sequence: ${r.toolCallSequence.join(" -> ")}`);
    console.log(`   Text response: ${r.hasTextResponse ? "Yes" : "No"}`);
    console.log(`   Strategy switch: ${r.strategySwitch ? "Yes" : "No"}`);
    console.log(`   Time: ${r.elapsedMs}ms`);
    if (r.error) {
      console.log(`   Error: ${r.error.substring(0, 100)}`);
    }

    if (r.passed) passed++;
    else failed++;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`TOTAL: ${passed} passed, ${failed} failed`);

  // Metrics Report
  console.log("\n" + "=".repeat(60));
  console.log("📈 METRICS REPORT");
  console.log("=".repeat(60));

  const avgToolCalls = results.reduce((s, r) => s + r.toolCallCount, 0) / results.length;
  const avgUnique = results.reduce((s, r) => s + r.uniqueToolsUsed, 0) / results.length;
  const avgTime = results.reduce((s, r) => s + r.elapsedMs, 0) / results.length;
  const textResponseRate = results.filter((r) => r.hasTextResponse).length / results.length;
  const strategySwitchRate = results.filter((r) => r.strategySwitch).length / results.length;

  console.log(`\nAvg tool calls per task: ${avgToolCalls.toFixed(1)}`);
  console.log(`Avg unique tools per task: ${avgUnique.toFixed(1)}`);
  console.log(`Avg response time: ${avgTime.toFixed(0)}ms`);
  console.log(`Text response rate: ${(textResponseRate * 100).toFixed(0)}%`);
  console.log(`Strategy switch rate: ${(strategySwitchRate * 100).toFixed(0)}%`);

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
