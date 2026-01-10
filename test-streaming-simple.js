#!/usr/bin/env node

/**
 * Simple Streaming Test Runner
 * Tests reasoning deltas and streaming functionality
 * 
 * This script can be run with: node test-streaming-simple.js
 * Or through the Convex CLI: npx convex run testStreaming
 */

import http from 'http';

const CONVEX_URL = process.env.CONVEX_URL || 'https://veracious-alligator-638.convex.cloud';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

console.log('🧪 SIMPLE STREAMING TEST RUNNER');
console.log('='.repeat(50));
console.log(`📡 Convex URL: ${CONVEX_URL}`);
console.log(`🔑 API Key: ${OPENROUTER_API_KEY ? '✅ Present' : '❌ Missing'}`);

if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY environment variable is required');
    process.exit(1);
}

// Helper to make HTTP requests to Convex
async function makeRequest(path, method = 'POST', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, CONVEX_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = data ? JSON.parse(data) : null;
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: result,
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

// Test 1: Create test task
async function testCreateTask() {
    console.log('\n📋 Test 1: Create Test Task');
    console.log('-'.repeat(30));

    try {
        const response = await makeRequest('/api/tasks.js/create', 'POST', {
            title: 'Streaming Test: Reasoning Deltas',
            repoFullName: 'opulentia/shadow-clean',
            repoUrl: 'https://github.com/opulentia/shadow-clean',
            userId: 'test-user-streaming',
            baseBranch: 'main',
            baseCommitSha: 'abc123def456789',
            shadowBranch: `shadow/streaming-test-${Date.now()}`,
            mainModel: 'deepseek/deepseek-r1',
            isScratchpad: true,
        });

        if (response.status !== 200) {
            throw new Error(`Failed to create task: ${response.text}`);
        }

        console.log(`✅ Task created: ${response.body.taskId}`);
        return response.body.taskId;
    } catch (error) {
        console.error(`❌ Failed to create task: ${error.message}`);
        throw error;
    }
}

// Test 2: Test reasoning streaming
async function testReasoningStreaming(taskId) {
    console.log('\n🧠 Test 2: Reasoning Delta Streaming');
    console.log('-'.repeat(30));

    try {
        const prompt = 'What is 15 * 23? Show your step-by-step reasoning.';

        const response = await makeRequest('/api/streaming.js/streamChatWithTools', 'POST', {
            taskId,
            prompt,
            model: 'deepseek/deepseek-r1',
            llmModel: 'deepseek/deepseek-r1',
            apiKeys: {
                openrouter: OPENROUTER_API_KEY,
            },
            clientMessageId: `reasoning-test-${Date.now()}`,
        });

        console.log(`📡 Stream initiated: ${response.status}`);

        if (response.body?.messageId) {
            console.log(`✅ Message ID: ${response.body.messageId}`);

            // Wait for streaming to complete
            console.log('⏳ Waiting for streaming to complete...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Check the message
            const msgResponse = await makeRequest(`/api/messages.js/byTask?taskId=${taskId}`, 'GET');

            if (msgResponse.status === 200 && msgResponse.body?.length > 0) {
                const latestMsg = msgResponse.body[msgResponse.body.length - 1];
                const metadata = latestMsg.metadataJson ? JSON.parse(latestMsg.metadataJson) : {};
                const parts = metadata.parts || [];
                const reasoningParts = parts.filter(p => p.type === 'reasoning');

                console.log(`📊 Message Analysis:`);
                console.log(`  Content length: ${latestMsg.content?.length || 0} chars`);
                console.log(`  Total parts: ${parts.length}`);
                console.log(`  Reasoning parts: ${reasoningParts.length}`);

                if (reasoningParts.length > 0) {
                    console.log('✅ Reasoning deltas captured!');
                    reasoningParts.forEach((part, i) => {
                        console.log(`  Part ${i + 1}: ${part.text?.substring(0, 100)}...`);
                    });
                } else {
                    console.log('⚠️  No reasoning parts found');
                }

                return {
                    success: true,
                    reasoningParts: reasoningParts.length,
                    totalParts: parts.length,
                };
            }
        } else {
            console.log('❌ No messageId in response');
            return { success: false, error: 'No messageId' };
        }
    } catch (error) {
        console.error(`❌ Reasoning stream test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Test 3: Test tool execution streaming
async function testToolStreaming(taskId) {
    console.log('\n🔧 Test 3: Tool Execution Streaming');
    console.log('-'.repeat(30));

    try {
        const prompt = 'List the files in the current directory';

        const response = await makeRequest('/api/streaming.js/streamChatWithTools', 'POST', {
            taskId,
            prompt,
            model: 'anthropic/claude-3-5-haiku-latest',
            llmModel: 'anthropic/claude-3-5-haiku-latest',
            apiKeys: {
                openrouter: OPENROUTER_API_KEY,
            },
            clientMessageId: `tool-test-${Date.now()}`,
        });

        console.log(`📡 Tool stream initiated: ${response.status}`);

        if (response.body?.messageId) {
            // Wait for streaming to complete
            console.log('⏳ Waiting for tool execution...');
            await new Promise(resolve => setTimeout(resolve, 8000));

            // Check for tool calls
            const toolResponse = await makeRequest(`/api/agentTools.js/byTask?taskId=${taskId}`, 'GET');

            if (toolResponse.status === 200) {
                const toolCalls = toolResponse.body || [];
                console.log(`🔧 Tool Analysis:`);
                console.log(`  Tool calls: ${toolCalls.length}`);

                if (toolCalls.length > 0) {
                    console.log('✅ Tool execution captured!');
                    toolCalls.forEach((tool, i) => {
                        console.log(`  Tool ${i + 1}: ${tool.toolName} (${tool.status})`);
                    });
                } else {
                    console.log('⚠️  No tool calls found');
                }

                return {
                    success: true,
                    toolCalls: toolCalls.length,
                    toolNames: toolCalls.map(t => t.toolName),
                };
            }
        }

        return { success: false, error: 'No tool data' };
    } catch (error) {
        console.error(`❌ Tool stream test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Test 4: Manual message parts test
async function testMessageParts(taskId) {
    console.log('\n🧩 Test 4: Manual Message Parts');
    console.log('-'.repeat(30));

    try {
        // Start streaming
        const startResponse = await makeRequest('/api/messages.js/startStreaming', 'POST', {
            taskId,
            llmModel: 'deepseek/deepseek-r1',
        });

        if (startResponse.status !== 200) {
            throw new Error(`Failed to start streaming: ${startResponse.text}`);
        }

        const messageId = startResponse.body.messageId;
        console.log(`📝 Started streaming: ${messageId}`);

        // Add reasoning part
        await makeRequest('/api/messages.js/appendStreamDelta', 'POST', {
            messageId,
            deltaText: 'Let me think step by step.\n',
            isFinal: false,
            parts: [{
                type: 'reasoning',
                text: 'First, I need to analyze the problem carefully.',
            }],
        });

        // Add text part
        await makeRequest('/api/messages.js/appendStreamDelta', 'POST', {
            messageId,
            deltaText: 'Based on my analysis:\n',
            isFinal: false,
            parts: [{
                type: 'text',
                text: 'The solution is to break it down into smaller steps.',
            }],
        });

        // Finalize
        await makeRequest('/api/messages.js/appendStreamDelta', 'POST', {
            messageId,
            deltaText: '',
            isFinal: true,
            finishReason: 'stop',
        });

        // Verify parts
        const msgResponse = await makeRequest(`/api/messages.js/get?messageId=${messageId}`, 'GET');

        if (msgResponse.status === 200) {
            const message = msgResponse.body;
            const metadata = message.metadataJson ? JSON.parse(message.metadataJson) : {};
            const parts = metadata.parts || [];

            console.log(`📊 Parts Analysis:`);
            console.log(`  Total parts: ${parts.length}`);
            console.log(`  Part types: ${parts.map(p => p.type).join(', ')}`);

            const reasoningParts = parts.filter(p => p.type === 'reasoning');
            const textParts = parts.filter(p => p.type === 'text');

            console.log(`  Reasoning parts: ${reasoningParts.length}`);
            console.log(`  Text parts: ${textParts.length}`);

            return {
                success: true,
                totalParts: parts.length,
                reasoningParts: reasoningParts.length,
                textParts: textParts.length,
            };
        }

        return { success: false, error: 'Failed to get message' };
    } catch (error) {
        console.error(`❌ Message parts test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Main test runner
async function runAllTests() {
    const startTime = Date.now();
    const results = [];

    try {
        // Test 1: Create task
        const taskId = await testCreateTask();
        results.push({ test: 'Create Task', success: !!taskId });

        if (!taskId) {
            throw new Error('Failed to create test task');
        }

        // Test 2: Reasoning streaming
        const reasoningResult = await testReasoningStreaming(taskId);
        results.push({ test: 'Reasoning Streaming', ...reasoningResult });

        // Test 3: Tool streaming
        const toolResult = await testToolStreaming(taskId);
        results.push({ test: 'Tool Streaming', ...toolResult });

        // Test 4: Message parts
        const partsResult = await testMessageParts(taskId);
        results.push({ test: 'Message Parts', ...partsResult });

        // Summary
        const duration = Date.now() - startTime;
        const passed = results.filter(r => r.success).length;
        const total = results.length;

        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${passed}/${total}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📈 Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);

        console.log('\n📋 Detailed Results:');
        results.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`  ${status} ${result.test}`);
            if (result.error) console.log(`    Error: ${result.error}`);
            if (result.reasoningParts) console.log(`    Reasoning parts: ${result.reasoningParts}`);
            if (result.toolCalls) console.log(`    Tool calls: ${result.toolCalls}`);
            if (result.totalParts) console.log(`    Total parts: ${result.totalParts}`);
        });

        // Cleanup
        console.log('\n🧹 Cleaning up test task...');
        await makeRequest('/api/tasks.js/delete', 'POST', { taskId });

        if (passed === total) {
            console.log('\n🎉 ALL TESTS PASSED!');
            process.exit(0);
        } else {
            console.log('\n❌ SOME TESTS FAILED');
            process.exit(1);
        }

    } catch (error) {
        console.error(`💥 Test suite crashed: ${error.message}`);
        process.exit(1);
    }
}

// Run the tests
runAllTests();
