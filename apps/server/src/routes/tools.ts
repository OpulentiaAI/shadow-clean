/**
 * Tool execution API for Convex Agent
 *
 * This router exposes tool execution as HTTP endpoints that the Convex Agent
 * can call via fetch() from within Convex actions.
 */
import { Router } from "express";
import { z } from "zod";
import { createToolExecutor } from "../execution";
import { getTask, toConvexId } from "../lib/convex-operations";
import fs from "node:fs";
import path from "node:path";

const router = Router();

// Shared API key for Convex-to-server calls (internal use only)
const CONVEX_TOOL_API_KEY = process.env.CONVEX_TOOL_API_KEY || "shadow-internal-tool-key";

// Middleware to validate internal API key
function validateInternalKey(req: any, res: any, next: any) {
  const apiKey = req.headers["x-convex-tool-key"];
  if (apiKey !== CONVEX_TOOL_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Schema for tool requests
const ReadFileSchema = z.object({
  target_file: z.string(),
  should_read_entire_file: z.boolean().optional(),
  start_line_one_indexed: z.number().optional(),
  end_line_one_indexed_inclusive: z.number().optional(),
});

const EditFileSchema = z.object({
  target_file: z.string(),
  instructions: z.string(),
  code_edit: z.string(),
  is_new_file: z.boolean().optional(),
});

const SearchReplaceSchema = z.object({
  file_path: z.string(),
  old_string: z.string(),
  new_string: z.string(),
  is_new_file: z.boolean().optional(),
});

const RunTerminalCmdSchema = z.object({
  command: z.string(),
  is_background: z.boolean().optional(),
});

const ListDirSchema = z.object({
  relative_workspace_path: z.string(),
});

const GrepSearchSchema = z.object({
  query: z.string(),
  include_pattern: z.string().optional(),
  exclude_pattern: z.string().optional(),
  case_sensitive: z.boolean().optional(),
});

const FileSearchSchema = z.object({
  query: z.string(),
});

const DeleteFileSchema = z.object({
  target_file: z.string(),
});

const SemanticSearchSchema = z.object({
  query: z.string(),
});

const WarpGrepSchema = z.object({
  query: z.string(),
});

// Helper to get executor for a task
async function getExecutorForTask(taskId: string, workspacePathOverride?: string) {
  if (workspacePathOverride) {
    return createToolExecutor(taskId, workspacePathOverride);
  }
  const task = await getTask(toConvexId<"tasks">(taskId));
  if (!task) {
    // Fallback for production: tasks may not be readable from Convex due to access policies.
    // If the workspace exists locally in the container, use it directly.
    const workspaceRoot = process.env.WORKSPACE_DIR || "/workspace";
    const candidate = path.join(workspaceRoot, "tasks", taskId);
    if (fs.existsSync(candidate)) {
      return createToolExecutor(taskId, candidate);
    }
    throw new Error(`Task ${taskId} not found`);
  }
  return createToolExecutor(taskId, task.workspacePath || undefined);
}

// Read file
router.post("/:taskId/read_file", validateInternalKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const params = ReadFileSchema.parse(req.body);

    const workspacePathOverride =
      typeof req.headers["x-shadow-workspace-path"] === "string"
        ? req.headers["x-shadow-workspace-path"]
        : undefined;
    const executor = await getExecutorForTask(taskId, workspacePathOverride);
    const result = await executor.readFile(params.target_file, {
      shouldReadEntireFile: params.should_read_entire_file,
      startLineOneIndexed: params.start_line_one_indexed,
      endLineOneIndexedInclusive: params.end_line_one_indexed_inclusive,
    });

    res.json(result);
  } catch (error) {
    console.error("[TOOL_API] read_file error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Edit file
router.post("/:taskId/edit_file", validateInternalKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const params = EditFileSchema.parse(req.body);

    const workspacePathOverride =
      typeof req.headers["x-shadow-workspace-path"] === "string"
        ? req.headers["x-shadow-workspace-path"]
        : undefined;
    const executor = await getExecutorForTask(taskId, workspacePathOverride);
    const result = await executor.writeFile(
      params.target_file,
      params.code_edit,
      params.instructions,
      params.is_new_file
    );

    res.json(result);
  } catch (error) {
    console.error("[TOOL_API] edit_file error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Search replace
router.post("/:taskId/search_replace", validateInternalKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const params = SearchReplaceSchema.parse(req.body);

    const workspacePathOverride =
      typeof req.headers["x-shadow-workspace-path"] === "string"
        ? req.headers["x-shadow-workspace-path"]
        : undefined;
    const executor = await getExecutorForTask(taskId, workspacePathOverride);
    const result = await executor.searchReplace(
      params.file_path,
      params.old_string,
      params.new_string,
      params.is_new_file
    );

    res.json(result);
  } catch (error) {
    console.error("[TOOL_API] search_replace error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Run terminal command
router.post("/:taskId/run_terminal_cmd", validateInternalKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const params = RunTerminalCmdSchema.parse(req.body);

    const workspacePathOverride =
      typeof req.headers["x-shadow-workspace-path"] === "string"
        ? req.headers["x-shadow-workspace-path"]
        : undefined;
    const executor = await getExecutorForTask(taskId, workspacePathOverride);
    const result = await executor.executeCommand(params.command, {
      isBackground: params.is_background,
    });

    res.json(result);
  } catch (error) {
    console.error("[TOOL_API] run_terminal_cmd error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// List directory
router.post("/:taskId/list_dir", validateInternalKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const params = ListDirSchema.parse(req.body);

    const workspacePathOverride =
      typeof req.headers["x-shadow-workspace-path"] === "string"
        ? req.headers["x-shadow-workspace-path"]
        : undefined;
    const executor = await getExecutorForTask(taskId, workspacePathOverride);
    const result = await executor.listDirectory(params.relative_workspace_path);

    res.json(result);
  } catch (error) {
    console.error("[TOOL_API] list_dir error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Grep search
router.post("/:taskId/grep_search", validateInternalKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const params = GrepSearchSchema.parse(req.body);

    const workspacePathOverride =
      typeof req.headers["x-shadow-workspace-path"] === "string"
        ? req.headers["x-shadow-workspace-path"]
        : undefined;
    const executor = await getExecutorForTask(taskId, workspacePathOverride);
    const result = await executor.grepSearch(params.query, {
      includePattern: params.include_pattern,
      excludePattern: params.exclude_pattern,
      caseSensitive: params.case_sensitive,
    });

    res.json(result);
  } catch (error) {
    console.error("[TOOL_API] grep_search error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// File search
router.post("/:taskId/file_search", validateInternalKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const params = FileSearchSchema.parse(req.body);

    const workspacePathOverride =
      typeof req.headers["x-shadow-workspace-path"] === "string"
        ? req.headers["x-shadow-workspace-path"]
        : undefined;
    const executor = await getExecutorForTask(taskId, workspacePathOverride);
    const result = await executor.searchFiles(params.query);

    res.json(result);
  } catch (error) {
    console.error("[TOOL_API] file_search error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Delete file
router.post("/:taskId/delete_file", validateInternalKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const params = DeleteFileSchema.parse(req.body);

    const workspacePathOverride =
      typeof req.headers["x-shadow-workspace-path"] === "string"
        ? req.headers["x-shadow-workspace-path"]
        : undefined;
    const executor = await getExecutorForTask(taskId, workspacePathOverride);
    const result = await executor.deleteFile(params.target_file);

    res.json(result);
  } catch (error) {
    console.error("[TOOL_API] delete_file error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Semantic search
router.post("/:taskId/semantic_search", validateInternalKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const params = SemanticSearchSchema.parse(req.body);

    const task = await getTask(toConvexId<"tasks">(taskId));
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    const repoMatch = task.repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    const repo = repoMatch?.[1] ?? task.repoUrl;

    const executor = await getExecutorForTask(taskId);
    const result = await executor.semanticSearch(params.query, repo);

    res.json(result);
  } catch (error) {
    console.error("[TOOL_API] semantic_search error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Warp grep (semantic code search)
router.post("/:taskId/warp_grep", validateInternalKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    const params = WarpGrepSchema.parse(req.body);

    const workspacePathOverride =
      typeof req.headers["x-shadow-workspace-path"] === "string"
        ? req.headers["x-shadow-workspace-path"]
        : undefined;
    const executor = await getExecutorForTask(taskId, workspacePathOverride);
    const result = await executor.warpGrep(params.query);

    res.json(result);
  } catch (error) {
    console.error("[TOOL_API] warp_grep error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export { router as toolsRouter };
