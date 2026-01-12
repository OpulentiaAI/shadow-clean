import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Daytona } from "@daytonaio/sdk";

/**
 * Daytona Runner Service
 * 
 * Bridges @daytonaio/sdk with Convex terminal streaming.
 * Executes commands in Daytona sandboxes and streams output to Convex.
 */

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5100;
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL || "https://veracious-alligator-638.convex.site";
const CONVEX_INGEST_SECRET = process.env.CONVEX_INGEST_SECRET;
const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY;
const DAYTONA_API_URL = process.env.DAYTONA_API_URL || "https://app.daytona.io/api";

// Active jobs tracking
interface Job {
  id: string;
  taskId: string;
  sessionId: string;
  sandboxId: string;
  command: string;
  status: "running" | "completed" | "cancelled" | "error";
  startedAt: number;
  abortController?: AbortController;
}

const activeJobs = new Map<string, Job>();

// Initialize Daytona client
let daytonaClient: Daytona | null = null;

function getDaytonaClient(): Daytona {
  if (!daytonaClient) {
    if (!DAYTONA_API_KEY) {
      throw new Error("DAYTONA_API_KEY is required");
    }
    daytonaClient = new Daytona({
      apiKey: DAYTONA_API_KEY,
      apiUrl: DAYTONA_API_URL,
    });
  }
  return daytonaClient;
}

/**
 * Push terminal output to Convex ingest endpoint
 */
async function pushToConvex(payload: {
  taskId: string;
  sessionId: string;
  sandboxId: string;
  stream: "stdout" | "stderr" | "meta";
  data: string;
  ts: number;
  done?: boolean;
  exitCode?: number;
  error?: string;
}): Promise<void> {
  if (!CONVEX_INGEST_SECRET) {
    console.error("[RUNNER] CONVEX_INGEST_SECRET not configured");
    return;
  }

  try {
    const response = await fetch(`${CONVEX_SITE_URL}/daytona-ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ingest-secret": CONVEX_INGEST_SECRET,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RUNNER] Failed to push to Convex: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error("[RUNNER] Error pushing to Convex:", error);
  }
}

/**
 * Execute command in Daytona sandbox with streaming output
 * 
 * Uses session-based execution with getSessionCommandLogs for streaming:
 * 1. Create a session
 * 2. Execute command asynchronously in the session
 * 3. Stream logs using getSessionCommandLogs with callbacks
 */
async function executeCommand(job: Job): Promise<void> {
  const { id: jobId, taskId, sessionId, sandboxId, command } = job;

  console.log(`[RUNNER] Starting job ${jobId}: ${command}`);

  try {
    const daytona = getDaytonaClient();
    
    // Get sandbox instance - SDK resolves toolbox URL automatically
    const sandbox = await daytona.get(sandboxId);
    
    // Push command echo to terminal
    await pushToConvex({
      taskId,
      sessionId,
      sandboxId,
      stream: "stdout",
      data: `$ ${command}`,
      ts: Date.now(),
    });

    // Create a session for streaming output
    const ptySessionId = `pty-${jobId}`;
    await sandbox.process.createSession(ptySessionId);

    // Execute command asynchronously in the session
    const execResult = await sandbox.process.executeSessionCommand(ptySessionId, {
      command,
      runAsync: true, // Required for streaming logs
    });

    const commandId = execResult.cmdId;
    if (!commandId) {
      throw new Error("No command ID returned from executeSessionCommand");
    }
    console.log(`[RUNNER] Command started with cmdId: ${commandId}`);

    // Stream logs using callbacks
    await sandbox.process.getSessionCommandLogs(
      ptySessionId,
      commandId,
      // onStdout callback
      async (chunk: string) => {
        if (chunk && activeJobs.get(jobId)?.status === "running") {
          await pushToConvex({
            taskId,
            sessionId,
            sandboxId,
            stream: "stdout",
            data: chunk,
            ts: Date.now(),
          });
        }
      },
      // onStderr callback
      async (chunk: string) => {
        if (chunk && activeJobs.get(jobId)?.status === "running") {
          await pushToConvex({
            taskId,
            sessionId,
            sandboxId,
            stream: "stderr",
            data: chunk,
            ts: Date.now(),
          });
        }
      }
    );

    // Update job status
    const currentJob = activeJobs.get(jobId);
    if (currentJob && currentJob.status === "running") {
      currentJob.status = "completed";
      
      // Push completion message
      await pushToConvex({
        taskId,
        sessionId,
        sandboxId,
        stream: "meta",
        data: "",
        ts: Date.now(),
        done: true,
        exitCode: execResult.exitCode ?? 0,
      });
    }

    console.log(`[RUNNER] Job ${jobId} completed`);
  } catch (error) {
    console.error(`[RUNNER] Job ${jobId} failed:`, error);
    
    const currentJob = activeJobs.get(jobId);
    if (currentJob) {
      currentJob.status = "error";
    }

    // Push error message
    await pushToConvex({
      taskId,
      sessionId,
      sandboxId,
      stream: "meta",
      data: "",
      ts: Date.now(),
      done: true,
      error: error instanceof Error ? error.message : "Command execution failed",
    });
  } finally {
    // Clean up job after a delay (keep for status queries)
    setTimeout(() => {
      activeJobs.delete(jobId);
    }, 60000); // Keep for 1 minute after completion
  }
}

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    activeJobs: activeJobs.size,
    daytonaConfigured: !!DAYTONA_API_KEY,
    convexConfigured: !!CONVEX_INGEST_SECRET,
    timestamp: Date.now(),
  });
});

// Start execution endpoint
app.post("/v1/exec", async (req, res) => {
  const { taskId, sessionId, sandboxId, command, cwd: _cwd, env: _env } = req.body;

  // Validate required fields
  if (!taskId || !sandboxId || !command) {
    return res.status(400).json({
      error: "Missing required fields: taskId, sandboxId, command",
    });
  }

  // Check configuration
  if (!DAYTONA_API_KEY) {
    return res.status(503).json({
      error: "Daytona API key not configured",
    });
  }

  if (!CONVEX_INGEST_SECRET) {
    return res.status(503).json({
      error: "Convex ingest secret not configured",
    });
  }

  // Create job
  const jobId = uuidv4();
  const job: Job = {
    id: jobId,
    taskId,
    sessionId: sessionId || `session-${jobId}`,
    sandboxId,
    command,
    status: "running",
    startedAt: Date.now(),
    abortController: new AbortController(),
  };

  activeJobs.set(jobId, job);

  // Start execution in background (don't await)
  executeCommand(job).catch((error) => {
    console.error(`[RUNNER] Unhandled error in job ${jobId}:`, error);
  });

  // Return immediately with job ID
  res.json({
    jobId,
    sessionId: job.sessionId,
    status: "running",
  });
});

// Cancel execution endpoint
app.post("/v1/cancel", async (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: "Missing jobId" });
  }

  const job = activeJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  if (job.status !== "running") {
    return res.json({
      jobId,
      status: job.status,
      message: "Job already completed",
    });
  }

  // Mark as cancelled
  job.status = "cancelled";
  job.abortController?.abort();

  // Push cancellation message
  await pushToConvex({
    taskId: job.taskId,
    sessionId: job.sessionId,
    sandboxId: job.sandboxId,
    stream: "meta",
    data: "",
    ts: Date.now(),
    done: true,
    error: "Execution cancelled",
  });

  console.log(`[RUNNER] Job ${jobId} cancelled`);

  res.json({
    jobId,
    status: "cancelled",
  });
});

// Get job status endpoint
app.get("/v1/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json({
    jobId: job.id,
    taskId: job.taskId,
    sandboxId: job.sandboxId,
    status: job.status,
    startedAt: job.startedAt,
    runningFor: Date.now() - job.startedAt,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[RUNNER] Daytona Runner listening on port ${PORT}`);
  console.log(`[RUNNER] Convex site URL: ${CONVEX_SITE_URL}`);
  console.log(`[RUNNER] Daytona API URL: ${DAYTONA_API_URL}`);
  console.log(`[RUNNER] Daytona configured: ${!!DAYTONA_API_KEY}`);
  console.log(`[RUNNER] Convex ingest configured: ${!!CONVEX_INGEST_SECRET}`);
});
