/**
 * Daytona Executor
 * Implements full ToolExecutor interface for Daytona sandbox operations
 */

import type { DaytonaService } from './daytona-service';
import { DAYTONA_WORKSPACE_PATH } from './config';
import type { ToolExecutor } from '../execution/interfaces/tool-executor';
import type { CommandResult } from '../execution/interfaces/types';
import type {
  CommandOptions,
  DeleteResult,
  DirectoryListing,
  FileResult,
  FileSearchResult,
  FileStatsResult,
  GrepOptions,
  GrepResult,
  ReadFileOptions,
  SearchOptions,
  WriteResult,
  SearchReplaceResult,
  SemanticSearchToolResult,
  WarpGrepResult,
  GitStatusResponse,
  GitDiffResponse,
  GitCommitResponse,
  GitPushResponse,
  GitCommitRequest,
  GitPushRequest,
  RecursiveDirectoryListing,
  RecursiveDirectoryEntry,
} from '@repo/types';

export class DaytonaExecutor implements ToolExecutor {
  private taskId: string;
  private sandboxId: string;
  private daytonaService: DaytonaService;

  constructor(taskId: string, sandboxId: string, daytonaService: DaytonaService) {
    this.taskId = taskId;
    this.sandboxId = sandboxId;
    this.daytonaService = daytonaService;
  }

  // ==================== File Operations ====================

  async getFileStats(targetFile: string): Promise<FileStatsResult> {
    try {
      const fullPath = this.resolvePath(targetFile);
      const result = await this.daytonaService.executeCommand(
        this.sandboxId,
        `stat -c '{"size":%s,"mtime":"%Y","isDir":"%F"}' "${fullPath}" 2>/dev/null`
      );
      
      if (result.exitCode !== 0) {
        return { success: false, error: 'File not found', message: 'Failed to get file stats' };
      }

      try {
        const parsed = JSON.parse(result.stdout.trim());
        const isDir = parsed.isDir === 'directory';
        return {
          success: true,
          stats: {
            size: parsed.size,
            mtime: new Date(parseInt(parsed.mtime) * 1000),
            isDirectory: isDir,
            isFile: !isDir,
          },
          message: 'File stats retrieved',
        };
      } catch {
        return { success: false, error: 'Failed to parse stats', message: 'Failed to get file stats' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get file stats',
      };
    }
  }

  async readFile(targetFile: string, options?: ReadFileOptions): Promise<FileResult> {
    try {
      const fullPath = this.resolvePath(targetFile);
      const content = await this.daytonaService.readFile(this.sandboxId, fullPath);
      
      const lines = content.split('\n');
      const totalLines = lines.length;
      
      // Handle line range if specified
      if (options?.startLineOneIndexed || options?.endLineOneIndexedInclusive) {
        const start = (options.startLineOneIndexed || 1) - 1;
        const end = options.endLineOneIndexedInclusive || totalLines;
        const selectedLines = lines.slice(start, end);
        
        return {
          success: true,
          content: selectedLines.join('\n'),
          totalLines,
          startLine: start + 1,
          endLine: end,
          message: `Read lines ${start + 1}-${end} of ${targetFile}`,
        };
      }
      
      return {
        success: true,
        content,
        totalLines,
        message: `File read successfully: ${targetFile}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to read file: ${targetFile}`,
      };
    }
  }

  async writeFile(
    targetFile: string,
    content: string,
    _instructions: string,
    isNewFile?: boolean
  ): Promise<WriteResult> {
    try {
      const fullPath = this.resolvePath(targetFile);
      
      // Create parent directories if needed
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      if (parentDir) {
        await this.daytonaService.executeCommand(this.sandboxId, `mkdir -p "${parentDir}"`);
      }
      
      const linesAdded = content.split('\n').length;
      await this.daytonaService.writeFile(this.sandboxId, fullPath, content);
      
      return {
        success: true,
        message: isNewFile ? `Created new file: ${targetFile}` : `Updated file: ${targetFile}`,
        isNewFile,
        linesAdded,
        linesRemoved: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to write file: ${targetFile}`,
      };
    }
  }

  async deleteFile(targetFile: string): Promise<DeleteResult> {
    try {
      const fullPath = this.resolvePath(targetFile);
      await this.daytonaService.deleteFile(this.sandboxId, fullPath);
      
      return { success: true, message: `Deleted file: ${targetFile}` };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to delete file: ${targetFile}`,
      };
    }
  }

  async searchReplace(
    filePath: string,
    oldString: string,
    newString: string,
    isNewFile?: boolean
  ): Promise<SearchReplaceResult> {
    try {
      const fullPath = this.resolvePath(filePath);
      
      if (isNewFile) {
        // Create new file with the content
        await this.daytonaService.writeFile(this.sandboxId, fullPath, newString);
        return {
          success: true,
          message: `Created new file: ${filePath}`,
          isNewFile: false,
          linesAdded: newString.split('\n').length,
          linesRemoved: 0,
          occurrences: 1,
          oldLength: 0,
          newLength: newString.length,
        };
      }
      
      // Read existing file
      const content = await this.daytonaService.readFile(this.sandboxId, fullPath);
      
      if (!content.includes(oldString)) {
        return {
          success: false,
          error: 'Old string not found in file',
          message: `The string to replace was not found in ${filePath}`,
          isNewFile: false,
          linesAdded: 0,
          linesRemoved: 0,
          occurrences: 0,
          oldLength: content.length,
          newLength: content.length,
        };
      }
      
      // Replace and write back
      const newContent = content.replace(oldString, newString);
      await this.daytonaService.writeFile(this.sandboxId, fullPath, newContent);
      
      return {
        success: true,
        message: `Replaced text in ${filePath}`,
        isNewFile: false,
        linesAdded: newContent.split('\n').length - content.split('\n').length,
        linesRemoved: 0,
        occurrences: 1,
        oldLength: content.length,
        newLength: newContent.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to search/replace in ${filePath}`,
        isNewFile: false,
        linesAdded: 0,
        linesRemoved: 0,
        occurrences: 0,
        oldLength: 0,
        newLength: 0,
      };
    }
  }

  // ==================== Directory Operations ====================

  async listDirectory(relativeWorkspacePath: string): Promise<DirectoryListing> {
    try {
      const fullPath = this.resolvePath(relativeWorkspacePath);
      const files = await this.daytonaService.listFiles(this.sandboxId, fullPath);
      
      return {
        success: true,
        contents: files.map(f => {
          const isDir = f.path.endsWith('/');
          return {
            name: f.path.replace(/\/$/, '').split('/').pop() || f.path,
            type: isDir ? 'directory' as const : 'file' as const,
            isDirectory: isDir,
          };
        }),
        path: relativeWorkspacePath,
        message: `Listed ${files.length} items in ${relativeWorkspacePath}`,
      };
    } catch (error) {
      return {
        success: false,
        path: relativeWorkspacePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to list directory: ${relativeWorkspacePath}`,
      };
    }
  }

  async listDirectoryRecursive(relativeWorkspacePath: string = '.'): Promise<RecursiveDirectoryListing> {
    try {
      const fullPath = this.resolvePath(relativeWorkspacePath);
      
      // Use find command to get recursive listing
      const result = await this.daytonaService.executeCommand(
        this.sandboxId,
        `find "${fullPath}" -maxdepth 5 -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' -not -path '*/dist/*' -printf '%P\\t%y\\n' 2>/dev/null | head -500`
      );
      
      const entries: RecursiveDirectoryEntry[] = [];
      
      if (result.exitCode === 0 && result.stdout) {
        const lines = result.stdout.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const [relativePath, type] = line.split('\t');
          if (relativePath) {
            entries.push({
              name: relativePath.split('/').pop() || relativePath,
              type: type === 'd' ? 'directory' : 'file',
              relativePath,
              isDirectory: type === 'd',
            });
          }
        }
      }
      
      return {
        success: true,
        entries,
        basePath: relativeWorkspacePath,
        totalCount: entries.length,
        message: `Recursively listed ${entries.length} items`,
      };
    } catch (error) {
      return {
        success: false,
        entries: [],
        basePath: relativeWorkspacePath,
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to list directory recursively`,
      };
    }
  }

  // ==================== Search Operations ====================

  async searchFiles(query: string, _options?: SearchOptions): Promise<FileSearchResult> {
    try {
      const result = await this.daytonaService.executeCommand(
        this.sandboxId,
        `find "${DAYTONA_WORKSPACE_PATH}" -type f -name "*${query}*" -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -50`
      );
      
      const files = result.stdout.trim().split('\n').filter(Boolean).map(f => 
        f.replace(DAYTONA_WORKSPACE_PATH + '/', '')
      );
      
      return {
        success: true,
        files,
        query,
        count: files.length,
        message: `Found ${files.length} files matching "${query}"`,
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        query,
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to search files`,
      };
    }
  }

  async grepSearch(query: string, options?: GrepOptions): Promise<GrepResult> {
    try {
      const caseFlag = options?.caseSensitive ? '' : '-i';
      const includeFlag = options?.includePattern ? `--include="${options.includePattern}"` : '';
      const excludeFlag = options?.excludePattern ? `--exclude="${options.excludePattern}"` : '';
      
      const result = await this.daytonaService.executeCommand(
        this.sandboxId,
        `grep -rn ${caseFlag} ${includeFlag} ${excludeFlag} --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=dist "${query}" "${DAYTONA_WORKSPACE_PATH}" 2>/dev/null | head -100`
      );
      
      const lines = result.stdout.trim().split('\n').filter(Boolean);
      const matches: string[] = [];
      const detailedMatches: Array<{ file: string; lineNumber: number; content: string }> = [];
      
      for (const line of lines) {
        const match = line.match(/^(.+?):(\d+):(.*)$/);
        if (match) {
          const file = match[1]?.replace(DAYTONA_WORKSPACE_PATH + '/', '') || '';
          const lineNumber = parseInt(match[2] || '0');
          const content = match[3] || '';
          matches.push(`${file}:${lineNumber}:${content}`);
          detailedMatches.push({ file, lineNumber, content });
        }
      }
      
      return {
        success: true,
        matches,
        detailedMatches,
        query,
        matchCount: matches.length,
        message: `Found ${matches.length} matches for "${query}"`,
      };
    } catch (error) {
      return {
        success: false,
        matches: [],
        query,
        matchCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to grep search`,
      };
    }
  }

  async semanticSearch(query: string, _repo: string, _options?: SearchOptions): Promise<SemanticSearchToolResult> {
    // Semantic search not available in Daytona - fall back to grep
    const grepResult = await this.grepSearch(query);
    return {
      success: grepResult.success,
      results: (grepResult.detailedMatches || []).map((m, idx) => ({
        id: idx,
        content: m.content,
        relevance: 1.0,
        filePath: m.file,
        lineStart: m.lineNumber,
        lineEnd: m.lineNumber,
        language: 'unknown',
        kind: 'code',
      })),
      query,
      searchTerms: [query],
      message: grepResult.message,
    };
  }

  async warpGrep(query: string): Promise<WarpGrepResult> {
    // Warp grep not available in Daytona - fall back to regular grep
    const grepResult = await this.grepSearch(query);
    return {
      success: grepResult.success,
      contexts: (grepResult.detailedMatches || []).map(m => ({
        file: m.file,
        content: m.content,
      })),
      query,
      message: grepResult.message,
    };
  }

  // ==================== Command Execution ====================

  async executeCommand(command: string, _options?: CommandOptions): Promise<CommandResult> {
    try {
      const fullCommand = `cd "${DAYTONA_WORKSPACE_PATH}" && ${command}`;
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

  // ==================== Workspace Information ====================

  getWorkspacePath(): string {
    return DAYTONA_WORKSPACE_PATH;
  }

  isRemote(): boolean {
    return true;
  }

  getTaskId(): string {
    return this.taskId;
  }

  getSandboxId(): string {
    return this.sandboxId;
  }

  // ==================== Git Operations ====================

  async getGitStatus(): Promise<GitStatusResponse> {
    try {
      const status = await this.daytonaService.gitStatus(this.sandboxId, DAYTONA_WORKSPACE_PATH);
      const hasChanges = status.staged.length > 0 || status.unstaged.length > 0 || status.untracked.length > 0;
      return {
        success: true,
        hasChanges,
        hasUnstagedChanges: status.unstaged.length > 0,
        hasStagedChanges: status.staged.length > 0,
        status: `Branch: ${status.branch}, Changes: ${hasChanges}`,
        message: 'Git status retrieved',
      };
    } catch (error) {
      return {
        success: false,
        hasChanges: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get git status',
      };
    }
  }

  async getGitDiff(): Promise<GitDiffResponse> {
    try {
      const result = await this.daytonaService.executeCommand(
        this.sandboxId,
        `cd "${DAYTONA_WORKSPACE_PATH}" && git diff`
      );
      
      return {
        success: true,
        diff: result.stdout,
        message: 'Git diff retrieved',
      };
    } catch (error) {
      return {
        success: false,
        diff: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get git diff',
      };
    }
  }

  async commitChanges(request: GitCommitRequest): Promise<GitCommitResponse> {
    try {
      // Stage all changes
      await this.daytonaService.executeCommand(
        this.sandboxId,
        `cd "${DAYTONA_WORKSPACE_PATH}" && git add -A`
      );
      
      // Commit
      const result = await this.daytonaService.executeCommand(
        this.sandboxId,
        `cd "${DAYTONA_WORKSPACE_PATH}" && git commit -m "${request.message.replace(/"/g, '\\"')}"`
      );
      
      // Get commit SHA
      const shaResult = await this.daytonaService.executeCommand(
        this.sandboxId,
        `cd "${DAYTONA_WORKSPACE_PATH}" && git rev-parse HEAD`
      );
      
      return {
        success: result.exitCode === 0,
        commitSha: shaResult.stdout.trim(),
        message: result.exitCode === 0 ? 'Changes committed' : 'Failed to commit',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to commit changes',
      };
    }
  }

  async pushBranch(request: GitPushRequest): Promise<GitPushResponse> {
    try {
      const branchName = request.branchName;
      const result = await this.daytonaService.executeCommand(
        this.sandboxId,
        `cd "${DAYTONA_WORKSPACE_PATH}" && git push origin ${branchName} ${request.setUpstream ? '--set-upstream' : ''}`
      );
      
      return {
        success: result.exitCode === 0,
        message: result.exitCode === 0 ? 'Branch pushed' : 'Failed to push',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to push branch',
      };
    }
  }

  // ==================== Private Helpers ====================

  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return path;
    }
    return `${DAYTONA_WORKSPACE_PATH}/${path}`;
  }
}

export default DaytonaExecutor;
