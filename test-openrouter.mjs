#!/usr/bin/env node
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

async function testOpenRouter() {
    console.log("Testing OpenRouter with AI SDK 5...");
    console.log("OpenRouter provider version: 1.5.3");

    const apiKey = "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";
    console.log(`API Key: ${apiKey.substring(0, 12)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)`);

    const openrouter = createOpenRouter({
        apiKey: apiKey,
        headers: {
            "HTTP-Referer": "https://code.opulentia.ai",
            "X-Title": "Shadow Agent Test",
        },
    });

    try {
        console.log("\nTrying model: mistralai/devstral-2512:free");
        const result = await generateText({
            model: openrouter.chat("mistralai/devstral-2512:free"),
            prompt: "Say hello in exactly 3 words",
            maxTokens: 50,
        });

        console.log("\n✅ SUCCESS!");
        console.log("Response:", result.text);
        console.log("Usage:", result.usage);
    } catch (error) {
        console.error("\n❌ ERROR with mistralai/devstral-2512:free:");
        console.error("Message:", error.message);

        // Try another model
        console.log("\nTrying model: anthropic/claude-opus-4.5");
        try {
            const result2 = await generateText({
                model: openrouter.chat("anthropic/claude-opus-4.5"),
                prompt: "Say hello in exactly 3 words",
                maxTokens: 50,
            });

            console.log("\n✅ SUCCESS with claude-opus-4.5!");
            console.log("Response:", result2.text);
        } catch (error2) {
            console.error("\n❌ ERROR with claude-opus-4.5:");
            console.error("Message:", error2.message);
        }
    }
}

testOpenRouter();
