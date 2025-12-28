/**
 * Daytona Service
 * Main service class for interacting with Daytona SDK
 * Provides sandbox management, file operations, git, process execution, and computer use
 */

import { Daytona } from '@daytonaio/sdk';
import { getDaytonaConfig, isDaytonaEnabled, DAYTONA_WORKSPACE_PATH } from './config';
import type {
  DaytonaSandboxConfig,
  DaytonaSandboxInfo,
  DaytonaSandboxState,
  DaytonaExecuteResult,
  DaytonaFileInfo,
  DaytonaGitStatus,
  DaytonaGitCommitResponse,
  DaytonaScreenshotOptions,
  DaytonaScreenshotResult,
  DaytonaDisplayInfo,
  DaytonaMousePosition,
  DaytonaMouseClickOptions,
  DaytonaKeyboardOptions,
  DaytonaPtyOptions,
  DaytonaPreviewOptions,
  DaytonaLogCallback,
  DaytonaSnapshot,
  DaytonaCreateSnapshotParams,
  DaytonaVolume,
} from './types';

export class DaytonaService {
  private daytona: Daytona | null = null;
  private sandboxCache: Map<string, unknown> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (!isDaytonaEnabled()) {
      console.warn('[DAYTONA_SERVICE] Daytona API key not configured - service disabled');
      return;
    }

    try {
      const config = getDaytonaConfig();
      this.daytona = new Daytona({
        apiKey: config.apiKey,
        ...(config.serverUrl && { serverUrl: config.serverUrl }),
        ...(config.timeout && { timeout: config.timeout }),
      });
      console.log('[DAYTONA_SERVICE] Initialized successfully');
    } catch (error) {
      console.error('[DAYTONA_SERVICE] Failed to initialize:', error);
      this.daytona = null;
    }
  }

  isEnabled(): boolean {
    return this.daytona !== null;
  }

  private ensureEnabled(): void {
    if (!this.daytona) {
      throw new Error('Daytona service is not enabled. Please configure DAYTONA_API_KEY.');
    }
  }

  // ==================== Sandbox Management ====================

  async createSandbox(config: DaytonaSandboxConfig): Promise<DaytonaSandboxInfo> {
    this.ensureEnabled();
    
    try {
      console.log('[DAYTONA_SERVICE] Creating sandbox with config:', JSON.stringify(config, null, 2));
      
      const createParams: Record<string, unknown> = {};
      
      if (config.snapshot) {
        createParams.snapshot = config.snapshot;
      } else if (config.image) {
        createParams.image = config.image;
      } else {
        createParams.language = config.language || 'typescript';
      }

      if (config.resources) {
        createParams.resources = config.resources;
      }

      if (config.ephemeral !== undefined) {
        createParams.ephemeral = config.ephemeral;
      }

      if (config.envVars) {
        createParams.envVars = config.envVars;
      }

      if (config.volumes) {
        createParams.volumes = config.volumes;
      }

      if (config.autoStopInterval) {
        createParams.autoStopInterval = config.autoStopInterval;
      }

      if (config.autoArchiveInterval) {
        createParams.autoArchiveInterval = config.autoArchiveInterval;
      }

      const sandbox = await this.daytona!.create(createParams as Parameters<typeof this.daytona.create>[0]);
      
      // Cache the sandbox instance
      const sandboxId = (sandbox as unknown as { id: string }).id;
      this.sandboxCache.set(sandboxId, sandbox);

      console.log(`[DAYTONA_SERVICE] Sandbox created: ${sandboxId}`);

      return this.mapSandboxToInfo(sandbox);
    } catch (error) {
      console.error('[DAYTONA_SERVICE] Failed to create sandbox:', error);
      throw error;
    }
  }

  async getSandbox(sandboxId: string): Promise<DaytonaSandboxInfo | null> {
    this.ensureEnabled();

    try {
      // Check cache first
      if (this.sandboxCache.has(sandboxId)) {
        const cached = this.sandboxCache.get(sandboxId);
        return this.mapSandboxToInfo(cached);
      }

      const sandbox = await this.daytona!.get(sandboxId);
      if (sandbox) {
        this.sandboxCache.set(sandboxId, sandbox);
        return this.mapSandboxToInfo(sandbox);
      }
      return null;
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to get sandbox ${sandboxId}:`, error);
      return null;
    }
  }

  async listSandboxes(filter?: { state?: DaytonaSandboxState }): Promise<DaytonaSandboxInfo[]> {
    this.ensureEnabled();

    try {
      const result = await this.daytona!.list(filter as Parameters<typeof this.daytona.list>[0]);
      const sandboxes = Array.isArray(result) ? result : (result as { sandboxes?: unknown[] }).sandboxes || [];
      return sandboxes.map((s: unknown) => this.mapSandboxToInfo(s));
    } catch (error) {
      console.error('[DAYTONA_SERVICE] Failed to list sandboxes:', error);
      return [];
    }
  }

  async startSandbox(sandboxId: string): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      await (sandbox as { start?: () => Promise<void> }).start?.();
      console.log(`[DAYTONA_SERVICE] Sandbox ${sandboxId} started`);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to start sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async stopSandbox(sandboxId: string): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      await (sandbox as { stop?: () => Promise<void> }).stop?.();
      console.log(`[DAYTONA_SERVICE] Sandbox ${sandboxId} stopped`);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to stop sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async deleteSandbox(sandboxId: string): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      await (sandbox as { delete?: () => Promise<void> }).delete?.();
      this.sandboxCache.delete(sandboxId);
      console.log(`[DAYTONA_SERVICE] Sandbox ${sandboxId} deleted`);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to delete sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async archiveSandbox(sandboxId: string): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      await (sandbox as { archive?: () => Promise<void> }).archive?.();
      console.log(`[DAYTONA_SERVICE] Sandbox ${sandboxId} archived`);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to archive sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  // ==================== Process Execution ====================

  async executeCommand(
    sandboxId: string,
    command: string,
    cwd?: string
  ): Promise<DaytonaExecuteResult> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const process = (sandbox as { process?: unknown }).process;
      
      if (!process) {
        throw new Error('Process API not available on sandbox');
      }

      const result = await (process as { executeCommand: (cmd: string, opts?: { cwd?: string }) => Promise<unknown> })
        .executeCommand(command, cwd ? { cwd } : undefined);

      return this.mapExecuteResult(result);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to execute command in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async runCode(
    sandboxId: string,
    language: string,
    code: string
  ): Promise<DaytonaExecuteResult> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const process = (sandbox as { process?: unknown }).process;
      
      if (!process) {
        throw new Error('Process API not available on sandbox');
      }

      const result = await (process as { runCode: (lang: string, code: string) => Promise<unknown> })
        .runCode(language, code);

      return this.mapExecuteResult(result);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to run code in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  // ==================== File System Operations ====================

  async listFiles(sandboxId: string, path: string): Promise<DaytonaFileInfo[]> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const fs = (sandbox as { fs?: unknown }).fs;
      
      if (!fs) {
        throw new Error('FileSystem API not available on sandbox');
      }

      const files = await (fs as { listFiles: (path: string) => Promise<unknown[]> }).listFiles(path);
      return files.map((f: unknown) => this.mapFileInfo(f));
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to list files in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async readFile(sandboxId: string, path: string): Promise<string> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const fs = (sandbox as { fs?: unknown }).fs;
      
      if (!fs) {
        throw new Error('FileSystem API not available on sandbox');
      }

      const content = await (fs as { readFile: (path: string) => Promise<string> }).readFile(path);
      return content;
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to read file in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const fs = (sandbox as { fs?: unknown }).fs;
      
      if (!fs) {
        throw new Error('FileSystem API not available on sandbox');
      }

      await (fs as { writeFile: (path: string, content: string) => Promise<void> }).writeFile(path, content);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to write file in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async deleteFile(sandboxId: string, path: string): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const fs = (sandbox as { fs?: unknown }).fs;
      
      if (!fs) {
        throw new Error('FileSystem API not available on sandbox');
      }

      await (fs as { deleteFile: (path: string) => Promise<void> }).deleteFile(path);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to delete file in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async createDirectory(sandboxId: string, path: string): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const fs = (sandbox as { fs?: unknown }).fs;
      
      if (!fs) {
        throw new Error('FileSystem API not available on sandbox');
      }

      await (fs as { createDirectory: (path: string) => Promise<void> }).createDirectory(path);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to create directory in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async uploadFile(sandboxId: string, path: string, data: Buffer): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const fs = (sandbox as { fs?: unknown }).fs;
      
      if (!fs) {
        throw new Error('FileSystem API not available on sandbox');
      }

      await (fs as { uploadFile: (path: string, data: Buffer) => Promise<void> }).uploadFile(path, data);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to upload file in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async downloadFile(sandboxId: string, path: string): Promise<Buffer> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const fs = (sandbox as { fs?: unknown }).fs;
      
      if (!fs) {
        throw new Error('FileSystem API not available on sandbox');
      }

      const data = await (fs as { downloadFile: (path: string) => Promise<Buffer> }).downloadFile(path);
      return data;
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to download file in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async searchAndReplace(
    sandboxId: string,
    path: string,
    search: string,
    replace: string
  ): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const fs = (sandbox as { fs?: unknown }).fs;
      
      if (!fs) {
        throw new Error('FileSystem API not available on sandbox');
      }

      await (fs as { searchAndReplace: (path: string, search: string, replace: string) => Promise<void> })
        .searchAndReplace(path, search, replace);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to search and replace in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  // ==================== Git Operations ====================

  async gitClone(
    sandboxId: string,
    repoUrl: string,
    targetPath: string,
    options?: { username?: string; token?: string; branch?: string }
  ): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const git = (sandbox as { git?: unknown }).git;
      
      if (!git) {
        throw new Error('Git API not available on sandbox');
      }

      await (git as { clone: (url: string, path: string, opts?: unknown) => Promise<void> })
        .clone(repoUrl, targetPath, options);
      console.log(`[DAYTONA_SERVICE] Cloned ${repoUrl} to ${targetPath} in sandbox ${sandboxId}`);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to clone repo in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async gitStatus(sandboxId: string, repoPath: string): Promise<DaytonaGitStatus> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const git = (sandbox as { git?: unknown }).git;
      
      if (!git) {
        throw new Error('Git API not available on sandbox');
      }

      const status = await (git as { status: (path: string) => Promise<unknown> }).status(repoPath);
      return this.mapGitStatus(status);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to get git status in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async gitCreateBranch(sandboxId: string, repoPath: string, branchName: string): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const git = (sandbox as { git?: unknown }).git;
      
      if (!git) {
        throw new Error('Git API not available on sandbox');
      }

      await (git as { createBranch: (path: string, branch: string) => Promise<void> })
        .createBranch(repoPath, branchName);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to create branch in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async gitCheckout(sandboxId: string, repoPath: string, branchName: string): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const git = (sandbox as { git?: unknown }).git;
      
      if (!git) {
        throw new Error('Git API not available on sandbox');
      }

      await (git as { checkout: (path: string, branch: string) => Promise<void> })
        .checkout(repoPath, branchName);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to checkout branch in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async gitAdd(sandboxId: string, repoPath: string, files: string[]): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const git = (sandbox as { git?: unknown }).git;
      
      if (!git) {
        throw new Error('Git API not available on sandbox');
      }

      await (git as { add: (path: string, files: string[]) => Promise<void> })
        .add(repoPath, files);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to add files in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async gitCommit(
    sandboxId: string,
    repoPath: string,
    message: string
  ): Promise<DaytonaGitCommitResponse> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const git = (sandbox as { git?: unknown }).git;
      
      if (!git) {
        throw new Error('Git API not available on sandbox');
      }

      const result = await (git as { commit: (path: string, message: string) => Promise<unknown> })
        .commit(repoPath, message);
      return this.mapGitCommitResponse(result);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to commit in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async gitPush(
    sandboxId: string,
    repoPath: string,
    remote: string,
    branch: string
  ): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const git = (sandbox as { git?: unknown }).git;
      
      if (!git) {
        throw new Error('Git API not available on sandbox');
      }

      await (git as { push: (path: string, remote: string, branch: string) => Promise<void> })
        .push(repoPath, remote, branch);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to push in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  async gitPull(
    sandboxId: string,
    repoPath: string,
    remote: string,
    branch: string
  ): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const git = (sandbox as { git?: unknown }).git;
      
      if (!git) {
        throw new Error('Git API not available on sandbox');
      }

      await (git as { pull: (path: string, remote: string, branch: string) => Promise<void> })
        .pull(repoPath, remote, branch);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to pull in sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  // ==================== Computer Use ====================

  async getComputerUse(sandboxId: string): Promise<unknown> {
    this.ensureEnabled();

    const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
    const computerUse = (sandbox as { computerUse?: unknown }).computerUse;
    
    if (!computerUse) {
      throw new Error('Computer Use API not available on this sandbox');
    }

    return computerUse;
  }

  async mouseMove(sandboxId: string, x: number, y: number): Promise<void> {
    const computerUse = await this.getComputerUse(sandboxId);
    const mouse = (computerUse as { mouse?: unknown }).mouse;
    
    if (!mouse) {
      throw new Error('Mouse API not available');
    }

    await (mouse as { move: (x: number, y: number) => Promise<void> }).move(x, y);
  }

  async mouseClick(
    sandboxId: string,
    x: number,
    y: number,
    options?: DaytonaMouseClickOptions
  ): Promise<void> {
    const computerUse = await this.getComputerUse(sandboxId);
    const mouse = (computerUse as { mouse?: unknown }).mouse;
    
    if (!mouse) {
      throw new Error('Mouse API not available');
    }

    await (mouse as { click: (x: number, y: number, opts?: unknown) => Promise<void> })
      .click(x, y, options);
  }

  async mouseDoubleClick(sandboxId: string, x: number, y: number): Promise<void> {
    const computerUse = await this.getComputerUse(sandboxId);
    const mouse = (computerUse as { mouse?: unknown }).mouse;
    
    if (!mouse) {
      throw new Error('Mouse API not available');
    }

    await (mouse as { doubleClick: (x: number, y: number) => Promise<void> }).doubleClick(x, y);
  }

  async mouseDrag(
    sandboxId: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): Promise<void> {
    const computerUse = await this.getComputerUse(sandboxId);
    const mouse = (computerUse as { mouse?: unknown }).mouse;
    
    if (!mouse) {
      throw new Error('Mouse API not available');
    }

    await (mouse as { drag: (x1: number, y1: number, x2: number, y2: number) => Promise<void> })
      .drag(startX, startY, endX, endY);
  }

  async mouseScroll(sandboxId: string, deltaX: number, deltaY: number): Promise<void> {
    const computerUse = await this.getComputerUse(sandboxId);
    const mouse = (computerUse as { mouse?: unknown }).mouse;
    
    if (!mouse) {
      throw new Error('Mouse API not available');
    }

    await (mouse as { scroll: (dx: number, dy: number) => Promise<void> }).scroll(deltaX, deltaY);
  }

  async keyboardType(sandboxId: string, text: string): Promise<void> {
    const computerUse = await this.getComputerUse(sandboxId);
    const keyboard = (computerUse as { keyboard?: unknown }).keyboard;
    
    if (!keyboard) {
      throw new Error('Keyboard API not available');
    }

    await (keyboard as { type: (text: string) => Promise<void> }).type(text);
  }

  async keyboardPress(
    sandboxId: string,
    key: string,
    options?: DaytonaKeyboardOptions
  ): Promise<void> {
    const computerUse = await this.getComputerUse(sandboxId);
    const keyboard = (computerUse as { keyboard?: unknown }).keyboard;
    
    if (!keyboard) {
      throw new Error('Keyboard API not available');
    }

    await (keyboard as { press: (key: string, opts?: unknown) => Promise<void> }).press(key, options);
  }

  async keyboardHotkey(sandboxId: string, ...keys: string[]): Promise<void> {
    const computerUse = await this.getComputerUse(sandboxId);
    const keyboard = (computerUse as { keyboard?: unknown }).keyboard;
    
    if (!keyboard) {
      throw new Error('Keyboard API not available');
    }

    await (keyboard as { hotkey: (...keys: string[]) => Promise<void> }).hotkey(...keys);
  }

  async screenshot(
    sandboxId: string,
    options?: DaytonaScreenshotOptions
  ): Promise<DaytonaScreenshotResult> {
    const computerUse = await this.getComputerUse(sandboxId);
    const screenshot = (computerUse as { screenshot?: unknown }).screenshot;
    
    if (!screenshot) {
      throw new Error('Screenshot API not available');
    }

    const result = await (screenshot as { capture: (opts?: unknown) => Promise<unknown> }).capture(options);
    return this.mapScreenshotResult(result);
  }

  async getDisplayInfo(sandboxId: string): Promise<DaytonaDisplayInfo> {
    const computerUse = await this.getComputerUse(sandboxId);
    const display = (computerUse as { display?: unknown }).display;
    
    if (!display) {
      throw new Error('Display API not available');
    }

    const info = await (display as { getInfo: () => Promise<unknown> }).getInfo();
    return info as DaytonaDisplayInfo;
  }

  // ==================== Preview ====================

  async getPreviewUrl(
    sandboxId: string,
    port: number,
    options?: DaytonaPreviewOptions
  ): Promise<string> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const url = await (sandbox as { getPreviewUrl: (port: number, opts?: unknown) => Promise<string> })
        .getPreviewUrl(port, options);
      return url;
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to get preview URL for sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  // ==================== Log Streaming ====================

  async streamLogs(sandboxId: string, callback: DaytonaLogCallback): Promise<void> {
    this.ensureEnabled();

    try {
      const sandbox = await this.getCachedOrFetchSandbox(sandboxId);
      const process = (sandbox as { process?: unknown }).process;
      
      if (!process) {
        throw new Error('Process API not available on sandbox');
      }

      await (process as { streamLogs: (cb: unknown) => Promise<void> }).streamLogs(callback);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to stream logs for sandbox ${sandboxId}:`, error);
      throw error;
    }
  }

  // ==================== Snapshots ====================

  async createSnapshot(params: DaytonaCreateSnapshotParams): Promise<DaytonaSnapshot> {
    this.ensureEnabled();

    try {
      const snapshot = await this.daytona!.snapshots.create(params as Parameters<typeof this.daytona.snapshots.create>[0]);
      return this.mapSnapshot(snapshot);
    } catch (error) {
      console.error('[DAYTONA_SERVICE] Failed to create snapshot:', error);
      throw error;
    }
  }

  async listSnapshots(): Promise<DaytonaSnapshot[]> {
    this.ensureEnabled();

    try {
      const result = await this.daytona!.snapshots.list();
      const snapshots = Array.isArray(result) ? result : (result as { snapshots?: unknown[] }).snapshots || [];
      return snapshots.map((s: unknown) => this.mapSnapshot(s));
    } catch (error) {
      console.error('[DAYTONA_SERVICE] Failed to list snapshots:', error);
      return [];
    }
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    this.ensureEnabled();

    try {
      await this.daytona!.snapshots.delete(snapshotId);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to delete snapshot ${snapshotId}:`, error);
      throw error;
    }
  }

  // ==================== Volumes ====================

  async createVolume(name: string, size: number): Promise<DaytonaVolume> {
    this.ensureEnabled();

    try {
      const volume = await this.daytona!.volumes.create({ name, size });
      return this.mapVolume(volume);
    } catch (error) {
      console.error('[DAYTONA_SERVICE] Failed to create volume:', error);
      throw error;
    }
  }

  async listVolumes(): Promise<DaytonaVolume[]> {
    this.ensureEnabled();

    try {
      const volumes = await this.daytona!.volumes.list();
      return volumes.map((v: unknown) => this.mapVolume(v));
    } catch (error) {
      console.error('[DAYTONA_SERVICE] Failed to list volumes:', error);
      return [];
    }
  }

  async deleteVolume(volumeId: string): Promise<void> {
    this.ensureEnabled();

    try {
      await this.daytona!.volumes.delete(volumeId);
    } catch (error) {
      console.error(`[DAYTONA_SERVICE] Failed to delete volume ${volumeId}:`, error);
      throw error;
    }
  }

  // ==================== Helper Methods ====================

  private async getCachedOrFetchSandbox(sandboxId: string): Promise<unknown> {
    if (this.sandboxCache.has(sandboxId)) {
      return this.sandboxCache.get(sandboxId)!;
    }

    const sandbox = await this.daytona!.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }

    this.sandboxCache.set(sandboxId, sandbox);
    return sandbox;
  }

  private mapSandboxToInfo(sandbox: unknown): DaytonaSandboxInfo {
    const s = sandbox as Record<string, unknown>;
    return {
      id: (s.id as string) || '',
      state: this.mapSandboxState(s.state),
      createdAt: (s.createdAt as string) || new Date().toISOString(),
      updatedAt: (s.updatedAt as string) || new Date().toISOString(),
      organizationId: s.organizationId as string | undefined,
      snapshotId: s.snapshotId as string | undefined,
      resources: s.resources as DaytonaSandboxInfo['resources'],
    };
  }

  private mapSandboxState(state: unknown): DaytonaSandboxState {
    const stateStr = String(state).toLowerCase();
    const validStates: DaytonaSandboxState[] = ['creating', 'running', 'stopped', 'archived', 'error'];
    return validStates.includes(stateStr as DaytonaSandboxState) 
      ? (stateStr as DaytonaSandboxState) 
      : 'unknown';
  }

  private mapExecuteResult(result: unknown): DaytonaExecuteResult {
    const r = result as Record<string, unknown>;
    return {
      stdout: (r.stdout as string) || '',
      stderr: (r.stderr as string) || '',
      exitCode: (r.exitCode as number) ?? 0,
      artifacts: r.artifacts as DaytonaExecuteResult['artifacts'],
    };
  }

  private mapFileInfo(file: unknown): DaytonaFileInfo {
    const f = file as Record<string, unknown>;
    return {
      name: (f.name as string) || '',
      path: (f.path as string) || '',
      isDirectory: (f.isDirectory as boolean) || false,
      size: f.size as number | undefined,
      modifiedAt: f.modifiedAt as string | undefined,
      permissions: f.permissions as string | undefined,
    };
  }

  private mapGitStatus(status: unknown): DaytonaGitStatus {
    const s = status as Record<string, unknown>;
    return {
      branch: (s.branch as string) || 'main',
      ahead: (s.ahead as number) || 0,
      behind: (s.behind as number) || 0,
      staged: (s.staged as string[]) || [],
      unstaged: (s.unstaged as string[]) || [],
      untracked: (s.untracked as string[]) || [],
    };
  }

  private mapGitCommitResponse(result: unknown): DaytonaGitCommitResponse {
    const r = result as Record<string, unknown>;
    return {
      sha: (r.sha as string) || '',
      message: (r.message as string) || '',
      author: (r.author as string) || '',
      timestamp: (r.timestamp as string) || new Date().toISOString(),
    };
  }

  private mapScreenshotResult(result: unknown): DaytonaScreenshotResult {
    const r = result as Record<string, unknown>;
    return {
      base64: (r.base64 as string) || (r.toBase64 ? (r as { toBase64: () => string }).toBase64() : ''),
      width: (r.width as number) || 0,
      height: (r.height as number) || 0,
      format: (r.format as string) || 'png',
    };
  }

  private mapSnapshot(snapshot: unknown): DaytonaSnapshot {
    const s = snapshot as Record<string, unknown>;
    return {
      id: (s.id as string) || '',
      name: (s.name as string) || '',
      createdAt: (s.createdAt as string) || new Date().toISOString(),
      size: s.size as number | undefined,
      state: (s.state as DaytonaSnapshot['state']) || 'ready',
    };
  }

  private mapVolume(volume: unknown): DaytonaVolume {
    const v = volume as Record<string, unknown>;
    return {
      id: (v.id as string) || '',
      name: (v.name as string) || '',
      size: (v.size as number) || 0,
      createdAt: (v.createdAt as string) || new Date().toISOString(),
      state: (v.state as DaytonaVolume['state']) || 'ready',
    };
  }
}

// Singleton instance
let daytonaServiceInstance: DaytonaService | null = null;

export function getDaytonaService(): DaytonaService {
  if (!daytonaServiceInstance) {
    daytonaServiceInstance = new DaytonaService();
  }
  return daytonaServiceInstance;
}

export default DaytonaService;
