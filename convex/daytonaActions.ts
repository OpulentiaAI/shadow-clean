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
 * Execute a command in the Daytona sandbox with streaming output
 */
export const executeCommand = action({
  args: {
    taskId: v.id("tasks"),
    command: v.string(),
    cwd: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
      // Try to create sandbox first
      const createResult = await ctx.runAction(api.daytonaActions.createSandbox, {
        taskId: args.taskId,
      });
      
      if (!createResult.success) {
        return createResult;
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
      const commandId = `cmd-${Date.now()}`;
      const sessionId = sandboxInfo.sessionId;

      console.log(`[DAYTONA] Executing command in sandbox ${sandboxInfo.sandboxId}: ${args.command}`);

      // Write command to terminal output
      await ctx.runMutation(api.terminalOutput.append, {
        taskId: args.taskId,
        commandId,
        content: `$ ${args.command}`,
        streamType: "stdout" as const,
        timestamp: Date.now(),
      });

      // Execute command via REST API (using sandbox toolbox proxy endpoint)
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

      // Write stdout to terminal
      if (result.stdout) {
        await ctx.runMutation(api.terminalOutput.append, {
          taskId: args.taskId,
          commandId,
          content: result.stdout,
          streamType: "stdout" as const,
          timestamp: Date.now(),
        });
      }

      // Write stderr to terminal
      if (result.stderr) {
        await ctx.runMutation(api.terminalOutput.append, {
          taskId: args.taskId,
          commandId,
          content: result.stderr,
          streamType: "stderr" as const,
          timestamp: Date.now(),
        });
      }

      // Update last activity
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
      
      // Write error to terminal
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
