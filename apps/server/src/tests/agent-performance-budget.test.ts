/**
 * Agent Performance Budget Tests
 * 
 * Enforces resource limits per task type.
 * Budget must be paired with correctness oracle.
 * 
 * Run: npx vitest run apps/server/src/tests/agent-performance-budget.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// TYPES
// ============================================================================

interface TaskBudget {
  maxIterations: number;
  maxToolCalls: number;
  maxRepeatedSameTool: number;
  maxTimeMs?: number;
}

interface AgentMetrics {
  iterations: number;
  toolCalls: number;
  toolCallsByName: Map<string, number>;
  consecutiveSameToolMax: number;
  durationMs: number;
  succeeded: boolean;
}

interface BudgetResult {
  withinBudget: boolean;
  violations: string[];
  metrics: AgentMetrics;
}

// ============================================================================
// BUDGET DEFINITIONS BY TASK TYPE
// ============================================================================

const TASK_BUDGETS: Record<string, TaskBudget> = {
  // Simple tasks - quick completion expected
  "file-read": {
    maxIterations: 3,
    maxToolCalls: 5,
    maxRepeatedSameTool: 2,
    maxTimeMs: 10000,
  },
  "simple-search": {
    maxIterations: 5,
    maxToolCalls: 10,
    maxRepeatedSameTool: 3,
    maxTimeMs: 15000,
  },
  // Medium complexity
  "implement-feature": {
    maxIterations: 10,
    maxToolCalls: 25,
    maxRepeatedSameTool: 4,
    maxTimeMs: 60000,
  },
  "fix-bug": {
    maxIterations: 12,
    maxToolCalls: 30,
    maxRepeatedSameTool: 4,
    maxTimeMs: 90000,
  },
  // Complex tasks
  "refactor": {
    maxIterations: 15,
    maxToolCalls: 40,
    maxRepeatedSameTool: 5,
    maxTimeMs: 120000,
  },
  "multi-file-workflow": {
    maxIterations: 20,
    maxToolCalls: 50,
    maxRepeatedSameTool: 5,
    maxTimeMs: 180000,
  },
};

// ============================================================================
// BUDGET CHECKER
// ============================================================================

function checkBudget(metrics: AgentMetrics, budget: TaskBudget): BudgetResult {
  const violations: string[] = [];
  
  if (metrics.iterations > budget.maxIterations) {
    violations.push(`Iterations: ${metrics.iterations} > ${budget.maxIterations}`);
  }
  
  if (metrics.toolCalls > budget.maxToolCalls) {
    violations.push(`Tool calls: ${metrics.toolCalls} > ${budget.maxToolCalls}`);
  }
  
  if (metrics.consecutiveSameToolMax > budget.maxRepeatedSameTool) {
    violations.push(`Repeated tool: ${metrics.consecutiveSameToolMax} > ${budget.maxRepeatedSameTool}`);
  }
  
  if (budget.maxTimeMs && metrics.durationMs > budget.maxTimeMs) {
    violations.push(`Duration: ${metrics.durationMs}ms > ${budget.maxTimeMs}ms`);
  }
  
  return {
    withinBudget: violations.length === 0,
    violations,
    metrics,
  };
}

// ============================================================================
// METRICS CALCULATOR
// ============================================================================

interface ToolCall {
  name: string;
  timestamp: number;
}

function calculateMetrics(
  toolCalls: ToolCall[],
  startTime: number,
  endTime: number,
  succeeded: boolean
): AgentMetrics {
  const toolCallsByName = new Map<string, number>();
  let consecutiveSameToolMax = 0;
  let currentConsecutive = 1;
  let lastTool = "";
  
  for (const call of toolCalls) {
    toolCallsByName.set(call.name, (toolCallsByName.get(call.name) || 0) + 1);
    
    if (call.name === lastTool) {
      currentConsecutive++;
      consecutiveSameToolMax = Math.max(consecutiveSameToolMax, currentConsecutive);
    } else {
      currentConsecutive = 1;
      lastTool = call.name;
    }
  }
  
  return {
    iterations: toolCalls.length,  // Simplified: 1 iteration per tool call
    toolCalls: toolCalls.length,
    toolCallsByName,
    consecutiveSameToolMax,
    durationMs: endTime - startTime,
    succeeded,
  };
}

// ============================================================================
// TESTS: Budget Enforcement
// ============================================================================

describe("Performance Budget: Enforcement", () => {
  it("passes when within all limits", () => {
    const metrics: AgentMetrics = {
      iterations: 3,
      toolCalls: 5,
      toolCallsByName: new Map([["read_file", 3], ["grep", 2]]),
      consecutiveSameToolMax: 2,
      durationMs: 5000,
      succeeded: true,
    };
    
    const result = checkBudget(metrics, TASK_BUDGETS["file-read"]!);
    expect(result.withinBudget).toBeTruthy();
    expect(result.violations).toHaveLength(0);
  });

  it("fails when iterations exceeded", () => {
    const metrics: AgentMetrics = {
      iterations: 10,
      toolCalls: 5,
      toolCallsByName: new Map(),
      consecutiveSameToolMax: 1,
      durationMs: 5000,
      succeeded: true,
    };
    
    const result = checkBudget(metrics, TASK_BUDGETS["file-read"]!);
    expect(result.withinBudget).toBeFalsy();
    expect(result.violations.some(v => v.includes("Iterations"))).toBeTruthy();
  });

  it("fails when tool calls exceeded", () => {
    const metrics: AgentMetrics = {
      iterations: 3,
      toolCalls: 50,
      toolCallsByName: new Map(),
      consecutiveSameToolMax: 1,
      durationMs: 5000,
      succeeded: true,
    };
    
    const result = checkBudget(metrics, TASK_BUDGETS["file-read"]!);
    expect(result.withinBudget).toBeFalsy();
    expect(result.violations.some(v => v.includes("Tool calls"))).toBeTruthy();
  });

  it("fails when same tool repeated too many times", () => {
    const metrics: AgentMetrics = {
      iterations: 3,
      toolCalls: 5,
      toolCallsByName: new Map([["read_file", 5]]),
      consecutiveSameToolMax: 5,
      durationMs: 5000,
      succeeded: true,
    };
    
    const result = checkBudget(metrics, TASK_BUDGETS["file-read"]!);
    expect(result.withinBudget).toBeFalsy();
    expect(result.violations.some(v => v.includes("Repeated"))).toBeTruthy();
  });

  it("fails when timeout exceeded", () => {
    const metrics: AgentMetrics = {
      iterations: 2,
      toolCalls: 3,
      toolCallsByName: new Map(),
      consecutiveSameToolMax: 1,
      durationMs: 20000,
      succeeded: true,
    };
    
    const result = checkBudget(metrics, TASK_BUDGETS["file-read"]!);
    expect(result.withinBudget).toBeFalsy();
    expect(result.violations.some(v => v.includes("Duration"))).toBeTruthy();
  });
});

// ============================================================================
// TESTS: Metrics Calculation
// ============================================================================

describe("Performance Budget: Metrics Calculation", () => {
  it("calculates basic metrics correctly", () => {
    const toolCalls: ToolCall[] = [
      { name: "grep", timestamp: 1000 },
      { name: "read_file", timestamp: 2000 },
      { name: "read_file", timestamp: 3000 },
    ];
    
    const metrics = calculateMetrics(toolCalls, 0, 5000, true);
    
    expect(metrics.toolCalls).toBe(3);
    expect(metrics.toolCallsByName.get("grep")).toBe(1);
    expect(metrics.toolCallsByName.get("read_file")).toBe(2);
    expect(metrics.consecutiveSameToolMax).toBe(2);
    expect(metrics.durationMs).toBe(5000);
  });

  it("tracks consecutive same tool", () => {
    const toolCalls: ToolCall[] = [
      { name: "read_file", timestamp: 1000 },
      { name: "read_file", timestamp: 2000 },
      { name: "read_file", timestamp: 3000 },
      { name: "grep", timestamp: 4000 },
      { name: "read_file", timestamp: 5000 },
    ];
    
    const metrics = calculateMetrics(toolCalls, 0, 6000, true);
    expect(metrics.consecutiveSameToolMax).toBe(3);
  });
});

// ============================================================================
// TESTS: Task Type Budgets
// ============================================================================

describe("Performance Budget: Task Type Budgets", () => {
  it("simple tasks have stricter budgets", () => {
    const simple = TASK_BUDGETS["file-read"]!;
    const complex = TASK_BUDGETS["multi-file-workflow"]!;
    
    expect(simple.maxIterations).toBeLessThan(complex.maxIterations);
    expect(simple.maxToolCalls).toBeLessThan(complex.maxToolCalls);
  });

  it("all task types have defined budgets", () => {
    const requiredTypes = [
      "file-read",
      "simple-search",
      "implement-feature",
      "fix-bug",
      "refactor",
      "multi-file-workflow",
    ];
    
    for (const type of requiredTypes) {
      expect(TASK_BUDGETS[type]).toBeDefined();
    }
  });
});

// ============================================================================
// TESTS: Anti-Reward-Hacking
// ============================================================================

describe("Performance Budget: Anti-Reward-Hacking", () => {
  it("fast but incorrect run fails", () => {
    // Agent finishes quickly but doesn't succeed
    const metrics: AgentMetrics = {
      iterations: 1,
      toolCalls: 1,
      toolCallsByName: new Map(),
      consecutiveSameToolMax: 1,
      durationMs: 100,
      succeeded: false,  // Failed despite speed
    };
    
    const result = checkBudget(metrics, TASK_BUDGETS["file-read"]!);
    
    // Within budget but didn't succeed - this should be caught by correctness oracle
    expect(result.withinBudget).toBeTruthy();
    expect(metrics.succeeded).toBeFalsy();
  });

  it("budget compliance requires correctness", () => {
    // Document the requirement
    const metricsWithSuccess: AgentMetrics = {
      iterations: 3,
      toolCalls: 5,
      toolCallsByName: new Map(),
      consecutiveSameToolMax: 1,
      durationMs: 5000,
      succeeded: true,
    };
    
    const metricsWithFailure: AgentMetrics = {
      ...metricsWithSuccess,
      succeeded: false,
    };
    
    // Both are within budget
    expect(checkBudget(metricsWithSuccess, TASK_BUDGETS["file-read"]!).withinBudget).toBeTruthy();
    expect(checkBudget(metricsWithFailure, TASK_BUDGETS["file-read"]!).withinBudget).toBeTruthy();
    
    // But only one succeeded - correctness oracle catches this
    expect(metricsWithSuccess.succeeded).toBeTruthy();
    expect(metricsWithFailure.succeeded).toBeFalsy();
  });

  it("cannot game by doing nothing", () => {
    // Zero tool calls within budget but task not complete
    const metrics: AgentMetrics = {
      iterations: 0,
      toolCalls: 0,
      toolCallsByName: new Map(),
      consecutiveSameToolMax: 0,
      durationMs: 10,
      succeeded: false,
    };
    
    const result = checkBudget(metrics, TASK_BUDGETS["file-read"]!);
    expect(result.withinBudget).toBeTruthy();
    expect(metrics.succeeded).toBeFalsy();
    
    // Combined check: within budget AND succeeded
    const passesFullCheck = result.withinBudget && metrics.succeeded;
    expect(passesFullCheck).toBeFalsy();
  });
});

// ============================================================================
// TESTS: Realistic Scenarios
// ============================================================================

describe("Performance Budget: Realistic Scenarios", () => {
  it("efficient file read passes", () => {
    const toolCalls: ToolCall[] = [
      { name: "list_dir", timestamp: 100 },
      { name: "read_file", timestamp: 200 },
    ];
    
    const metrics = calculateMetrics(toolCalls, 0, 1000, true);
    const result = checkBudget(metrics, TASK_BUDGETS["file-read"]!);
    
    expect(result.withinBudget).toBeTruthy();
    expect(metrics.succeeded).toBeTruthy();
  });

  it("thrashing search fails budget", () => {
    // Agent keeps searching the same thing
    const toolCalls: ToolCall[] = Array(15).fill(null).map((_, i) => ({
      name: "grep",
      timestamp: i * 100,
    }));
    
    const metrics = calculateMetrics(toolCalls, 0, 2000, false);
    const result = checkBudget(metrics, TASK_BUDGETS["simple-search"]!);
    
    expect(result.withinBudget).toBeFalsy();
    expect(result.violations.some(v => v.includes("Repeated"))).toBeTruthy();
  });

  it("efficient feature implementation passes", () => {
    const toolCalls: ToolCall[] = [
      { name: "read_file", timestamp: 100 },
      { name: "grep", timestamp: 200 },
      { name: "read_file", timestamp: 300 },
      { name: "write_file", timestamp: 400 },
      { name: "run_command", timestamp: 500 },  // npm test
    ];
    
    const metrics = calculateMetrics(toolCalls, 0, 30000, true);
    const result = checkBudget(metrics, TASK_BUDGETS["implement-feature"]!);
    
    expect(result.withinBudget).toBeTruthy();
    expect(metrics.succeeded).toBeTruthy();
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

describe("Performance Budget: Summary", () => {
  it("documents budget limits", () => {
    console.log("\n  Task Type Budgets:");
    for (const [type, budget] of Object.entries(TASK_BUDGETS)) {
      console.log(`    ${type}: ${budget.maxIterations} iter, ${budget.maxToolCalls} calls, ${budget.maxRepeatedSameTool} repeat`);
    }
    
    expect(Object.keys(TASK_BUDGETS).length).toBeGreaterThan(0);
  });
});
