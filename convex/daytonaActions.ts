"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Daytona } from "@daytonaio/sdk";

/**
 * Daytona integration for terminal execution (Node.js runtime)
 * Uses Daytona SDK for command execution
 */

const getApiConfig = () => {
  const apiKey = process.env.DAYTONA_API_KEY?.trim().replace(/\\n/g, "");
  const apiUrl = (process.env.DAYTONA_API_URL || "https://app.daytona.io/api").trim().replace(/\\n/g, "");
  
  if (!apiKey) {
    throw new Error("DAYTONA_API_KEY not configured");
  }
  
  return { apiKey, apiUrl };
};

// REST API helper for Daytona main API
async function daytonaApi(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const { apiKey, apiUrl } = getApiConfig();
  const url = `${apiUrl}${endpoint}`;
  
  console.log(`[DAYTONA] API: ${options.method || "GET"} ${url}`);
  
  return fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

// REST API helper for Daytona toolbox API
async function toolboxApi(
  toolboxUrl: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const { apiKey } = getApiConfig();
  const url = `${toolboxUrl}${endpoint}`;
  
  console.log(`[DAYTONA] Toolbox API: ${options.method || "GET"} ${url}`);
  
  return fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

type SandboxDetails = {
  state?: string;
  toolboxUrl?: string;
  ip?: string;
  ipAddress?: string;
  host?: string;
  address?: string;
  network?: { ip?: string; ipAddress?: string; address?: string };
  [key: string]: unknown;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get Daytona SDK client
const getDaytonaClient = () => {
  const { apiKey } = getApiConfig();
  return new Daytona({ apiKey });
};

const getSandboxIp = (sandbox: SandboxDetails): string | undefined => {
  const runtime = (sandbox as { runtime?: { ip?: string; network?: { ip?: string; address?: string } } }).runtime;
  return (
    sandbox.ip ||
    sandbox.ipAddress ||
    sandbox.host ||
    sandbox.address ||
    sandbox.network?.ip ||
    sandbox.network?.ipAddress ||
    sandbox.network?.address ||
    runtime?.ip ||
    runtime?.network?.ip ||
    runtime?.network?.address
  );
};

async function fetchSandboxDetails(sandboxId: string): Promise<SandboxDetails | null> {
  const statusResponse = await daytonaApi(`/sandbox/${sandboxId}`, {
    method: "GET",
  });

  if (statusResponse.status === 404) {
    return null;
  }

  if (!statusResponse.ok) {
    const errorText = await statusResponse.text();
    throw new Error(`Failed to get sandbox: ${statusResponse.status} - ${errorText}`);
  }

  return statusResponse.json() as Promise<SandboxDetails>;
}

async function ensureSandboxReady(sandboxId: string): Promise<{
  sandboxData: SandboxDetails;
}> {
  let sandboxData = await fetchSandboxDetails(sandboxId);
  if (!sandboxData) {
    throw new Error(`Sandbox ${sandboxId} not found`);
  }

  // Start sandbox if not started
  if (sandboxData.state !== "started") {
    console.log(`[DAYTONA] Starting sandbox ${sandboxId}...`);
    const startResponse = await daytonaApi(`/sandbox/${sandboxId}/start`, {
      method: "POST",
    });
    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      if (!errorText.toLowerCase().includes("already")) {
        throw new Error(`Failed to start sandbox: ${startResponse.status} - ${errorText}`);
      }
    }
  }

  // Poll until sandbox is started
  let attempts = 0;
  while (attempts < 30 && sandboxData.state !== "started") {
    await delay(2000);
    sandboxData = await fetchSandboxDetails(sandboxId);
    if (!sandboxData) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }
    console.log(`[DAYTONA] Waiting for sandbox to start... state=${sandboxData.state}`);
    attempts++;
  }

  if (sandboxData.state !== "started") {
    throw new Error(`Sandbox failed to start: state=${sandboxData.state}`);
  }

  console.log(`[DAYTONA] Sandbox ${sandboxId} is ready`);
  return { sandboxData };
}

/**
 * Create or get a Daytona sandbox for a task
 * Automatically starts the sandbox and waits for it to be ready
 */
export const createSandbox = action({
  args: {
    taskId: v.id("tasks"),
    gitRepoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; sandboxId?: string; sessionId?: string; message?: string; error?: string }> => {
    try {
      console.log(`[DAYTONA][AUTO-START v2] Creating sandbox for task ${args.taskId}`);

      const existingSandbox = await ctx.runQuery(api.daytona.getSandboxInfo, {
        taskId: args.taskId,
      });

      if (existingSandbox?.sandboxId) {
        const existingDetails = await fetchSandboxDetails(existingSandbox.sandboxId);
        if (existingDetails) {
          await ensureSandboxReady(existingSandbox.sandboxId);
          await ctx.runMutation(api.daytona.updateActivity, { taskId: args.taskId });
          return {
            success: true,
            sandboxId: existingSandbox.sandboxId,
            sessionId: existingSandbox.sessionId,
            message: "Daytona sandbox reused and started successfully (v2)",
          };
        }
      }
      
      // Get task info for workspace context
      const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
      const repoUrl = args.gitRepoUrl || task?.repoUrl;
      const baseBranch = task?.baseBranch || "main";
      const isScratchpad = task?.isScratchpad ?? false;
      const isRemoteRepo = !!repoUrl && !repoUrl.startsWith("/") && !repoUrl.startsWith("~");
      
      // Create a new sandbox via REST API
      const response = await daytonaApi("/sandbox", {
        method: "POST",
        body: JSON.stringify({
          labels: {
            taskId: args.taskId as string,
            source: "opulent-os",
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const sandbox = await response.json();
      const sandboxId = sandbox.id || sandbox.sandboxId;
      console.log(`[DAYTONA][AUTO-START v2] Sandbox created: ${sandboxId}`);

      console.log(`[DAYTONA][AUTO-START v2] Starting sandbox ${sandboxId}...`);
      await ensureSandboxReady(sandboxId);

      // Clone git repo if provided using SDK
      if (repoUrl && isRemoteRepo && !isScratchpad) {
        console.log(`[DAYTONA][AUTO-START v2] Cloning repo: ${repoUrl} (branch: ${baseBranch})`);
        try {
          const daytona = getDaytonaClient();
          const sdkSandbox = await daytona.get(sandboxId);
          const sessionId = `clone-${Date.now()}`;
          await sdkSandbox.process.createSession(sessionId);
          const cloneResult = await sdkSandbox.process.executeSessionCommand(sessionId, {
            command: `cd /home/daytona && if [ ! -d .git ]; then git clone --branch ${baseBranch} --depth 1 ${repoUrl} .; else echo "Repo already initialized"; fi`,
          });
          console.log(`[DAYTONA] Clone result: cmdId=${cloneResult.cmdId}`);
        } catch (cloneError) {
          console.error(`[DAYTONA] Clone error (non-fatal):`, cloneError);
        }
      }

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
        message: "Daytona sandbox created and started successfully (v2)",
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
 * Debug helper: fetch raw sandbox details for troubleshooting
 */
export const getSandboxDetails = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_ctx, args) => {
    const details = await fetchSandboxDetails(args.sandboxId);
    return {
      success: true,
      details,
      ip: details ? getSandboxIp(details) : null,
      ready: details ? Boolean(details.toolboxUrl && getSandboxIp(details)) : false,
    };
  },
});

/**
 * Start command execution via Daytona SDK (async version)
 * Uses SDK directly - no external Runner service needed
 * 
 * Returns immediately with commandId - command runs in background
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
    commandId?: string;
    sessionId?: string;
    status?: string;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
  }> => {
    // Route directly to executeCommand which uses SDK
    return ctx.runAction(api.daytonaActions.executeCommand, {
      taskId: args.taskId,
      command: args.command,
      cwd: args.cwd,
    });
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
 * Execute command in Daytona sandbox using REST API
 * Fully Convex-native - no external Runner service needed
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
    commandId?: string;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
  }> => {
    // Get sandbox info
    let sandboxInfo = await ctx.runQuery(api.daytona.getSandboxInfo, {
      taskId: args.taskId,
    }) as { sandboxId: string; toolboxUrl?: string } | null;

    const task = await ctx.runQuery(api.tasks.get, { taskId: args.taskId });
    const repoUrl = task?.repoUrl;
    const baseBranch = task?.baseBranch || "main";
    const isScratchpad = task?.isScratchpad ?? false;
    const isRemoteRepo = !!repoUrl && !repoUrl.startsWith("/") && !repoUrl.startsWith("~");

    if (!sandboxInfo) {
      const createResult = await ctx.runAction(api.daytonaActions.createSandbox, {
        taskId: args.taskId,
      }) as { success: boolean; error?: string; sandboxId?: string; toolboxUrl?: string };
      
      if (!createResult.success) {
        return { success: false, error: createResult.error || "Failed to create sandbox" };
      }
      
      sandboxInfo = await ctx.runQuery(api.daytona.getSandboxInfo, {
        taskId: args.taskId,
      }) as { sandboxId: string; toolboxUrl?: string } | null;
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

      // Log command to terminal output
      await ctx.runMutation(api.terminalOutput.append, {
        taskId: args.taskId,
        commandId,
        content: `$ ${args.command}`,
        streamType: "stdout" as const,
        timestamp: Date.now(),
      });

      await ensureSandboxReady(sandboxInfo.sandboxId);
      
      // Use Daytona SDK for command execution
      const daytona = getDaytonaClient();
      const sdkSandbox = await daytona.get(sandboxInfo.sandboxId);
      console.log(`[DAYTONA] Connected to sandbox via SDK`);
      
      // Create a session for command execution
      const execSessionId = `exec-${commandId}`;
      await sdkSandbox.process.createSession(execSessionId);
      
      // Ensure repo is initialized before every run
      if (repoUrl && isRemoteRepo && !isScratchpad) {
        try {
          await sdkSandbox.process.executeSessionCommand(execSessionId, {
            command: `cd /home/daytona && if [ ! -d .git ]; then git clone --branch ${baseBranch} --depth 1 ${repoUrl} .; else echo "Repo already initialized"; fi`,
          });
        } catch (initError) {
          console.log(`[DAYTONA] Repo init error (non-fatal):`, initError);
        }
      }

      // Execute command via SDK
      const cwd = args.cwd || "/home/daytona";
      console.log(`[DAYTONA] Executing: ${args.command} in ${cwd}`);
      
      // Prefix command with cd to working directory
      const fullCommand = cwd !== "/home/daytona" ? `cd ${cwd} && ${args.command}` : args.command;
      const execResult = await sdkSandbox.process.executeSessionCommand(execSessionId, {
        command: fullCommand,
      });
      
      console.log(`[DAYTONA] Result: cmdId=${execResult.cmdId}`);
      
      // Wait a moment for command to complete and get output
      await delay(1000);
      
      // Try to get command output from session logs
      let stdout = "";
      if (execResult.cmdId) {
        try {
          await sdkSandbox.process.getSessionCommandLogs(
            execSessionId,
            execResult.cmdId,
            (chunk) => { stdout += chunk; },
            (chunk) => { stdout += chunk; }
          );
        } catch {
          console.log(`[DAYTONA] Could not get logs, command may still be running`);
        }
      }
      
      const stderr = "";
      const exitCode = 0;

      // Log stdout
      if (stdout) {
        await ctx.runMutation(api.terminalOutput.append, {
          taskId: args.taskId,
          commandId,
          content: stdout,
          streamType: "stdout" as const,
          timestamp: Date.now(),
        });
      }

      // Log stderr
      if (stderr) {
        await ctx.runMutation(api.terminalOutput.append, {
          taskId: args.taskId,
          commandId,
          content: stderr,
          streamType: "stderr" as const,
          timestamp: Date.now(),
        });
      }

      // Update activity timestamp
      await ctx.runMutation(api.daytona.updateActivity, {
        taskId: args.taskId,
      });

      return {
        success: true,
        commandId,
        exitCode,
        stdout,
        stderr,
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
 * Note: This requires an active PTY session - use executeCommand for simple commands
 */
export const sendInput = action({
  args: {
    taskId: v.id("tasks"),
    input: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const sandboxInfo = await ctx.runQuery(api.daytona.getSandboxInfo, {
      taskId: args.taskId,
    });

    if (!sandboxInfo) {
      return { success: false, error: "No active sandbox for this task" };
    }

    try {
      // Execute input as a command - get sandbox toolbox URL and call API
      const sandboxResponse = await daytonaApi(`/sandbox/${sandboxInfo.sandboxId}`, {
        method: "GET",
      });
      
      if (!sandboxResponse.ok) {
        throw new Error(`Failed to get sandbox: ${sandboxResponse.status}`);
      }
      
      const sandboxData = await sandboxResponse.json();
      const toolboxUrl = sandboxData.toolboxUrl;
      
      if (!toolboxUrl) {
        throw new Error("Sandbox toolbox URL not available");
      }
      
      // Execute the input as a command
      const execResponse = await toolboxApi(toolboxUrl, "/process/execute", {
        method: "POST",
        body: JSON.stringify({
          command: args.input,
          cwd: "/workspace",
        }),
      });
      
      if (!execResponse.ok) {
        const errorText = await execResponse.text();
        throw new Error(`Command failed: ${execResponse.status} - ${errorText}`);
      }
      
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
    const sandboxInfo = await ctx.runQuery(api.daytona.getSandboxInfo, {
      taskId: args.taskId,
    });

    if (!sandboxInfo) {
      return { success: true, message: "No sandbox to stop" };
    }

    try {
      // Delete sandbox via REST API
      const response = await daytonaApi(`/sandbox/${sandboxInfo.sandboxId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

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

/**
 * List all sandboxes for the organization
 */
export const listSandboxes = action({
  args: {},
  handler: async () => {
    try {
      const response = await daytonaApi("/sandbox", {
        method: "GET",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const sandboxes = await response.json();
      return {
        success: true,
        sandboxes: sandboxes.items || sandboxes,
        count: (sandboxes.items || sandboxes).length,
      };
    } catch (error) {
      console.error("[DAYTONA] Error listing sandboxes:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list sandboxes",
      };
    }
  },
});

/**
 * Archive a sandbox by ID
 */
export const archiveSandbox = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const response = await daytonaApi(`/sandbox/${args.sandboxId}/archive`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      return { success: true, message: `Sandbox ${args.sandboxId} archived` };
    } catch (error) {
      console.error("[DAYTONA] Error archiving sandbox:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to archive sandbox",
      };
    }
  },
});

/**
 * Delete a sandbox by ID (permanent)
 */
export const deleteSandbox = action({
  args: {
    sandboxId: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const response = await daytonaApi(`/sandbox/${args.sandboxId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      return { success: true, message: `Sandbox ${args.sandboxId} deleted` };
    } catch (error) {
      console.error("[DAYTONA] Error deleting sandbox:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete sandbox",
      };
    }
  },
});

/**
 * Bulk archive all sandboxes except the most recent N
 */
export const cleanupSandboxes = action({
  args: {
    keepCount: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const keepCount = args.keepCount ?? 2;
    
    try {
      const response = await daytonaApi("/sandbox", {
        method: "GET",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const sandboxes = (data.items || data) as Array<{ id: string; createdAt: string; state: string }>;
      
      // Sort by creation date (newest first)
      sandboxes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const toDelete = sandboxes.slice(keepCount);
      const deleted: string[] = [];
      const errors: string[] = [];

      for (const sandbox of toDelete) {
        try {
          const delResponse = await daytonaApi(`/sandbox/${sandbox.id}`, {
            method: "DELETE",
          });
          
          if (delResponse.ok) {
            deleted.push(sandbox.id);
          } else {
            errors.push(`${sandbox.id}: ${await delResponse.text()}`);
          }
        } catch (err) {
          errors.push(`${sandbox.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      return {
        success: true,
        total: sandboxes.length,
        kept: keepCount,
        deleted: deleted.length,
        deletedIds: deleted,
        errors,
      };
    } catch (error) {
      console.error("[DAYTONA] Error cleaning up sandboxes:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to cleanup sandboxes",
      };
    }
  },
});
