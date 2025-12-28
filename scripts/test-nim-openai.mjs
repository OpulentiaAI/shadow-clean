#!/usr/bin/env node
/**
 * NVIDIA NIM Provider Test Script (using OpenAI SDK)
 * Tests Kimi K2 Thinking and DeepSeek V3.2 models via NVIDIA NIM API
 */

import OpenAI from 'openai';

const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const NIM_API_KEY = process.env.NIM_API_KEY;

if (!NIM_API_KEY) {
    console.error('❌ NIM_API_KEY environment variable is required');
    console.log('Get your API key from: https://build.nvidia.com/explore/discover');
    process.exit(1);
}

// Create NIM client using OpenAI SDK
const client = new OpenAI({
    baseURL: NIM_BASE_URL,
    apiKey: NIM_API_KEY,
});

// Test models
const MODELS = [
    { id: 'moonshotai/kimi-k2-thinking', name: 'Kimi K2 Thinking' },
    { id: 'deepseek-ai/deepseek-v3.2', name: 'DeepSeek V3.2' },
];

async function testCompletion(modelId, modelName) {
    console.log(`\n🧪 Testing ${modelName} (${modelId})...`);

    try {
        const startTime = Date.now();
        const completion = await client.chat.completions.create({
            model: modelId,
            messages: [{ role: 'user', content: 'What is 2 + 2? Reply with just the number.' }],
            max_tokens: 100,
            temperature: 0.7,
        });
        const duration = Date.now() - startTime;

        const response = completion.choices[0]?.message?.content || '';
        console.log(`   ✅ Response: "${response.trim()}"`);
        console.log(`   📊 Tokens: ${completion.usage?.total_tokens || 'N/A'} | Time: ${duration}ms`);
        return { success: true, duration };
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testStreaming(modelId, modelName) {
    console.log(`\n🧪 Testing ${modelName} (${modelId}) - Streaming...`);

    try {
        const startTime = Date.now();
        const stream = await client.chat.completions.create({
            model: modelId,
            messages: [{ role: 'user', content: 'Say "Hello from NIM!" and nothing else.' }],
            max_tokens: 50,
            stream: true,
        });

        process.stdout.write('   📝 Streaming: ');
        let fullText = '';
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            process.stdout.write(content);
            fullText += content;
        }
        console.log();

        const duration = Date.now() - startTime;
        console.log(`   ✅ Complete | Time: ${duration}ms`);
        return { success: true, duration };
    } catch (error) {
        console.log(`\n   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testToolUse(modelId, modelName) {
    console.log(`\n🧪 Testing ${modelName} (${modelId}) - Tool Use...`);

    try {
        const startTime = Date.now();
        const completion = await client.chat.completions.create({
            model: modelId,
            messages: [{ role: 'user', content: 'What is the weather in San Francisco?' }],
            max_tokens: 200,
            tools: [
                {
                    type: 'function',
                    function: {
                        name: 'getWeather',
                        description: 'Get the current weather for a location',
                        parameters: {
                            type: 'object',
                            properties: {
                                location: {
                                    type: 'string',
                                    description: 'The city and state, e.g. San Francisco, CA',
                                },
                            },
                            required: ['location'],
                        },
                    },
                },
            ],
        });
        const duration = Date.now() - startTime;

        const toolCalls = completion.choices[0]?.message?.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
            console.log(`   ✅ Tool called: ${toolCalls[0].function.name}`);
            console.log(`   📋 Args: ${toolCalls[0].function.arguments}`);
        } else {
            const content = completion.choices[0]?.message?.content || '';
            console.log(`   ⚠️  No tool call (model responded with text instead)`);
            console.log(`   📝 Response: "${content.slice(0, 100)}..."`);
        }
        console.log(`   ⏱️  Time: ${duration}ms`);
        return { success: true, toolCalled: toolCalls?.length > 0, duration };
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('        NVIDIA NIM Provider Test Suite');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`API Endpoint: ${NIM_BASE_URL}`);
    console.log(`API Key: ${NIM_API_KEY.slice(0, 10)}...${NIM_API_KEY.slice(-4)}`);

    const results = [];

    for (const model of MODELS) {
        console.log('\n───────────────────────────────────────────────────────');
        console.log(`📦 Model: ${model.name}`);
        console.log('───────────────────────────────────────────────────────');

        // Test completion
        const compResult = await testCompletion(model.id, model.name);
        results.push({ model: model.name, test: 'completion', ...compResult });

        // Test streaming
        const streamResult = await testStreaming(model.id, model.name);
        results.push({ model: model.name, test: 'streaming', ...streamResult });

        // Test tool use
        const toolResult = await testToolUse(model.id, model.name);
        results.push({ model: model.name, test: 'toolUse', ...toolResult });
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                    TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════');

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
        console.log('\nFailed tests:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.model} / ${r.test}: ${r.error}`);
        });
    }

    console.log('\n═══════════════════════════════════════════════════════');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
