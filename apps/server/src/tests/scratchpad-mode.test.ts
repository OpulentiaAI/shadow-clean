/**
 * Scratchpad Mode Spec Tests
 * 
 * Tests to verify that scratchpad mode functionality works correctly:
 * - Utility functions for building scratchpad URLs and names
 * - Detection of scratchpad repos
 * - Initialization steps for scratchpad mode
 * 
 * Run with: npx tsx src/tests/scratchpad-mode.test.ts
 */

import {
  SCRATCHPAD_REPO_OWNER,
  SCRATCHPAD_REPO_URL_SCHEME,
  SCRATCHPAD_BASE_BRANCH,
  SCRATCHPAD_DISPLAY_NAME,
  buildScratchpadRepoFullName,
  buildScratchpadRepoUrl,
  isScratchpadRepoFullName,
  getScratchpadSteps,
} from "@repo/types";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✅ ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${errorMsg}`);
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T): void {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: T): void {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy(): void {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy(): void {
      if (actual) {
        throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(item: unknown): void {
      if (!Array.isArray(actual) || !actual.includes(item)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`);
      }
    },
    toStartWith(prefix: string): void {
      if (typeof actual !== "string" || !actual.startsWith(prefix)) {
        throw new Error(`Expected "${actual}" to start with "${prefix}"`);
      }
    },
  };
}

async function runTests() {
  console.log("🚀 Scratchpad Mode Spec Tests");
  console.log("====================================\n");

  // ========== Constants Tests ==========
  console.log("📋 Constants Tests\n");

  test("SCRATCHPAD_REPO_OWNER should be 'scratchpad'", () => {
    expect(SCRATCHPAD_REPO_OWNER).toBe("scratchpad");
  });

  test("SCRATCHPAD_REPO_URL_SCHEME should be 'scratchpad://'", () => {
    expect(SCRATCHPAD_REPO_URL_SCHEME).toBe("scratchpad://");
  });

  test("SCRATCHPAD_BASE_BRANCH should be 'scratchpad-main'", () => {
    expect(SCRATCHPAD_BASE_BRANCH).toBe("scratchpad-main");
  });

  test("SCRATCHPAD_DISPLAY_NAME should be 'Scratchpad'", () => {
    expect(SCRATCHPAD_DISPLAY_NAME).toBe("Scratchpad");
  });

  // ========== buildScratchpadRepoFullName Tests ==========
  console.log("\n📋 buildScratchpadRepoFullName Tests\n");

  test("buildScratchpadRepoFullName should format taskId correctly", () => {
    const result = buildScratchpadRepoFullName("task123");
    expect(result).toBe("scratchpad/task123");
  });

  test("buildScratchpadRepoFullName should handle Convex-style IDs", () => {
    const result = buildScratchpadRepoFullName("j57abc123xyz");
    expect(result).toBe("scratchpad/j57abc123xyz");
  });

  test("buildScratchpadRepoFullName should handle empty taskId", () => {
    const result = buildScratchpadRepoFullName("");
    expect(result).toBe("scratchpad/");
  });

  // ========== buildScratchpadRepoUrl Tests ==========
  console.log("\n📋 buildScratchpadRepoUrl Tests\n");

  test("buildScratchpadRepoUrl should format URL correctly", () => {
    const result = buildScratchpadRepoUrl("task123");
    expect(result).toBe("scratchpad://task123");
  });

  test("buildScratchpadRepoUrl should handle Convex-style IDs", () => {
    const result = buildScratchpadRepoUrl("j57abc123xyz");
    expect(result).toBe("scratchpad://j57abc123xyz");
  });

  // ========== isScratchpadRepoFullName Tests ==========
  console.log("\n📋 isScratchpadRepoFullName Tests\n");

  test("isScratchpadRepoFullName should return true for valid scratchpad repo", () => {
    const result = isScratchpadRepoFullName("scratchpad/task123");
    expect(result).toBeTruthy();
  });

  test("isScratchpadRepoFullName should return true for any scratchpad/ prefix", () => {
    const result = isScratchpadRepoFullName("scratchpad/anything-here");
    expect(result).toBeTruthy();
  });

  test("isScratchpadRepoFullName should return false for GitHub repos", () => {
    const result = isScratchpadRepoFullName("owner/repo");
    expect(result).toBeFalsy();
  });

  test("isScratchpadRepoFullName should return false for null", () => {
    const result = isScratchpadRepoFullName(null);
    expect(result).toBeFalsy();
  });

  test("isScratchpadRepoFullName should return false for undefined", () => {
    const result = isScratchpadRepoFullName(undefined);
    expect(result).toBeFalsy();
  });

  test("isScratchpadRepoFullName should return false for empty string", () => {
    const result = isScratchpadRepoFullName("");
    expect(result).toBeFalsy();
  });

  test("isScratchpadRepoFullName should return false for partial match", () => {
    const result = isScratchpadRepoFullName("scratchpadowner/repo");
    expect(result).toBeFalsy();
  });

  // ========== getScratchpadSteps Tests ==========
  console.log("\n📋 getScratchpadSteps Tests\n");

  test("getScratchpadSteps should return minimal steps", () => {
    const steps = getScratchpadSteps();
    expect(steps.length).toBe(1);
  });

  test("getScratchpadSteps should include PREPARE_WORKSPACE", () => {
    const steps = getScratchpadSteps();
    expect(steps).toContain("PREPARE_WORKSPACE");
  });

  test("getScratchpadSteps should NOT include heavy steps like INSTALL_DEPENDENCIES", () => {
    const steps = getScratchpadSteps();
    const hasHeavySteps = steps.some((s: string) => 
      ["INSTALL_DEPENDENCIES", "START_BACKGROUND_SERVICES", "COMPLETE_SHADOW_WIKI"].includes(s)
    );
    expect(hasHeavySteps).toBeFalsy();
  });

  // ========== Integration Tests ==========
  console.log("\n📋 Integration Tests\n");

  test("Scratchpad URL should be parseable back to taskId", () => {
    const taskId = "testTask123";
    const url = buildScratchpadRepoUrl(taskId);
    const extractedId = url.replace(SCRATCHPAD_REPO_URL_SCHEME, "");
    expect(extractedId).toBe(taskId);
  });

  test("Scratchpad repo full name should be parseable back to taskId", () => {
    const taskId = "testTask456";
    const fullName = buildScratchpadRepoFullName(taskId);
    const extractedId = fullName.replace(`${SCRATCHPAD_REPO_OWNER}/`, "");
    expect(extractedId).toBe(taskId);
  });

  test("Built scratchpad repo should be detected by isScratchpadRepoFullName", () => {
    const taskId = "integrationTest789";
    const fullName = buildScratchpadRepoFullName(taskId);
    const isDetected = isScratchpadRepoFullName(fullName);
    expect(isDetected).toBeTruthy();
  });

  // ========== Summary ==========
  console.log("\n====================================");
  console.log("📊 Test Results Summary:");
  console.log("====================================\n");

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  for (const result of results) {
    console.log(`  ${result.passed ? "✅" : "❌"} ${result.name}`);
  }

  console.log("\n====================================");
  console.log(`Total: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("🎉 All scratchpad mode tests passed!");
  } else {
    console.log("⚠️ Some tests failed.");
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
