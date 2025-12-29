/**
 * Factory functions for creating execution layer components
 * This is the main entry point for the abstraction layer
 */

import config from "../config";
import { AgentMode } from "@repo/types";
import { ToolExecutor } from "./interfaces/tool-executor";
import { WorkspaceManager } from "./interfaces/workspace-manager";
import { LocalToolExecutor } from "./local/local-tool-executor";
import { LocalWorkspaceManager } from "./local/local-workspace-manager";
import { RemoteToolExecutor } from "./remote/remote-tool-executor";
import { RemoteWorkspaceManager } from "./remote/remote-workspace-manager";
import { RemoteVMRunner } from "./remote/remote-vm-runner";
import { LocalGitService } from "./local/local-git-service";
import { RemoteGitService } from "./remote/remote-git-service";
import { GitService } from "./interfaces/git-service";
import { GitManager } from "../services/git-manager";
import { getTask, toConvexId } from "../lib/convex-operations";
import { DaytonaWorkspaceManager } from "../daytona";
import { isDaytonaEnabled } from "../daytona/config";

/**
 * Create a tool executor based on the configured agent mode
 * For remote mode, uses dynamic pod discovery to find actual running VMs
 * Prefers Daytona when enabled (DAYTONA_API_KEY set)
 */
export async function createToolExecutor(
  taskId: string,
  workspacePath?: string,
  mode?: AgentMode
): Promise<ToolExecutor> {
  // If Daytona is enabled, use Daytona workspace manager to get executor
  if (isDaytonaEnabled()) {
    console.log(`[CREATE_TOOL_EXECUTOR] Using Daytona for task ${taskId}`);
    const daytonaManager = new DaytonaWorkspaceManager();
    try {
      return await daytonaManager.getExecutor(taskId);
    } catch (error) {
      console.error(`[CREATE_TOOL_EXECUTOR] Daytona executor failed for task ${taskId}:`, error);
      throw new Error(
        `Cannot create Daytona executor for task ${taskId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  const agentMode = mode || config.agentMode;

  if (agentMode === "local") {
    // If workspacePath not provided, look it up from the task
    let resolvedWorkspacePath = workspacePath;
    if (!resolvedWorkspacePath) {
      const task = await getTask(toConvexId<"tasks">(taskId));
      resolvedWorkspacePath = task?.workspacePath || undefined;
    }
    
    if (!resolvedWorkspacePath) {
      console.warn(`[CREATE_TOOL_EXECUTOR] No workspace path for task ${taskId}, using default`);
    }
    
    return new LocalToolExecutor(taskId, resolvedWorkspacePath);
  }

  // For remote mode, use dynamic pod discovery to find the actual running VM
  try {
    const vmRunner = new RemoteVMRunner();
    const pod = await vmRunner.getVMPodStatus(taskId);
    const podIP = pod.status?.podIP;

    if (!podIP) {
      throw new Error(
        `Pod IP not available for task ${taskId}. Pod may not be running.`
      );
    }

    // Use direct pod IP connectivity (same approach as working file operations)
    const sidecarUrl = `http://${podIP}:8080`;
    return new RemoteToolExecutor(taskId, sidecarUrl);
  } catch (error) {
    console.error(
      `[CREATE_TOOL_EXECUTOR] Failed to find pod for task ${taskId}:`,
      error
    );

    // Check if this is a pod not found error (404)
    const isNotFound =
      error instanceof Error &&
      (error.message.includes("404") ||
        error.message.includes("not found") ||
        error.message.includes("NotFound"));

    if (isNotFound) {
      throw new Error(
        `Remote workspace for task ${taskId} is not available. This usually means the workspace was cleaned up due to inactivity. Please try your request again to automatically reconnect.`
      );
    }

    throw new Error(
      `Cannot create remote tool executor for task ${taskId}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Create a workspace manager based on the configured agent mode
 * Prefers Daytona when enabled (DAYTONA_API_KEY set)
 */
export function createWorkspaceManager(mode?: AgentMode): WorkspaceManager {
  // If Daytona is enabled, use it regardless of mode
  if (isDaytonaEnabled()) {
    console.log("[WORKSPACE_MANAGER] Using Daytona workspace manager");
    return new DaytonaWorkspaceManager();
  }

  const agentMode = mode || config.agentMode;

  switch (agentMode) {
    case "local":
      return new LocalWorkspaceManager();

    case "remote":
      return new RemoteWorkspaceManager();

    default:
      throw new Error(`Unsupported agent mode: ${agentMode}`);
  }
}

/**
 * Get the current agent mode from configuration
 */
export function getAgentMode(): AgentMode {
  return config.agentMode;
}

/**
 * Create a git service based on the configured agent mode
 * Provides unified git operations interface for both local and remote execution
 */
export async function createGitService(taskId: string): Promise<GitService> {
  const agentMode = getAgentMode();

  if (agentMode === "remote") {
    // For remote mode, use the tool executor to wrap git operations
    const toolExecutor = await createToolExecutor(taskId);
    return new RemoteGitService(toolExecutor as RemoteToolExecutor);
  } else {
    // For local mode, get workspace path and create GitManager
    const task = await getTask(toConvexId<"tasks">(taskId));

    if (!task?.workspacePath) {
      throw new Error(`Task ${taskId} not found or has no workspace path`);
    }

    const gitManager = new GitManager(task.workspacePath);
    return new LocalGitService(gitManager);
  }
}

/**
 * Check if the current mode is remote
 */
export function isRemoteMode(): boolean {
  return config.agentMode === "remote";
}

/**
 * Check if the current mode is local
 */
export function isLocalMode(): boolean {
  return config.agentMode === "local";
}

/**
 * Check if the current mode requires VM infrastructure
 */
export function isVMMode(): boolean {
  return config.agentMode === "remote";
}

// Re-export types and interfaces for convenience
export type { ToolExecutor, WorkspaceManager, GitService };
export type {
  AgentMode,
  FileResult,
  WriteResult,
  DeleteResult,
  DirectoryListing,
  FileSearchResult,
  GrepResult,
  SemanticSearchToolResult,
} from "@repo/types";
export type {
  CommandResult,
  WorkspaceInfo,
  WorkspaceStatus,
  HealthStatus,
} from "./interfaces/types";
