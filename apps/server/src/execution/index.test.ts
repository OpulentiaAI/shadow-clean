import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createToolExecutor,
  createWorkspaceManager,
  getAgentMode,
  createGitService,
  isRemoteMode,
  isLocalMode,
} from './index';
import config from '../config';
import { prisma } from '@repo/db';
import { LocalToolExecutor } from './local/local-tool-executor';
import { RemoteToolExecutor } from './remote/remote-tool-executor';
import { LocalWorkspaceManager } from './local/local-workspace-manager';
import { RemoteWorkspaceManager } from './remote/remote-workspace-manager';

// Mock dependencies
vi.mock('../config', () => ({
  default: {
    agentMode: 'local',
  },
}));

vi.mock('@repo/db', () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('./local/local-tool-executor', () => ({
  LocalToolExecutor: class {
    isRemote = () => false;
  },
}));

vi.mock('./remote/remote-tool-executor', () => ({
  RemoteToolExecutor: class {
    isRemote = () => true;
  },
}));

vi.mock('./local/local-workspace-manager', () => ({
  LocalWorkspaceManager: class {
    prepareWorkspace = vi.fn();
  },
}));

vi.mock('./remote/remote-workspace-manager', () => ({
  RemoteWorkspaceManager: class {
    prepareWorkspace = vi.fn();
  },
}));

vi.mock('./remote/remote-vm-runner', () => ({
  RemoteVMRunner: class {
    getVMPodStatus = vi.fn().mockResolvedValue({
      status: {
        podIP: '10.0.0.1',
      },
    });
  },
}));

vi.mock('../services/git-manager', () => ({
  GitManager: class {
    // Mock git manager methods
  },
}));

describe('execution-layer-unit-test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset config to local mode
    (config as any).agentMode = 'local';
  });

  it('returns correct agent mode from config', () => {
    (config as any).agentMode = 'local';
    expect(getAgentMode()).toBe('local');

    (config as any).agentMode = 'remote';
    expect(getAgentMode()).toBe('remote');
  });

  it('creates local tool executor when in local mode', async () => {
    (config as any).agentMode = 'local';

    const executor = await createToolExecutor('task-123', '/test/workspace');

    expect(executor).toBeDefined();
    expect(executor.isRemote()).toBe(false);
  });

  it('creates local workspace manager when in local mode', () => {
    (config as any).agentMode = 'local';

    const manager = createWorkspaceManager();

    expect(manager).toBeDefined();
  });

  it('creates remote workspace manager when in remote mode', () => {
    (config as any).agentMode = 'remote';

    const manager = createWorkspaceManager();

    expect(manager).toBeDefined();
  });

  it('correctly identifies local mode', () => {
    (config as any).agentMode = 'local';
    expect(isLocalMode()).toBe(true);
    expect(isRemoteMode()).toBe(false);
  });

  it('correctly identifies remote mode', () => {
    (config as any).agentMode = 'remote';
    expect(isRemoteMode()).toBe(true);
    expect(isLocalMode()).toBe(false);
  });

  it('creates git service for local mode', async () => {
    (config as any).agentMode = 'local';

    vi.mocked(prisma.task.findUnique).mockResolvedValue({
      id: 'task-123',
      workspacePath: '/test/workspace',
    } as any);

    const gitService = await createGitService('task-123');

    expect(gitService).toBeDefined();
    expect(prisma.task.findUnique).toHaveBeenCalledWith({
      where: { id: 'task-123' },
      select: { workspacePath: true },
    });
  });
});

describe('execution-layer-integration-test', () => {
  it.skipIf(!process.env.RUN_INTEGRATION_TESTS)(
    'creates and uses tool executor with real configuration',
    async () => {
      // This test would require:
      // 1. Real workspace setup
      // 2. Real file system operations
      // 3. Real git operations
      //
      // For now, verify the factory functions work correctly
      const mode = getAgentMode();
      expect(['local', 'remote']).toContain(mode);

      const manager = createWorkspaceManager();
      expect(manager).toBeDefined();
      expect(manager).toHaveProperty('prepareWorkspace');
    }
  );
});
