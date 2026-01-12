/**
 * Create or get a Daytona sandbox for a task
 */
export declare const createSandbox: import("convex/server").RegisteredAction<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    error: string;
    sandboxId?: undefined;
    sessionId?: undefined;
    message?: undefined;
} | {
    success: boolean;
    sandboxId: any;
    sessionId: string;
    message: string;
    error?: undefined;
}>>;
/**
 * Start command execution via Daytona Runner service
 *
 * This action calls the external Daytona Runner service which uses
 * @daytonaio/sdk to properly resolve toolbox URLs and stream output.
 * Output is pushed back to Convex via the ingest endpoint.
 *
 * Returns immediately with jobId - does NOT wait for command to complete.
 */
export declare const startDaytonaExec: any;
/**
 * Cancel a running Daytona command execution
 */
export declare const cancelDaytonaExec: import("convex/server").RegisteredAction<"public", {
    jobId: string;
}, Promise<{
    success: boolean;
    error: string;
    jobId?: undefined;
    status?: undefined;
} | {
    success: boolean;
    jobId: any;
    status: any;
    error?: undefined;
}>>;
/**
 * Legacy executeCommand - kept for backward compatibility
 * Now routes through startDaytonaExec when ENABLE_DAYTONA_TERMINAL is true
 */
export declare const executeCommand: any;
/**
 * Send input to the PTY session (interactive terminal)
 */
export declare const sendInput: import("convex/server").RegisteredAction<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
    input: string;
}, Promise<{
    success: boolean;
    error: string;
} | {
    success: boolean;
    error?: undefined;
}>>;
/**
 * Stop and cleanup a Daytona sandbox
 */
export declare const stopSandbox: import("convex/server").RegisteredAction<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    error: string;
    message?: undefined;
} | {
    success: boolean;
    message: string;
    error?: undefined;
}>>;
//# sourceMappingURL=daytonaActions.d.ts.map