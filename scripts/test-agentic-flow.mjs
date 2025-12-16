#!/usr/bin/env node
/**
 * End-to-End Agentic Flow Test Script
 * Tests the complete user journey through the Shadow system
 * 
 * Usage: node scripts/test-agentic-flow.mjs
 * Requires: CONVEX_URL environment variable
 */

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
    console.error('❌ CONVEX_URL environment variable required');
    process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function testAgenticFlow() {
    console.log('🚀 Starting end-to-end agentic flow test...\n');
    console.log(`📡 Convex URL: ${CONVEX_URL}\n`);

    const testRunId = `e2e-test-${Date.now()}`;
    const results = {
        tests: [],
        passed: 0,
        failed: 0,
    };

    function logTest(name, passed, details = '') {
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${name}${details ? `: ${details}` : ''}`);
        results.tests.push({ name, passed, details });
        if (passed) results.passed++;
        else results.failed++;
    }

    try {
        // Test 1: Feature Flags
        console.log('\n📋 Test 1: Feature Flag Verification');
        const flags = await client.query(api.monitoring.dashboard.getFeatureFlags);
        logTest('ENABLE_PROMPT_MESSAGE_ID', flags.ENABLE_PROMPT_MESSAGE_ID === true);
        logTest('ENABLE_WORKFLOW', flags.ENABLE_WORKFLOW === true);
        logTest('ENABLE_RETRY_WITH_BACKOFF', flags.ENABLE_RETRY_WITH_BACKOFF === true);

        // Test 2: System Health
        console.log('\n📋 Test 2: System Health Check');
        const health = await client.query(api.monitoring.dashboard.getSystemHealth);
        logTest('Health Status', health.health.status === 'healthy' || health.health.status === 'degraded', health.health.status);
        logTest('No Critical Alerts', health.health.alerts.length === 0, `${health.health.alerts.length} alerts`);

        // Test 3: promptMessageId Pattern
        console.log('\n📋 Test 3: promptMessageId Pattern (BP012)');
        const promptTest = await client.action(api.api.testHelpers.testPromptMessageId);
        logTest('savePromptMessage', promptTest.tests.savePromptMessage === 'PASS');
        logTest('createAssistantMessage', promptTest.tests.createAssistantMessage === 'PASS');
        logTest('findAssistantForPrompt', promptTest.tests.findAssistantForPrompt === 'PASS');
        logTest('fieldPersistence', promptTest.tests.fieldPersistence === 'PASS');

        // Test 4: Workflow Mode
        console.log('\n📋 Test 4: Workflow Mode Verification');
        const workflowMode = await client.query(api.api.testHelpers.checkWorkflowMode);
        logTest('Workflow Enabled', workflowMode.ENABLE_WORKFLOW === true);
        logTest('Mode is Workflow', workflowMode.mode === 'workflow', workflowMode.mode);

        // Test 5: API Connectivity
        console.log('\n📋 Test 5: API Connectivity');
        logTest('Convex Connected', true, 'All queries/actions succeeded');

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 END-TO-END TEST SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${results.tests.length}`);
        console.log(`Passed: ${results.passed}`);
        console.log(`Failed: ${results.failed}`);
        console.log(`Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);

        if (results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            results.tests.filter(t => !t.passed).forEach(t => {
                console.log(`   - ${t.name}: ${t.details}`);
            });
        }

        console.log('\n' + (results.failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'));

        return { success: results.failed === 0, results };

    } catch (error) {
        console.error('\n❌ Test execution failed:', error.message);
        console.error(error.stack);
        return { success: false, error: error.message };
    }
}

// Run if executed directly
testAgenticFlow().then(result => {
    process.exit(result.success ? 0 : 1);
});

export { testAgenticFlow };
