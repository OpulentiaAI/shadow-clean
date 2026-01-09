/**
 * Tool Execution Logger
 *
 * Provides detailed logging and metrics for tool execution in agent workflows.
 * Tracks success rates, execution durations, and error patterns.
 *
 * Based on Convex Agent observability patterns and AI SDK tool tracking.
 * @see https://docs.convex.dev/agents
 */

export interface ToolExecution {
  id: string;
  toolName: string;
  taskId: string;
  startedAt: number;
  completedAt?: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  durationMs?: number;
  error?: string;
  argsPreview?: string;
  resultPreview?: string;
}

export interface ToolMetrics {
  executions: Map<string, ToolExecution>;
  byTool: Map<string, ToolStats>;
  totalExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
  avgDurationMs: number;
}

export interface ToolStats {
  toolName: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
  avgDurationMs: number;
  lastExecutedAt: number;
  errors: string[];
}

const MAX_EXECUTIONS = 500;
const MAX_ERRORS_PER_TOOL = 10;
const PREVIEW_LENGTH = 100;

/**
 * Create initial tool metrics state
 */
export function createToolMetrics(): ToolMetrics {
  return {
    executions: new Map(),
    byTool: new Map(),
    totalExecutions: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgDurationMs: 0,
  };
}

/**
 * Log tool execution start
 */
export function logToolStart(
  metrics: ToolMetrics,
  toolCallId: string,
  toolName: string,
  taskId: string,
  args?: Record<string, unknown>
): ToolMetrics {
  const execution: ToolExecution = {
    id: toolCallId,
    toolName,
    taskId,
    startedAt: Date.now(),
    status: 'executing',
    argsPreview: args ? truncatePreview(JSON.stringify(args)) : undefined,
  };

  const executions = new Map(metrics.executions);

  // Cleanup old executions if at max
  if (executions.size >= MAX_EXECUTIONS) {
    const oldest = findOldestExecution(executions);
    if (oldest) {
      executions.delete(oldest);
    }
  }

  executions.set(toolCallId, execution);

  console.debug(`[ToolExec] Started: ${toolName} (${toolCallId})`, {
    taskId,
    args: execution.argsPreview,
  });

  return {
    ...metrics,
    executions,
    totalExecutions: metrics.totalExecutions + 1,
  };
}

/**
 * Log tool execution completion
 */
export function logToolComplete(
  metrics: ToolMetrics,
  toolCallId: string,
  result?: unknown
): ToolMetrics {
  const execution = metrics.executions.get(toolCallId);
  if (!execution) {
    console.warn(`[ToolExec] Completion for unknown tool: ${toolCallId}`);
    return metrics;
  }

  const completedAt = Date.now();
  const durationMs = completedAt - execution.startedAt;

  const updatedExecution: ToolExecution = {
    ...execution,
    status: 'completed',
    completedAt,
    durationMs,
    resultPreview: result ? truncatePreview(JSON.stringify(result)) : undefined,
  };

  const executions = new Map(metrics.executions);
  executions.set(toolCallId, updatedExecution);

  // Update per-tool stats
  const byTool = new Map(metrics.byTool);
  const toolStats = byTool.get(execution.toolName) || createToolStats(execution.toolName);

  const updatedStats: ToolStats = {
    ...toolStats,
    executionCount: toolStats.executionCount + 1,
    successCount: toolStats.successCount + 1,
    totalDurationMs: toolStats.totalDurationMs + durationMs,
    avgDurationMs: Math.round(
      (toolStats.totalDurationMs + durationMs) / (toolStats.successCount + 1)
    ),
    lastExecutedAt: completedAt,
  };

  byTool.set(execution.toolName, updatedStats);

  // Calculate new average duration
  const totalDuration = metrics.avgDurationMs * metrics.totalSuccesses + durationMs;
  const newAvgDuration = Math.round(totalDuration / (metrics.totalSuccesses + 1));

  console.debug(`[ToolExec] Completed: ${execution.toolName} (${toolCallId})`, {
    durationMs,
    result: updatedExecution.resultPreview,
  });

  return {
    ...metrics,
    executions,
    byTool,
    totalSuccesses: metrics.totalSuccesses + 1,
    avgDurationMs: newAvgDuration,
  };
}

/**
 * Log tool execution failure
 */
export function logToolFailed(
  metrics: ToolMetrics,
  toolCallId: string,
  error: string
): ToolMetrics {
  const execution = metrics.executions.get(toolCallId);
  if (!execution) {
    console.warn(`[ToolExec] Failure for unknown tool: ${toolCallId}`);
    return metrics;
  }

  const completedAt = Date.now();
  const durationMs = completedAt - execution.startedAt;

  const updatedExecution: ToolExecution = {
    ...execution,
    status: 'failed',
    completedAt,
    durationMs,
    error,
  };

  const executions = new Map(metrics.executions);
  executions.set(toolCallId, updatedExecution);

  // Update per-tool stats
  const byTool = new Map(metrics.byTool);
  const toolStats = byTool.get(execution.toolName) || createToolStats(execution.toolName);

  const errors = [...toolStats.errors, error];
  if (errors.length > MAX_ERRORS_PER_TOOL) {
    errors.shift();
  }

  const updatedStats: ToolStats = {
    ...toolStats,
    executionCount: toolStats.executionCount + 1,
    failureCount: toolStats.failureCount + 1,
    totalDurationMs: toolStats.totalDurationMs + durationMs,
    avgDurationMs: Math.round(
      (toolStats.totalDurationMs + durationMs) / (toolStats.executionCount + 1)
    ),
    lastExecutedAt: completedAt,
    errors,
  };

  byTool.set(execution.toolName, updatedStats);

  console.error(`[ToolExec] Failed: ${execution.toolName} (${toolCallId})`, {
    durationMs,
    error,
  });

  return {
    ...metrics,
    executions,
    byTool,
    totalFailures: metrics.totalFailures + 1,
  };
}

/**
 * Get execution by ID
 */
export function getExecution(
  metrics: ToolMetrics,
  toolCallId: string
): ToolExecution | undefined {
  return metrics.executions.get(toolCallId);
}

/**
 * Get stats for a specific tool
 */
export function getToolStats(
  metrics: ToolMetrics,
  toolName: string
): ToolStats | undefined {
  return metrics.byTool.get(toolName);
}

/**
 * Get all tool stats sorted by execution count
 */
export function getAllToolStats(metrics: ToolMetrics): ToolStats[] {
  return Array.from(metrics.byTool.values()).sort(
    (a, b) => b.executionCount - a.executionCount
  );
}

/**
 * Get pending executions
 */
export function getPendingExecutions(metrics: ToolMetrics): ToolExecution[] {
  return Array.from(metrics.executions.values()).filter(
    (exec) => exec.status === 'executing'
  );
}

/**
 * Get recent executions
 */
export function getRecentExecutions(
  metrics: ToolMetrics,
  limit: number = 20
): ToolExecution[] {
  return Array.from(metrics.executions.values())
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit);
}

/**
 * Get failed executions
 */
export function getFailedExecutions(
  metrics: ToolMetrics,
  limit: number = 20
): ToolExecution[] {
  return Array.from(metrics.executions.values())
    .filter((exec) => exec.status === 'failed')
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit);
}

/**
 * Get summary metrics
 */
export function getToolSummary(metrics: ToolMetrics): {
  totalExecutions: number;
  successRate: number;
  avgDurationMs: number;
  pendingCount: number;
  uniqueTools: number;
  mostUsedTool: string | null;
  slowestTool: string | null;
} {
  const totalCompleted = metrics.totalSuccesses + metrics.totalFailures;
  const successRate = totalCompleted > 0 ? metrics.totalSuccesses / totalCompleted : 1;
  const pendingCount = getPendingExecutions(metrics).length;

  let mostUsedTool: string | null = null;
  let maxExecutions = 0;
  let slowestTool: string | null = null;
  let maxAvgDuration = 0;

  for (const stats of metrics.byTool.values()) {
    if (stats.executionCount > maxExecutions) {
      maxExecutions = stats.executionCount;
      mostUsedTool = stats.toolName;
    }
    if (stats.avgDurationMs > maxAvgDuration) {
      maxAvgDuration = stats.avgDurationMs;
      slowestTool = stats.toolName;
    }
  }

  return {
    totalExecutions: metrics.totalExecutions,
    successRate,
    avgDurationMs: metrics.avgDurationMs,
    pendingCount,
    uniqueTools: metrics.byTool.size,
    mostUsedTool,
    slowestTool,
  };
}

/**
 * Format tool metrics for display
 */
export function formatToolMetrics(metrics: ToolMetrics): string {
  const summary = getToolSummary(metrics);
  const topTools = getAllToolStats(metrics).slice(0, 5);

  let output = `
🔧 Tool Execution Metrics
━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Overview
  • Total Executions: ${summary.totalExecutions}
  • Success Rate: ${(summary.successRate * 100).toFixed(1)}%
  • Avg Duration: ${summary.avgDurationMs}ms
  • Pending: ${summary.pendingCount}
  • Unique Tools: ${summary.uniqueTools}

🏆 Top Tools by Usage
`;

  for (const tool of topTools) {
    const successRate = tool.executionCount > 0
      ? ((tool.successCount / tool.executionCount) * 100).toFixed(0)
      : '100';
    output += `  • ${tool.toolName}: ${tool.executionCount} calls, ${successRate}% success, ${tool.avgDurationMs}ms avg\n`;
  }

  if (summary.mostUsedTool) {
    output += `\n🌟 Most Used: ${summary.mostUsedTool}`;
  }
  if (summary.slowestTool) {
    output += `\n🐢 Slowest: ${summary.slowestTool}`;
  }

  return output.trim();
}

// Helper functions

function createToolStats(toolName: string): ToolStats {
  return {
    toolName,
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    totalDurationMs: 0,
    avgDurationMs: 0,
    lastExecutedAt: 0,
    errors: [],
  };
}

function truncatePreview(str: string): string {
  if (str.length <= PREVIEW_LENGTH) return str;
  return str.substring(0, PREVIEW_LENGTH) + '...';
}

function findOldestExecution(executions: Map<string, ToolExecution>): string | null {
  let oldestId: string | null = null;
  let oldestTime = Infinity;

  for (const [id, exec] of executions) {
    // Only remove completed executions
    if (exec.status !== 'executing' && exec.startedAt < oldestTime) {
      oldestTime = exec.startedAt;
      oldestId = id;
    }
  }

  return oldestId;
}
