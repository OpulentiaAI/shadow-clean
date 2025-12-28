/**
 * Daytona Workspace Manager
 * Implements WorkspaceManager interface using Daytona sandboxes
 * Replaces K8s-based VM runner with Daytona cloud infrastructure
 */

import type { WorkspaceManager } from '../execution/interfaces/workspace-manager';
import type { ToolExecutor } from '../execution/interfaces/tool-executor';
import type {
  WorkspaceInfo,
  WorkspaceStatus,
  HealthStatus,
  TaskConfig,
} from '../execution/interfaces/types';
import { getDaytonaService, type DaytonaService } from './daytona-service';
import { DaytonaExecutor } from './daytona-executor';
import { DAYTONA_WORKSPACE_PATH, DAYTONA_POLL_INTERVAL, DAYTONA_MAX_WAIT_TIME } from './config';
import config from '../config';
import { getGitHubAppEmail, getGitHubAppName } from '../config/shared';
import { getGitHubAccessToken } from '../github/auth/account-service';
import type { DaytonaSandboxConfig } from './types';

// Map task IDs to sandbox IDs
const taskToSandboxMap = new Map<string, string>();

export class DaytonaWorkspaceManager implements WorkspaceManager {
  private daytonaService: DaytonaService;

  constructor() {
    this.daytonaService = getDaytonaService();
  }

  async prepareWorkspace(taskConfig: TaskConfig): Promise<WorkspaceInfo> {
    try {
      console.log(`[DAYTONA_WM] Preparing Daytona sandbox for task ${taskConfig.id}`);

      // Get GitHub token for non-scratchpad tasks
      let githubToken: string | undefined;
      if (!taskConfig.isScratchpad) {
        const token = await getGitHubAccessToken(taskConfig.userId);
        githubToken = token ?? undefined;
        if (!githubToken) {
          throw new Error(`No GitHub access token found for user ${taskConfig.userId}`);
        }
      }

      // Create sandbox configuration
      const sandboxConfig: DaytonaSandboxConfig = {
        language: 'typescript',
        resources: {
          cpu: 2,
          memory: 4096,
          disk: 20480,
        },
        envVars: {
          TASK_ID: taskConfig.id,
          REPO_URL: taskConfig.repoUrl,
          BASE_BRANCH: taskConfig.baseBranch,
          SHADOW_BRANCH: taskConfig.shadowBranch,
          USER_ID: taskConfig.userId,
          IS_SCRATCHPAD: taskConfig.isScratchpad ? 'true' : 'false',
          ...(githubToken && { GITHUB_TOKEN: githubToken }),
        },
      };

      // Create the sandbox
      const sandboxInfo = await this.daytonaService.createSandbox(sandboxConfig);
      console.log(`[DAYTONA_WM] Created sandbox: ${sandboxInfo.id}`);

      // Store the mapping
      taskToSandboxMap.set(taskConfig.id, sandboxInfo.id);

      // Wait for sandbox to be ready
      await this.waitForSandboxReady(sandboxInfo.id);

      // Clone repository and set up workspace
      try {
        if (taskConfig.isScratchpad) {
          // Initialize scratchpad workspace
          await this.initializeScratchpad(sandboxInfo.id);
        } else {
          // Clone the repository
          await this.cloneRepository(sandboxInfo.id, taskConfig, githubToken);
        }

        // Configure git user
        await this.configureGitUser(sandboxInfo.id);

        // Create shadow branch
        await this.createShadowBranch(sandboxInfo.id, taskConfig.baseBranch, taskConfig.shadowBranch);

        console.log(`[DAYTONA_WM] Workspace setup complete for task ${taskConfig.id}`);

        return {
          success: true,
          workspacePath: DAYTONA_WORKSPACE_PATH,
          podName: sandboxInfo.id, // Using sandbox ID as identifier
          serviceName: sandboxInfo.id,
          gitSetupFailed: false,
        };
      } catch (gitError) {
        console.error(`[DAYTONA_WM] Failed to setup git in sandbox:`, gitError);
        const gitErrorMessage = gitError instanceof Error ? gitError.message : 'Unknown git setup error';
        
        return {
          success: true, // Don't fail workspace creation
          workspacePath: DAYTONA_WORKSPACE_PATH,
          podName: sandboxInfo.id,
          serviceName: sandboxInfo.id,
          gitSetupFailed: true,
          gitError: gitErrorMessage,
        };
      }
    } catch (error) {
      console.error(`[DAYTONA_WM] Failed to prepare workspace:`, error);
      return {
        success: false,
        workspacePath: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async cleanupWorkspace(taskId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[DAYTONA_WM] Cleaning up workspace for task ${taskId}`);

      const sandboxId = taskToSandboxMap.get(taskId);
      if (!sandboxId) {
        return {
          success: true,
          message: `No sandbox found for task ${taskId} (may have been cleaned up already)`,
        };
      }

      await this.daytonaService.deleteSandbox(sandboxId);
      taskToSandboxMap.delete(taskId);

      console.log(`[DAYTONA_WM] Deleted sandbox ${sandboxId} for task ${taskId}`);

      return {
        success: true,
        message: `Workspace cleaned up successfully for task ${taskId}`,
      };
    } catch (error) {
      console.error(`[DAYTONA_WM] Failed to cleanup workspace:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getWorkspaceStatus(taskId: string): Promise<WorkspaceStatus> {
    try {
      const sandboxId = taskToSandboxMap.get(taskId);
      if (!sandboxId) {
        return {
          exists: false,
          path: '',
          isReady: false,
          error: `No sandbox found for task ${taskId}`,
        };
      }

      const sandboxInfo = await this.daytonaService.getSandbox(sandboxId);
      if (!sandboxInfo) {
        return {
          exists: false,
          path: DAYTONA_WORKSPACE_PATH,
          isReady: false,
          error: 'Sandbox not found',
        };
      }

      return {
        exists: true,
        path: DAYTONA_WORKSPACE_PATH,
        isReady: sandboxInfo.state === 'running',
      };
    } catch (error) {
      return {
        exists: false,
        path: '',
        isReady: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getWorkspacePath(_taskId: string): string {
    return DAYTONA_WORKSPACE_PATH;
  }

  async workspaceExists(taskId: string): Promise<boolean> {
    const sandboxId = taskToSandboxMap.get(taskId);
    if (!sandboxId) return false;

    const sandboxInfo = await this.daytonaService.getSandbox(sandboxId);
    return sandboxInfo !== null;
  }

  async getWorkspaceSize(taskId: string): Promise<number> {
    try {
      const sandboxId = taskToSandboxMap.get(taskId);
      if (!sandboxId) return 0;

      // Execute du command to get workspace size
      const result = await this.daytonaService.executeCommand(
        sandboxId,
        'du -sb /workspace 2>/dev/null | cut -f1'
      );

      const size = parseInt(result.stdout.trim(), 10);
      return Number.isNaN(size) ? 0 : size;
    } catch {
      return 0;
    }
  }

  async getExecutor(taskId: string): Promise<ToolExecutor> {
    const sandboxId = taskToSandboxMap.get(taskId);
    if (!sandboxId) {
      throw new Error(`No sandbox found for task ${taskId}`);
    }

    // Return DaytonaExecutor cast as ToolExecutor for compatibility
    // Note: DaytonaExecutor provides a simplified interface
    return new DaytonaExecutor(taskId, sandboxId, this.daytonaService) as unknown as ToolExecutor;
  }

  async healthCheck(taskId: string): Promise<HealthStatus> {
    try {
      const status = await this.getWorkspaceStatus(taskId);

      if (!status.exists) {
        return {
          healthy: false,
          message: `Workspace does not exist for task ${taskId}`,
        };
      }

      if (!status.isReady) {
        return {
          healthy: false,
          message: `Workspace is not ready for task ${taskId}`,
        };
      }

      // Test connectivity by running a simple command
      const sandboxId = taskToSandboxMap.get(taskId);
      if (sandboxId) {
        const result = await this.daytonaService.executeCommand(sandboxId, 'echo "health check"');
        if (result.exitCode !== 0) {
          return {
            healthy: false,
            message: `Health check command failed for task ${taskId}`,
          };
        }
      }

      return {
        healthy: true,
        message: `Workspace is healthy for task ${taskId}`,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed for task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  isRemote(): boolean {
    return true;
  }

  // ==================== Daytona-Specific Methods ====================

  getSandboxId(taskId: string): string | undefined {
    return taskToSandboxMap.get(taskId);
  }

  async getPreviewUrl(taskId: string, port: number): Promise<string | null> {
    const sandboxId = taskToSandboxMap.get(taskId);
    if (!sandboxId) return null;

    try {
      return await this.daytonaService.getPreviewUrl(sandboxId, port);
    } catch {
      return null;
    }
  }

  // ==================== Private Helper Methods ====================

  private async waitForSandboxReady(sandboxId: string): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < DAYTONA_MAX_WAIT_TIME) {
      const sandboxInfo = await this.daytonaService.getSandbox(sandboxId);
      
      if (sandboxInfo?.state === 'running') {
        console.log(`[DAYTONA_WM] Sandbox ${sandboxId} is ready`);
        return;
      }

      if (sandboxInfo?.state === 'error') {
        throw new Error(`Sandbox ${sandboxId} entered error state`);
      }

      await new Promise(resolve => setTimeout(resolve, DAYTONA_POLL_INTERVAL));
    }

    throw new Error(`Timeout waiting for sandbox ${sandboxId} to be ready`);
  }

  private async initializeScratchpad(sandboxId: string): Promise<void> {
    console.log(`[DAYTONA_WM] Initializing scratchpad workspace`);
    
    await this.daytonaService.executeCommand(sandboxId, `
      cd ${DAYTONA_WORKSPACE_PATH} &&
      git init &&
      echo "# Scratchpad" > README.md &&
      git add . &&
      git commit -m "Initialize scratchpad workspace" --allow-empty
    `);
  }

  private async cloneRepository(
    sandboxId: string,
    taskConfig: TaskConfig,
    githubToken?: string
  ): Promise<void> {
    console.log(`[DAYTONA_WM] Cloning repository ${taskConfig.repoUrl}`);

    // Construct the authenticated URL if we have a token
    let repoUrl = taskConfig.repoUrl;
    if (githubToken && repoUrl.startsWith('https://')) {
      repoUrl = repoUrl.replace('https://', `https://${githubToken}@`);
    }

    await this.daytonaService.executeCommand(sandboxId, `
      cd ${DAYTONA_WORKSPACE_PATH} &&
      git clone --depth 1 --branch "${taskConfig.baseBranch}" "${repoUrl}" .
    `);

    console.log(`[DAYTONA_WM] Repository cloned successfully`);
  }

  private async configureGitUser(sandboxId: string): Promise<void> {
    const gitName = getGitHubAppName(config);
    const gitEmail = getGitHubAppEmail(config);

    await this.daytonaService.executeCommand(sandboxId, `
      git config --global user.name "${gitName}" &&
      git config --global user.email "${gitEmail}" &&
      git config --global --add safe.directory ${DAYTONA_WORKSPACE_PATH}
    `);

    console.log(`[DAYTONA_WM] Configured git user: ${gitName}`);
  }

  private async createShadowBranch(
    sandboxId: string,
    _baseBranch: string,
    shadowBranch: string
  ): Promise<void> {
    await this.daytonaService.executeCommand(sandboxId, `
      cd ${DAYTONA_WORKSPACE_PATH} &&
      git checkout -B "${shadowBranch}"
    `);

    console.log(`[DAYTONA_WM] Created shadow branch: ${shadowBranch}`);
  }
}

export default DaytonaWorkspaceManager;
