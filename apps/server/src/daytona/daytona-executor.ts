/**
 * Daytona Executor
 * Simplified executor for Daytona sandbox operations
 * Does not implement full ToolExecutor interface to avoid type conflicts
 */

import type { DaytonaService } from './daytona-service';
import { DAYTONA_WORKSPACE_PATH } from './config';

export interface DaytonaCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  message: string;
}

export interface DaytonaFileResult {
  success: boolean;
  content?: string;
  error?: string;
  message: string;
}

export class DaytonaExecutor {
  private taskId: string;
  private sandboxId: string;
  private daytonaService: DaytonaService;

  constructor(taskId: string, sandboxId: string, daytonaService: DaytonaService) {
    this.taskId = taskId;
    this.sandboxId = sandboxId;
    this.daytonaService = daytonaService;
  }

  async executeCommand(command: string, cwd?: string): Promise<DaytonaCommandResult> {
    try {
      const workingDir = cwd || DAYTONA_WORKSPACE_PATH;
      const fullCommand = `cd "${workingDir}" && ${command}`;
      
      const result = await this.daytonaService.executeCommand(this.sandboxId, fullCommand);

      return {
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        message: result.exitCode === 0 ? 'Command executed successfully' : 'Command failed',
      };
    } catch (error) {
      console.error(`[DAYTONA_EXECUTOR] Command execution failed:`, error);
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
        message: 'Command execution failed',
      };
    }
  }

  async readFile(filePath: string): Promise<DaytonaFileResult> {
    try {
      const fullPath = this.resolvePath(filePath);
      const content = await this.daytonaService.readFile(this.sandboxId, fullPath);
      
      return {
        success: true,
        content,
        message: 'File read successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to read file',
      };
    }
  }

  async writeFile(filePath: string, content: string): Promise<{ success: boolean; error?: string; message: string }> {
    try {
      const fullPath = this.resolvePath(filePath);
      await this.daytonaService.writeFile(this.sandboxId, fullPath, content);
      
      return { success: true, message: 'File written successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to write file',
      };
    }
  }

  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string; message: string }> {
    try {
      const fullPath = this.resolvePath(filePath);
      await this.daytonaService.deleteFile(this.sandboxId, fullPath);
      
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to delete file',
      };
    }
  }

  async listFiles(dirPath: string): Promise<{ success: boolean; files?: string[]; error?: string }> {
    try {
      const fullPath = this.resolvePath(dirPath);
      const files = await this.daytonaService.listFiles(this.sandboxId, fullPath);
      
      return {
        success: true,
        files: files.map(f => f.path),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Git operations
  async configureGitUser(config: { name: string; email: string }): Promise<void> {
    await this.executeCommand(`git config user.name "${config.name}"`);
    await this.executeCommand(`git config user.email "${config.email}"`);
  }

  async createShadowBranch(_baseBranch: string, shadowBranch: string): Promise<void> {
    await this.executeCommand(`git checkout -B "${shadowBranch}"`, DAYTONA_WORKSPACE_PATH);
  }

  async gitStatus(): Promise<{
    branch: string;
    staged: string[];
    unstaged: string[];
    untracked: string[];
  }> {
    try {
      const status = await this.daytonaService.gitStatus(this.sandboxId, DAYTONA_WORKSPACE_PATH);
      return {
        branch: status.branch,
        staged: status.staged,
        unstaged: status.unstaged,
        untracked: status.untracked,
      };
    } catch (error) {
      console.error('[DAYTONA_EXECUTOR] Git status failed:', error);
      return {
        branch: 'unknown',
        staged: [],
        unstaged: [],
        untracked: [],
      };
    }
  }

  getTaskId(): string {
    return this.taskId;
  }

  getSandboxId(): string {
    return this.sandboxId;
  }

  getWorkspacePath(): string {
    return DAYTONA_WORKSPACE_PATH;
  }

  isRemote(): boolean {
    return true;
  }

  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path;
    }
    return `${DAYTONA_WORKSPACE_PATH}/${path}`;
  }
}

export default DaytonaExecutor;
