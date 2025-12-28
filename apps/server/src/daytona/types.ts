/**
 * Daytona Integration Types
 * Types for sandbox management, computer use, and workspace operations
 */

export interface DaytonaSandboxConfig {
  language?: 'typescript' | 'javascript' | 'python' | 'go' | 'rust' | 'java';
  image?: string;
  snapshot?: string;
  resources?: DaytonaResources;
  ephemeral?: boolean;
  autoStopInterval?: number;
  autoArchiveInterval?: number;
  autoDeleteInterval?: number;
  envVars?: Record<string, string>;
  volumes?: DaytonaVolumeMount[];
  networkAllowList?: string[];
}

export interface DaytonaResources {
  cpu?: number;
  memory?: number; // in MB
  disk?: number;   // in MB
  gpu?: string;
}

export interface DaytonaVolumeMount {
  volumeId: string;
  mountPath: string;
}

export interface DaytonaSandboxInfo {
  id: string;
  state: DaytonaSandboxState;
  createdAt: string;
  updatedAt: string;
  organizationId?: string;
  snapshotId?: string;
  resources?: DaytonaResources;
  previewUrl?: string;
}

export type DaytonaSandboxState = 
  | 'creating'
  | 'running'
  | 'stopped'
  | 'archived'
  | 'error'
  | 'unknown';

export interface DaytonaExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  artifacts?: DaytonaExecutionArtifacts;
}

export interface DaytonaExecutionArtifacts {
  files?: string[];
  charts?: DaytonaChart[];
}

export interface DaytonaChart {
  type: 'line' | 'bar' | 'scatter' | 'pie' | 'box';
  title?: string;
  data: unknown;
}

export interface DaytonaFileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: string;
  permissions?: string;
}

export interface DaytonaGitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface DaytonaGitCommitResponse {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
}

// Computer Use Types
export interface DaytonaMousePosition {
  x: number;
  y: number;
}

export interface DaytonaMouseClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
}

export interface DaytonaScreenshotOptions {
  region?: DaytonaScreenshotRegion;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export interface DaytonaScreenshotRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DaytonaScreenshotResult {
  base64: string;
  width: number;
  height: number;
  format: string;
}

export interface DaytonaDisplayInfo {
  width: number;
  height: number;
  scaleFactor?: number;
}

export interface DaytonaKeyboardOptions {
  modifiers?: ('Control' | 'Shift' | 'Alt' | 'Meta')[];
}

// PTY Types
export interface DaytonaPtyOptions {
  cols?: number;
  rows?: number;
  shell?: string;
  env?: Record<string, string>;
}

export interface DaytonaPtySession {
  id: string;
  write: (data: string) => Promise<void>;
  resize: (cols: number, rows: number) => Promise<void>;
  close: () => Promise<void>;
  onData: (callback: (data: string) => void) => void;
}

// Session Types
export interface DaytonaSession {
  id: string;
  sandboxId: string;
  createdAt: string;
}

export interface DaytonaSessionExecuteResponse {
  cmdId: string;
  output: string;
  exitCode?: number;
}

// Preview Types
export interface DaytonaPreviewOptions {
  authenticated?: boolean;
  path?: string;
}

// LSP Types
export interface DaytonaLspLanguageId {
  language: string;
  rootPath: string;
}

export interface DaytonaLspPosition {
  line: number;
  character: number;
}

export interface DaytonaLspCompletion {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insertText?: string;
}

// Snapshot Types
export interface DaytonaSnapshot {
  id: string;
  name: string;
  createdAt: string;
  size?: number;
  state: 'building' | 'ready' | 'error';
}

export interface DaytonaCreateSnapshotParams {
  name: string;
  sandboxId?: string;
  image?: string;
  resources?: DaytonaResources;
}

// Volume Types
export interface DaytonaVolume {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  state: 'creating' | 'ready' | 'error';
}

// Log Streaming Types
export interface DaytonaLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

export type DaytonaLogCallback = (log: DaytonaLogEntry) => void;

// Workspace Manager Integration Types
export interface DaytonaWorkspaceInfo {
  success: boolean;
  sandboxId: string;
  workspacePath: string;
  previewUrl?: string;
  error?: string;
  gitSetupFailed?: boolean;
  gitError?: string;
}

export interface DaytonaWorkspaceStatus {
  exists: boolean;
  path: string;
  isReady: boolean;
  state: DaytonaSandboxState;
  sizeBytes?: number;
  error?: string;
}

export interface DaytonaHealthStatus {
  healthy: boolean;
  message: string;
  sandboxState?: DaytonaSandboxState;
  details?: Record<string, unknown>;
}

// Task Config Extension for Daytona
export interface DaytonaTaskConfig {
  id: string;
  repoFullName: string;
  repoUrl: string;
  baseBranch: string;
  shadowBranch: string;
  userId: string;
  isScratchpad?: boolean;
  // Daytona-specific options
  daytona?: {
    resources?: DaytonaResources;
    snapshot?: string;
    volumes?: DaytonaVolumeMount[];
    enableComputerUse?: boolean;
    enableBrowserPreview?: boolean;
  };
}
