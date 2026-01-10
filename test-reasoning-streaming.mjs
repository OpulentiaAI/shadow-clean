#!/usr/bin/env node

/**
 * Test reasoning delta streaming for Convex-native agent
 * Tests models that support reasoning: DeepSeek R1, Claude with extended thinking, etc.
 */

import http from 'http';

const CONVEX_URL = process.env.CONVEX_URL || 'http://localhost:8000';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.MODEL || 'deepseek/deepseek-r1';

console.log(`[TEST] Starting reasoning delta test`);
console.log(`[TEST] Convex URL: ${CONVEX_URL}`);
console.log(`[TEST] Model: ${MODEL}`);
console.log(`[TEST] OpenRouter API Key present: ${!!OPENROUTER_API_KEY}`);

if (!OPENROUTER_API_KEY) {
  console.error('[ERROR] OPENROUTER_API_KEY environment variable not set');
  process.exit(1);
}

// Create test task via Convex
async function makeHttpRequest(url, method = 'POST', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            text: data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            text: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Main test
async function runTest() {
  try {
    console.log('\n[TEST] Creating test task...');
    const createTaskResponse = await makeHttpRequest(
      `${CONVEX_URL}/api/testHelpers.js/createTestTask`,
      'POST',
      { name: 'Reasoning Stream Test' }
    );

    if (createTaskResponse.status !== 200) {
      console.error('[ERROR] Failed to create test task:', createTaskResponse.text);
      process.exit(1);
    }

    const taskId = createTaskResponse.body?.taskId;
    console.log(`[TEST] Task created: ${taskId}`);

    // Test streaming with reasoning model
    console.log('\n[TEST] Testing reasoning delta streaming...');
    console.log(`[TEST] Sending prompt to ${MODEL}...`);

    const prompt = 'What is 2+2? Think step by step and show your reasoning.';

    // Make streaming call
    const streamResponse = await makeHttpRequest(
      `${CONVEX_URL}/api/streaming.js/streamChatWithTools`,
      'POST',
      {
        taskId,
        prompt,
        model: MODEL,
        llmModel: MODEL,
        tools: undefined,
        apiKeys: {
          openrouter: OPENROUTER_API_KEY,
        },
        clientMessageId: `test-${Date.now()}`,
      }
    );

    console.log(`[TEST] Stream response status: ${streamResponse.status}`);
    console.log(`[TEST] Stream response:`, JSON.stringify(streamResponse.body, null, 2));

    // Verify message was created
    if (streamResponse.body?.messageId) {
      console.log('\n[TEST] ✅ Message created successfully with ID:', streamResponse.body.messageId);
      
      // Fetch message to check for reasoning parts
      const msgResponse = await makeHttpRequest(
        `${CONVEX_URL}/api/messages.js/byTask?taskId=${taskId}`,
        'GET'
      );

      if (msgResponse.status === 200 && msgResponse.body?.length > 0) {
        const lastMsg = msgResponse.body[msgResponse.body.length - 1];
        const parts = lastMsg.metadata?.parts || [];
        const reasoningParts = parts.filter((p) => p.type === 'reasoning' || p.type === 'reasoning-delta');

        console.log(`[TEST] Message has ${parts.length} parts total`);
        console.log(`[TEST] Reasoning parts: ${reasoningParts.length}`);

        if (reasoningParts.length > 0) {
          console.log('[TEST] ✅ Reasoning deltas were captured!');
          reasoningParts.forEach((p, i) => {
            console.log(`  Part ${i + 1}: ${p.text?.substring(0, 100)}...`);
          });
        } else {
          console.log('[TEST] ⚠️  No reasoning parts found. Deltas may not be streaming.');
        }

        console.log('\n[TEST] Message structure:');
        console.log(`  ID: ${lastMsg._id}`);
        console.log(`  Role: ${lastMsg.role}`);
        console.log(`  Content length: ${lastMsg.content?.length || 0}`);
        console.log(`  Parts: ${parts.map((p) => p.type).join(', ')}`);
      }
    } else {
      console.error('[ERROR] No messageId in response');
      process.exit(1);
    }

    // Cleanup
    console.log('\n[TEST] Cleaning up test task...');
    await makeHttpRequest(`${CONVEX_URL}/api/testHelpers.js/deleteTestTask`, 'POST', { taskId });

    console.log('[TEST] ✅ Test completed successfully!\n');
  } catch (error) {
    console.error('[ERROR]', error);
    process.exit(1);
  }
}

runTest();
