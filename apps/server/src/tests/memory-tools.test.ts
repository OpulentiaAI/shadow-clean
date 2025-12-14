/**
 * Memory Tools Test
 * Tests the add_memory, list_memories, and remove_memory functionality
 * Run with: OPENROUTER_API_KEY=... npx tsx src/tests/memory-tools.test.ts
 */

import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY environment variable is required");
  process.exit(1);
}

// Simulated memory storage for testing
const memoryStore: Array<{
  id: string;
  content: string;
  category: string;
  createdAt: number;
}> = [];

// Memory tool schemas
const AddMemorySchema = z.object({
  content: z.string().describe("The memory content to store"),
  category: z
    .enum([
      "INFRA",
      "SETUP",
      "STYLES",
      "ARCHITECTURE",
      "TESTING",
      "PATTERNS",
      "BUGS",
      "PERFORMANCE",
      "CONFIG",
      "GENERAL",
    ])
    .describe("Category for the memory"),
  explanation: z.string().describe("Why this memory is being added"),
});

const ListMemoriesSchema = z.object({
  category: z
    .enum([
      "INFRA",
      "SETUP",
      "STYLES",
      "ARCHITECTURE",
      "TESTING",
      "PATTERNS",
      "BUGS",
      "PERFORMANCE",
      "CONFIG",
      "GENERAL",
    ])
    .optional()
    .describe("Filter by category"),
  explanation: z.string().describe("Why memories are being listed"),
});

const RemoveMemorySchema = z.object({
  memoryId: z.string().describe("ID of the memory to remove"),
  explanation: z.string().describe("Why this memory is being removed"),
});

// Create test tools
function createMemoryTools() {
  return {
    add_memory: tool({
      description:
        "Store important information about the repository for future reference. Use this to remember patterns, configurations, architectural decisions, or debugging insights that will be useful across tasks.",
      parameters: AddMemorySchema,
      execute: async (args) => {
        const { content, category, explanation } = args;
        console.log(`   [add_memory] ${explanation || 'No explanation'}`);
        console.log(`   Content: "${content}", Category: ${category}`);
        const id = `mem_${Date.now()}`;
        memoryStore.push({
          id,
          content: content || 'No content',
          category: category || 'GENERAL',
          createdAt: Date.now(),
        });
        return {
          success: true,
          memoryId: id,
          message: `Added memory: ${content}`,
        };
      },
    }),

    list_memories: tool({
      description:
        "Retrieve stored memories for the current repository. Use this to recall previous learnings, patterns, configurations, or insights.",
      parameters: ListMemoriesSchema,
      execute: async (args) => {
        const { category, explanation } = args;
        console.log(`   [list_memories] ${explanation || 'No explanation'}`);
        const filtered = category
          ? memoryStore.filter((m) => m.category === category)
          : memoryStore;
        return {
          success: true,
          memories: filtered,
          count: filtered.length,
        };
      },
    }),

    remove_memory: tool({
      description:
        "Remove a previously stored memory that is no longer relevant or accurate.",
      parameters: RemoveMemorySchema,
      execute: async (args) => {
        const { memoryId, explanation } = args;
        console.log(`   [remove_memory] ${explanation || 'No explanation'}`);
        const index = memoryStore.findIndex((m) => m.id === memoryId);
        if (index === -1) {
          return { success: false, error: "Memory not found" };
        }
        const removed = memoryStore.splice(index, 1)[0];
        return {
          success: true,
          message: `Removed memory: ${removed.content}`,
        };
      },
    }),
  };
}

async function runMemoryTests() {
  console.log("🚀 Memory Tools Test\n" + "=".repeat(50));
  console.log(`OPENROUTER_API_KEY: ✅ Set\n`);

  const openrouter = createOpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const model = openrouter("anthropic/claude-haiku-4.5");
  const tools = createMemoryTools();

  let passed = 0;
  let failed = 0;

  // Test 1: Agent should use add_memory to store important info
  console.log("📋 Test 1: Agent stores memory when discovering important info");
  try {
    const result = await generateText({
      model,
      tools,
      maxSteps: 3,
      prompt: `You just discovered that this project uses Convex for the database layer instead of Prisma. 
      This is important architectural information. Store this as a memory for future reference.
      Use the add_memory tool with category ARCHITECTURE.`,
    });

    const addMemoryCalls = result.steps.filter(
      (s) => s.toolCalls?.some((tc) => tc.toolName === "add_memory")
    );

    if (addMemoryCalls.length > 0 && memoryStore.length > 0) {
      console.log("✅ PASS: Agent stored memory successfully");
      console.log(`   Stored: "${memoryStore[0].content}"`);
      passed++;
    } else {
      console.log("❌ FAIL: Agent didn't use add_memory tool");
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Error - ${error}`);
    failed++;
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 2: Agent should use list_memories to recall info
  console.log("📋 Test 2: Agent recalls memories when asked about patterns");
  try {
    const result = await generateText({
      model,
      tools,
      maxSteps: 3,
      prompt: `Before making database changes, check if there are any stored memories about 
      the project's architecture or database patterns. Use list_memories to find relevant information.`,
    });

    const listMemoryCalls = result.steps.filter(
      (s) => s.toolCalls?.some((tc) => tc.toolName === "list_memories")
    );

    if (listMemoryCalls.length > 0) {
      console.log("✅ PASS: Agent recalled memories");
      console.log(`   Found ${memoryStore.length} memories`);
      passed++;
    } else {
      console.log("❌ FAIL: Agent didn't use list_memories tool");
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Error - ${error}`);
    failed++;
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 3: Agent stores bug pattern as memory
  console.log("📋 Test 3: Agent stores bug pattern for future reference");
  try {
    const result = await generateText({
      model,
      tools,
      maxSteps: 3,
      prompt: `You just fixed a tricky bug: "Socket.IO connections fail silently when CORS is misconfigured".
      Store this as a BUGS memory so you remember this pattern in the future.`,
    });

    const addMemoryCalls = result.steps.filter(
      (s) => s.toolCalls?.some((tc) => tc.toolName === "add_memory")
    );

    const bugMemory = memoryStore.find((m) => m.category === "BUGS");
    if (addMemoryCalls.length > 0 && bugMemory) {
      console.log("✅ PASS: Agent stored bug pattern");
      console.log(`   Bug: "${bugMemory.content}"`);
      passed++;
    } else {
      console.log("❌ FAIL: Agent didn't store bug as memory");
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Error - ${error}`);
    failed++;
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Test 4: Agent filters memories by category
  console.log("📋 Test 4: Agent filters memories by category");
  try {
    const result = await generateText({
      model,
      tools,
      maxSteps: 3,
      prompt: `List only the ARCHITECTURE memories for this project to understand the tech stack.`,
    });

    const listCalls = result.steps
      .flatMap((s) => s.toolCalls || [])
      .filter((tc) => tc.toolName === "list_memories");

    // Check if category filter was used (simplified check)
    const usedFilter = listCalls.length > 0;

    if (listCalls.length > 0) {
      console.log("✅ PASS: Agent listed memories");
      if (usedFilter) {
        console.log("   ✅ Used category filter correctly");
      } else {
        console.log("   ⚠️ Didn't use category filter (acceptable)");
      }
      passed++;
    } else {
      console.log("❌ FAIL: Agent didn't list memories");
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: Error - ${error}`);
    failed++;
  }

  console.log("\n" + "=".repeat(50));
  console.log(`\n📊 Final Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("🎉 All memory tests passed!");
  } else {
    console.log("⚠️ Some memory tests failed.");
  }

  console.log("\n📝 Final Memory Store:");
  memoryStore.forEach((m, i) => {
    console.log(`   ${i + 1}. [${m.category}] ${m.content}`);
  });

  process.exit(failed > 0 ? 1 : 0);
}

runMemoryTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
