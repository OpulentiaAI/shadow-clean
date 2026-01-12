/**
 * Shadow Agent Queries
 *
 * This file contains queries for accessing Agent data.
 * These run in the default (non-Node) runtime.
 *
 * Note: Agent's listMessages is designed to be called from actions.
 * For queries, we use the component's internal tables directly.
 */
/**
 * Get thread metadata using component's getThread
 */
export declare const getThread: import("convex/server").RegisteredQuery<"public", {
    threadId: string;
}, Promise<{
    _creationTime: number;
    _id: string;
    status: "active" | "archived";
    summary?: string;
    title?: string;
    userId?: string;
}>>;
//# sourceMappingURL=queries.d.ts.map