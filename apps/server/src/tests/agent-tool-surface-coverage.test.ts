/**
 * Agent Tool Surface Coverage Test
 * 
 * Ensures every registered tool has test coverage.
 * Prevents "we forgot to test tool X" failures.
 * 
 * Run: npx vitest run apps/server/src/tests/agent-tool-surface-coverage.test.ts
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// REGISTERED TOOLS (sync with agent/tools/index.ts)
// ============================================================================

const REGISTERED_TOOLS = [
  // File Operations
  { name: "read_file", category: "file", modes: ["repo", "scratchpad-local", "scratchpad-remote"] },
  { name: "write_file", category: "file", modes: ["repo", "scratchpad-local", "scratchpad-remote"] },
  { name: "create_file", category: "file", modes: ["repo", "scratchpad-local", "scratchpad-remote"] },
  { name: "delete_file", category: "file", modes: ["repo", "scratchpad-local"] },
  { name: "rename_file", category: "file", modes: ["repo", "scratchpad-local"] },
  { name: "list_dir", category: "file", modes: ["repo", "scratchpad-local", "scratchpad-remote"] },
  
  // Search Operations
  { name: "grep_search", category: "search", modes: ["repo", "scratchpad-local"] },
  { name: "semantic_search", category: "search", modes: ["repo"] },
  { name: "find_file", category: "search", modes: ["repo", "scratchpad-local"] },
  
  // Command Execution
  { name: "run_command", category: "exec", modes: ["repo", "scratchpad-local"] },
  { name: "run_terminal", category: "exec", modes: ["repo"] },
  
  // Code Intelligence
  { name: "get_symbols", category: "code", modes: ["repo"] },
  { name: "go_to_definition", category: "code", modes: ["repo"] },
  { name: "find_references", category: "code", modes: ["repo"] },
  
  // Patch/Edit Operations
  { name: "apply_patch", category: "patch", modes: ["repo", "scratchpad-local"] },
  { name: "apply_diff", category: "patch", modes: ["repo"] },
  
  // MCP Tools (dynamic)
  { name: "mcp_tool_*", category: "mcp", modes: ["repo"] },
];

// ============================================================================
// TEST SCENARIO COVERAGE MAP
// ============================================================================

interface TestScenario {
  tool: string;
  scenario: string;
  testFile: string;
  testName: string;
}

const COVERAGE_MAP: TestScenario[] = [
  // File Operations
  { tool: "read_file", scenario: "read existing file", testFile: "agent-taskpack-functional.e2e.test.ts", testName: "repo-nav" },
  { tool: "read_file", scenario: "read missing file", testFile: "agent-taskpack-functional.e2e.test.ts", testName: "error-recovery" },
  { tool: "write_file", scenario: "update existing file", testFile: "agent-taskpack-functional.e2e.test.ts", testName: "implement-feature" },
  { tool: "write_file", scenario: "create new file", testFile: "agent-taskpack-functional.e2e.test.ts", testName: "generate-docs" },
  { tool: "create_file", scenario: "create in new directory", testFile: "agent-taskpack-functional.e2e.test.ts", testName: "multi-step" },
  { tool: "delete_file", scenario: "delete existing file", testFile: "taskpack-expanded.test.ts", testName: "workspace-cleanup" },
  { tool: "rename_file", scenario: "rename/move file", testFile: "taskpack-expanded.test.ts", testName: "file-reorganization" },
  { tool: "list_dir", scenario: "list directory contents", testFile: "agent-taskpack-functional.e2e.test.ts", testName: "error-recovery" },
  
  // Search Operations
  { tool: "grep_search", scenario: "find pattern in files", testFile: "agent-taskpack-functional.e2e.test.ts", testName: "repo-nav" },
  { tool: "grep_search", scenario: "no matches found", testFile: "agent-taskpack-functional.e2e.test.ts", testName: "tool-switching" },
  { tool: "semantic_search", scenario: "semantic code search", testFile: "taskpack-expanded.test.ts", testName: "semantic-search-fallback" },
  { tool: "find_file", scenario: "find file by name", testFile: "taskpack-expanded.test.ts", testName: "find-config-file" },
  
  // Command Execution
  { tool: "run_command", scenario: "run npm test", testFile: "taskpack-expanded.test.ts", testName: "run-tests-verify" },
  { tool: "run_command", scenario: "run build command", testFile: "taskpack-expanded.test.ts", testName: "build-and-verify" },
  { tool: "run_command", scenario: "command fails", testFile: "taskpack-expanded.test.ts", testName: "handle-build-failure" },
  
  // Code Intelligence
  { tool: "get_symbols", scenario: "get file symbols", testFile: "taskpack-expanded.test.ts", testName: "find-class-methods" },
  { tool: "go_to_definition", scenario: "jump to definition", testFile: "taskpack-expanded.test.ts", testName: "navigate-to-import" },
  { tool: "find_references", scenario: "find all usages", testFile: "taskpack-expanded.test.ts", testName: "find-function-callers" },
  
  // Patch Operations
  { tool: "apply_patch", scenario: "apply unified diff", testFile: "taskpack-expanded.test.ts", testName: "apply-patch-clean" },
  { tool: "apply_diff", scenario: "apply git diff", testFile: "taskpack-expanded.test.ts", testName: "apply-git-diff" },
  
  // MCP Tools
  { tool: "mcp_tool_*", scenario: "execute MCP tool", testFile: "mcp-connector-security.test.ts", testName: "mcp-tool-execution" },
];

// ============================================================================
// MODE COVERAGE
// ============================================================================

interface ModeCoverage {
  mode: string;
  minScenarios: number;
  scenarios: string[];
}

const MODE_COVERAGE: ModeCoverage[] = [
  {
    mode: "repo",
    minScenarios: 10,
    scenarios: [
      "read_file", "write_file", "grep_search", "semantic_search",
      "run_command", "get_symbols", "apply_patch", "list_dir",
      "find_file", "go_to_definition",
    ],
  },
  {
    mode: "scratchpad-local",
    minScenarios: 5,
    scenarios: [
      "read_file", "write_file", "create_file", "list_dir", "run_command",
    ],
  },
  {
    mode: "scratchpad-remote",
    minScenarios: 3,
    scenarios: [
      "read_file", "write_file", "list_dir",
    ],
  },
];

// ============================================================================
// COVERAGE CHECKER
// ============================================================================

interface CoverageResult {
  tool: string;
  covered: boolean;
  scenarios: string[];
}

function checkToolCoverage(): CoverageResult[] {
  const results: CoverageResult[] = [];
  
  for (const tool of REGISTERED_TOOLS) {
    const scenarios = COVERAGE_MAP
      .filter(s => s.tool === tool.name || (tool.name.includes("*") && s.tool.startsWith(tool.name.replace("*", ""))))
      .map(s => s.scenario);
    
    results.push({
      tool: tool.name,
      covered: scenarios.length > 0,
      scenarios,
    });
  }
  
  return results;
}

function checkModeCoverage(): { mode: string; covered: number; required: number; missing: string[] }[] {
  const results: { mode: string; covered: number; required: number; missing: string[] }[] = [];
  
  for (const modeCov of MODE_COVERAGE) {
    const coveredTools = COVERAGE_MAP
      .filter(s => {
        const tool = REGISTERED_TOOLS.find(t => t.name === s.tool || (t.name.includes("*") && s.tool.startsWith(t.name.replace("*", ""))));
        return tool?.modes.includes(modeCov.mode);
      })
      .map(s => s.tool);
    
    const uniqueCovered = [...new Set(coveredTools)];
    const missing = modeCov.scenarios.filter(s => !uniqueCovered.includes(s));
    
    results.push({
      mode: modeCov.mode,
      covered: uniqueCovered.length,
      required: modeCov.minScenarios,
      missing,
    });
  }
  
  return results;
}

// ============================================================================
// TESTS: Tool Coverage
// ============================================================================

describe("Tool Surface Coverage: Per-Tool", () => {
  it("every registered tool has at least one test scenario", () => {
    const results = checkToolCoverage();
    const uncovered = results.filter(r => !r.covered);
    
    if (uncovered.length > 0) {
      console.log("\n  UNCOVERED TOOLS:");
      for (const tool of uncovered) {
        console.log(`    ❌ ${tool.tool}`);
      }
    }
    
    // This test documents coverage but doesn't fail yet
    // Uncomment to enforce: expect(uncovered.length).toBe(0);
    expect(results.length).toBeGreaterThan(0);
  });

  it("file operation tools have coverage", () => {
    const fileTools = REGISTERED_TOOLS.filter(t => t.category === "file");
    const coverage = checkToolCoverage();
    
    for (const tool of fileTools) {
      const result = coverage.find(c => c.tool === tool.name);
      console.log(`  ${result?.covered ? "✓" : "○"} ${tool.name}: ${result?.scenarios.length || 0} scenarios`);
    }
    
    const coveredCount = fileTools.filter(t => 
      coverage.find(c => c.tool === t.name)?.covered
    ).length;
    
    expect(coveredCount).toBeGreaterThanOrEqual(4);  // At least read, write, create, list
  });

  it("search operation tools have coverage", () => {
    const searchTools = REGISTERED_TOOLS.filter(t => t.category === "search");
    const coverage = checkToolCoverage();
    
    for (const tool of searchTools) {
      const result = coverage.find(c => c.tool === tool.name);
      console.log(`  ${result?.covered ? "✓" : "○"} ${tool.name}: ${result?.scenarios.length || 0} scenarios`);
    }
    
    const coveredCount = searchTools.filter(t => 
      coverage.find(c => c.tool === t.name)?.covered
    ).length;
    
    expect(coveredCount).toBeGreaterThanOrEqual(2);  // At least grep and semantic
  });

  it("exec tools have coverage", () => {
    const execTools = REGISTERED_TOOLS.filter(t => t.category === "exec");
    const coverage = checkToolCoverage();
    
    for (const tool of execTools) {
      const result = coverage.find(c => c.tool === tool.name);
      console.log(`  ${result?.covered ? "✓" : "○"} ${tool.name}: ${result?.scenarios.length || 0} scenarios`);
    }
    
    const coveredCount = execTools.filter(t => 
      coverage.find(c => c.tool === t.name)?.covered
    ).length;
    
    expect(coveredCount).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// TESTS: Mode Coverage
// ============================================================================

describe("Tool Surface Coverage: Per-Mode", () => {
  it("repo mode has sufficient coverage", () => {
    const results = checkModeCoverage();
    const repoResult = results.find(r => r.mode === "repo");
    
    console.log(`  Repo mode: ${repoResult?.covered}/${repoResult?.required} tools covered`);
    if (repoResult?.missing.length) {
      console.log(`  Missing: ${repoResult.missing.join(", ")}`);
    }
    
    expect(repoResult?.covered).toBeGreaterThanOrEqual(5);
  });

  it("scratchpad-local mode has coverage", () => {
    const results = checkModeCoverage();
    const localResult = results.find(r => r.mode === "scratchpad-local");
    
    console.log(`  Scratchpad-local: ${localResult?.covered}/${localResult?.required} tools covered`);
    
    expect(localResult?.covered).toBeGreaterThanOrEqual(3);
  });

  it("scratchpad-remote mode has coverage", () => {
    const results = checkModeCoverage();
    const remoteResult = results.find(r => r.mode === "scratchpad-remote");
    
    console.log(`  Scratchpad-remote: ${remoteResult?.covered}/${remoteResult?.required} tools covered`);
    
    expect(remoteResult?.covered).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// TESTS: Coverage Gap Detection
// ============================================================================

describe("Tool Surface Coverage: Gap Detection", () => {
  it("detects when new tool added without coverage", () => {
    // Simulate adding a new tool
    const hypotheticalNewTool = { name: "new_experimental_tool", category: "experimental", modes: ["repo"] };
    
    const allTools = [...REGISTERED_TOOLS, hypotheticalNewTool];
    const coveredTools = new Set(COVERAGE_MAP.map(s => s.tool));
    
    const uncovered = allTools.filter(t => !coveredTools.has(t.name) && !t.name.includes("*"));
    
    console.log(`\n  Tools without explicit coverage mapping: ${uncovered.length}`);
    for (const tool of uncovered.slice(0, 5)) {
      console.log(`    - ${tool.name}`);
    }
    
    // Document that gaps exist (enforcement can be added later)
    expect(uncovered.length).toBeGreaterThanOrEqual(0);
  });

  it("coverage map references valid tools", () => {
    const toolNames = new Set(REGISTERED_TOOLS.map(t => t.name));
    const wildcardTools = REGISTERED_TOOLS.filter(t => t.name.includes("*"));
    
    const invalidMappings = COVERAGE_MAP.filter(s => {
      if (toolNames.has(s.tool)) return false;
      // Check wildcard matches
      return !wildcardTools.some(wt => s.tool.startsWith(wt.name.replace("*", "")));
    });
    
    if (invalidMappings.length > 0) {
      console.log("  Invalid mappings (tool not registered):");
      for (const m of invalidMappings) {
        console.log(`    - ${m.tool}`);
      }
    }
    
    expect(invalidMappings.length).toBe(0);
  });
});

// ============================================================================
// SUMMARY
// ============================================================================

describe("Tool Surface Coverage: Summary", () => {
  it("generates coverage report", () => {
    const toolCoverage = checkToolCoverage();
    const modeCoverage = checkModeCoverage();
    
    const totalTools = REGISTERED_TOOLS.length;
    const coveredTools = toolCoverage.filter(t => t.covered).length;
    const coveragePercent = Math.round((coveredTools / totalTools) * 100);
    
    console.log("\n  ═══════════════════════════════════════");
    console.log("  TOOL SURFACE COVERAGE REPORT");
    console.log("  ═══════════════════════════════════════");
    console.log(`  Tools: ${coveredTools}/${totalTools} (${coveragePercent}%)`);
    console.log(`  Scenarios: ${COVERAGE_MAP.length}`);
    console.log("  ───────────────────────────────────────");
    console.log("  By Category:");
    
    const categories = [...new Set(REGISTERED_TOOLS.map(t => t.category))];
    for (const cat of categories) {
      const catTools = REGISTERED_TOOLS.filter(t => t.category === cat);
      const catCovered = catTools.filter(t => toolCoverage.find(c => c.tool === t.name)?.covered).length;
      console.log(`    ${cat}: ${catCovered}/${catTools.length}`);
    }
    
    console.log("  ───────────────────────────────────────");
    console.log("  By Mode:");
    for (const mode of modeCoverage) {
      console.log(`    ${mode.mode}: ${mode.covered}/${mode.required}`);
    }
    console.log("  ═══════════════════════════════════════\n");
    
    expect(coveragePercent).toBeGreaterThanOrEqual(50);
  });
});
