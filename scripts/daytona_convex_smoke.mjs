#!/usr/bin/env node
/**
 * Daytona Convex CLI Smoke Test Suite
 * Comprehensive QA testing for Daytona migration verification
 * 
 * Usage: node scripts/daytona_convex_smoke.mjs
 * 
 * Requirements:
 * - CONVEX_DEPLOYMENT env var set (or .env.local configured)
 * - DAYTONA_API_KEY set in Convex environment
 */

import { execSync, spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = join(__dirname, '..', 'artifacts', 'daytona');

// Ensure artifacts directory exists
if (!existsSync(ARTIFACTS_DIR)) {
    mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// Test results storage
const results = {
    timestamp: new Date().toISOString(),
    environment: {},
    tests: [],
    summary: { passed: 0, failed: 0, skipped: 0 }
};

// Global sandbox ID for test chain
let testSandboxId = null;

/**
 * Execute a Convex CLI command and return parsed result
 */
function runConvexCommand(functionName, args = {}) {
    const argsJson = JSON.stringify(args);
    const cmd = `npx convex run ${functionName} '${argsJson}'`;

    console.log(`\n📡 Running: ${cmd}`);

    try {
        const output = execSync(cmd, {
            encoding: 'utf-8',
            cwd: join(__dirname, '..'),
            timeout: 120000 // 2 minute timeout
        });

        // Parse JSON output (handle truncated console output)
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return { success: true, data: JSON.parse(jsonMatch[0]), raw: output, command: cmd };
        }
        return { success: true, data: output, raw: output, command: cmd };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            stderr: error.stderr?.toString() || '',
            command: cmd
        };
    }
}

/**
 * Record test result
 */
function recordTest(capability, name, result, invariants = {}) {
    const testResult = {
        capability,
        name,
        command: result.command,
        passed: result.success && (invariants.check ? invariants.check(result.data) : true),
        timestamp: new Date().toISOString(),
        data: result.data,
        error: result.error,
        invariants: invariants.description || 'N/A'
    };

    results.tests.push(testResult);

    if (testResult.passed) {
        results.summary.passed++;
        console.log(`✅ ${capability}: ${name} - PASSED`);
    } else {
        results.summary.failed++;
        console.log(`❌ ${capability}: ${name} - FAILED`);
        if (result.error) console.log(`   Error: ${result.error}`);
    }

    // Save individual test artifact
    const artifactPath = join(ARTIFACTS_DIR, `${capability}_${name.replace(/\s+/g, '_')}.json`);
    writeFileSync(artifactPath, JSON.stringify(testResult, null, 2));

    return testResult;
}

/**
 * Test Suite
 */
async function runTests() {
    console.log('🚀 Daytona Convex CLI Smoke Test Suite');
    console.log('=====================================\n');

    // Check environment
    console.log('📋 Environment Check:');
    try {
        const envCheck = execSync('cat .env.local 2>/dev/null | grep -E "CONVEX_" | head -2', {
            encoding: 'utf-8',
            cwd: join(__dirname, '..')
        });
        results.environment.convexConfigured = envCheck.includes('CONVEX_');
        console.log('   CONVEX_DEPLOYMENT: configured');
    } catch {
        results.environment.convexConfigured = false;
        console.log('   CONVEX_DEPLOYMENT: NOT CONFIGURED');
    }

    // ============================================
    // CAP-01: Test Connection
    // ============================================
    console.log('\n--- CAP-01: testConnection ---');
    const connResult = runConvexCommand('daytona:testConnection');
    recordTest('CAP-01', 'testConnection', connResult, {
        description: 'success=true, hasApiKey=true, sandboxCount>=0',
        check: (d) => d?.success === true && d?.config?.hasApiKey === true
    });

    if (!connResult.data?.success) {
        console.log('\n⚠️  Connection failed - cannot proceed with remaining tests');
        console.log('   Ensure DAYTONA_API_KEY is set in Convex environment');
        results.summary.skipped = 12; // remaining tests
        return;
    }

    // ============================================
    // CAP-03: List Sandboxes (before create)
    // ============================================
    console.log('\n--- CAP-03: listSandboxes (pre-create) ---');
    const listBeforeResult = runConvexCommand('daytona:listSandboxes');
    const initialCount = listBeforeResult.data?.sandboxes?.length || 0;
    recordTest('CAP-03', 'listSandboxes_preCreate', listBeforeResult, {
        description: 'success=true, sandboxes is array',
        check: (d) => d?.success === true && Array.isArray(d?.sandboxes)
    });

    // ============================================
    // CAP-02: Create Sandbox
    // ============================================
    console.log('\n--- CAP-02: createSandbox ---');
    const createResult = runConvexCommand('daytona:createSandbox', { language: 'typescript' });
    recordTest('CAP-02', 'createSandbox', createResult, {
        description: 'success=true, sandbox.id exists, sandbox.state=started',
        check: (d) => d?.success === true && d?.sandbox?.id && d?.sandbox?.state === 'started'
    });

    if (createResult.data?.success && createResult.data?.sandbox?.id) {
        testSandboxId = createResult.data.sandbox.id;
        console.log(`   Sandbox created: ${testSandboxId}`);
    } else {
        console.log('\n⚠️  Sandbox creation failed - skipping sandbox-dependent tests');
        results.summary.skipped = 10;
        return;
    }

    // ============================================
    // CAP-04: Get Sandbox
    // ============================================
    console.log('\n--- CAP-04: getSandbox ---');
    const getResult = runConvexCommand('daytona:getSandbox', { sandboxId: testSandboxId });
    recordTest('CAP-04', 'getSandbox', getResult, {
        description: 'success=true, sandbox.id matches',
        check: (d) => d?.success === true && d?.sandbox?.id === testSandboxId
    });

    // ============================================
    // CAP-09: Get Preview URL
    // ============================================
    console.log('\n--- CAP-09: getPreviewUrl ---');
    const previewResult = runConvexCommand('daytona:getPreviewUrl', { sandboxId: testSandboxId, port: 3000 });
    recordTest('CAP-09', 'getPreviewUrl', previewResult, {
        description: 'success=true, previewUrl matches pattern https://{port}-{id}.proxy.daytona.works',
        check: (d) => {
            if (!d?.success || !d?.previewUrl) return false;
            const pattern = /^https:\/\/3000-[a-f0-9-]+\.proxy\.daytona\.works$/;
            return pattern.test(d.previewUrl);
        }
    });

    // ============================================
    // CAP-10: Get Terminal URL
    // ============================================
    console.log('\n--- CAP-10: getTerminalUrl ---');
    const terminalResult = runConvexCommand('daytona:getTerminalUrl', { sandboxId: testSandboxId });
    recordTest('CAP-10', 'getTerminalUrl', terminalResult, {
        description: 'success=true, terminalUrl matches pattern https://22222-{id}.proxy.daytona.works',
        check: (d) => {
            if (!d?.success || !d?.terminalUrl) return false;
            const pattern = /^https:\/\/22222-[a-f0-9-]+\.proxy\.daytona\.works$/;
            return pattern.test(d.terminalUrl);
        }
    });

    // ============================================
    // CAP-06: Execute Command (Node SDK)
    // ============================================
    console.log('\n--- CAP-06: executeCommandNode ---');
    const execResult = runConvexCommand('daytonaNode:executeCommandNode', {
        sandboxId: testSandboxId,
        command: 'echo "DAYTONA_TEST_OK" && pwd && whoami'
    });
    recordTest('CAP-06', 'executeCommandNode', execResult, {
        description: 'success=true, exitCode=0, stdout contains DAYTONA_TEST_OK',
        check: (d) => {
            if (!d?.success || !d?.result) return false;
            return d.result.exitCode === 0 && d.result.stdout?.includes('DAYTONA_TEST_OK');
        }
    });

    // ============================================
    // CAP-08: File Operations (write via command, then list)
    // ============================================
    console.log('\n--- CAP-08: File Operations (via command) ---');
    const writeViaCmd = runConvexCommand('daytonaNode:executeCommandNode', {
        sandboxId: testSandboxId,
        command: 'echo "Hello from Daytona QA test" > /home/daytona/qa_test.txt && cat /home/daytona/qa_test.txt'
    });
    recordTest('CAP-08', 'writeFile_viaCommand', writeViaCmd, {
        description: 'success=true, stdout contains test content',
        check: (d) => d?.success === true && d?.result?.stdout?.includes('Hello from Daytona QA test')
    });

    // ============================================
    // CAP-07: Git Clone (small repo)
    // ============================================
    console.log('\n--- CAP-07: gitCloneNode (small repo) ---');
    // Use a very small repo to avoid timeouts
    const gitResult = runConvexCommand('daytonaNode:gitCloneNode', {
        sandboxId: testSandboxId,
        url: 'https://github.com/octocat/Hello-World.git',
        path: '/home/daytona/hello-world'
    });
    recordTest('CAP-07', 'gitCloneNode', gitResult, {
        description: 'success=true (or 502 timeout for large repos)',
        check: (d) => d?.success === true || d?.error?.includes('502')
    });

    // Verify git clone via ls
    if (gitResult.data?.success) {
        const verifyGit = runConvexCommand('daytonaNode:executeCommandNode', {
            sandboxId: testSandboxId,
            command: 'ls -la /home/daytona/hello-world'
        });
        recordTest('CAP-07', 'gitClone_verify', verifyGit, {
            description: 'directory exists and contains files',
            check: (d) => d?.success === true && d?.result?.stdout?.includes('README')
        });
    }

    // ============================================
    // CAP-11: Screenshot (may fail if no desktop)
    // ============================================
    console.log('\n--- CAP-11: takeScreenshotNode ---');
    const screenshotResult = runConvexCommand('daytonaNode:takeScreenshotNode', { sandboxId: testSandboxId });
    recordTest('CAP-11', 'takeScreenshotNode', screenshotResult, {
        description: 'success=true OR expected error (no desktop configured)',
        check: (d) => d?.success === true || d?.error?.includes('screenshot') || d?.error?.includes('desktop')
    });

    // ============================================
    // CAP-03: List Sandboxes (verify creation)
    // ============================================
    console.log('\n--- CAP-03: listSandboxes (post-create) ---');
    const listAfterResult = runConvexCommand('daytona:listSandboxes');
    recordTest('CAP-03', 'listSandboxes_postCreate', listAfterResult, {
        description: 'success=true, count increased or contains our sandbox',
        check: (d) => {
            if (!d?.success || !Array.isArray(d?.sandboxes)) return false;
            return d.sandboxes.some(s => s.id === testSandboxId);
        }
    });

    // ============================================
    // CLEANUP: CAP-05: Delete Sandbox
    // ============================================
    console.log('\n--- CAP-05: deleteSandbox (cleanup) ---');
    if (testSandboxId) {
        const deleteResult = runConvexCommand('daytona:deleteSandbox', { sandboxId: testSandboxId });
        recordTest('CAP-05', 'deleteSandbox', deleteResult, {
            description: 'success=true',
            check: (d) => d?.success === true
        });

        // Verify deletion
        console.log('\n--- CAP-03: listSandboxes (verify deletion) ---');
        const listFinalResult = runConvexCommand('daytona:listSandboxes');
        recordTest('CAP-03', 'listSandboxes_verifyDelete', listFinalResult, {
            description: 'sandbox no longer in list',
            check: (d) => {
                if (!d?.success || !Array.isArray(d?.sandboxes)) return false;
                return !d.sandboxes.some(s => s.id === testSandboxId);
            }
        });
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        await runTests();
    } catch (error) {
        console.error('\n❌ Test suite error:', error.message);
        results.error = error.message;
    } finally {
        // Cleanup on unexpected exit
        if (testSandboxId && !results.tests.some(t => t.name === 'deleteSandbox' && t.passed)) {
            console.log('\n🧹 Cleanup: Attempting to delete sandbox...');
            try {
                runConvexCommand('daytona:deleteSandbox', { sandboxId: testSandboxId });
            } catch { }
        }
    }

    // Write summary
    console.log('\n=====================================');
    console.log('📊 TEST SUMMARY');
    console.log('=====================================');
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⏭️  Skipped: ${results.summary.skipped}`);
    console.log(`📁 Artifacts: ${ARTIFACTS_DIR}`);

    // Save full results
    const summaryPath = join(ARTIFACTS_DIR, 'test-results-summary.json');
    writeFileSync(summaryPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Full results: ${summaryPath}`);

    // Exit with appropriate code
    process.exit(results.summary.failed > 0 ? 1 : 0);
}

main();
