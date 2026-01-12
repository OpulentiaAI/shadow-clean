"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Daytona REST API integration for terminal streaming (Node.js runtime)
 * Uses direct HTTP calls instead of SDK for better Convex compatibility
 * 
 * Based on Daytona.io 2026 REST API documentation
 */

// Helper to make authenticated Daytona API calls
async function daytonaFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
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
export const createSandbox = action({
  args: {
    taskId: v.id("tasks"),
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
            taskId: args.taskId as string,
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
      await ctx.runMutation(api.daytona.storeSandboxInfo, {
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
    } catch (error) {
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
export const startDaytonaExec = action({
  args: {
    taskId: v.id("tasks"),
    command: v.string(),
    cwd: v.optional(v.string()),
    env: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    jobId?: string;
    sessionId?: string;
    status?: string;
  }> => {
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
    let sandboxInfo = await ctx.runQuery(api.daytona.getSandboxInfo, {
      taskId: args.taskId,
    });

    if (!sandboxInfo) {
      // Try to create sandbox first
      const createResult = await ctx.runAction(api.daytonaActions.createSandbox, {
        taskId: args.taskId,
      }) as { success: boolean; error?: string; sandboxId?: string; sessionId?: string };
      
      if (!createResult.success) {
        return { success: false, error: createResult.error || "Failed to create sandbox" };
      }
      
      // Re-fetch sandbox info
      sandboxInfo = await ctx.runQuery(api.daytona.getSandboxInfo, {
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
    } catch (error) {
      console.error("[DAYTONA] Error calling Runner:", error);

      // Write error to terminal output
      await ctx.runMutation(api.terminalOutput.append, {
        taskId: args.taskId,
        commandId: `cmd-${Date.now()}`,
        content: `Error: ${error instanceof Error ? error.message : "Failed to start command execution"}`,
        streamType: "stderr" as const,
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
export const cancelDaytonaExec = action({
  args: {
    jobId: v.string(),
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
    } catch (error) {
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
export const executeCommand = action({
  args: {
    taskId: v.id("tasks"),
    command: v.string(),
    cwd: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    jobId?: string;
    sessionId?: string;
    status?: string;
    commandId?: string;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
  }> => {
    // Check if Daytona terminal is enabled - use Runner if so
    const enableDaytona = process.env.ENABLE_DAYTONA_TERMINAL === "true";
    if (enableDaytona) {
      // Route through Runner service for proper SDK-based execution
      return ctx.runAction(api.daytonaActions.startDaytonaExec, {
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
    let sandboxInfo = await ctx.runQuery(api.daytona.getSandboxInfo, {
      taskId: args.taskId,
    });

    if (!sandboxInfo) {
      const createResult = await ctx.runAction(api.daytonaActions.createSandbox, {
        taskId: args.taskId,
      }) as { success: boolean; error?: string; sandboxId?: string; sessionId?: string };
      
      if (!createResult.success) {
        return { success: false, error: createResult.error || "Failed to create sandbox" };
      }
      
      sandboxInfo = await ctx.runQuery(api.daytona.getSandboxInfo, {
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

      await ctx.runMutation(api.terminalOutput.append, {
        taskId: args.taskId,
        commandId,
        content: `$ ${args.command}`,
        streamType: "stdout" as const,
        timestamp: Date.now(),
      });

      const response = await daytonaFetch(
        `/sandbox/${sandboxInfo.sandboxId}/toolbox/process/execute`,
        {
          method: "POST",
          body: JSON.stringify({
            command: args.command,
            cwd: args.cwd || "/workspace",
          }),
        }
      );

      const result = await response.json();

      if (result.stdout) {
        await ctx.runMutation(api.terminalOutput.append, {
          taskId: args.taskId,
          commandId,
          content: result.stdout,
          streamType: "stdout" as const,
          timestamp: Date.now(),
        });
      }

      if (result.stderr) {
        await ctx.runMutation(api.terminalOutput.append, {
          taskId: args.taskId,
          commandId,
          content: result.stderr,
          streamType: "stderr" as const,
          timestamp: Date.now(),
        });
      }

      await ctx.runMutation(api.daytona.updateActivity, {
        taskId: args.taskId,
      });

      return {
        success: true,
        commandId,
        exitCode: result.exitCode ?? 0,
        stdout: result.stdout || "",
        stderr: result.stderr || "",
      };
    } catch (error) {
      console.error("[DAYTONA] Error executing command:", error);
      
      await ctx.runMutation(api.terminalOutput.append, {
        taskId: args.taskId,
        commandId: `cmd-${Date.now()}`,
        content: `Error: ${error instanceof Error ? error.message : "Command execution failed"}`,
        streamType: "stderr" as const,
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
export const sendInput = action({
  args: {
    taskId: v.id("tasks"),
    input: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DAYTONA_API_KEY;

    if (!apiKey) {
      return { success: false, error: "Daytona API key not configured" };
    }

    const sandboxInfo = await ctx.runQuery(api.daytona.getSandboxInfo, {
      taskId: args.taskId,
    });

    if (!sandboxInfo) {
      return { success: false, error: "No active sandbox for this task" };
    }

    try {
      // Send input via REST API (PTY input endpoint via sandbox toolbox proxy)
      await daytonaFetch(
        `/sandbox/${sandboxInfo.sandboxId}/toolbox/process/pty/${sandboxInfo.sessionId}/input`,
        {
          method: "POST",
          body: JSON.stringify({ input: args.input }),
        }
      );

      return { success: true };
    } catch (error) {
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
export const stopSandbox = action({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.DAYTONA_API_KEY;

    if (!apiKey) {
      return { success: false, error: "Daytona API key not configured" };
    }

    const sandboxInfo = await ctx.runQuery(api.daytona.getSandboxInfo, {
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
      await ctx.runMutation(api.daytona.updateSandboxStatus, {
        taskId: args.taskId,
        status: "stopped",
      });

      return { success: true, message: "Sandbox stopped" };
    } catch (error) {
      console.error("[DAYTONA] Error stopping sandbox:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to stop sandbox",
      };
    }
  },
});
