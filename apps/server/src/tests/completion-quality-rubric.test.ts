/**
 * Completion Quality Rubric Tests
 * 
 * Tests that agent responses meet UX/communication quality standards.
 * Catches "tests pass but output is unusable" scenarios.
 * 
 * Run: npx vitest run apps/server/src/tests/completion-quality-rubric.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// TYPES
// ============================================================================

interface CompletionResponse {
  text: string;
  status: "success" | "failure" | "partial";
  codeChanged: boolean;
  filesModified?: string[];
}

interface RubricScore {
  total: number;
  maxScore: number;
  passed: boolean;
  breakdown: { criterion: string; score: number; maxScore: number; notes: string }[];
}

// ============================================================================
// RUBRIC CRITERIA
// ============================================================================

interface RubricCriterion {
  name: string;
  maxScore: number;
  evaluate: (response: CompletionResponse) => { score: number; notes: string };
}

const SUCCESS_RUBRIC: RubricCriterion[] = [
  {
    name: "Non-empty response",
    maxScore: 10,
    evaluate: (r) => ({
      score: r.text.trim().length > 0 ? 10 : 0,
      notes: r.text.trim().length > 0 ? "Has content" : "EMPTY RESPONSE",
    }),
  },
  {
    name: "What changed summary",
    maxScore: 15,
    evaluate: (r) => {
      const hasWhatChanged = /changed|modified|updated|added|removed|created/i.test(r.text);
      return {
        score: hasWhatChanged ? 15 : 0,
        notes: hasWhatChanged ? "Describes changes" : "Missing change description",
      };
    },
  },
  {
    name: "File references (if code changed)",
    maxScore: 15,
    evaluate: (r) => {
      if (!r.codeChanged) return { score: 15, notes: "N/A (no code change)" };
      const hasFileRef = /\.(ts|js|tsx|jsx|json|md|py|go|rs)|\//i.test(r.text);
      return {
        score: hasFileRef ? 15 : 0,
        notes: hasFileRef ? "References files" : "Missing file references",
      };
    },
  },
  {
    name: "Verification command (if code changed)",
    maxScore: 10,
    evaluate: (r) => {
      if (!r.codeChanged) return { score: 10, notes: "N/A (no code change)" };
      const hasCommand = /npm|yarn|pnpm|run|test|build|`[^`]+`/i.test(r.text);
      return {
        score: hasCommand ? 10 : 0,
        notes: hasCommand ? "Includes command" : "Missing verification command",
      };
    },
  },
];

const FAILURE_RUBRIC: RubricCriterion[] = [
  {
    name: "Non-empty response",
    maxScore: 10,
    evaluate: (r) => ({
      score: r.text.trim().length > 0 ? 10 : 0,
      notes: r.text.trim().length > 0 ? "Has content" : "EMPTY RESPONSE",
    }),
  },
  {
    name: "What was tried",
    maxScore: 20,
    evaluate: (r) => {
      const hasTried = /tried|attempted|looked|searched|checked|ran/i.test(r.text);
      return {
        score: hasTried ? 20 : 0,
        notes: hasTried ? "Explains attempts" : "Missing attempt description",
      };
    },
  },
  {
    name: "Why it failed",
    maxScore: 20,
    evaluate: (r) => {
      const hasReason = /because|due to|error|failed|could not|unable|not found|doesn't exist/i.test(r.text);
      return {
        score: hasReason ? 20 : 0,
        notes: hasReason ? "Explains failure reason" : "Missing failure reason",
      };
    },
  },
  {
    name: "Next step suggestion",
    maxScore: 15,
    evaluate: (r) => {
      const hasNext = /try|suggest|recommend|could|might|alternative|instead|next/i.test(r.text);
      return {
        score: hasNext ? 15 : 0,
        notes: hasNext ? "Suggests next steps" : "Missing next step",
      };
    },
  },
];

// ============================================================================
// RUBRIC EVALUATOR
// ============================================================================

function evaluateRubric(response: CompletionResponse): RubricScore {
  const rubric = response.status === "failure" ? FAILURE_RUBRIC : SUCCESS_RUBRIC;
  const breakdown: RubricScore["breakdown"] = [];
  let total = 0;
  let maxScore = 0;
  
  for (const criterion of rubric) {
    const result = criterion.evaluate(response);
    breakdown.push({
      criterion: criterion.name,
      score: result.score,
      maxScore: criterion.maxScore,
      notes: result.notes,
    });
    total += result.score;
    maxScore += criterion.maxScore;
  }
  
  const passThreshold = maxScore * 0.6;  // 60% minimum
  
  return {
    total,
    maxScore,
    passed: total >= passThreshold,
    breakdown,
  };
}

// ============================================================================
// SPECIFIC CHECKS
// ============================================================================

function hasVerifiableReferences(text: string): boolean {
  // Must include file paths or specific code references
  const patterns = [
    /`[^`]+\.(ts|js|tsx|jsx|json|md|py)`/,  // Backticked file
    /\w+\.(ts|js|tsx|jsx|json|md|py)/,       // File extension
    /line \d+/i,                              // Line reference
    /:\d+/,                                   // Line number suffix
  ];
  return patterns.some(p => p.test(text));
}

function hasActionableCommands(text: string): boolean {
  const patterns = [
    /`npm [a-z]+`/,
    /`yarn [a-z]+`/,
    /`pnpm [a-z]+`/,
    /run `[^`]+`/,
    /execute:?\s*`[^`]+`/,
  ];
  return patterns.some(p => p.test(text));
}

function isMinimalResponse(text: string): boolean {
  const words = text.trim().split(/\s+/).length;
  return words < 10;
}

// ============================================================================
// TESTS: Success Responses
// ============================================================================

describe("Completion Quality: Success Responses", () => {
  it("good success response passes rubric", () => {
    const response: CompletionResponse = {
      text: `I've updated the \`src/utils.ts\` file to add the multiply function.
      
Changes made:
- Added \`multiply(a, b)\` function that returns a * b
- The function is exported for use in other modules

To verify, run \`npm test\` to ensure all tests pass.`,
      status: "success",
      codeChanged: true,
      filesModified: ["src/utils.ts"],
    };
    
    const result = evaluateRubric(response);
    expect(result.passed).toBeTruthy();
    expect(result.total).toBeGreaterThanOrEqual(result.maxScore * 0.8);
  });

  it("empty success response fails", () => {
    const response: CompletionResponse = {
      text: "",
      status: "success",
      codeChanged: true,
    };
    
    const result = evaluateRubric(response);
    expect(result.passed).toBeFalsy();
  });

  it("minimal success response fails", () => {
    const response: CompletionResponse = {
      text: "Done.",
      status: "success",
      codeChanged: true,
    };
    
    const result = evaluateRubric(response);
    expect(result.passed).toBeFalsy();
    expect(isMinimalResponse(response.text)).toBeTruthy();
  });

  it("success without file references (when code changed) fails", () => {
    const response: CompletionResponse = {
      text: "I added the function you requested. It should work now.",
      status: "success",
      codeChanged: true,
    };
    
    const result = evaluateRubric(response);
    const fileRefScore = result.breakdown.find(b => b.criterion.includes("File"));
    expect(fileRefScore?.score).toBe(0);
  });
});

// ============================================================================
// TESTS: Failure Responses
// ============================================================================

describe("Completion Quality: Failure Responses", () => {
  it("good failure response passes rubric", () => {
    const response: CompletionResponse = {
      text: `I was unable to complete the task.

What I tried:
- Searched for the config file using grep
- Checked common locations (config.json, settings.json, .config)
- Listed the project directory

Why it failed:
The config file doesn't exist in this project. There's no configuration file in the expected locations.

Next steps:
You could create a config.json file, or specify the exact path if it exists elsewhere.`,
      status: "failure",
      codeChanged: false,
    };
    
    const result = evaluateRubric(response);
    expect(result.passed).toBeTruthy();
  });

  it("silent failure fails rubric", () => {
    const response: CompletionResponse = {
      text: "No.",  // Truly minimal - matches no rubric patterns
      status: "failure",
      codeChanged: false,
    };
    
    const result = evaluateRubric(response);
    expect(result.passed).toBeFalsy();
  });

  it("failure without explanation fails", () => {
    const response: CompletionResponse = {
      text: "Failed to find the file.",
      status: "failure",
      codeChanged: false,
    };
    
    const result = evaluateRubric(response);
    expect(result.passed).toBeFalsy();
    
    // Check specific criteria
    const triedScore = result.breakdown.find(b => b.criterion.includes("tried"));
    expect(triedScore?.score).toBe(0);
  });
});

// ============================================================================
// TESTS: Verifiable References
// ============================================================================

describe("Completion Quality: Verifiable References", () => {
  it("detects file path references", () => {
    expect(hasVerifiableReferences("Updated `src/utils.ts`")).toBeTruthy();
    expect(hasVerifiableReferences("Changed index.js")).toBeTruthy();
    expect(hasVerifiableReferences("At line 42")).toBeTruthy();
    expect(hasVerifiableReferences("src/app.tsx:15")).toBeTruthy();
  });

  it("rejects vague references", () => {
    expect(hasVerifiableReferences("Updated the file")).toBeFalsy();
    expect(hasVerifiableReferences("Changed some code")).toBeFalsy();
    expect(hasVerifiableReferences("Fixed it")).toBeFalsy();
  });
});

// ============================================================================
// TESTS: Actionable Commands
// ============================================================================

describe("Completion Quality: Actionable Commands", () => {
  it("detects runnable commands", () => {
    expect(hasActionableCommands("Run `npm test` to verify")).toBeTruthy();
    expect(hasActionableCommands("Execute: `yarn build`")).toBeTruthy();
    // pnpm without context doesn't match current patterns
    expect(hasActionableCommands("run `pnpm dev`")).toBeTruthy();
  });

  it("rejects vague instructions", () => {
    expect(hasActionableCommands("Run the tests")).toBeFalsy();
    expect(hasActionableCommands("Build the project")).toBeFalsy();
  });
});

// ============================================================================
// TESTS: Anti-Reward-Hacking
// ============================================================================

describe("Completion Quality: Anti-Reward-Hacking", () => {
  it("cannot pass with boilerplate response", () => {
    const boilerplate: CompletionResponse = {
      text: "Task completed successfully.",
      status: "success",
      codeChanged: true,
    };
    
    expect(evaluateRubric(boilerplate).passed).toBeFalsy();
  });

  it("cannot pass failure with generic error", () => {
    const generic: CompletionResponse = {
      text: "An error occurred.",
      status: "failure",
      codeChanged: false,
    };
    
    expect(evaluateRubric(generic).passed).toBeFalsy();
  });

  it("requires multiple quality signals", () => {
    // Having just one criterion isn't enough
    const partialGood: CompletionResponse = {
      text: "Done.",  // Minimal - no file ref, no change description
      status: "success",
      codeChanged: true,
    };
    
    const result = evaluateRubric(partialGood);
    // Should fail because missing most criteria
    expect(result.passed).toBeFalsy();
  });
});

// ============================================================================
// TESTS: Edge Cases
// ============================================================================

describe("Completion Quality: Edge Cases", () => {
  it("handles partial success", () => {
    const response: CompletionResponse = {
      text: `Partially completed the task.

I updated \`src/auth.ts\` with the new login function.

However, I could not update the tests because the test file was not found.
You may need to create \`tests/auth.test.ts\` manually.

Run \`npm test\` to verify the changes.`,
      status: "partial",
      codeChanged: true,
    };
    
    // Partial uses success rubric
    const result = evaluateRubric(response);
    expect(result.passed).toBeTruthy();
  });

  it("success without code change has relaxed requirements", () => {
    const response: CompletionResponse = {
      text: "The function already exists in src/utils.ts. No changes needed.",
      status: "success",
      codeChanged: false,
    };
    
    const result = evaluateRubric(response);
    // File ref and command criteria should be N/A
    const fileRef = result.breakdown.find(b => b.criterion.includes("File"));
    const command = result.breakdown.find(b => b.criterion.includes("command"));
    
    expect(fileRef?.notes).toContain("N/A");
    expect(command?.notes).toContain("N/A");
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

describe("Completion Quality: Summary", () => {
  it("documents quality requirements", () => {
    const successRequirements = SUCCESS_RUBRIC.map(c => c.name);
    const failureRequirements = FAILURE_RUBRIC.map(c => c.name);
    
    console.log("\n  Success Response Requirements:");
    for (let i = 0; i < successRequirements.length; i++) {
      console.log(`    ${i + 1}. ${successRequirements[i]}`);
    }
    
    console.log("\n  Failure Response Requirements:");
    for (let i = 0; i < failureRequirements.length; i++) {
      console.log(`    ${i + 1}. ${failureRequirements[i]}`);
    }
    
    expect(successRequirements.length).toBeGreaterThan(0);
    expect(failureRequirements.length).toBeGreaterThan(0);
  });
});
