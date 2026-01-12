/**
 * Monitoring Dashboard
 * Real-time system health and alerting for workflow integration.
 */
/**
 * Get real-time system health metrics
 */
export declare const getSystemHealth: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    timestamp: number;
    window: string;
    workflows: {
        total: number;
        completed: number;
        failed: number;
        inProgress: number;
        completionRate: number;
        errorRate: number;
    };
    messages: {
        total: number;
        completed: number;
        streaming: number;
        failed: number;
        completionRate: number;
        errorRate: number;
    };
    health: {
        status: string;
        alerts: string[];
    };
}>>;
/**
 * Check for active alerts
 */
export declare const checkAlerts: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    timestamp: number;
    alertCount: number;
    alerts: string[];
    status: string;
    stuckWorkflows: number;
    stuckMessages: number;
}>>;
/**
 * Get feature flag status
 */
export declare const getFeatureFlags: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    ENABLE_WORKFLOW: boolean;
    ENABLE_PROMPT_MESSAGE_ID: boolean;
    ENABLE_RETRY_WITH_BACKOFF: boolean;
    ENABLE_MESSAGE_COMPRESSION: boolean;
    LOG_PROVIDER_ENABLED: boolean;
}>>;
/**
 * Get recent workflow traces for debugging
 */
export declare const getRecentTraces: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    id: import("convex/values").GenericId<"workflowTraces">;
    traceId: string;
    status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
    model: string;
    createdAt: number;
    completedAt: number;
    errorMessage: string;
    durationMs: number;
}[]>>;
//# sourceMappingURL=dashboard.d.ts.map