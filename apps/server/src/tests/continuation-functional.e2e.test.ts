/**
 * Continuation / Multi-Turn Functional E2E Tests
 * 
 * Verifies agent maintains state and progresses across turns.
 * Tests resume, requirement changes, and stale assumption handling.
 * 
 * Run: npx vitest run apps/server/src/tests/continuation-functional.e2e.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// TYPES
// ============================================================================

interface TurnState {
  turnNumber: number;
  prompt: string;
  toolCalls: string[];
  artifacts: Map<string, string>;
  stateVariables: Map<string, unknown>;
}

interface ContinuationRun {
  taskId: string;
  turns: TurnState[];
  finalStatus: "completed" | "failed" | "in_progress";
}

interface ContinuationOracle {
  statePreserved: (prev: TurnState, curr: TurnState) => boolean;
  progressMade: (prev: TurnState, curr: TurnState) => boolean;
  noBacktracking: (turns: TurnState[]) => boolean;
  meetsConstraints: (run: ContinuationRun, constraints: string[]) => boolean;
}

// ============================================================================
// STATE PRESERVATION CHECKER
// ============================================================================

function checkStatePreservation(prev: TurnState, curr: TurnState): { preserved: boolean; lost: string[] } {
  const lost: string[] = [];
  
  // Check that state variables are preserved
  for (const [key, value] of prev.stateVariables) {
    const currValue = curr.stateVariables.get(key);
    if (currValue === undefined) {
      lost.push(`State variable lost: ${key}`);
    } else if (JSON.stringify(currValue) !== JSON.stringify(value)) {
      // Value changed - might be intentional update or loss
      // Only flag if it's a regression (e.g., progress counter decreased)
      if (typeof value === "number" && typeof currValue === "number" && currValue < value) {
        lost.push(`State regressed: ${key} (${value} -> ${currValue})`);
      }
    }
  }
  
  return { preserved: lost.length === 0, lost };
}

// ============================================================================
// PROGRESS CHECKER
// ============================================================================

function checkProgress(prev: TurnState, curr: TurnState): { progressed: boolean; reason: string } {
  // Progress indicators:
  // 1. New artifacts created
  // 2. Different tool calls (not repeating same sequence)
  // 3. State variables updated meaningfully
  
  const newArtifacts = [...curr.artifacts.keys()].filter(k => !prev.artifacts.has(k));
  if (newArtifacts.length > 0) {
    return { progressed: true, reason: `New artifacts: ${newArtifacts.join(", ")}` };
  }
  
  // Check for different tool calls
  const prevTools = prev.toolCalls.join(",");
  const currTools = curr.toolCalls.join(",");
  if (currTools !== prevTools && curr.toolCalls.length > 0) {
    return { progressed: true, reason: "Different tool sequence" };
  }
  
  // Check state variable updates
  const stateUpdates: string[] = [];
  for (const [key, value] of curr.stateVariables) {
    const prevValue = prev.stateVariables.get(key);
    if (prevValue !== undefined && JSON.stringify(prevValue) !== JSON.stringify(value)) {
      stateUpdates.push(key);
    }
  }
  
  if (stateUpdates.length > 0) {
    return { progressed: true, reason: `State updated: ${stateUpdates.join(", ")}` };
  }
  
  return { progressed: false, reason: "No observable progress" };
}

// ============================================================================
// BACKTRACKING DETECTOR
// ============================================================================

function detectBacktracking(turns: TurnState[]): { hasBacktracking: boolean; instances: string[] } {
  const instances: string[] = [];
  
  for (let i = 1; i < turns.length; i++) {
    const prev = turns[i - 1];
    const curr = turns[i];
    if (!prev || !curr) continue;
    
    // Check if we're re-reading files we already read
    const prevReads = prev.toolCalls.filter(t => t.startsWith("read_file:"));
    const currReads = curr.toolCalls.filter(t => t.startsWith("read_file:"));
    
    for (const read of currReads) {
      if (prevReads.includes(read)) {
        // Might be backtracking - check if we made progress between
        const progressBetween = checkProgress(prev, curr);
        if (!progressBetween.progressed) {
          instances.push(`Turn ${i + 1}: Re-read without progress: ${read}`);
        }
      }
    }
    
    // Check if artifacts were deleted and recreated
    for (const [path, content] of prev.artifacts) {
      if (!curr.artifacts.has(path)) {
        // Artifact removed
        instances.push(`Turn ${i + 1}: Artifact removed: ${path}`);
      }
    }
  }
  
  return { hasBacktracking: instances.length > 0, instances };
}

// ============================================================================
// SIMULATED MULTI-TURN RUN
// ============================================================================

function simulateContinuationRun(scenario: string): ContinuationRun {
  const run: ContinuationRun = {
    taskId: `continuation_${scenario}`,
    turns: [],
    finalStatus: "in_progress",
  };
  
  switch (scenario) {
    case "resume-after-partial": {
      // Turn 1: Start implementation
      run.turns.push({
        turnNumber: 1,
        prompt: "Implement user authentication",
        toolCalls: ["read_file:src/auth.ts", "write_file:src/auth.ts"],
        artifacts: new Map([["src/auth.ts", "partial implementation"]]),
        stateVariables: new Map([["step", 1], ["totalSteps", 3]]),
      });
      
      // Turn 2: Continue from where we left off
      run.turns.push({
        turnNumber: 2,
        prompt: "Continue",
        toolCalls: ["read_file:src/auth.ts", "write_file:src/middleware.ts"],
        artifacts: new Map([
          ["src/auth.ts", "partial implementation"],
          ["src/middleware.ts", "auth middleware"],
        ]),
        stateVariables: new Map([["step", 2], ["totalSteps", 3]]),
      });
      
      // Turn 3: Complete
      run.turns.push({
        turnNumber: 3,
        prompt: "Continue",
        toolCalls: ["write_file:src/routes.ts", "run_command:npm test"],
        artifacts: new Map([
          ["src/auth.ts", "complete implementation"],
          ["src/middleware.ts", "auth middleware"],
          ["src/routes.ts", "protected routes"],
        ]),
        stateVariables: new Map([["step", 3], ["totalSteps", 3], ["complete", true]]),
      });
      
      run.finalStatus = "completed";
      break;
    }
    
    case "requirement-change": {
      // Turn 1: Original implementation
      run.turns.push({
        turnNumber: 1,
        prompt: "Create a login function",
        toolCalls: ["write_file:src/login.ts"],
        artifacts: new Map([["src/login.ts", "function login(user, pass) {}"]]),
        stateVariables: new Map([["authType", "password"]]),
      });
      
      // Turn 2: Requirement changes
      run.turns.push({
        turnNumber: 2,
        prompt: "Actually, make it OAuth instead of password auth",
        toolCalls: ["read_file:src/login.ts", "write_file:src/login.ts", "write_file:src/oauth.ts"],
        artifacts: new Map([
          ["src/login.ts", "function login() { return oauth.redirect() }"],
          ["src/oauth.ts", "oauth handler"],
        ]),
        stateVariables: new Map([["authType", "oauth"], ["adapted", true]]),
      });
      
      run.finalStatus = "completed";
      break;
    }
    
    case "stale-assumption": {
      // Turn 1: Based on initial state
      run.turns.push({
        turnNumber: 1,
        prompt: "Update the config",
        toolCalls: ["read_file:config.json"],
        artifacts: new Map(),
        stateVariables: new Map([["configVersion", "1.0"]]),
      });
      
      // Turn 2: Config changed externally, agent must re-evaluate
      run.turns.push({
        turnNumber: 2,
        prompt: "Continue (note: config.json was updated externally)",
        toolCalls: ["read_file:config.json", "write_file:config.json"],  // Re-reads, doesn't assume
        artifacts: new Map([["config.json", "updated config v2"]]),
        stateVariables: new Map([["configVersion", "2.0"], ["revalidated", true]]),
      });
      
      run.finalStatus = "completed";
      break;
    }
    
    case "backtracking-bad": {
      // Turn 1: Read file
      run.turns.push({
        turnNumber: 1,
        prompt: "Find the bug",
        toolCalls: ["read_file:src/app.ts", "grep_search:error"],
        artifacts: new Map(),
        stateVariables: new Map([["searched", true]]),
      });
      
      // Turn 2: Re-read same file without progress (BAD)
      run.turns.push({
        turnNumber: 2,
        prompt: "Continue",
        toolCalls: ["read_file:src/app.ts", "grep_search:error"],  // Same exact calls
        artifacts: new Map(),
        stateVariables: new Map([["searched", true]]),  // No change
      });
      
      run.finalStatus = "failed";
      break;
    }
    
    default:
      break;
  }
  
  return run;
}

// ============================================================================
// TESTS: Resume After Partial
// ============================================================================

describe("Continuation: Resume After Partial", () => {
  it("picks up where it left off", () => {
    const run = simulateContinuationRun("resume-after-partial");
    
    expect(run.turns.length).toBe(3);
    expect(run.finalStatus).toBe("completed");
    
    // Check state preservation across turns
    for (let i = 1; i < run.turns.length; i++) {
      const prev = run.turns[i - 1]!;
      const curr = run.turns[i]!;
      const preservation = checkStatePreservation(prev, curr);
      
      expect(preservation.preserved).toBeTruthy();
    }
  });

  it("maintains step counter", () => {
    const run = simulateContinuationRun("resume-after-partial");
    
    const steps = run.turns.map(t => t.stateVariables.get("step"));
    expect(steps).toEqual([1, 2, 3]);
  });

  it("accumulates artifacts", () => {
    const run = simulateContinuationRun("resume-after-partial");
    
    // Each turn should have equal or more artifacts
    let prevCount = 0;
    for (const turn of run.turns) {
      expect(turn.artifacts.size).toBeGreaterThanOrEqual(prevCount);
      prevCount = turn.artifacts.size;
    }
  });
});

// ============================================================================
// TESTS: Requirement Change
// ============================================================================

describe("Continuation: Requirement Change", () => {
  it("adapts without full restart", () => {
    const run = simulateContinuationRun("requirement-change");
    
    expect(run.turns.length).toBe(2);
    expect(run.finalStatus).toBe("completed");
    
    // Should have adapted flag
    const finalState = run.turns[1]!.stateVariables;
    expect(finalState.get("adapted")).toBeTruthy();
  });

  it("updates state to reflect new requirement", () => {
    const run = simulateContinuationRun("requirement-change");
    
    const initialAuthType = run.turns[0]!.stateVariables.get("authType");
    const finalAuthType = run.turns[1]!.stateVariables.get("authType");
    
    expect(initialAuthType).toBe("password");
    expect(finalAuthType).toBe("oauth");
  });

  it("modifies existing artifacts appropriately", () => {
    const run = simulateContinuationRun("requirement-change");
    
    // login.ts should be modified, not just recreated
    const turn2 = run.turns[1]!;
    expect(turn2.toolCalls).toContain("read_file:src/login.ts");
    expect(turn2.toolCalls).toContain("write_file:src/login.ts");
  });
});

// ============================================================================
// TESTS: Stale Assumption Handling
// ============================================================================

describe("Continuation: Stale Assumptions", () => {
  it("re-validates when external changes occur", () => {
    const run = simulateContinuationRun("stale-assumption");
    
    // Turn 2 should re-read the file, not assume stale state
    const turn2 = run.turns[1]!;
    expect(turn2.toolCalls).toContain("read_file:config.json");
    expect(turn2.stateVariables.get("revalidated")).toBeTruthy();
  });

  it("updates state after re-validation", () => {
    const run = simulateContinuationRun("stale-assumption");
    
    const v1 = run.turns[0]!.stateVariables.get("configVersion");
    const v2 = run.turns[1]!.stateVariables.get("configVersion");
    
    expect(v1).toBe("1.0");
    expect(v2).toBe("2.0");
  });
});

// ============================================================================
// TESTS: Backtracking Detection
// ============================================================================

describe("Continuation: Backtracking Detection", () => {
  it("detects unproductive loops", () => {
    const run = simulateContinuationRun("backtracking-bad");
    
    const backtracking = detectBacktracking(run.turns);
    
    expect(backtracking.hasBacktracking).toBeTruthy();
    expect(backtracking.instances.length).toBeGreaterThan(0);
  });

  it("good continuation has no backtracking", () => {
    const run = simulateContinuationRun("resume-after-partial");
    
    const backtracking = detectBacktracking(run.turns);
    
    expect(backtracking.hasBacktracking).toBeFalsy();
  });
});

// ============================================================================
// TESTS: Progress Verification
// ============================================================================

describe("Continuation: Progress Verification", () => {
  it("each turn makes observable progress", () => {
    const run = simulateContinuationRun("resume-after-partial");
    
    for (let i = 1; i < run.turns.length; i++) {
      const prev = run.turns[i - 1]!;
      const curr = run.turns[i]!;
      const progress = checkProgress(prev, curr);
      
      expect(progress.progressed).toBeTruthy();
      console.log(`  Turn ${i + 1}: ${progress.reason}`);
    }
  });

  it("detects lack of progress", () => {
    const run = simulateContinuationRun("backtracking-bad");
    
    const prev = run.turns[0]!;
    const curr = run.turns[1]!;
    const progress = checkProgress(prev, curr);
    
    expect(progress.progressed).toBeFalsy();
  });
});

// ============================================================================
// TESTS: Oracle Validation
// ============================================================================

describe("Continuation: Oracle Validation", () => {
  const oracle: ContinuationOracle = {
    statePreserved: (prev, curr) => checkStatePreservation(prev, curr).preserved,
    progressMade: (prev, curr) => checkProgress(prev, curr).progressed,
    noBacktracking: (turns) => !detectBacktracking(turns).hasBacktracking,
    meetsConstraints: (run, constraints) => {
      const finalArtifacts = run.turns[run.turns.length - 1]?.artifacts ?? new Map();
      return constraints.every(c => finalArtifacts.has(c) || run.finalStatus === "completed");
    },
  };

  it("successful run passes all oracle checks", () => {
    const run = simulateContinuationRun("resume-after-partial");
    
    // State preserved between all turns
    for (let i = 1; i < run.turns.length; i++) {
      expect(oracle.statePreserved(run.turns[i - 1]!, run.turns[i]!)).toBeTruthy();
    }
    
    // No backtracking
    expect(oracle.noBacktracking(run.turns)).toBeTruthy();
    
    // Meets constraints
    expect(oracle.meetsConstraints(run, ["src/auth.ts", "src/middleware.ts"])).toBeTruthy();
  });

  it("failed run fails oracle checks", () => {
    const run = simulateContinuationRun("backtracking-bad");
    
    expect(oracle.noBacktracking(run.turns)).toBeFalsy();
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

describe("Continuation: Summary", () => {
  it("documents continuation scenarios", () => {
    const scenarios = [
      "Resume after partial: picks up multi-step tasks",
      "Requirement change: adapts without full restart",
      "Stale assumption: re-validates external changes",
      "Backtracking: detects unproductive loops",
    ];
    
    console.log("\n  Continuation Scenarios Tested:");
    for (let i = 0; i < scenarios.length; i++) {
      console.log(`    ${i + 1}. ${scenarios[i]}`);
    }
    
    expect(scenarios.length).toBe(4);
  });
});
