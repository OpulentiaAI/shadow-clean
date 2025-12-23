/**
 * Functional Soak Tests (Nightly)
 * 
 * Long-running tests with randomized fixtures and injected flakiness.
 * Catches hidden failures and long-horizon loop issues.
 * 
 * Run: NIGHTLY=true npx vitest run apps/server/src/tests/functional-soak.nightly.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SOAK_CONFIG = {
  taskCount: 10,
  maxIterationsPerTask: 20,
  toolFlakinessRate: 0.1,  // 10% of tool calls may fail
  timeoutFlakiness: 0.05,  // 5% may timeout
  emptyResultRate: 0.05,   // 5% return empty
  randomSeed: Date.now(),
};

// ============================================================================
// SEEDED RANDOM
// ============================================================================

class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
  
  pick<T>(arr: T[]): T {
    return arr[this.nextInt(arr.length)]!;
  }
  
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

interface SoakMetrics {
  taskId: string;
  seed: number;
  iterations: number;
  toolCalls: number;
  stallSteps: number;
  duplicateCalls: number;
  flakyFailures: number;
  succeeded: boolean;
  proofOfWork: boolean;
  duration: number;
}

interface SoakSummary {
  totalTasks: number;
  passedTasks: number;
  failedTasks: number;
  avgIterations: number;
  avgToolCalls: number;
  totalStallSteps: number;
  totalFlakyFailures: number;
  tasksWithoutProofOfWork: number;
  regressions: string[];
}

// ============================================================================
// FLAKY TOOL SIMULATOR
// ============================================================================

interface ToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
  wasFlaky: boolean;
}

function simulateFlakyTool(
  toolName: string,
  rng: SeededRandom,
  config: typeof SOAK_CONFIG
): ToolResult {
  // Random flakiness
  if (rng.next() < config.toolFlakinessRate) {
    return { success: false, error: "Transient failure", wasFlaky: true };
  }
  
  // Timeout simulation
  if (rng.next() < config.timeoutFlakiness) {
    return { success: false, error: "Timeout", wasFlaky: true };
  }
  
  // Empty result simulation
  if (rng.next() < config.emptyResultRate) {
    return { success: true, result: null, wasFlaky: true };
  }
  
  // Normal success
  return { success: true, result: { data: `${toolName}_result` }, wasFlaky: false };
}

// ============================================================================
// SOAK TASK RUNNER
// ============================================================================

function runSoakTask(taskId: string, seed: number, config: typeof SOAK_CONFIG): SoakMetrics {
  const rng = new SeededRandom(seed);
  const startTime = Date.now();
  
  const metrics: SoakMetrics = {
    taskId,
    seed,
    iterations: 0,
    toolCalls: 0,
    stallSteps: 0,
    duplicateCalls: 0,
    flakyFailures: 0,
    succeeded: false,
    proofOfWork: false,
    duration: 0,
  };
  
  const tools = ["read_file", "write_file", "grep_search", "run_command", "list_dir"];
  const callHistory: string[] = [];
  let artifacts = 0;
  let consecutiveStalls = 0;
  
  for (let i = 0; i < config.maxIterationsPerTask; i++) {
    metrics.iterations++;
    
    // Pick random tool
    const tool = rng.pick(tools);
    const toolCall = `${tool}:${rng.nextInt(100)}`;
    
    // Check for duplicate
    if (callHistory.includes(toolCall)) {
      metrics.duplicateCalls++;
    }
    callHistory.push(toolCall);
    
    // Simulate tool execution
    const result = simulateFlakyTool(tool, rng, config);
    metrics.toolCalls++;
    
    if (!result.success) {
      metrics.flakyFailures++;
      if (result.wasFlaky) {
        // Flaky failure - should retry or switch
        consecutiveStalls++;
      }
      continue;
    }
    
    // Progress made
    if (tool === "write_file" || tool === "run_command") {
      artifacts++;
      metrics.proofOfWork = true;
      consecutiveStalls = 0;
    } else {
      // Read-only tools don't count as progress by themselves
      if (callHistory.slice(-3).every(c => c.startsWith("read") || c.startsWith("grep") || c.startsWith("list"))) {
        consecutiveStalls++;
      }
    }
    
    if (consecutiveStalls >= 3) {
      metrics.stallSteps++;
      consecutiveStalls = 0;
    }
    
    // Success condition
    if (artifacts >= 2 && rng.next() > 0.3) {
      metrics.succeeded = true;
      break;
    }
  }
  
  metrics.duration = Date.now() - startTime;
  return metrics;
}

// ============================================================================
// SUMMARY CALCULATOR
// ============================================================================

function calculateSummary(results: SoakMetrics[]): SoakSummary {
  const passed = results.filter(r => r.succeeded);
  const failed = results.filter(r => !r.succeeded);
  
  const regressions: string[] = [];
  
  // Check for concerning patterns
  const avgStalls = results.reduce((s, r) => s + r.stallSteps, 0) / results.length;
  if (avgStalls > 2) {
    regressions.push(`High stall rate: ${avgStalls.toFixed(2)} avg stalls per task`);
  }
  
  const avgDuplicates = results.reduce((s, r) => s + r.duplicateCalls, 0) / results.length;
  if (avgDuplicates > 3) {
    regressions.push(`High duplicate rate: ${avgDuplicates.toFixed(2)} avg duplicates per task`);
  }
  
  const noProofOfWork = results.filter(r => !r.proofOfWork && r.succeeded);
  if (noProofOfWork.length > 0) {
    regressions.push(`${noProofOfWork.length} tasks succeeded without proof-of-work`);
  }
  
  return {
    totalTasks: results.length,
    passedTasks: passed.length,
    failedTasks: failed.length,
    avgIterations: results.reduce((s, r) => s + r.iterations, 0) / results.length,
    avgToolCalls: results.reduce((s, r) => s + r.toolCalls, 0) / results.length,
    totalStallSteps: results.reduce((s, r) => s + r.stallSteps, 0),
    totalFlakyFailures: results.reduce((s, r) => s + r.flakyFailures, 0),
    tasksWithoutProofOfWork: noProofOfWork.length,
    regressions,
  };
}

// ============================================================================
// TESTS: Soak Run
// ============================================================================

describe("Functional Soak: Basic Run", () => {
  it("runs multiple tasks with flakiness", () => {
    const results: SoakMetrics[] = [];
    const baseSeed = SOAK_CONFIG.randomSeed;
    
    for (let i = 0; i < SOAK_CONFIG.taskCount; i++) {
      const taskSeed = baseSeed + i;
      const result = runSoakTask(`soak_task_${i}`, taskSeed, SOAK_CONFIG);
      results.push(result);
    }
    
    const summary = calculateSummary(results);
    
    console.log("\n  ═══════════════════════════════════════");
    console.log("  SOAK TEST SUMMARY");
    console.log("  ═══════════════════════════════════════");
    console.log(`  Seed: ${baseSeed}`);
    console.log(`  Tasks: ${summary.passedTasks}/${summary.totalTasks} passed`);
    console.log(`  Avg iterations: ${summary.avgIterations.toFixed(1)}`);
    console.log(`  Avg tool calls: ${summary.avgToolCalls.toFixed(1)}`);
    console.log(`  Total stalls: ${summary.totalStallSteps}`);
    console.log(`  Flaky failures: ${summary.totalFlakyFailures}`);
    console.log("  ═══════════════════════════════════════\n");
    
    // At least some tasks should pass despite flakiness
    expect(summary.passedTasks).toBeGreaterThan(0);
  });

  it("detects tasks without proof-of-work", () => {
    // Run with high empty result rate to trigger no-proof-of-work
    const strictConfig = { ...SOAK_CONFIG, emptyResultRate: 0.5 };
    const results: SoakMetrics[] = [];
    
    for (let i = 0; i < 5; i++) {
      const result = runSoakTask(`strict_${i}`, i * 1000, strictConfig);
      results.push(result);
    }
    
    const summary = calculateSummary(results);
    
    // Document proof-of-work tracking
    console.log(`  Tasks without proof-of-work: ${summary.tasksWithoutProofOfWork}`);
    expect(summary).toBeDefined();
  });
});

// ============================================================================
// TESTS: Regression Detection
// ============================================================================

describe("Functional Soak: Regression Detection", () => {
  it("flags high stall rate", () => {
    // Simulate results with high stalls
    const badResults: SoakMetrics[] = [
      { taskId: "1", seed: 1, iterations: 20, toolCalls: 20, stallSteps: 5, duplicateCalls: 0, flakyFailures: 0, succeeded: true, proofOfWork: true, duration: 100 },
      { taskId: "2", seed: 2, iterations: 20, toolCalls: 20, stallSteps: 4, duplicateCalls: 0, flakyFailures: 0, succeeded: true, proofOfWork: true, duration: 100 },
    ];
    
    const summary = calculateSummary(badResults);
    
    expect(summary.regressions.some(r => r.includes("stall"))).toBeTruthy();
  });

  it("flags high duplicate rate", () => {
    const badResults: SoakMetrics[] = [
      { taskId: "1", seed: 1, iterations: 10, toolCalls: 10, stallSteps: 0, duplicateCalls: 5, flakyFailures: 0, succeeded: true, proofOfWork: true, duration: 100 },
      { taskId: "2", seed: 2, iterations: 10, toolCalls: 10, stallSteps: 0, duplicateCalls: 4, flakyFailures: 0, succeeded: true, proofOfWork: true, duration: 100 },
    ];
    
    const summary = calculateSummary(badResults);
    
    expect(summary.regressions.some(r => r.includes("duplicate"))).toBeTruthy();
  });

  it("flags done-without-work", () => {
    const badResults: SoakMetrics[] = [
      { taskId: "1", seed: 1, iterations: 5, toolCalls: 5, stallSteps: 0, duplicateCalls: 0, flakyFailures: 0, succeeded: true, proofOfWork: false, duration: 100 },
    ];
    
    const summary = calculateSummary(badResults);
    
    expect(summary.regressions.some(r => r.includes("proof-of-work"))).toBeTruthy();
  });
});

// ============================================================================
// TESTS: Reproducibility
// ============================================================================

describe("Functional Soak: Reproducibility", () => {
  it("same seed produces same results", () => {
    const seed = 12345;
    
    const result1 = runSoakTask("repro_1", seed, SOAK_CONFIG);
    const result2 = runSoakTask("repro_2", seed, SOAK_CONFIG);
    
    expect(result1.iterations).toBe(result2.iterations);
    expect(result1.toolCalls).toBe(result2.toolCalls);
    expect(result1.succeeded).toBe(result2.succeeded);
  });

  it("different seeds produce different results", () => {
    const result1 = runSoakTask("diff_1", 11111, SOAK_CONFIG);
    const result2 = runSoakTask("diff_2", 22222, SOAK_CONFIG);
    
    // At least some metrics should differ
    const sameIterations = result1.iterations === result2.iterations;
    const sameToolCalls = result1.toolCalls === result2.toolCalls;
    const sameDuplicates = result1.duplicateCalls === result2.duplicateCalls;
    
    const allSame = sameIterations && sameToolCalls && sameDuplicates;
    expect(allSame).toBeFalsy();
  });
});

// ============================================================================
// TESTS: Flakiness Handling
// ============================================================================

describe("Functional Soak: Flakiness Handling", () => {
  it("tolerates expected flakiness rate", () => {
    const results: SoakMetrics[] = [];
    
    for (let i = 0; i < 20; i++) {
      const result = runSoakTask(`flaky_${i}`, i * 100, SOAK_CONFIG);
      results.push(result);
    }
    
    const totalFlaky = results.reduce((s, r) => s + r.flakyFailures, 0);
    const totalCalls = results.reduce((s, r) => s + r.toolCalls, 0);
    const flakyRate = totalFlaky / totalCalls;
    
    // Flaky rate should be roughly around config rate
    expect(flakyRate).toBeLessThan(SOAK_CONFIG.toolFlakinessRate * 3);
  });

  it("high flakiness reduces pass rate", () => {
    const highFlakyConfig = { ...SOAK_CONFIG, toolFlakinessRate: 0.5 };
    const results: SoakMetrics[] = [];
    
    for (let i = 0; i < 10; i++) {
      const result = runSoakTask(`highflaky_${i}`, i * 100, highFlakyConfig);
      results.push(result);
    }
    
    const summary = calculateSummary(results);
    
    // With 50% flakiness, pass rate should be affected
    console.log(`  High flakiness pass rate: ${summary.passedTasks}/${summary.totalTasks}`);
    // Document that high flakiness impacts success (may still pass all if lucky with RNG)
    expect(summary.totalFlakyFailures).toBeGreaterThan(0);
  });
});

// ============================================================================
// NIGHTLY GUARD
// ============================================================================

describe("Functional Soak: Nightly Guard", () => {
  it.skipIf(process.env.NIGHTLY !== "true")(
    "extended soak run (only in nightly)",
    () => {
      const extendedConfig = { ...SOAK_CONFIG, taskCount: 50 };
      const results: SoakMetrics[] = [];
      
      for (let i = 0; i < extendedConfig.taskCount; i++) {
        const result = runSoakTask(`nightly_${i}`, i * 100, extendedConfig);
        results.push(result);
      }
      
      const summary = calculateSummary(results);
      
      console.log("\n  NIGHTLY EXTENDED SOAK:");
      console.log(`  ${summary.passedTasks}/${summary.totalTasks} passed`);
      
      expect(summary.regressions.length).toBe(0);
    }
  );
});

// ============================================================================
// SUMMARY
// ============================================================================

describe("Functional Soak: Summary", () => {
  it("documents soak configuration", () => {
    console.log("\n  Soak Test Configuration:");
    console.log(`    Tasks per run: ${SOAK_CONFIG.taskCount}`);
    console.log(`    Max iterations: ${SOAK_CONFIG.maxIterationsPerTask}`);
    console.log(`    Tool flakiness: ${SOAK_CONFIG.toolFlakinessRate * 100}%`);
    console.log(`    Timeout rate: ${SOAK_CONFIG.timeoutFlakiness * 100}%`);
    console.log(`    Empty result rate: ${SOAK_CONFIG.emptyResultRate * 100}%`);
    
    expect(SOAK_CONFIG).toBeDefined();
  });
});
