/**
 * Approval Workflow - Human-in-the-Loop Support
 * Best Practice: Use awaitEvent for human approval before dangerous operations
 * Source: https://www.convex.dev/components/workflow#awaitevent
 *
 * This workflow pauses execution and waits for human approval
 * before executing potentially dangerous tool operations.
 */
/**
 * Durable agent workflow with human approval for dangerous operations
 */
export declare const durableAgentWithApproval: any;
/**
 * Send approval event to a waiting workflow
 * Note: Full implementation depends on @convex-dev/workflow version
 */
export declare const sendApproval: import("convex/server").RegisteredAction<"public", {
    reason?: string;
    approvedBy?: string;
    workflowId: string;
    approved: boolean;
}, Promise<{
    sent: boolean;
    workflowId: string;
    approved: boolean;
    timestamp: number;
}>>;
//# sourceMappingURL=approvalWorkflow.d.ts.map