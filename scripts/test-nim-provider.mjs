#!/usr/bin/env node
/**
 * NVIDIA NIM Provider Test Script
 * Tests Kimi K2 Thinking and DeepSeek V3.2 models via NVIDIA NIM API
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, streamText } from 'ai';

const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const NIM_API_KEY = process.env.NIM_API_KEY;

if (!NIM_API_KEY) {
    console.error('❌ NIM_API_KEY environment variable is required');
    console.log('Get your API key from: https://build.nvidia.com/explore/discover');
    process.exit(1);
}

// Create NIM client
const nim = createOpenAICompatible({
    name: 'nim',
    baseURL: NIM_BASE_URL,
    headers: {
        Authorization: `Bearer ${NIM_API_KEY}`,
    },
});

// Test models
const MODELS = [
    { id: 'moonshotai/kimi-k2-thinking', name: 'Kimi K2 Thinking' },
    { id: 'deepseek-ai/deepseek-v3.2', name: 'DeepSeek V3.2' },
    { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1' },
];

async function testGenerateText(modelId, modelName) {
    console.log(`\n🧪 Testing ${modelName} (${modelId}) - generateText...`);

    try {
        const startTime = Date.now();
        const { text, usage, finishReason } = await generateText({
            model: nim.chatModel(modelId),
            prompt: 'What is 2 + 2? Reply with just the number.',
            maxTokens: 100,
        });
        const duration = Date.now() - startTime;

        console.log(`   ✅ Response: "${text.trim()}"`);
        console.log(`   📊 Tokens: ${usage?.totalTokens || 'N/A'} | Finish: ${finishReason} | Time: ${duration}ms`);
        return { success: true, duration };
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testStreamText(modelId, modelName) {
    console.log(`\n🧪 Testing ${modelName} (${modelId}) - streamText...`);

    try {
        const startTime = Date.now();
        const result = streamText({
            model: nim.chatModel(modelId),
            prompt: 'Say "Hello from NIM!" and nothing else.',
            maxTokens: 50,
        });

        let fullText = '';
        process.stdout.write('   📝 Streaming: ');
        for await (const textPart of result.textStream) {
            process.stdout.write(textPart);
            fullText += textPart;
        }
        console.log();

        const duration = Date.now() - startTime;
        const usage = await result.usage;
        const finishReason = await result.finishReason;

        console.log(`   ✅ Complete | Tokens: ${usage?.totalTokens || 'N/A'} | Finish: ${finishReason} | Time: ${duration}ms`);
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
        const { text, toolCalls, finishReason } = await generateText({
            model: nim.chatModel(modelId),
            prompt: 'What is the weather in San Francisco?',
            maxTokens: 200,
            tools: {
                getWeather: {
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
        });
        const duration = Date.now() - startTime;

        if (toolCalls && toolCalls.length > 0) {
            console.log(`   ✅ Tool called: ${toolCalls[0].toolName}`);
            console.log(`   📋 Args: ${JSON.stringify(toolCalls[0].args)}`);
        } else {
            console.log(`   ⚠️  No tool call (model responded with text instead)`);
            console.log(`   📝 Response: "${text?.slice(0, 100)}..."`);
        }
        console.log(`   ⏱️  Time: ${duration}ms | Finish: ${finishReason}`);
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

        // Test generateText
        const genResult = await testGenerateText(model.id, model.name);
        results.push({ model: model.name, test: 'generateText', ...genResult });

        // Test streamText
        const streamResult = await testStreamText(model.id, model.name);
        results.push({ model: model.name, test: 'streamText', ...streamResult });

        // Test tool use (only for models that support it)
        if (model.id.includes('llama') || model.id.includes('deepseek-v3')) {
            const toolResult = await testToolUse(model.id, model.name);
            results.push({ model: model.name, test: 'toolUse', ...toolResult });
        }
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
