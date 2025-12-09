import express from "express";
import { LocalWorkspaceManager } from "@/execution/local/local-workspace-manager";
import { runShadowWiki } from "./core";
import { CodebaseUnderstandingStorage } from "./db-storage";
import fs from "fs";
import { ModelType } from "@repo/types";
import { modelContextService } from "@/services/model-context-service";
import { getTask, getCodebaseUnderstanding, toConvexId } from "@/lib/convex-operations";

const shadowWikiRouter = express.Router();

/**
 * Generate codebase understanding summary for a task
 * POST /api/indexing/shadowwiki/generate/:taskId
 */
shadowWikiRouter.post("/generate/:taskId", async (req, res, next) => {
  const { taskId } = req.params;
  const { forceRefresh = false, model, modelMini } = req.body;

  try {
    // Get task details first via Convex
    const task = await getTask(toConvexId<"tasks">(taskId));

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Get codebase understanding if task has one
    const codebaseUnderstanding = task.codebaseUnderstandingId
      ? await getCodebaseUnderstanding(task.codebaseUnderstandingId)
      : null;

    // Get or create model context for this task
    const modelContext = await modelContextService.refreshContext(
      taskId,
      req.headers.cookie
    );

    if (!modelContext) {
      return res.status(400).json({
        error:
          "No API keys found. Please configure your OpenAI or Anthropic API key in settings.",
      });
    }

    // Validate that user has required API keys
    if (!modelContext.validateAccess()) {
      const provider = modelContext.getProvider();
      const providerName =
        provider === "anthropic"
          ? "Anthropic"
          : provider === "openrouter"
            ? "OpenRouter"
            : "OpenAI";
      return res.status(400).json({
        error: `${providerName} API key required. Please configure your API key in settings.`,
      });
    }

    // Check if summary already exists and no force refresh
    const storage = new CodebaseUnderstandingStorage(taskId);
    const hasExisting = await storage.hasExistingSummary();

    if (hasExisting && !forceRefresh) {
      return res.json({
        message: "Summary already exists. Use forceRefresh=true to regenerate.",
        taskId,
        codebaseUnderstandingId: codebaseUnderstanding?._id,
      });
    }

    // Get the workspace directory directly
    const workspaceManager = new LocalWorkspaceManager();
    const workspaceDir = workspaceManager.getWorkspacePath(taskId);

    if (!fs.existsSync(workspaceDir)) {
      return res.status(404).json({
        error: "Workspace directory not found. Task may not be initialized.",
      });
    }

    console.log(`[SHADOW-WIKI] Analyzing workspace directly: ${workspaceDir}`);

    // Run Shadow Wiki analysis directly on workspace
    const result = await runShadowWiki(
      taskId,
      task.repoFullName,
      task.repoUrl,
      task.userId,
      modelContext,
      {
        concurrency: 12,
        model: model as ModelType,
        modelMini: modelMini as ModelType,
        recursionLimit: 1,
      }
    );

    res.json({
      message: "Summary generated successfully",
      taskId,
      codebaseUnderstandingId: result.codebaseUnderstandingId,
      stats: result.stats,
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    next(error);
  }
});

export { shadowWikiRouter };
