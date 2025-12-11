#!/usr/bin/env node
import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

async function testStreaming() {
    const convexUrl = "https://veracious-alligator-638.convex.cloud";
    const client = new ConvexHttpClient(convexUrl);

    console.log("Testing Convex streaming action directly...");
    console.log(`Using Convex URL: ${convexUrl}`);

    // First, let's list some tasks to find a valid one
    console.log("\nFinding a valid task...");

    // We need to create a task first or use an existing one
    // Get a test task ID from the database
    // For testing, we'll try with a known task or create one
    const testTaskId = "k57djtv6r12ffnesxd4qs9g1as7x21yb"; // Use existing task

    const apiKeys = {
        openrouter: "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",
        anthropic: undefined,
        openai: undefined
    };

    console.log("\nAPI Keys being sent:");
    console.log(`  openrouter: ${apiKeys.openrouter.substring(0, 12)}...${apiKeys.openrouter.substring(apiKeys.openrouter.length - 4)} (${apiKeys.openrouter.length} chars)`);

    try {
        console.log("\nCalling streamChatWithTools action...");
        const result = await client.action(api.streaming.streamChatWithTools, {
            taskId: testTaskId,
            prompt: "Hello, respond with just 'Hi there!'",
            model: "mistralai/devstral-2512:free", // Use free model for testing
            systemPrompt: "You are a helpful assistant. Keep responses very short.",
            llmModel: "mistralai/devstral-2512:free",
            apiKeys: apiKeys
        });

        console.log("\n✅ SUCCESS!");
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("\n❌ ERROR:");
        console.error("Message:", error.message);
        if (error.data) {
            console.error("Data:", JSON.stringify(error.data, null, 2));
        }
        console.error("Full error:", error);
    }
}

testStreaming();
