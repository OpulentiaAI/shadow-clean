"use node";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopSandbox = exports.sendInput = exports.executeCommand = exports.cancelDaytonaExec = exports.startDaytonaExec = exports.createSandbox = void 0;
const server_1 = require("./_generated/server");
const values_1 = require("convex/values");
const api_1 = require("./_generated/api");
/**
 * Daytona REST API integration for terminal streaming (Node.js runtime)
 * Uses direct HTTP calls instead of SDK for better Convex compatibility
 *
 * Based on Daytona.io 2026 REST API documentation
 */
// Helper to make authenticated Daytona API calls
async function daytonaFetch(endpoint, options = {}) {
    const apiKey = process.env.DAYTONA_API_KEY?.trim().replace(/\\n/g, "");
    const apiUrl = (process.env.DAYTONA_API_URL || "https://app.daytona.io/api").trim().replace(/\\n/g, "");
    if (!apiKey) {
        throw new Error("DAYTONA_API_KEY not configured");
    }
    const url = `${apiUrl}${endpoint}`;
    console.log(`[DAYTONA] API call: ${options.method || "GET"} ${url}`);
    const response = await fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            ...options.headers,
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DAYTONA] API error: ${response.status} ${errorText}`);
        throw new Error(`Daytona API error: ${response.status} - ${errorText}`);
    }
    return response;
}
/**
 * Create or get a Daytona sandbox for a task
 */
exports.createSandbox = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.DAYTONA_API_KEY;
        if (!apiKey) {
            console.error("[DAYTONA] No DAYTONA_API_KEY configured");
            return {
                success: false,
                error: "Daytona API key not configured. Please set DAYTONA_API_KEY in environment variables.",
            };
        }
        try {
            console.log(`[DAYTONA] Creating sandbox for task ${args.taskId}`);
            // Create a new sandbox via REST API (endpoint is /sandbox not /sandboxes)
            const response = await daytonaFetch("/sandbox", {
                method: "POST",
                body: JSON.stringify({
                    labels: {
                        taskId: args.taskId,
                        source: "opulent-os",
                    },
                }),
            });
            const sandbox = await response.json();
            const sandboxId = sandbox.id || sandbox.sandboxId;
            console.log(`[DAYTONA] Sandbox created: ${sandboxId}`);
            // Create a PTY session for interactive terminal
            const sessionId = `terminal-${args.taskId}-${Date.now()}`;
            // Store sandbox info in task metadata
            await ctx.runMutation(api_1.api.daytona.storeSandboxInfo, {
                taskId: args.taskId,
                sandboxId,
                sessionId,
            });
            return {
                success: true,
                sandboxId,
                sessionId,
                message: "Daytona sandbox created successfully",
            };
        }
        catch (error) {
            console.error("[DAYTONA] Error creating sandbox:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to create Daytona sandbox",
            };
        }
    },
});
/**
 * Start command execution via Daytona Runner service
 *
 * This action calls the external Daytona Runner service which uses
 * @daytonaio/sdk to properly resolve toolbox URLs and stream output.
 * Output is pushed back to Convex via the ingest endpoint.
 *
 * Returns immediately with jobId - does NOT wait for command to complete.
 */
exports.startDaytonaExec = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        command: values_1.v.string(),
        cwd: values_1.v.optional(values_1.v.string()),
        env: values_1.v.optional(values_1.v.record(values_1.v.string(), values_1.v.string())),
    },
    handler: async (ctx, args) => {
        // Check feature flag
        const enableDaytona = process.env.ENABLE_DAYTONA_TERMINAL === "true";
        if (!enableDaytona) {
            return {
                success: false,
                error: "Daytona terminal is disabled. Set ENABLE_DAYTONA_TERMINAL=true to enable.",
            };
        }
        const runnerUrl = process.env.DAYTONA_RUNNER_URL || "http://localhost:5100";
        // Get sandbox info
        let sandboxInfo = await ctx.runQuery(api_1.api.daytona.getSandboxInfo, {
            taskId: args.taskId,
        });
        if (!sandboxInfo) {
            // Try to create sandbox first
            const createResult = await ctx.runAction(api_1.api.daytonaActions.createSandbox, {
                taskId: args.taskId,
            });
            if (!createResult.success) {
                return createResult;
            }
            // Re-fetch sandbox info
            sandboxInfo = await ctx.runQuery(api_1.api.daytona.getSandboxInfo, {
                taskId: args.taskId,
            });
        }
        if (!sandboxInfo) {
            return {
                success: false,
                error: "Failed to get sandbox info",
            };
        }
        try {
            console.log(`[DAYTONA] Calling Runner to execute: ${args.command}`);
            // Call Daytona Runner service
            const response = await fetch(`${runnerUrl}/v1/exec`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    taskId: args.taskId,
                    sessionId: sandboxInfo.sessionId,
                    sandboxId: sandboxInfo.sandboxId,
                    command: args.command,
                    cwd: args.cwd || "/workspace",
                    env: args.env || {},
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Runner error: ${response.status} - ${errorText}`);
            }
            const result = await response.json();
            console.log(`[DAYTONA] Runner started job: ${result.jobId}`);
            return {
                success: true,
                jobId: result.jobId,
                sessionId: result.sessionId,
                status: result.status,
            };
        }
        catch (error) {
            console.error("[DAYTONA] Error calling Runner:", error);
            // Write error to terminal output
            await ctx.runMutation(api_1.api.terminalOutput.append, {
                taskId: args.taskId,
                commandId: `cmd-${Date.now()}`,
                content: `Error: ${error instanceof Error ? error.message : "Failed to start command execution"}`,
                streamType: "stderr",
                timestamp: Date.now(),
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to start command execution",
            };
        }
    },
});
/**
 * Cancel a running Daytona command execution
 */
exports.cancelDaytonaExec = (0, server_1.action)({
    args: {
        jobId: values_1.v.string(),
    },
    handler: async (_ctx, args) => {
        const enableDaytona = process.env.ENABLE_DAYTONA_TERMINAL === "true";
        if (!enableDaytona) {
            return {
                success: false,
                error: "Daytona terminal is disabled",
            };
        }
        const runnerUrl = process.env.DAYTONA_RUNNER_URL || "http://localhost:5100";
        try {
            const response = await fetch(`${runnerUrl}/v1/cancel`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ jobId: args.jobId }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Runner error: ${response.status} - ${errorText}`);
            }
            const result = await response.json();
            return {
                success: true,
                jobId: result.jobId,
                status: result.status,
            };
        }
        catch (error) {
            console.error("[DAYTONA] Error cancelling job:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to cancel job",
            };
        }
    },
});
/**
 * Legacy executeCommand - kept for backward compatibility
 * Now routes through startDaytonaExec when ENABLE_DAYTONA_TERMINAL is true
 */
exports.executeCommand = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        command: values_1.v.string(),
        cwd: values_1.v.optional(values_1.v.string()),
    },
    handler: async (ctx, args) => {
        // Check if Daytona terminal is enabled - use Runner if so
        const enableDaytona = process.env.ENABLE_DAYTONA_TERMINAL === "true";
        if (enableDaytona) {
            // Route through Runner service for proper SDK-based execution
            return ctx.runAction(api_1.api.daytonaActions.startDaytonaExec, {
                taskId: args.taskId,
                command: args.command,
                cwd: args.cwd,
            });
        }
        // Legacy direct REST API path (fallback, may not work for all endpoints)
        const apiKey = process.env.DAYTONA_API_KEY;
        if (!apiKey) {
            return {
                success: false,
                error: "Daytona API key not configured",
            };
        }
        // Get sandbox info
        let sandboxInfo = await ctx.runQuery(api_1.api.daytona.getSandboxInfo, {
            taskId: args.taskId,
        });
        if (!sandboxInfo) {
            const createResult = await ctx.runAction(api_1.api.daytonaActions.createSandbox, {
                taskId: args.taskId,
            });
            if (!createResult.success) {
                return createResult;
            }
            sandboxInfo = await ctx.runQuery(api_1.api.daytona.getSandboxInfo, {
                taskId: args.taskId,
            });
        }
        if (!sandboxInfo) {
            return {
                success: false,
                error: "Failed to get sandbox info",
            };
        }
        try {
            const commandId = `cmd-${Date.now()}`;
            console.log(`[DAYTONA] Executing command in sandbox ${sandboxInfo.sandboxId}: ${args.command}`);
            await ctx.runMutation(api_1.api.terminalOutput.append, {
                taskId: args.taskId,
                commandId,
                content: `$ ${args.command}`,
                streamType: "stdout",
                timestamp: Date.now(),
            });
            const response = await daytonaFetch(`/sandbox/${sandboxInfo.sandboxId}/toolbox/process/execute`, {
                method: "POST",
                body: JSON.stringify({
                    command: args.command,
                    cwd: args.cwd || "/workspace",
                }),
            });
            const result = await response.json();
            if (result.stdout) {
                await ctx.runMutation(api_1.api.terminalOutput.append, {
                    taskId: args.taskId,
                    commandId,
                    content: result.stdout,
                    streamType: "stdout",
                    timestamp: Date.now(),
                });
            }
            if (result.stderr) {
                await ctx.runMutation(api_1.api.terminalOutput.append, {
                    taskId: args.taskId,
                    commandId,
                    content: result.stderr,
                    streamType: "stderr",
                    timestamp: Date.now(),
                });
            }
            await ctx.runMutation(api_1.api.daytona.updateActivity, {
                taskId: args.taskId,
            });
            return {
                success: true,
                commandId,
                exitCode: result.exitCode ?? 0,
                stdout: result.stdout || "",
                stderr: result.stderr || "",
            };
        }
        catch (error) {
            console.error("[DAYTONA] Error executing command:", error);
            await ctx.runMutation(api_1.api.terminalOutput.append, {
                taskId: args.taskId,
                commandId: `cmd-${Date.now()}`,
                content: `Error: ${error instanceof Error ? error.message : "Command execution failed"}`,
                streamType: "stderr",
                timestamp: Date.now(),
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : "Command execution failed",
            };
        }
    },
});
/**
 * Send input to the PTY session (interactive terminal)
 */
exports.sendInput = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
        input: values_1.v.string(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.DAYTONA_API_KEY;
        if (!apiKey) {
            return { success: false, error: "Daytona API key not configured" };
        }
        const sandboxInfo = await ctx.runQuery(api_1.api.daytona.getSandboxInfo, {
            taskId: args.taskId,
        });
        if (!sandboxInfo) {
            return { success: false, error: "No active sandbox for this task" };
        }
        try {
            // Send input via REST API (PTY input endpoint via sandbox toolbox proxy)
            await daytonaFetch(`/sandbox/${sandboxInfo.sandboxId}/toolbox/process/pty/${sandboxInfo.sessionId}/input`, {
                method: "POST",
                body: JSON.stringify({ input: args.input }),
            });
            return { success: true };
        }
        catch (error) {
            console.error("[DAYTONA] Error sending input:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to send input",
            };
        }
    },
});
/**
 * Stop and cleanup a Daytona sandbox
 */
exports.stopSandbox = (0, server_1.action)({
    args: {
        taskId: values_1.v.id("tasks"),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.DAYTONA_API_KEY;
        if (!apiKey) {
            return { success: false, error: "Daytona API key not configured" };
        }
        const sandboxInfo = await ctx.runQuery(api_1.api.daytona.getSandboxInfo, {
            taskId: args.taskId,
        });
        if (!sandboxInfo) {
            return { success: true, message: "No sandbox to stop" };
        }
        try {
            // Stop sandbox via REST API
            await daytonaFetch(`/sandbox/${sandboxInfo.sandboxId}`, {
                method: "DELETE",
            });
            // Update status
            await ctx.runMutation(api_1.api.daytona.updateSandboxStatus, {
                taskId: args.taskId,
                status: "stopped",
            });
            return { success: true, message: "Sandbox stopped" };
        }
        catch (error) {
            console.error("[DAYTONA] Error stopping sandbox:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to stop sandbox",
            };
        }
    },
});
