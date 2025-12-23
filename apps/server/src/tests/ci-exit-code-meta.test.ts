/**
 * CI Exit Code Meta-Test
 * 
 * This test suite verifies that CI correctly propagates test failures.
 * The SKIP_META_FAIL env var controls whether the intentional failure runs.
 * 
 * Usage:
 * - Normal CI: SKIP_META_FAIL=true npx vitest run ci-exit-code-meta.test.ts
 * - Verify CI catches failures: npx vitest run ci-exit-code-meta.test.ts
 *   (this SHOULD fail and CI should exit non-zero)
 * 
 * Run: npx vitest run apps/server/src/tests/ci-exit-code-meta.test.ts
 */

import { describe, it, expect } from "vitest";

describe("CI Exit Code Verification", () => {
  it("passes normally to verify test harness works", () => {
    expect(1 + 1).toBe(2);
  });

  it("verifies pipefail would catch failures", () => {
    // This test documents the pipefail requirement
    // The actual verification is done by the shell script
    const bashCommand = `
      set -euo pipefail
      false | cat  # This would exit 0 without pipefail, but exits 1 with it
    `;
    
    // We can't actually run bash here, but we document the expectation
    expect(bashCommand).toContain("pipefail");
  });

  // This test intentionally fails when SKIP_META_FAIL is not set
  // Use it to verify CI properly catches failures
  it.skipIf(process.env.SKIP_META_FAIL === "true")(
    "INTENTIONAL FAILURE - CI should catch this and exit non-zero",
    () => {
      // If CI passes when this runs, your pipeline is broken!
      expect(true).toBe(false);
    }
  );
});

describe("Pipeline Exit Code Patterns", () => {
  it("documents safe vs unsafe patterns", () => {
    const unsafePatterns = [
      // These can mask failures:
      "npx vitest run ... | tail -30",
      "npx vitest run ... 2>&1 | grep -v warning",
      "command | head -n 100",
    ];

    const safePatterns = [
      // These preserve exit codes:
      "npx vitest run ... --reporter=verbose",
      "npx vitest run ... 2>&1 | tee log.txt; test ${PIPESTATUS[0]} -eq 0",
      "set -o pipefail; command | tail -30",
    ];

    // Just documentation - these always pass
    expect(unsafePatterns.length).toBeGreaterThan(0);
    expect(safePatterns.length).toBeGreaterThan(0);
  });

  it("verifies PIPESTATUS array usage pattern", () => {
    // This is how you safely pipe in bash while preserving exit codes:
    const safePattern = `
#!/bin/bash
set -o pipefail

# Run test and capture exit code from PIPESTATUS
npx vitest run ... 2>&1 | tee vitest.log
VITEST_EXIT=\${PIPESTATUS[0]}

# Or using process substitution
npx vitest run ... > >(tee vitest.log) 2>&1
VITEST_EXIT=$?

exit $VITEST_EXIT
`;
    
    expect(safePattern).toContain("PIPESTATUS");
    expect(safePattern).toContain("pipefail");
  });
});
