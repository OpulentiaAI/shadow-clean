/**
 * E2E Test for all OpenRouter models with tool calls
 * Tests each model can make a simple tool call
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, tool } from "ai";
import { z } from "zod";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MODELS = [
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview" },
  { id: "moonshotai/kimi-k2-thinking", name: "Kimi K2 Thinking" },
  { id: "mistralai/devstral-2512:free", name: "Devstral 2 (Free)" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3" },
  { id: "openai/gpt-5.1-codex", name: "GPT-5.1 Codex" },
  { id: "openai/gpt-5.1", name: "GPT-5.1" },
];

// Simple calculator tool for testing
const calculatorTool = tool({
  description: "Add two numbers together",
  parameters: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
  execute: async ({ a, b }) => {
    return { result: a + b };
  },
});

async function testModel(modelId: string, modelName: string): Promise<boolean> {
  console.log(`\n--- Testing ${modelName} (${modelId}) ---`);
  
  const openrouter = createOpenRouter({
    apiKey: OPENROUTER_API_KEY,
  });

  try {
    const startTime = Date.now();
    
    const result = await generateText({
      model: openrouter(modelId),
      prompt: "What is 15 + 27? Use the calculator tool to compute this.",
      tools: { calculator: calculatorTool },
      maxSteps: 2,
      maxTokens: 500,
    });

    const elapsed = Date.now() - startTime;
    
    // Check if tool was called
    const toolCalls = result.steps?.flatMap(s => s.toolCalls || []) || [];
    const hasToolCall = toolCalls.length > 0;
    
    if (hasToolCall) {
      console.log(`✅ ${modelName}: Tool call SUCCESS (${elapsed}ms)`);
      console.log(`   Tool calls: ${JSON.stringify(toolCalls.map(t => ({ name: t.toolName, args: t.args })))}`);
      console.log(`   Response: ${result.text?.substring(0, 100) || "(no text)"}`);
      return true;
    } else {
      console.log(`⚠️ ${modelName}: No tool call made (${elapsed}ms)`);
      console.log(`   Response: ${result.text?.substring(0, 150) || "(no text)"}`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ ${modelName}: ERROR`);
    console.log(`   ${error.message?.substring(0, 200) || error}`);
    return false;
  }
}

async function runAllTests() {
  console.log("🚀 OpenRouter Models Tool Call E2E Test");
  console.log("========================================");
  console.log(`OPENROUTER_API_KEY: ${OPENROUTER_API_KEY ? "✅ Set" : "❌ Not set"}`);
  
  if (!OPENROUTER_API_KEY) {
    console.error("ERROR: OPENROUTER_API_KEY not set");
    process.exit(1);
  }

  const results: Record<string, boolean> = {};

  for (const model of MODELS) {
    results[model.name] = await testModel(model.id, model.name);
  }

  console.log("\n========================================");
  console.log("📊 Test Results Summary:");
  console.log("========================================");

  let passed = 0;
  let failed = 0;

  for (const [name, success] of Object.entries(results)) {
    console.log(`  ${success ? "✅" : "❌"} ${name}`);
    if (success) passed++;
    else failed++;
  }

  console.log("========================================");
  console.log(`Total: ${passed} passed, ${failed} failed`);
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
