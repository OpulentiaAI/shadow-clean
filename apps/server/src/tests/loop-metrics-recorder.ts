/**
 * Loop Metrics Recorder for Agent Behavior Analysis
 *
 * Tracks and analyzes agent tool-calling behavior to ensure:
 * - No unnecessary repeated tool calls
 * - Strategy switching when stuck
 * - Measurable progress per iteration
 * - Bounded retries and efficient execution
 */

export interface ToolCallRecord {
  toolName: string;
  args: Record<string, unknown>;
  argsHash: string;
  timestamp: number;
  iterationIndex: number;
  resultType: "success" | "error" | "empty";
  resultSummary?: string;
}

export interface ProgressMarker {
  type: "file_created" | "file_modified" | "search_hit" | "patch_applied" | "answer_generated" | "tool_success";
  description: string;
  timestamp: number;
  iterationIndex: number;
}

export interface LoopMetrics {
  totalToolCalls: number;
  uniqueToolCalls: number;
  maxConsecutiveSameTool: number;
  duplicateCallRate: number;
  stallSteps: number;
  progressMarkers: ProgressMarker[];
  timeToFirstProgress: number | null;
  totalIterations: number;
  toolCallsByName: Record<string, number>;
  consecutiveSameToolHistory: number[];
  duplicateCalls: Array<{ toolName: string; argsHash: string; count: number }>;
}

export interface LoopMetricsThresholds {
  maxConsecutiveSameTool: number;
  maxDuplicateCallRate: number;
  maxStallSteps: number;
  maxTotalToolCalls: number;
}

export const DEFAULT_THRESHOLDS: LoopMetricsThresholds = {
  maxConsecutiveSameTool: 2,
  maxDuplicateCallRate: 0.15,
  maxStallSteps: 2,
  maxTotalToolCalls: 50,
};

export class LoopMetricsRecorder {
  private toolCalls: ToolCallRecord[] = [];
  private progressMarkers: ProgressMarker[] = [];
  private iterationIndex: number = 0;
  private startTime: number = 0;
  private thresholds: LoopMetricsThresholds;

  constructor(thresholds: Partial<LoopMetricsThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.startTime = Date.now();
  }

  /**
   * Hash arguments for duplicate detection (excluding volatile fields)
   */
  private hashArgs(args: Record<string, unknown>): string {
    // Sort keys and stringify for deterministic hashing
    const sortedKeys = Object.keys(args).sort();
    const normalized = sortedKeys.reduce((acc, key) => {
      // Exclude volatile fields like timestamps, random IDs
      if (!key.includes("timestamp") && !key.includes("random") && !key.includes("id")) {
        acc[key] = args[key];
      }
      return acc;
    }, {} as Record<string, unknown>);
    return JSON.stringify(normalized);
  }

  /**
   * Record a tool call
   */
  recordToolCall(
    toolName: string,
    args: Record<string, unknown>,
    resultType: "success" | "error" | "empty",
    resultSummary?: string
  ): void {
    const argsHash = this.hashArgs(args);
    this.toolCalls.push({
      toolName,
      args,
      argsHash,
      timestamp: Date.now(),
      iterationIndex: this.iterationIndex,
      resultType,
      resultSummary,
    });
  }

  /**
   * Record a progress marker
   */
  recordProgress(type: ProgressMarker["type"], description: string): void {
    this.progressMarkers.push({
      type,
      description,
      timestamp: Date.now(),
      iterationIndex: this.iterationIndex,
    });
  }

  /**
   * Start a new iteration
   */
  nextIteration(): void {
    this.iterationIndex++;
  }

  /**
   * Compute all metrics from recorded data
   */
  computeMetrics(): LoopMetrics {
    const totalToolCalls = this.toolCalls.length;

    // Unique tool calls (unique toolName + argsHash combinations)
    const uniqueCallsSet = new Set(
      this.toolCalls.map((call) => `${call.toolName}:${call.argsHash}`)
    );
    const uniqueToolCalls = uniqueCallsSet.size;

    // Tool calls by name
    const toolCallsByName: Record<string, number> = {};
    for (const call of this.toolCalls) {
      toolCallsByName[call.toolName] = (toolCallsByName[call.toolName] || 0) + 1;
    }

    // Max consecutive same tool
    let maxConsecutiveSameTool = 0;
    let currentConsecutive = 1;
    const consecutiveSameToolHistory: number[] = [];

    for (let i = 1; i < this.toolCalls.length; i++) {
      if (this.toolCalls[i]!.toolName === this.toolCalls[i - 1]!.toolName) {
        currentConsecutive++;
      } else {
        consecutiveSameToolHistory.push(currentConsecutive);
        maxConsecutiveSameTool = Math.max(maxConsecutiveSameTool, currentConsecutive);
        currentConsecutive = 1;
      }
    }
    if (currentConsecutive > 0) {
      consecutiveSameToolHistory.push(currentConsecutive);
      maxConsecutiveSameTool = Math.max(maxConsecutiveSameTool, currentConsecutive);
    }

    // Duplicate call rate
    const callSignatures = this.toolCalls.map((call) => `${call.toolName}:${call.argsHash}`);
    const signatureCounts: Record<string, number> = {};
    for (const sig of callSignatures) {
      signatureCounts[sig] = (signatureCounts[sig] || 0) + 1;
    }

    const duplicateCalls = Object.entries(signatureCounts)
      .filter(([_, count]) => count > 1)
      .map(([sig, count]) => {
        const [toolName, argsHash] = sig.split(":");
        return { toolName: toolName!, argsHash: argsHash!, count };
      });

    const totalDuplicates = Object.values(signatureCounts)
      .filter((count) => count > 1)
      .reduce((sum, count) => sum + (count - 1), 0);
    const duplicateCallRate = totalToolCalls > 0 ? totalDuplicates / totalToolCalls : 0;

    // Stall steps (iterations without progress)
    const iterationsWithProgress = new Set(
      this.progressMarkers.map((p) => p.iterationIndex)
    );
    let stallSteps = 0;
    for (let i = 0; i <= this.iterationIndex; i++) {
      if (!iterationsWithProgress.has(i)) {
        stallSteps++;
      }
    }

    // Time to first progress
    const firstProgress = this.progressMarkers.length > 0
      ? this.progressMarkers[0]!.timestamp - this.startTime
      : null;

    return {
      totalToolCalls,
      uniqueToolCalls,
      maxConsecutiveSameTool,
      duplicateCallRate,
      stallSteps,
      progressMarkers: this.progressMarkers,
      timeToFirstProgress: firstProgress,
      totalIterations: this.iterationIndex + 1,
      toolCallsByName,
      consecutiveSameToolHistory,
      duplicateCalls,
    };
  }

  /**
   * Validate metrics against thresholds
   * Returns list of violations
   */
  validateMetrics(metrics?: LoopMetrics): Array<{ metric: string; actual: number; threshold: number; message: string }> {
    const m = metrics || this.computeMetrics();
    const violations: Array<{ metric: string; actual: number; threshold: number; message: string }> = [];

    if (m.maxConsecutiveSameTool > this.thresholds.maxConsecutiveSameTool) {
      violations.push({
        metric: "maxConsecutiveSameTool",
        actual: m.maxConsecutiveSameTool,
        threshold: this.thresholds.maxConsecutiveSameTool,
        message: `Agent called same tool ${m.maxConsecutiveSameTool} times consecutively (max: ${this.thresholds.maxConsecutiveSameTool})`,
      });
    }

    if (m.duplicateCallRate > this.thresholds.maxDuplicateCallRate) {
      violations.push({
        metric: "duplicateCallRate",
        actual: m.duplicateCallRate,
        threshold: this.thresholds.maxDuplicateCallRate,
        message: `Duplicate call rate ${(m.duplicateCallRate * 100).toFixed(1)}% exceeds threshold ${(this.thresholds.maxDuplicateCallRate * 100).toFixed(1)}%`,
      });
    }

    if (m.stallSteps > this.thresholds.maxStallSteps) {
      violations.push({
        metric: "stallSteps",
        actual: m.stallSteps,
        threshold: this.thresholds.maxStallSteps,
        message: `Agent stalled for ${m.stallSteps} iterations without progress (max: ${this.thresholds.maxStallSteps})`,
      });
    }

    if (m.totalToolCalls > this.thresholds.maxTotalToolCalls) {
      violations.push({
        metric: "totalToolCalls",
        actual: m.totalToolCalls,
        threshold: this.thresholds.maxTotalToolCalls,
        message: `Agent made ${m.totalToolCalls} tool calls (max: ${this.thresholds.maxTotalToolCalls})`,
      });
    }

    return violations;
  }

  /**
   * Get formatted metrics report
   */
  getReport(): string {
    const metrics = this.computeMetrics();
    const violations = this.validateMetrics(metrics);

    const lines = [
      "=" .repeat(60),
      "LOOP METRICS REPORT",
      "=".repeat(60),
      "",
      "SUMMARY:",
      `  Total Tool Calls: ${metrics.totalToolCalls}`,
      `  Unique Tool Calls: ${metrics.uniqueToolCalls}`,
      `  Max Consecutive Same Tool: ${metrics.maxConsecutiveSameTool}`,
      `  Duplicate Call Rate: ${(metrics.duplicateCallRate * 100).toFixed(1)}%`,
      `  Stall Steps: ${metrics.stallSteps}`,
      `  Total Iterations: ${metrics.totalIterations}`,
      `  Progress Markers: ${metrics.progressMarkers.length}`,
      `  Time to First Progress: ${metrics.timeToFirstProgress !== null ? `${metrics.timeToFirstProgress}ms` : "N/A"}`,
      "",
      "TOOL CALL DISTRIBUTION:",
      ...Object.entries(metrics.toolCallsByName).map(
        ([name, count]) => `  ${name}: ${count}`
      ),
      "",
    ];

    if (metrics.duplicateCalls.length > 0) {
      lines.push("DUPLICATE CALLS:");
      for (const dup of metrics.duplicateCalls) {
        lines.push(`  ${dup.toolName} (${dup.count}x): ${dup.argsHash.substring(0, 50)}...`);
      }
      lines.push("");
    }

    if (violations.length > 0) {
      lines.push("VIOLATIONS:");
      for (const v of violations) {
        lines.push(`  [FAIL] ${v.message}`);
      }
      lines.push("");
    } else {
      lines.push("VALIDATION: All thresholds passed");
      lines.push("");
    }

    lines.push("=".repeat(60));

    return lines.join("\n");
  }

  /**
   * Reset all recorded data
   */
  reset(): void {
    this.toolCalls = [];
    this.progressMarkers = [];
    this.iterationIndex = 0;
    this.startTime = Date.now();
  }
}

/**
 * Create a recorder with strict thresholds for testing
 */
export function createStrictRecorder(): LoopMetricsRecorder {
  return new LoopMetricsRecorder({
    maxConsecutiveSameTool: 2,
    maxDuplicateCallRate: 0.10,
    maxStallSteps: 1,
    maxTotalToolCalls: 30,
  });
}

/**
 * Create a recorder with relaxed thresholds for complex tasks
 */
export function createRelaxedRecorder(): LoopMetricsRecorder {
  return new LoopMetricsRecorder({
    maxConsecutiveSameTool: 4,
    maxDuplicateCallRate: 0.25,
    maxStallSteps: 3,
    maxTotalToolCalls: 100,
  });
}
