import { router as IndexingRouter } from "@/indexing/index";
import { AvailableModels, ModelType } from "@repo/types";
import {
  getTask,
  getTaskWithDetails,
  updateTask,
  listMessagesByTask,
  listToolCallsByTask,
  toConvexId,
} from "./lib/convex-operations";

import cors from "cors";
import express from "express";
import http from "http";
import { z } from "zod";
import config, { getCorsOrigins } from "./config";
import { ChatService } from "./agent/chat";
import { TaskInitializationEngine } from "./initialization";
import { errorHandler } from "./middleware/error-handler";
import { apiKeyAuth } from "./middleware/api-key-auth";
import { createSocketServer } from "./socket";
import { getGitHubAccessToken } from "./github/auth/account-service";
import { updateTaskStatus } from "./utils/task-status";
import { hasReachedTaskLimit } from "./services/task-limit";
import { createWorkspaceManager } from "./execution";
import { filesRouter } from "./files/router";
import { handleGitHubWebhook } from "./webhooks/github-webhook";
import { getIndexingStatus } from "./routes/indexing-status";
import { toolsRouter } from "./routes/tools";
import { modelContextService } from "./services/model-context-service";
import { parseApiKeysFromCookies } from "./utils/cookie-parser";
import { TaskModelContext } from "./services/task-model-context";
import { getUserByExternalId } from "./lib/convex-operations";

const app = express();
export const chatService = new ChatService();
const initializationEngine = new TaskInitializationEngine();

async function ensureConvexTask(taskId: string) {
  try {
    const existing = await getTaskWithDetails(toConvexId<"tasks">(taskId));
    if (existing?.task) {
      return { convexTaskId: taskId };
    }
  } catch (error) {
    console.warn(`[TASK_SYNC] Task ${taskId} not found in Convex.`, error);
  }

  return { convexTaskId: null, error: "Task not found" as const };
}

const initiateTaskSchema = z.object({
  message: z.string().min(1, "Message is required"),
  model: z.enum(Object.values(AvailableModels) as [string, ...string[]], {
    errorMap: () => ({ message: "Invalid model type" }),
  }),
  userId: z.string().min(1, "User ID is required"),
  // When true, skip backend LLM processing - Convex streaming will handle it
  useConvexStreaming: z.boolean().optional().default(false),
});

const socketIOServer = http.createServer(app);
createSocketServer(socketIOServer);

// Health check endpoint (before CORS) for Railway/load balancers
app.get("/health", (_req, res) => {
  res
    .status(200)
    .json({ status: "healthy", timestamp: new Date().toISOString() });
});

const corsOrigins = getCorsOrigins(config);

console.log(`[CORS] Allowing origins:`, corsOrigins);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

// Special raw body handling for webhook endpoints (before JSON parsing)
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json", limit: "2mb" })
);

// General JSON/urlencoded parsers with increased limits (some requests exceed 100kb)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// API key authentication for protected routes
app.use("/api", (req, res, next) => {
  // Skip auth for webhooks and tools (tools have their own x-convex-tool-key auth)
  if (req.path.startsWith("/webhooks") || req.path.startsWith("/tools")) {
    return next();
  }
  return apiKeyAuth(req, res, next);
});

/* ROUTES */
app.get("/", (_req, res) => {
  res.send("<h1>Hello world</h1>");
});

// Indexing routes
app.use("/api/indexing", IndexingRouter);

// Files routes
app.use("/api/tasks", filesRouter);

// Tool execution routes for Convex Agent
app.use("/api/tools", toolsRouter);

// GitHub webhook endpoint
app.post("/api/webhooks/github/pull-request", handleGitHubWebhook);

// Indexing status endpoint
app.get("/api/indexing-status/:repoFullName", async (req, res) => {
  try {
    const { repoFullName } = req.params;
    const decodedRepoFullName = decodeURIComponent(repoFullName);
    const status = await getIndexingStatus(decodedRepoFullName);
    res.json(status);
  } catch (error) {
    console.error("Error fetching indexing status:", error);
    res.status(500).json({ error: "Failed to fetch indexing status" });
  }
});

// Get task details
app.get("/api/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskResult = await getTaskWithDetails(toConvexId<"tasks">(taskId));

    if (!taskResult.task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Return task with user info in format expected by frontend
    res.json({
      ...taskResult.task,
      user: taskResult.task.userId ? { id: taskResult.task.userId } : null,
      messages: taskResult.messages,
      todos: taskResult.todos,
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// Get tool calls for a task
app.get("/api/tasks/:taskId/tool-calls", async (req, res) => {
  try {
    const { taskId } = req.params;
    const toolCalls = await listToolCallsByTask(toConvexId<"tasks">(taskId));
    res.json({ toolCalls });
  } catch (error) {
    console.error("Error fetching tool calls:", error);
    res.status(500).json({ error: "Failed to fetch tool calls" });
  }
});

// Initiate task with agent using new initialization system
app.post("/api/tasks/:taskId/initiate", async (req, res) => {
  try {
    console.log("RECEIVED TASK INITIATE REQUEST: /api/tasks/:taskId/initiate");
    const { taskId } = req.params;

    // Validate request body with Zod
    const validation = initiateTaskSchema.safeParse(req.body);
    if (!validation.success) {
      console.warn("[TASK_INITIATE] Validation failed", {
        taskId,
        body: req.body,
        issues: validation.error.issues,
      });
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { message, model, userId, useConvexStreaming } = validation.data;
    console.log("[TASK_INITIATE] Payload accepted", {
      taskId,
      userId,
      model,
    });

    // Check task limit before processing (production only)
    const isAtLimit = await hasReachedTaskLimit(userId);
    if (isAtLimit) {
      return res.status(429).json({
        error: "Task limit reached",
        message:
          "You have reached the maximum number of active tasks. Please complete or archive existing tasks to create new ones.",
      });
    }

    const task = await getTask(toConvexId<"tasks">(taskId));

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const isScratchpad = task.isScratchpad ?? false;

    // Check if this is a local repository (doesn't require GitHub auth)
    const isLocalRepo =
      isScratchpad ||
      task.repoFullName.startsWith("local/") ||
      (task.repoUrl &&
        (task.repoUrl.startsWith("/") || task.repoUrl.startsWith("~")));

    console.log(
      `[TASK_INITIATE] Starting task ${taskId}: ${task.repoUrl}:${task.baseBranch || "unknown"} (local: ${isLocalRepo}, scratchpad: ${isScratchpad})`
    );

    try {
      // Only require GitHub auth for non-local repositories
      if (!isLocalRepo) {
        const githubAccessToken = await getGitHubAccessToken(userId);

        if (!githubAccessToken) {
          console.error(
            `[TASK_INITIATE] No GitHub access token found for user ${userId}`
          );

          await updateTaskStatus(taskId, "FAILED", "INIT");

          return res.status(400).json({
            error: "GitHub access token required",
            details: "Please connect your GitHub account to clone repositories",
          });
        }
      }

      const initContext = await modelContextService.createContext(
        taskId,
        req.headers.cookie,
        model as ModelType
      );

      if (!initContext.validateAccess()) {
        const provider = initContext.getProvider();
        const providerName =
          provider === "anthropic"
            ? "Anthropic"
            : provider === "openrouter"
              ? "OpenRouter"
              : "OpenAI";

        await updateTaskStatus(taskId, "FAILED", "INIT");

        return res.status(400).json({
          error: `${providerName} API key required`,
          details: `Please configure your ${providerName} API key in settings to use ${model}.`,
        });
      }

      await updateTaskStatus(taskId, "INITIALIZING", "INIT");
      console.log(
        `⏳ [TASK_INITIATE] Task ${taskId} status set to INITIALIZING - starting initialization...`
      );

      const initSteps =
        await initializationEngine.getDefaultStepsForTask(taskId);

      // Split steps into essential (blocking) and non-essential (background)
      const essentialSteps = initSteps.filter(
        (step) => step === "PREPARE_WORKSPACE"
      );
      const backgroundSteps = initSteps.filter(
        (step) => step !== "PREPARE_WORKSPACE"
      );

      console.log(
        `[TASK_INITIATE] Essential steps: ${essentialSteps.join(", ")}`
      );
      console.log(
        `[TASK_INITIATE] Background steps: ${backgroundSteps.join(", ")}`
      );

      // Wait for essential steps only (workspace must exist before chat can start)
      if (essentialSteps.length > 0) {
        await initializationEngine.initializeTask(
          taskId,
          essentialSteps,
          userId,
          initContext
        );
      }

      const updatedTask = await getTask(toConvexId<"tasks">(taskId));

      await updateTaskStatus(taskId, "RUNNING", "INIT");

      // Start background initialization steps (don't await)
      if (backgroundSteps.length > 0) {
        console.log(
          `[TASK_INITIATE] Starting background initialization for task ${taskId}`
        );
        initializationEngine
          .initializeTask(taskId, backgroundSteps, userId, initContext)
          .catch((error) => {
            console.error(
              `[TASK_INITIATE] Background initialization failed for task ${taskId}:`,
              error
            );
          });
      }

      // Start chat processing immediately (don't wait for background init)
      // Skip if Convex streaming is enabled - Convex action will handle LLM call
      if (!useConvexStreaming) {
        console.log(
          `[TASK_INITIATE] Using legacy backend LLM processing for task ${taskId}`
        );
        await chatService.processUserMessage({
          taskId,
          userMessage: message,
          context: initContext,
          enableTools: true,
          skipUserMessageSave: true,
          workspacePath: updatedTask?.workspacePath || undefined,
        });
      } else {
        console.log(
          `[TASK_INITIATE] Skipping backend LLM - Convex streaming enabled for task ${taskId}`
        );
      }

      res.json({
        success: true,
        message: "Task initiated successfully",
      });
    } catch (initError) {
      console.error(
        `[TASK_INITIATE] Initialization failed for task ${taskId}:`,
        initError
      );
      console.log(
        `❌ [TASK_INITIATE] Task ${taskId} initialization failed - setting status to FAILED`
      );

      await updateTaskStatus(taskId, "FAILED", "INIT");

      if (
        initError instanceof Error &&
        (initError.message.includes("authentication") ||
          initError.message.includes("access token") ||
          initError.message.includes("refresh"))
      ) {
        return res.status(401).json({
          error: "GitHub authentication failed",
          details: "Please reconnect your GitHub account and try again",
        });
      }

      return res.status(500).json({
        error: "Task initialization failed",
        details:
          initError instanceof Error ? initError.message : "Unknown error",
      });
    }
  } catch (error) {
    console.error("Error initiating task:", error);
    res.status(500).json({ error: "Failed to initiate task" });
  }
});

app.get("/api/tasks/:taskId/messages", async (req, res) => {
  try {
    const { taskId } = req.params;
    const messages = await chatService.getChatHistory(taskId);
    res.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Submit a message to an existing task
app.post("/api/tasks/:taskId/messages", async (req, res) => {
  console.log(`[MESSAGE_SUBMIT] ====== HTTP MESSAGE REQUEST RECEIVED ======`);
  console.log(`[MESSAGE_SUBMIT] Request for task ${req.params.taskId}`);
  try {
    const { taskId } = req.params;
    const { message, model } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log(`[MESSAGE_SUBMIT] Submitting message to task ${taskId}`);

    // Fetch task from Convex
    const task = await getTask(toConvexId<"tasks">(taskId));

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Allow messages in more states for hosted/Convex flow (Railway may mark tasks as INITIALIZING)
    const isActiveStatus =
      task.status === "RUNNING" ||
      task.status === "INITIALIZING" ||
      task.status === "COMPLETED" || // allow follow-ups
      task.hasBeenInitialized === true ||
      task.initStatus === "ACTIVE";
    if (!isActiveStatus) {
      return res.status(400).json({
        error:
          "Task is not active. Please wait for initialization to complete.",
      });
    }

    // Build model context - API keys come from cookies (sent by frontend)
    // Note: parseApiKeysFromCookies has module-level env var reads that may miss runtime changes
    // So we also check env vars directly here as a safety net
    const apiKeys = parseApiKeysFromCookies(req.headers.cookie || "");

    // Extra safety: if no openrouter key from cookies/module-level env, check runtime env
    if (!apiKeys.openrouter && process.env.OPENROUTER_API_KEY) {
      console.log(
        `[MESSAGE_SUBMIT] Using runtime OPENROUTER_API_KEY env var as fallback`
      );
      apiKeys.openrouter = process.env.OPENROUTER_API_KEY;
    }

    console.log(
      `[MESSAGE_SUBMIT] Cookie header present: ${!!req.headers.cookie}`
    );
    console.log(
      `[MESSAGE_SUBMIT] Cookie header value: ${req.headers.cookie?.substring(0, 100) || "none"}`
    );
    console.log(`[MESSAGE_SUBMIT] API keys after parsing:`);
    console.log(
      `[MESSAGE_SUBMIT]   - openrouter: ${apiKeys.openrouter ? `present (${apiKeys.openrouter.length} chars, prefix: ${apiKeys.openrouter.substring(0, 8)}...)` : "MISSING"}`
    );
    console.log(
      `[MESSAGE_SUBMIT]   - anthropic: ${apiKeys.anthropic ? `present (${apiKeys.anthropic.length} chars)` : "missing"}`
    );
    console.log(
      `[MESSAGE_SUBMIT]   - openai: ${apiKeys.openai ? `present (${apiKeys.openai.length} chars)` : "missing"}`
    );
    console.log(
      `[MESSAGE_SUBMIT] Runtime env check: OPENROUTER_API_KEY=${process.env.OPENROUTER_API_KEY ? `present (${process.env.OPENROUTER_API_KEY.length} chars)` : "MISSING"}`
    );

    const selectedModel = (model as ModelType) || task.mainModel || "gpt-4o";
    const context = new TaskModelContext(taskId, selectedModel, apiKeys);

    // Validate API key access BEFORE processing (match initiate endpoint behavior)
    if (!context.validateAccess()) {
      const provider = context.getProvider();
      const providerName =
        provider === "anthropic"
          ? "Anthropic"
          : provider === "openrouter"
            ? "OpenRouter"
            : "OpenAI";

      console.error(
        `[MESSAGE_SUBMIT] API key validation failed for ${providerName}`
      );
      console.error(
        `[MESSAGE_SUBMIT] Model: ${selectedModel}, Provider: ${provider}`
      );
      console.error(
        `[MESSAGE_SUBMIT] Available keys: openrouter=${!!apiKeys.openrouter}, anthropic=${!!apiKeys.anthropic}, openai=${!!apiKeys.openai}`
      );

      return res.status(400).json({
        error: `${providerName} API key required`,
        details: `Please configure your ${providerName} API key to use ${selectedModel}. The key may be missing from both cookies and server environment.`,
      });
    }

    console.log(
      `[MESSAGE_SUBMIT] API key validation passed, proceeding with model: ${selectedModel}`
    );

    // Process the user message
    await chatService.processUserMessage({
      taskId,
      userMessage: message,
      context,
      enableTools: true,
      workspacePath: task.workspacePath || undefined,
    });

    res.json({ success: true, message: "Message submitted successfully" });
  } catch (error) {
    console.error(
      `[MESSAGE_SUBMIT] Error submitting message to task ${req.params.taskId}:`,
      error
    );
    res.status(500).json({
      error: "Failed to submit message",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.delete("/api/tasks/:taskId/cleanup", async (req, res) => {
  try {
    const { taskId } = req.params;

    console.log(`[TASK_CLEANUP] Starting cleanup for task ${taskId}`);

    const task = await getTask(toConvexId<"tasks">(taskId));

    if (!task) {
      console.warn(`[TASK_CLEANUP] Task ${taskId} not found`);
      return res.status(404).json({
        success: false,
        error: "Task not found",
      });
    }

    if (task.workspaceCleanedUp) {
      console.log(`[TASK_CLEANUP] Task ${taskId} workspace already cleaned up`);
      return res.json({
        success: true,
        message: "Workspace already cleaned up",
        alreadyCleanedUp: true,
        task: {
          id: taskId,
          status: task.status,
          workspaceCleanedUp: true,
        },
      });
    }

    const workspaceManager = createWorkspaceManager();

    console.log(
      `[TASK_CLEANUP] Cleaning up workspace for task ${taskId} using ${workspaceManager.isRemote() ? "remote" : "local"} mode`
    );

    const cleanupResult = await workspaceManager.cleanupWorkspace(taskId);

    if (!cleanupResult.success) {
      console.error(
        `[TASK_CLEANUP] Cleanup failed for task ${taskId}:`,
        cleanupResult.message
      );
      return res.status(500).json({
        success: false,
        error: "Workspace cleanup failed",
        details: cleanupResult.message,
      });
    }

    await updateTask({
      taskId: toConvexId<"tasks">(taskId),
      workspaceCleanedUp: true,
    });

    res.json({
      success: true,
      message: cleanupResult.message,
      task: {
        id: taskId,
        status: task.status,
        workspaceCleanedUp: true,
      },
      cleanupDetails: {
        mode: workspaceManager.isRemote() ? "remote" : "local",
        workspacePath: task.workspacePath,
      },
    });
  } catch (error) {
    console.error(
      `[TASK_CLEANUP] Error cleaning up task ${req.params.taskId}:`,
      error
    );
    res.status(500).json({
      success: false,
      error: "Failed to cleanup task",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/api/tasks/:taskId/pull-request", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.body;

    console.log(`[PR_CREATION] Creating PR for task ${taskId}`);

    const task = await getTask(toConvexId<"tasks">(taskId));

    if (!task) {
      console.warn(`[PR_CREATION] Task ${taskId} not found`);
      return res.status(404).json({
        success: false,
        error: "Task not found",
      });
    }

    // Ownership check:
    // - In Convex, task.userId is a Convex user id (Id<"users">).
    // - In production, the frontend often supplies BetterAuth user id (externalId).
    // Support both so PR creation works for Convex-native tasks.
    if (config.nodeEnv === "production") {
      const rawUserId = typeof userId === "string" ? userId : "";
      const directMatch = rawUserId && task.userId?.toString() === rawUserId;

      let externalIdMatch = false;
      if (!directMatch && rawUserId) {
        try {
          const convexUser = await getUserByExternalId(rawUserId);
          externalIdMatch = !!convexUser && task.userId === convexUser._id;
        } catch (err) {
          console.warn(
            `[PR_CREATION] Failed to resolve user externalId ${rawUserId}:`,
            err
          );
        }
      }

      if (!directMatch && !externalIdMatch) {
        console.warn(
          `[PR_CREATION] User ${rawUserId || "<missing>"} does not own task ${taskId}`
        );
        return res.status(403).json({
          success: false,
          error: "Unauthorized",
        });
      }
    }

    if (task.isScratchpad) {
      return res.status(400).json({
        success: false,
        error: "Scratchpad workspaces cannot create pull requests",
      });
    }

    if (task.pullRequestNumber) {
      console.log(
        `[PR_CREATION] Task ${taskId} already has PR #${task.pullRequestNumber}`
      );
      return res.json({
        success: true,
        prNumber: task.pullRequestNumber,
        prUrl: `${task.repoUrl}/pull/${task.pullRequestNumber}`,
        message: "Pull request already exists",
      });
    }

    // Get messages and find the latest assistant message
    const messages = await listMessagesByTask(toConvexId<"tasks">(taskId));
    const assistantMessages = messages.filter((m) => m.role === "ASSISTANT");
    const latestAssistantMessage =
      assistantMessages.length > 0
        ? assistantMessages[assistantMessages.length - 1]
        : null;

    if (!latestAssistantMessage) {
      console.warn(
        `[PR_CREATION] No assistant messages found for task ${taskId}`
      );
      return res.status(400).json({
        success: false,
        error:
          "No assistant messages found. Cannot create PR without agent responses.",
      });
    }

    // Get or refresh model context for PR creation
    const modelContext = await modelContextService.refreshContext(
      taskId,
      req.headers.cookie
    );

    const messageId = latestAssistantMessage._id as string;
    const prResult = modelContext
      ? await chatService.createPRIfNeeded(
          taskId,
          task.workspacePath || undefined,
          messageId,
          modelContext
        )
      : await chatService.createPRIfNeeded(
          taskId,
          task.workspacePath || undefined,
          messageId
        );

    if (!prResult.success) {
      return res.status(400).json({
        success: false,
        error: prResult.error || "Failed to create pull request",
      });
    }

    if (!prResult.prNumber) {
      return res.status(500).json({
        success: false,
        error: "Pull request created but PR number missing",
      });
    }

    console.log(
      `[PR_CREATION] Successfully created PR #${prResult.prNumber} for task ${taskId}`
    );

    res.json({
      success: true,
      prNumber: prResult.prNumber,
      prUrl: `${task.repoUrl}/pull/${prResult.prNumber}`,
      messageId,
    });
  } catch (error) {
    console.error(
      `[PR_CREATION] Error creating PR for task ${req.params.taskId}:`,
      error
    );
    res.status(500).json({
      success: false,
      error: "Failed to create pull request",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.use(errorHandler);

export { app, socketIOServer };
