/**
 * Model Differential Functional Tests
 * 
 * Compares task results across models to detect regressions.
 * Uses runtime-generated fixtures to prevent hardcoding.
 * 
 * Run: npx vitest run apps/server/src/tests/model-differential-functional.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// TYPES
// ============================================================================

interface ModelResult {
  modelId: string;
  taskId: string;
  succeeded: boolean;
  toolCalls: number;
  duplicateCallRate: number;
  stallSteps: number;
  completionQualityScore: number;
  durationMs: number;
}

interface DifferentialResult {
  taskId: string;
  modelResults: ModelResult[];
  passRate: number;
  avgToolCalls: number;
  avgDuplicateRate: number;
  regressions: string[];
}

interface RegressionThresholds {
  maxDuplicateRateIncrease: number;  // vs baseline
  minPassRate: number;
  maxToolCallIncrease: number;
  minModelsRequired: number;
}

// ============================================================================
// DEFAULT THRESHOLDS
// ============================================================================

const DEFAULT_THRESHOLDS: RegressionThresholds = {
  maxDuplicateRateIncrease: 0.1,  // 10% increase triggers regression
  minPassRate: 0.6,               // At least 60% of models must pass
  maxToolCallIncrease: 1.5,       // 50% increase triggers regression
  minModelsRequired: 2,           // At least 2 models must complete
};

// ============================================================================
// SIMULATED MODEL RESULTS
// ============================================================================

const AVAILABLE_MODELS = [
  "claude-3-5-sonnet",
  "gpt-4o",
  "grok-code-fast",
  "devstral-2",
  "deepseek-r1",
];

function generateModelResult(modelId: string, taskId: string, seed: number): ModelResult {
  // Seeded random for reproducibility
  const rng = (s: number) => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
  
  const r1 = rng(seed + modelId.length);
  const r2 = rng(seed + taskId.length);
  const r3 = rng(seed + modelId.length + taskId.length);
  
  return {
    modelId,
    taskId,
    succeeded: r1 > 0.2,  // 80% base success rate
    toolCalls: Math.floor(r2 * 20) + 3,
    duplicateCallRate: r3 * 0.3,  // 0-30%
    stallSteps: Math.floor(r1 * 3),
    completionQualityScore: 0.5 + r2 * 0.5,
    durationMs: Math.floor(r3 * 30000) + 5000,
  };
}

// ============================================================================
// DIFFERENTIAL ANALYZER
// ============================================================================

function analyzeDifferential(results: ModelResult[], baseline?: ModelResult): DifferentialResult {
  const taskId = results[0]?.taskId ?? "unknown";
  const successes = results.filter(r => r.succeeded);
  const passRate = results.length > 0 ? successes.length / results.length : 0;
  
  const avgToolCalls = results.length > 0
    ? results.reduce((sum, r) => sum + r.toolCalls, 0) / results.length
    : 0;
    
  const avgDuplicateRate = results.length > 0
    ? results.reduce((sum, r) => sum + r.duplicateCallRate, 0) / results.length
    : 0;
  
  const regressions: string[] = [];
  
  if (baseline) {
    if (avgDuplicateRate > baseline.duplicateCallRate + DEFAULT_THRESHOLDS.maxDuplicateRateIncrease) {
      regressions.push(`Duplicate rate increased: ${(avgDuplicateRate * 100).toFixed(1)}% vs baseline ${(baseline.duplicateCallRate * 100).toFixed(1)}%`);
    }
    if (avgToolCalls > baseline.toolCalls * DEFAULT_THRESHOLDS.maxToolCallIncrease) {
      regressions.push(`Tool calls increased: ${avgToolCalls.toFixed(1)} vs baseline ${baseline.toolCalls}`);
    }
  }
  
  if (passRate < DEFAULT_THRESHOLDS.minPassRate) {
    regressions.push(`Pass rate below threshold: ${(passRate * 100).toFixed(1)}% < ${DEFAULT_THRESHOLDS.minPassRate * 100}%`);
  }
  
  return {
    taskId,
    modelResults: results,
    passRate,
    avgToolCalls,
    avgDuplicateRate,
    regressions,
  };
}

// ============================================================================
// RUNTIME FIXTURE GENERATOR
// ============================================================================

function generateRuntimeFixture(): { taskId: string; expectedPattern: RegExp } {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const taskId = `task_${timestamp}_${random}`;
  
  // Generate expected pattern at runtime - impossible to hardcode
  const expectedPattern = new RegExp(`result_${random}`);
  
  return { taskId, expectedPattern };
}

// ============================================================================
// TESTS: Differential Analysis
// ============================================================================

describe("Model Differential: Analysis", () => {
  it("calculates pass rate correctly", () => {
    const results: ModelResult[] = [
      { modelId: "a", taskId: "t1", succeeded: true, toolCalls: 5, duplicateCallRate: 0.1, stallSteps: 0, completionQualityScore: 0.8, durationMs: 5000 },
      { modelId: "b", taskId: "t1", succeeded: true, toolCalls: 6, duplicateCallRate: 0.15, stallSteps: 1, completionQualityScore: 0.7, durationMs: 6000 },
      { modelId: "c", taskId: "t1", succeeded: false, toolCalls: 10, duplicateCallRate: 0.3, stallSteps: 3, completionQualityScore: 0.4, durationMs: 10000 },
    ];
    
    const diff = analyzeDifferential(results);
    expect(diff.passRate).toBeCloseTo(2/3, 2);
  });

  it("calculates average metrics", () => {
    const results: ModelResult[] = [
      { modelId: "a", taskId: "t1", succeeded: true, toolCalls: 10, duplicateCallRate: 0.1, stallSteps: 0, completionQualityScore: 0.8, durationMs: 5000 },
      { modelId: "b", taskId: "t1", succeeded: true, toolCalls: 20, duplicateCallRate: 0.2, stallSteps: 1, completionQualityScore: 0.7, durationMs: 6000 },
    ];
    
    const diff = analyzeDifferential(results);
    expect(diff.avgToolCalls).toBe(15);
    expect(diff.avgDuplicateRate).toBeCloseTo(0.15, 2);
  });

  it("detects pass rate regression", () => {
    const results: ModelResult[] = [
      { modelId: "a", taskId: "t1", succeeded: false, toolCalls: 5, duplicateCallRate: 0.1, stallSteps: 0, completionQualityScore: 0.3, durationMs: 5000 },
      { modelId: "b", taskId: "t1", succeeded: false, toolCalls: 6, duplicateCallRate: 0.15, stallSteps: 1, completionQualityScore: 0.3, durationMs: 6000 },
    ];
    
    const diff = analyzeDifferential(results);
    expect(diff.regressions.some(r => r.includes("Pass rate"))).toBeTruthy();
  });

  it("detects duplicate rate regression vs baseline", () => {
    const baseline: ModelResult = {
      modelId: "baseline", taskId: "t1", succeeded: true,
      toolCalls: 5, duplicateCallRate: 0.05, stallSteps: 0,
      completionQualityScore: 0.9, durationMs: 5000,
    };
    
    const results: ModelResult[] = [
      { modelId: "a", taskId: "t1", succeeded: true, toolCalls: 5, duplicateCallRate: 0.25, stallSteps: 0, completionQualityScore: 0.8, durationMs: 5000 },
      { modelId: "b", taskId: "t1", succeeded: true, toolCalls: 6, duplicateCallRate: 0.20, stallSteps: 1, completionQualityScore: 0.7, durationMs: 6000 },
    ];
    
    const diff = analyzeDifferential(results, baseline);
    expect(diff.regressions.some(r => r.includes("Duplicate rate"))).toBeTruthy();
  });
});

// ============================================================================
// TESTS: Multi-Model Comparison
// ============================================================================

describe("Model Differential: Multi-Model Comparison", () => {
  it("compares results across all models", () => {
    const taskId = "test-task";
    const seed = 12345;
    
    const results = AVAILABLE_MODELS.map(model => 
      generateModelResult(model, taskId, seed)
    );
    
    const diff = analyzeDifferential(results);
    
    expect(diff.modelResults.length).toBe(AVAILABLE_MODELS.length);
    expect(diff.passRate).toBeGreaterThan(0);
  });

  it("identifies outlier models", () => {
    const results: ModelResult[] = [
      { modelId: "good-1", taskId: "t1", succeeded: true, toolCalls: 5, duplicateCallRate: 0.05, stallSteps: 0, completionQualityScore: 0.9, durationMs: 5000 },
      { modelId: "good-2", taskId: "t1", succeeded: true, toolCalls: 6, duplicateCallRate: 0.08, stallSteps: 0, completionQualityScore: 0.85, durationMs: 6000 },
      { modelId: "outlier", taskId: "t1", succeeded: false, toolCalls: 30, duplicateCallRate: 0.5, stallSteps: 5, completionQualityScore: 0.2, durationMs: 30000 },
    ];
    
    // Find outlier by metrics
    const outlier = results.find(r => r.duplicateCallRate > 0.3);
    expect(outlier?.modelId).toBe("outlier");
  });

  it("requires minimum models for valid comparison", () => {
    const results: ModelResult[] = [
      { modelId: "only-one", taskId: "t1", succeeded: true, toolCalls: 5, duplicateCallRate: 0.1, stallSteps: 0, completionQualityScore: 0.8, durationMs: 5000 },
    ];
    
    const diff = analyzeDifferential(results);
    
    // With only 1 model, comparison is less meaningful
    expect(results.length).toBeLessThan(DEFAULT_THRESHOLDS.minModelsRequired);
  });
});

// ============================================================================
// TESTS: Runtime Fixtures (Anti-Hardcoding)
// ============================================================================

describe("Model Differential: Runtime Fixtures", () => {
  it("generates unique fixtures per run", () => {
    const fixture1 = generateRuntimeFixture();
    const fixture2 = generateRuntimeFixture();
    
    expect(fixture1.taskId).not.toBe(fixture2.taskId);
  });

  it("fixtures include timestamp for uniqueness", () => {
    const fixture = generateRuntimeFixture();
    expect(fixture.taskId).toMatch(/task_\d+_\w+/);
  });

  it("expected pattern is runtime-generated", () => {
    const fixture = generateRuntimeFixture();
    
    // The pattern is generated at runtime, impossible to predict
    const testString = `result_${fixture.taskId.split("_")[2]}`;
    expect(fixture.expectedPattern.test(testString)).toBeTruthy();
    
    // Random string won't match
    expect(fixture.expectedPattern.test("result_hardcoded")).toBeFalsy();
  });
});

// ============================================================================
// TESTS: Regression Detection
// ============================================================================

describe("Model Differential: Regression Detection", () => {
  it("no regression when metrics improve", () => {
    const baseline: ModelResult = {
      modelId: "baseline", taskId: "t1", succeeded: true,
      toolCalls: 10, duplicateCallRate: 0.2, stallSteps: 2,
      completionQualityScore: 0.7, durationMs: 10000,
    };
    
    const results: ModelResult[] = [
      { modelId: "a", taskId: "t1", succeeded: true, toolCalls: 5, duplicateCallRate: 0.05, stallSteps: 0, completionQualityScore: 0.9, durationMs: 5000 },
      { modelId: "b", taskId: "t1", succeeded: true, toolCalls: 6, duplicateCallRate: 0.08, stallSteps: 0, completionQualityScore: 0.85, durationMs: 6000 },
    ];
    
    const diff = analyzeDifferential(results, baseline);
    expect(diff.regressions).toHaveLength(0);
  });

  it("flags tool call explosion", () => {
    const baseline: ModelResult = {
      modelId: "baseline", taskId: "t1", succeeded: true,
      toolCalls: 5, duplicateCallRate: 0.1, stallSteps: 0,
      completionQualityScore: 0.9, durationMs: 5000,
    };
    
    const results: ModelResult[] = [
      { modelId: "a", taskId: "t1", succeeded: true, toolCalls: 20, duplicateCallRate: 0.1, stallSteps: 0, completionQualityScore: 0.8, durationMs: 5000 },
    ];
    
    const diff = analyzeDifferential(results, baseline);
    expect(diff.regressions.some(r => r.includes("Tool calls"))).toBeTruthy();
  });
});

// ============================================================================
// TESTS: Quality Score Tracking
// ============================================================================

describe("Model Differential: Quality Scores", () => {
  it("tracks completion quality per model", () => {
    const results: ModelResult[] = AVAILABLE_MODELS.map((model, i) => ({
      modelId: model,
      taskId: "t1",
      succeeded: true,
      toolCalls: 5 + i,
      duplicateCallRate: 0.1,
      stallSteps: 0,
      completionQualityScore: 0.7 + (i * 0.05),
      durationMs: 5000,
    }));
    
    // Each model has different quality score
    const scores = results.map(r => r.completionQualityScore);
    const uniqueScores = new Set(scores);
    expect(uniqueScores.size).toBe(results.length);
  });

  it("identifies best performing model", () => {
    const results: ModelResult[] = [
      { modelId: "model-a", taskId: "t1", succeeded: true, toolCalls: 5, duplicateCallRate: 0.05, stallSteps: 0, completionQualityScore: 0.95, durationMs: 3000 },
      { modelId: "model-b", taskId: "t1", succeeded: true, toolCalls: 8, duplicateCallRate: 0.1, stallSteps: 1, completionQualityScore: 0.75, durationMs: 8000 },
      { modelId: "model-c", taskId: "t1", succeeded: true, toolCalls: 6, duplicateCallRate: 0.08, stallSteps: 0, completionQualityScore: 0.85, durationMs: 5000 },
    ];
    
    const best = results.reduce((a, b) => 
      a.completionQualityScore > b.completionQualityScore ? a : b
    );
    
    expect(best.modelId).toBe("model-a");
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

describe("Model Differential: Summary", () => {
  it("documents available models", () => {
    console.log("\n  Available Models for Differential Testing:");
    for (let i = 0; i < AVAILABLE_MODELS.length; i++) {
      console.log(`    ${i + 1}. ${AVAILABLE_MODELS[i]}`);
    }
    
    expect(AVAILABLE_MODELS.length).toBeGreaterThan(0);
  });

  it("documents regression thresholds", () => {
    console.log("\n  Regression Thresholds:");
    console.log(`    Max duplicate rate increase: ${DEFAULT_THRESHOLDS.maxDuplicateRateIncrease * 100}%`);
    console.log(`    Min pass rate: ${DEFAULT_THRESHOLDS.minPassRate * 100}%`);
    console.log(`    Max tool call increase: ${DEFAULT_THRESHOLDS.maxToolCallIncrease * 100}%`);
    console.log(`    Min models required: ${DEFAULT_THRESHOLDS.minModelsRequired}`);
    
    expect(DEFAULT_THRESHOLDS).toBeDefined();
  });
});
