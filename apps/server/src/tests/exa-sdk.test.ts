/**
 * Test for Exa AI SDK web search functionality
 */

import { webSearch } from "@exalabs/ai-sdk";
import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const EXA_API_KEY = process.env.EXA_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function testExaWebSearch() {
  console.log("🔍 Exa AI SDK Web Search Test");
  console.log("================================");
  console.log(`EXA_API_KEY: ${EXA_API_KEY ? "✅ Set" : "❌ Not set"}`);
  console.log(`OPENROUTER_API_KEY: ${OPENROUTER_API_KEY ? "✅ Set" : "❌ Not set"}`);

  if (!EXA_API_KEY) {
    console.error("ERROR: EXA_API_KEY not set");
    process.exit(1);
  }

  if (!OPENROUTER_API_KEY) {
    console.error("ERROR: OPENROUTER_API_KEY not set");
    process.exit(1);
  }

  const openrouter = createOpenRouter({
    apiKey: OPENROUTER_API_KEY,
  });

  try {
    console.log("\n--- Testing Exa Web Search with AI ---");
    const startTime = Date.now();

    const result = await generateText({
      model: openrouter("deepseek/deepseek-chat"),
      prompt: "What are the latest AI developments in December 2024? Use web search to find current information.",
      system: "You are a helpful assistant. Use web search to find current information. Be concise.",
      tools: {
        webSearch: webSearch({
          numResults: 3,
          contents: {
            text: { maxCharacters: 500 },
          },
        }),
      },
      maxSteps: 3,
      maxTokens: 1000,
    });

    const elapsed = Date.now() - startTime;

    // Check if tool was called
    const toolCalls = result.steps?.flatMap((s) => s.toolCalls || []) || [];
    const hasToolCall = toolCalls.length > 0;

    if (hasToolCall) {
      console.log(`✅ Exa Web Search: Tool call SUCCESS (${elapsed}ms)`);
      console.log(`   Tool calls: ${toolCalls.length}`);
      console.log(`   Response preview: ${result.text?.substring(0, 200) || "(no text)"}...`);
    } else {
      console.log(`⚠️ Exa Web Search: No tool call made (${elapsed}ms)`);
      console.log(`   Response: ${result.text?.substring(0, 200) || "(no text)"}`);
    }

    console.log("\n================================");
    console.log("📊 Test Results Summary:");
    console.log("================================");
    console.log(`  ${hasToolCall ? "✅" : "⚠️"} Exa Web Search`);
    console.log("================================");
    console.log(`Test completed in ${elapsed}ms`);

    process.exit(hasToolCall ? 0 : 1);
  } catch (error: any) {
    console.log(`❌ Exa Web Search: ERROR`);
    console.log(`   Message: ${error.message?.substring(0, 300) || error}`);
    if (error.cause) {
      console.log(`   Cause: ${JSON.stringify(error.cause)?.substring(0, 300)}`);
    }
    process.exit(1);
  }
}

testExaWebSearch();
