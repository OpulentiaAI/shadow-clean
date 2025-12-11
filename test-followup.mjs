#!/usr/bin/env node

// Test the follow-up message flow by calling the server endpoints directly

async function testFollowUpFlow() {
    const serverUrl = "http://localhost:4000";

    console.log("=== Testing Follow-Up Message Flow ===\n");

    // First, we need a valid task ID - let's use one from the existing tasks
    // Looking at the logs, we have task IDs like: k5751pbejnafk10n9dvj74z0px7x2a12
    const testTaskId = "k5751pbejnafk10n9dvj74z0px7x2a12";

    // The cookie format for OpenRouter key
    const openrouterKey = "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";
    const cookieHeader = `openrouter-key=${openrouterKey}`;

    console.log(`Task ID: ${testTaskId}`);
    console.log(`Cookie: ${cookieHeader.substring(0, 30)}...`);

    // First, let's check if the task exists
    console.log("\n--- Step 1: Get Task Status ---");
    try {
        const taskResponse = await fetch(`${serverUrl}/api/tasks/${testTaskId}`, {
            headers: {
                "Cookie": cookieHeader
            }
        });
        console.log(`Task fetch status: ${taskResponse.status}`);
        const taskData = await taskResponse.json();
        console.log(`Task status: ${taskData.status}`);
        console.log(`Task mainModel: ${taskData.mainModel}`);
    } catch (e) {
        console.error("Error getting task:", e.message);
    }

    // Now try to submit a follow-up message
    console.log("\n--- Step 2: Submit Follow-up Message ---");
    try {
        const messageResponse = await fetch(`${serverUrl}/api/tasks/${testTaskId}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": cookieHeader
            },
            body: JSON.stringify({
                message: "What is 2+2?",
                model: "mistralai/devstral-2512:free"
            })
        });

        console.log(`Message submit status: ${messageResponse.status}`);
        const responseText = await messageResponse.text();
        console.log(`Response: ${responseText}`);

        if (messageResponse.ok) {
            console.log("\n✅ Follow-up message submitted successfully!");
            console.log("Check the server logs to see if the streaming action was called.");
        } else {
            console.log("\n❌ Follow-up message failed!");
        }
    } catch (e) {
        console.error("Error submitting message:", e.message);
    }
}

testFollowUpFlow();
