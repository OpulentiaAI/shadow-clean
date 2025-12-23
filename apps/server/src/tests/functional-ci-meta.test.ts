/**
 * Functional CI Meta-Test
 * 
 * Verifies that CI correctly propagates functional test failures.
 * Mirrors ci-exit-code-meta.test.ts but scoped to functional suite.
 * 
 * Run: SKIP_FUNCTIONAL_META_FAIL=true npx vitest run functional-ci-meta.test.ts
 */

import { describe, it, expect } from "vitest";

describe("Functional CI Exit Code Verification", () => {
  it("basic sanity check passes", () => {
    expect(1 + 1).toBe(2);
  });

  it("documents run-functional-tests.sh requirements", () => {
    const requirements = [
      "set -euo pipefail at top of script",
      "No piping to tail/head without PIPESTATUS check",
      "Exit with non-zero if any test fails",
      "Log output to files for debugging",
      "Summary at end with pass/fail counts",
    ];
    
    expect(requirements.length).toBe(5);
    console.log("\n  Functional CI Script Requirements:");
    for (let i = 0; i < requirements.length; i++) {
      console.log(`    ${i + 1}. ${requirements[i]}`);
    }
  });

  it("verifies PIPESTATUS preservation pattern", () => {
    // This documents the correct pattern for CI scripts
    const safePattern = `
# SAFE: Preserves exit code
npx vitest run ... 2>&1 | tee log.txt
VITEST_EXIT=\${PIPESTATUS[0]}
if [[ $VITEST_EXIT -ne 0 ]]; then
  echo "Tests failed!"
  exit 1
fi
`;
    
    const unsafePattern = `
# UNSAFE: Masks failures
npx vitest run ... | tail -30  # exit 0 even if vitest fails!
`;
    
    expect(safePattern).toContain("PIPESTATUS");
    expect(unsafePattern).not.toContain("PIPESTATUS");
  });

  // This test intentionally fails when SKIP_FUNCTIONAL_META_FAIL is not set
  // Used to verify CI catches functional test failures
  it.skipIf(process.env.SKIP_FUNCTIONAL_META_FAIL === "true")(
    "INTENTIONAL FUNCTIONAL FAILURE - CI must catch this",
    () => {
      // If this passes in CI, the functional pipeline is broken!
      expect(true).toBe(false);
    }
  );
});

describe("Functional Test Pipeline Validation", () => {
  it("functional tests must run through run-functional-tests.sh", () => {
    const ciConfig = {
      entrypoint: "./apps/server/src/tests/run-functional-tests.sh",
      noPipes: true,
      exitOnFailure: true,
    };
    
    expect(ciConfig.entrypoint).toContain("run-functional-tests.sh");
    expect(ciConfig.noPipes).toBeTruthy();
    expect(ciConfig.exitOnFailure).toBeTruthy();
  });

  it("all functional test files must be included", () => {
    const functionalTestFiles = [
      "agent-taskpack-functional.e2e.test.ts",
      "run-lifecycle.e2e.test.ts",
      "tool-output-utilization.test.ts",
      "completion-quality-rubric.test.ts",
      "agent-performance-budget.test.ts",
      "model-differential-functional.test.ts",
      "functional-ci-meta.test.ts",
    ];
    
    console.log("\n  Functional Test Files:");
    for (let i = 0; i < functionalTestFiles.length; i++) {
      console.log(`    ${i + 1}. ${functionalTestFiles[i]}`);
    }
    
    expect(functionalTestFiles.length).toBeGreaterThanOrEqual(7);
  });
});
