/**
 * Tool Output Utilization Tests
 * 
 * Ensures agent actually uses tool outputs in final response.
 * Injects unique canaries that MUST appear in response.
 * 
 * Run: npx vitest run apps/server/src/tests/tool-output-utilization.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// TYPES
// ============================================================================

interface ToolOutput {
  toolName: string;
  canary: string;  // Unique identifier that must appear in response
  output: unknown;
}

interface AgentResponse {
  text: string;
  toolOutputs: ToolOutput[];
}

// ============================================================================
// CANARY GENERATOR
// ============================================================================

function generateCanary(): string {
  return `CANARY_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function injectCanary(output: Record<string, unknown>, canary: string): Record<string, unknown> {
  return { ...output, _canary: canary };
}

// ============================================================================
// UTILIZATION CHECKER
// ============================================================================

interface UtilizationResult {
  passed: boolean;
  utilized: string[];
  ignored: string[];
  details: string;
}

function checkToolOutputUtilization(response: AgentResponse): UtilizationResult {
  const utilized: string[] = [];
  const ignored: string[] = [];
  
  for (const toolOutput of response.toolOutputs) {
    if (response.text.includes(toolOutput.canary)) {
      utilized.push(toolOutput.toolName);
    } else {
      ignored.push(toolOutput.toolName);
    }
  }
  
  return {
    passed: ignored.length === 0,
    utilized,
    ignored,
    details: ignored.length === 0 
      ? "All tool outputs utilized" 
      : `Ignored: ${ignored.join(", ")}`,
  };
}

// ============================================================================
// DERIVED FACTS CHECKER
// ============================================================================

interface DerivedFact {
  source: string;  // Tool that provided this
  fact: string;    // The derived information
  pattern: RegExp; // Pattern to find in response
}

function checkDerivedFacts(response: string, facts: DerivedFact[]): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const fact of facts) {
    if (!fact.pattern.test(response)) {
      missing.push(`${fact.source}: ${fact.fact}`);
    }
  }
  
  return { passed: missing.length === 0, missing };
}

// ============================================================================
// TESTS: Canary Detection
// ============================================================================

describe("Tool Output Utilization: Canary Detection", () => {
  it("detects when tool output is used", () => {
    const canary = generateCanary();
    const response: AgentResponse = {
      text: `Found the function at line 42. Details: ${canary}`,
      toolOutputs: [
        { toolName: "grep_search", canary, output: { line: 42 } },
      ],
    };
    
    const result = checkToolOutputUtilization(response);
    expect(result.passed).toBeTruthy();
    expect(result.utilized).toContain("grep_search");
  });

  it("detects when tool output is ignored", () => {
    const canary = generateCanary();
    const response: AgentResponse = {
      text: "I found something but won't tell you what.",
      toolOutputs: [
        { toolName: "read_file", canary, output: { content: "secret" } },
      ],
    };
    
    const result = checkToolOutputUtilization(response);
    expect(result.passed).toBeFalsy();
    expect(result.ignored).toContain("read_file");
  });

  it("handles multiple tool outputs", () => {
    const canary1 = generateCanary();
    const canary2 = generateCanary();
    const canary3 = generateCanary();
    
    const response: AgentResponse = {
      text: `Found in file A (${canary1}) and file B (${canary2}). Ignored file C.`,
      toolOutputs: [
        { toolName: "read_file_A", canary: canary1, output: {} },
        { toolName: "read_file_B", canary: canary2, output: {} },
        { toolName: "read_file_C", canary: canary3, output: {} },
      ],
    };
    
    const result = checkToolOutputUtilization(response);
    expect(result.passed).toBeFalsy();
    expect(result.utilized).toHaveLength(2);
    expect(result.ignored).toContain("read_file_C");
  });
});

// ============================================================================
// TESTS: Derived Facts
// ============================================================================

describe("Tool Output Utilization: Derived Facts", () => {
  it("passes when all derived facts present", () => {
    const response = "The add function is in src/utils.ts at line 5. It takes two parameters.";
    const facts: DerivedFact[] = [
      { source: "grep_search", fact: "file location", pattern: /src\/utils\.ts/ },
      { source: "grep_search", fact: "line number", pattern: /line \d+/ },
      { source: "read_file", fact: "parameters", pattern: /two parameters/ },
    ];
    
    const result = checkDerivedFacts(response, facts);
    expect(result.passed).toBeTruthy();
  });

  it("fails when derived facts missing", () => {
    const response = "Found the function.";  // Missing specifics
    const facts: DerivedFact[] = [
      { source: "grep_search", fact: "file location", pattern: /src\/\w+\.ts/ },
      { source: "grep_search", fact: "line number", pattern: /line \d+/ },
    ];
    
    const result = checkDerivedFacts(response, facts);
    expect(result.passed).toBeFalsy();
    expect(result.missing.length).toBe(2);
  });

  it("requires specific data from tool output", () => {
    // Simulate: grep found "VERSION = '2.0.0'" at line 10
    const toolOutput = { file: "constants.ts", line: 10, match: "VERSION = '2.0.0'" };
    
    // Good response: includes derived facts
    const goodResponse = "The VERSION is set to '2.0.0' in constants.ts at line 10.";
    
    // Bad response: generic, ignores tool data
    const badResponse = "I found the version constant.";
    
    const facts: DerivedFact[] = [
      { source: "grep", fact: "version value", pattern: /2\.0\.0/ },
      { source: "grep", fact: "file name", pattern: /constants\.ts/ },
      { source: "grep", fact: "line", pattern: /line 10/ },
    ];
    
    expect(checkDerivedFacts(goodResponse, facts).passed).toBeTruthy();
    expect(checkDerivedFacts(badResponse, facts).passed).toBeFalsy();
  });
});

// ============================================================================
// TESTS: Anti-Reward-Hacking
// ============================================================================

describe("Tool Output Utilization: Anti-Reward-Hacking", () => {
  it("canaries are unique per run", () => {
    const canaries = new Set<string>();
    for (let i = 0; i < 100; i++) {
      canaries.add(generateCanary());
    }
    expect(canaries.size).toBe(100);
  });

  it("cannot pass by hardcoding responses", () => {
    // Generate runtime canary - impossible to predict
    const canary = generateCanary();
    
    // Hardcoded response won't contain runtime canary
    const hardcodedResponse: AgentResponse = {
      text: "The function is in src/utils.ts",
      toolOutputs: [{ toolName: "grep", canary, output: {} }],
    };
    
    const result = checkToolOutputUtilization(hardcodedResponse);
    expect(result.passed).toBeFalsy();
  });

  it("empty response fails utilization check", () => {
    const canary = generateCanary();
    const response: AgentResponse = {
      text: "",
      toolOutputs: [{ toolName: "read_file", canary, output: { content: "data" } }],
    };
    
    const result = checkToolOutputUtilization(response);
    expect(result.passed).toBeFalsy();
  });

  it("generic response without specifics fails", () => {
    const facts: DerivedFact[] = [
      { source: "grep", fact: "exact line", pattern: /line \d+/ },
      { source: "grep", fact: "exact file", pattern: /\w+\.(ts|js)/ },
    ];
    
    const genericResponses = [
      "Found it!",
      "The code is in the project.",
      "I located the function you asked about.",
    ];
    
    for (const response of genericResponses) {
      const result = checkDerivedFacts(response, facts);
      expect(result.passed).toBeFalsy();
    }
  });
});

// ============================================================================
// TESTS: Real Scenarios
// ============================================================================

describe("Tool Output Utilization: Real Scenarios", () => {
  it("file search scenario requires path and content", () => {
    const canary = generateCanary();
    const toolOutput = {
      path: "src/auth/login.ts",
      content: `export function login(user: string) { /* ${canary} */ }`,
    };
    
    const goodResponse: AgentResponse = {
      text: `Found login function in src/auth/login.ts. It takes a user parameter. ${canary}`,
      toolOutputs: [{ toolName: "read_file", canary, output: toolOutput }],
    };
    
    const result = checkToolOutputUtilization(goodResponse);
    expect(result.passed).toBeTruthy();
    
    const facts: DerivedFact[] = [
      { source: "read_file", fact: "path", pattern: /src\/auth\/login\.ts/ },
      { source: "read_file", fact: "function name", pattern: /login/ },
      { source: "read_file", fact: "parameter", pattern: /user/ },
    ];
    expect(checkDerivedFacts(goodResponse.text, facts).passed).toBeTruthy();
  });

  it("command output scenario requires exit code and output", () => {
    const canary = generateCanary();
    const toolOutput = {
      command: "npm test",
      exitCode: 0,
      stdout: `All 42 tests passed ${canary}`,
    };
    
    const goodResponse: AgentResponse = {
      text: `Tests passed: 42 tests completed successfully. ${canary}`,
      toolOutputs: [{ toolName: "run_command", canary, output: toolOutput }],
    };
    
    expect(checkToolOutputUtilization(goodResponse).passed).toBeTruthy();
    
    const facts: DerivedFact[] = [
      { source: "run_command", fact: "test count", pattern: /42/ },
      { source: "run_command", fact: "result", pattern: /passed|success/i },
    ];
    expect(checkDerivedFacts(goodResponse.text, facts).passed).toBeTruthy();
  });

  it("grep search scenario requires matches and locations", () => {
    const canary = generateCanary();
    const toolOutput = {
      matches: [
        { file: "src/api.ts", line: 15, text: "export const API_URL" },
        { file: "src/config.ts", line: 8, text: "const API_URL" },
      ],
      _canary: canary,
    };
    
    const goodResponse: AgentResponse = {
      text: `Found API_URL in 2 files: src/api.ts:15 and src/config.ts:8. ${canary}`,
      toolOutputs: [{ toolName: "grep_search", canary, output: toolOutput }],
    };
    
    expect(checkToolOutputUtilization(goodResponse).passed).toBeTruthy();
    
    const facts: DerivedFact[] = [
      { source: "grep", fact: "file 1", pattern: /src\/api\.ts/ },
      { source: "grep", fact: "file 2", pattern: /src\/config\.ts/ },
      { source: "grep", fact: "line numbers", pattern: /15.*8|8.*15/ },
    ];
    expect(checkDerivedFacts(goodResponse.text, facts).passed).toBeTruthy();
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

describe("Tool Output Utilization: Summary", () => {
  it("documents verification requirements", () => {
    const requirements = [
      "Unique canaries injected into tool outputs",
      "Response must contain canary to prove utilization",
      "Derived facts must appear in response",
      "Generic responses without specifics fail",
      "Empty or minimal responses fail",
    ];
    
    console.log("\n  Tool Output Verification Requirements:");
    for (let i = 0; i < requirements.length; i++) {
      console.log(`    ${i + 1}. ${requirements[i]}`);
    }
    
    expect(requirements.length).toBe(5);
  });
});
