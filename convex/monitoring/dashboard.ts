/**
 * Monitoring Dashboard
 * Real-time system health and alerting for workflow integration.
 */

import { query } from "../_generated/server";

/**
 * Get real-time system health metrics
 */
export const getSystemHealth = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Get recent workflow traces
    const traces = await ctx.db
      .query("workflowTraces")
      .withIndex("by_status")
      .filter((q) => q.gte(q.field("createdAt"), oneHourAgo))
      .collect();

    // Calculate workflow metrics
    const totalTraces = traces.length;
    const completedTraces = traces.filter((t) => t.status === "COMPLETED").length;
    const failedTraces = traces.filter((t) => t.status === "FAILED").length;
    const inProgressTraces = traces.filter((t) => t.status === "STARTED" || t.status === "IN_PROGRESS").length;

    const completionRate = totalTraces > 0 ? completedTraces / totalTraces : 1;
    const errorRate = totalTraces > 0 ? failedTraces / totalTraces : 0;

    // Get recent messages for streaming health
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_status")
      .filter((q) => q.gte(q.field("createdAt"), oneHourAgo))
      .collect();

    const totalMessages = messages.length;
    const completedMessages = messages.filter((m) => m.status === "complete").length;
    const streamingMessages = messages.filter((m) => m.status === "streaming").length;
    const failedMessages = messages.filter((m) => m.status === "failed").length;

    const messageCompletionRate = totalMessages > 0 ? completedMessages / totalMessages : 1;
    const messageErrorRate = totalMessages > 0 ? failedMessages / totalMessages : 0;

    // Determine health status
    const isHealthy = errorRate < 0.1 && messageErrorRate < 0.1 && messageCompletionRate > 0.9;
    const alerts: string[] = [];

    if (errorRate >= 0.1) {
      alerts.push(`Workflow error rate: ${(errorRate * 100).toFixed(1)}%`);
    }
    if (messageErrorRate >= 0.1) {
      alerts.push(`Message error rate: ${(messageErrorRate * 100).toFixed(1)}%`);
    }
    if (inProgressTraces > 10) {
      alerts.push(`${inProgressTraces} workflows in progress`);
    }

    return {
      timestamp: now,
      window: "1h",
      workflows: {
        total: totalTraces,
        completed: completedTraces,
        failed: failedTraces,
        inProgress: inProgressTraces,
        completionRate: Math.round(completionRate * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
      },
      messages: {
        total: totalMessages,
        completed: completedMessages,
        streaming: streamingMessages,
        failed: failedMessages,
        completionRate: Math.round(messageCompletionRate * 100) / 100,
        errorRate: Math.round(messageErrorRate * 100) / 100,
      },
      health: {
        status: isHealthy ? "healthy" : "degraded",
        alerts,
      },
    };
  },
});

/**
 * Check for active alerts
 */
export const checkAlerts = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const alerts: string[] = [];

    // Check for stuck workflows (>5 minutes in STARTED state)
    const stuckWorkflows = await ctx.db
      .query("workflowTraces")
      .withIndex("by_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "STARTED"),
          q.lt(q.field("startedAt"), fiveMinutesAgo)
        )
      )
      .collect();

    if (stuckWorkflows.length > 0) {
      alerts.push(`${stuckWorkflows.length} workflow(s) stuck for >5 minutes`);
    }

    // Check for stuck streaming messages
    const stuckMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_status")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "streaming"),
          q.lt(q.field("createdAt"), fiveMinutesAgo)
        )
      )
      .collect();

    if (stuckMessages.length > 0) {
      alerts.push(`${stuckMessages.length} message(s) stuck streaming for >5 minutes`);
    }

    // Check recent error rate
    const recentTraces = await ctx.db
      .query("workflowTraces")
      .withIndex("by_status")
      .filter((q) => q.gte(q.field("createdAt"), fiveMinutesAgo))
      .collect();

    if (recentTraces.length > 0) {
      const errorCount = recentTraces.filter((t) => t.status === "FAILED").length;
      const errorRate = errorCount / recentTraces.length;
      if (errorRate > 0.2) {
        alerts.push(`High error rate (5min): ${(errorRate * 100).toFixed(1)}%`);
      }
    }

    return {
      timestamp: now,
      alertCount: alerts.length,
      alerts,
      status: alerts.length === 0 ? "OK" : "ALERT",
      stuckWorkflows: stuckWorkflows.length,
      stuckMessages: stuckMessages.length,
    };
  },
});

/**
 * Get feature flag status
 */
export const getFeatureFlags = query({
  args: {},
  handler: async () => {
    return {
      ENABLE_WORKFLOW: process.env.ENABLE_WORKFLOW === "true",
      ENABLE_PROMPT_MESSAGE_ID: process.env.ENABLE_PROMPT_MESSAGE_ID === "true",
      ENABLE_RETRY_WITH_BACKOFF: process.env.ENABLE_RETRY_WITH_BACKOFF === "true",
      ENABLE_MESSAGE_COMPRESSION: process.env.ENABLE_MESSAGE_COMPRESSION === "true",
      LOG_PROVIDER_ENABLED: process.env.LOG_PROVIDER_ENABLED === "true",
    };
  },
});

/**
 * Get recent workflow traces for debugging
 */
export const getRecentTraces = query({
  args: {},
  handler: async (ctx) => {
    const traces = await ctx.db
      .query("workflowTraces")
      .withIndex("by_status")
      .order("desc")
      .take(20);

    return traces.map((t) => ({
      id: t._id,
      traceId: t.traceId,
      status: t.status,
      model: t.model,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      errorMessage: t.errorMessage,
      durationMs: t.completedAt ? t.completedAt - t.startedAt : null,
    }));
  },
});
