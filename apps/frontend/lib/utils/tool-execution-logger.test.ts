import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createToolMetrics,
  logToolStart,
  logToolComplete,
  logToolFailed,
  getExecution,
  getToolStats,
  getAllToolStats,
  getPendingExecutions,
  getRecentExecutions,
  getFailedExecutions,
  getToolSummary,
  formatToolMetrics,
} from './tool-execution-logger';

describe('tool-execution-logger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createToolMetrics', () => {
    it('should create empty metrics', () => {
      const metrics = createToolMetrics();

      expect(metrics.executions.size).toBe(0);
      expect(metrics.byTool.size).toBe(0);
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.totalSuccesses).toBe(0);
      expect(metrics.totalFailures).toBe(0);
    });
  });

  describe('logToolStart', () => {
    it('should track new tool execution', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const metrics = createToolMetrics();
      const updated = logToolStart(metrics, 'call-1', 'read_file', 'task-123');

      expect(updated.executions.size).toBe(1);
      expect(updated.totalExecutions).toBe(1);

      const execution = updated.executions.get('call-1');
      expect(execution?.toolName).toBe('read_file');
      expect(execution?.taskId).toBe('task-123');
      expect(execution?.status).toBe('executing');
      expect(execution?.startedAt).toBe(now);
    });

    it('should store args preview', () => {
      const metrics = createToolMetrics();
      const updated = logToolStart(
        metrics,
        'call-1',
        'read_file',
        'task-123',
        { path: '/src/index.ts' }
      );

      const execution = updated.executions.get('call-1');
      expect(execution?.argsPreview).toContain('/src/index.ts');
    });

    it('should truncate long args', () => {
      const metrics = createToolMetrics();
      const longContent = 'a'.repeat(200);
      const updated = logToolStart(
        metrics,
        'call-1',
        'edit_file',
        'task-123',
        { content: longContent }
      );

      const execution = updated.executions.get('call-1');
      expect(execution?.argsPreview?.length).toBeLessThanOrEqual(103); // 100 + '...'
    });
  });

  describe('logToolComplete', () => {
    it('should mark execution as completed with duration', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let metrics = createToolMetrics();
      metrics = logToolStart(metrics, 'call-1', 'read_file', 'task-123');

      vi.advanceTimersByTime(150);
      metrics = logToolComplete(metrics, 'call-1', { content: 'file content' });

      const execution = metrics.executions.get('call-1');
      expect(execution?.status).toBe('completed');
      expect(execution?.durationMs).toBe(150);
      expect(metrics.totalSuccesses).toBe(1);
    });

    it('should update per-tool stats', () => {
      let metrics = createToolMetrics();
      metrics = logToolStart(metrics, 'call-1', 'read_file', 'task-123');
      vi.advanceTimersByTime(100);
      metrics = logToolComplete(metrics, 'call-1');

      metrics = logToolStart(metrics, 'call-2', 'read_file', 'task-123');
      vi.advanceTimersByTime(200);
      metrics = logToolComplete(metrics, 'call-2');

      const stats = getToolStats(metrics, 'read_file');
      expect(stats?.executionCount).toBe(2);
      expect(stats?.successCount).toBe(2);
      expect(stats?.avgDurationMs).toBe(150); // (100 + 200) / 2
    });

    it('should handle unknown tool call', () => {
      const metrics = createToolMetrics();
      const updated = logToolComplete(metrics, 'unknown-call');

      expect(updated).toEqual(metrics);
    });
  });

  describe('logToolFailed', () => {
    it('should mark execution as failed', () => {
      let metrics = createToolMetrics();
      metrics = logToolStart(metrics, 'call-1', 'edit_file', 'task-123');
      vi.advanceTimersByTime(50);
      metrics = logToolFailed(metrics, 'call-1', 'Permission denied');

      const execution = metrics.executions.get('call-1');
      expect(execution?.status).toBe('failed');
      expect(execution?.error).toBe('Permission denied');
      expect(metrics.totalFailures).toBe(1);
    });

    it('should track errors per tool', () => {
      let metrics = createToolMetrics();
      metrics = logToolStart(metrics, 'call-1', 'edit_file', 'task-123');
      metrics = logToolFailed(metrics, 'call-1', 'Error 1');

      metrics = logToolStart(metrics, 'call-2', 'edit_file', 'task-123');
      metrics = logToolFailed(metrics, 'call-2', 'Error 2');

      const stats = getToolStats(metrics, 'edit_file');
      expect(stats?.failureCount).toBe(2);
      expect(stats?.errors).toContain('Error 1');
      expect(stats?.errors).toContain('Error 2');
    });
  });

  describe('getExecution', () => {
    it('should return execution by ID', () => {
      let metrics = createToolMetrics();
      metrics = logToolStart(metrics, 'call-1', 'read_file', 'task-123');

      const execution = getExecution(metrics, 'call-1');
      expect(execution?.toolName).toBe('read_file');
    });

    it('should return undefined for unknown ID', () => {
      const metrics = createToolMetrics();
      expect(getExecution(metrics, 'unknown')).toBe(undefined);
    });
  });

  describe('getAllToolStats', () => {
    it('should return stats sorted by execution count', () => {
      let metrics = createToolMetrics();

      // read_file: 3 executions
      for (let i = 0; i < 3; i++) {
        metrics = logToolStart(metrics, `read-${i}`, 'read_file', 'task-123');
        metrics = logToolComplete(metrics, `read-${i}`);
      }

      // edit_file: 1 execution
      metrics = logToolStart(metrics, 'edit-1', 'edit_file', 'task-123');
      metrics = logToolComplete(metrics, 'edit-1');

      // search: 2 executions
      for (let i = 0; i < 2; i++) {
        metrics = logToolStart(metrics, `search-${i}`, 'search', 'task-123');
        metrics = logToolComplete(metrics, `search-${i}`);
      }

      const allStats = getAllToolStats(metrics);
      expect(allStats[0]?.toolName).toBe('read_file');
      expect(allStats[1]?.toolName).toBe('search');
      expect(allStats[2]?.toolName).toBe('edit_file');
    });
  });

  describe('getPendingExecutions', () => {
    it('should return only executing tools', () => {
      let metrics = createToolMetrics();
      metrics = logToolStart(metrics, 'call-1', 'read_file', 'task-123');
      metrics = logToolStart(metrics, 'call-2', 'edit_file', 'task-123');
      metrics = logToolComplete(metrics, 'call-1');

      const pending = getPendingExecutions(metrics);
      expect(pending.length).toBe(1);
      expect(pending[0]?.id).toBe('call-2');
    });
  });

  describe('getRecentExecutions', () => {
    it('should return recent executions in order', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let metrics = createToolMetrics();

      metrics = logToolStart(metrics, 'call-1', 'tool-1', 'task-123');
      vi.advanceTimersByTime(100);
      metrics = logToolStart(metrics, 'call-2', 'tool-2', 'task-123');
      vi.advanceTimersByTime(100);
      metrics = logToolStart(metrics, 'call-3', 'tool-3', 'task-123');

      const recent = getRecentExecutions(metrics, 2);
      expect(recent.length).toBe(2);
      expect(recent[0]?.id).toBe('call-3'); // Most recent first
      expect(recent[1]?.id).toBe('call-2');
    });
  });

  describe('getFailedExecutions', () => {
    it('should return only failed executions', () => {
      let metrics = createToolMetrics();
      metrics = logToolStart(metrics, 'call-1', 'tool-1', 'task-123');
      metrics = logToolComplete(metrics, 'call-1');

      metrics = logToolStart(metrics, 'call-2', 'tool-2', 'task-123');
      metrics = logToolFailed(metrics, 'call-2', 'Error');

      const failed = getFailedExecutions(metrics);
      expect(failed.length).toBe(1);
      expect(failed[0]?.id).toBe('call-2');
    });
  });

  describe('getToolSummary', () => {
    it('should calculate summary metrics', () => {
      let metrics = createToolMetrics();

      // 3 successes
      for (let i = 0; i < 3; i++) {
        metrics = logToolStart(metrics, `success-${i}`, 'read_file', 'task-123');
        vi.advanceTimersByTime(100);
        metrics = logToolComplete(metrics, `success-${i}`);
      }

      // 1 failure
      metrics = logToolStart(metrics, 'fail-1', 'edit_file', 'task-123');
      metrics = logToolFailed(metrics, 'fail-1', 'Error');

      const summary = getToolSummary(metrics);

      expect(summary.totalExecutions).toBe(4);
      expect(summary.successRate).toBe(0.75);
      expect(summary.uniqueTools).toBe(2);
      expect(summary.mostUsedTool).toBe('read_file');
    });

    it('should handle empty metrics', () => {
      const metrics = createToolMetrics();
      const summary = getToolSummary(metrics);

      expect(summary.totalExecutions).toBe(0);
      expect(summary.successRate).toBe(1);
      expect(summary.mostUsedTool).toBe(null);
      expect(summary.slowestTool).toBe(null);
    });

    it('should identify slowest tool', () => {
      let metrics = createToolMetrics();

      // Fast tool
      metrics = logToolStart(metrics, 'fast-1', 'read_file', 'task-123');
      vi.advanceTimersByTime(50);
      metrics = logToolComplete(metrics, 'fast-1');

      // Slow tool
      metrics = logToolStart(metrics, 'slow-1', 'search', 'task-123');
      vi.advanceTimersByTime(500);
      metrics = logToolComplete(metrics, 'slow-1');

      const summary = getToolSummary(metrics);
      expect(summary.slowestTool).toBe('search');
    });
  });

  describe('formatToolMetrics', () => {
    it('should format metrics as readable string', () => {
      let metrics = createToolMetrics();
      metrics = logToolStart(metrics, 'call-1', 'read_file', 'task-123');
      vi.advanceTimersByTime(100);
      metrics = logToolComplete(metrics, 'call-1');

      const formatted = formatToolMetrics(metrics);

      expect(formatted).toContain('Tool Execution Metrics');
      expect(formatted).toContain('Total Executions: 1');
      expect(formatted).toContain('read_file');
    });
  });
});
