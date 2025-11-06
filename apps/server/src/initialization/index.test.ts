import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TaskInitializationEngine } from './index';
import { BackgroundServiceManager } from './background-service-manager';
import { prisma } from '@repo/db';
import * as taskStatusUtils from '../utils/task-status';
import * as executionModule from '../execution';
import { TaskModelContext } from '../services/task-model-context';

// Mock dependencies
vi.mock('@repo/db', () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    taskSession: {
      create: vi.fn(),
    },
    userSettings: {
      findUnique: vi.fn(),
    },
  },
  InitStatus: {},
}));

vi.mock('../utils/task-status', () => ({
  clearTaskProgress: vi.fn(),
  setInitStatus: vi.fn(),
  setTaskFailed: vi.fn(),
  setTaskInitialized: vi.fn(),
}));

vi.mock('../socket', () => ({
  emitStreamChunk: vi.fn(),
}));

vi.mock('./background-service-manager', () => ({
  BackgroundServiceManager: vi.fn().mockImplementation(() => ({
    startServices: vi.fn().mockResolvedValue(undefined),
    areAllServicesComplete: vi.fn().mockReturnValue(true),
  })),
}));

vi.mock('../execution', () => ({
  createWorkspaceManager: vi.fn(),
  getAgentMode: vi.fn().mockReturnValue('local'),
}));

describe('TaskInitializationEngine-unit-test', () => {
  let engine: TaskInitializationEngine;
  let mockWorkspaceManager: any;
  let mockBackgroundServiceManager: any;
  let mockModelContext: TaskModelContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock workspace manager
    mockWorkspaceManager = {
      prepareWorkspace: vi.fn().mockResolvedValue({
        success: true,
        workspacePath: '/test/workspace',
      }),
      getExecutor: vi.fn().mockResolvedValue({
        listDirectory: vi.fn().mockResolvedValue({
          success: true,
          contents: [{ name: 'test.txt', type: 'file' }],
        }),
        executeCommand: vi.fn().mockResolvedValue({
          success: true,
          stdout: 'installed',
        }),
      }),
    };

    // Mock createWorkspaceManager to return our mock
    vi.mocked(executionModule.createWorkspaceManager).mockReturnValue(mockWorkspaceManager);

    // Create engine instance
    engine = new TaskInitializationEngine();

    // Get mocked background service manager
    mockBackgroundServiceManager = (engine as any).backgroundServiceManager;

    // Create mock model context
    mockModelContext = {
      getProvider: vi.fn().mockReturnValue('anthropic'),
      getModel: vi.fn().mockReturnValue('claude-sonnet-4'),
      validateAccess: vi.fn().mockReturnValue(true),
    } as any;
  });

  it('initializes with workspace manager and background service manager', () => {
    expect(engine).toBeDefined();
    expect((engine as any).abstractWorkspaceManager).toBeDefined();
    expect((engine as any).backgroundServiceManager).toBeDefined();
    expect(BackgroundServiceManager).toHaveBeenCalledOnce();
  });

  it('executes initialization steps in sequence and sets task to ACTIVE', async () => {
    // Mock task data
    vi.mocked(prisma.task.findUnique).mockResolvedValue({
      id: 'task-123',
      repoFullName: 'test/repo',
      repoUrl: 'https://github.com/test/repo',
      baseBranch: 'main',
      shadowBranch: 'shadow/task-123',
      workspacePath: null,
      userId: 'user-123',
    } as any);

    vi.mocked(prisma.task.update).mockResolvedValue({} as any);

    const steps = ['PREPARE_WORKSPACE'] as any[];

    await engine.initializeTask('task-123', steps, 'user-123', mockModelContext);

    // Verify initialization flow
    expect(taskStatusUtils.clearTaskProgress).toHaveBeenCalledWith('task-123');
    expect(taskStatusUtils.setInitStatus).toHaveBeenCalledWith('task-123', 'PREPARE_WORKSPACE');
    expect(mockWorkspaceManager.prepareWorkspace).toHaveBeenCalledWith({
      id: 'task-123',
      repoFullName: 'test/repo',
      repoUrl: 'https://github.com/test/repo',
      baseBranch: 'main',
      shadowBranch: 'shadow/task-123',
      userId: 'user-123',
    });
    expect(taskStatusUtils.setInitStatus).toHaveBeenCalledWith('task-123', 'ACTIVE');
    expect(taskStatusUtils.setTaskInitialized).toHaveBeenCalledWith('task-123');
  });

  it('handles initialization errors and marks task as failed', async () => {
    // Mock task data
    vi.mocked(prisma.task.findUnique).mockResolvedValue({
      id: 'task-456',
      repoFullName: 'test/repo',
      repoUrl: 'https://github.com/test/repo',
      baseBranch: 'main',
      shadowBranch: 'shadow/task-456',
      workspacePath: null,
      userId: 'user-456',
    } as any);

    // Mock prepareWorkspace to fail
    mockWorkspaceManager.prepareWorkspace.mockResolvedValue({
      success: false,
      error: 'Failed to clone repository',
    });

    const steps = ['PREPARE_WORKSPACE'] as any[];

    await expect(
      engine.initializeTask('task-456', steps, 'user-456', mockModelContext)
    ).rejects.toThrow();

    // Verify error handling
    expect(taskStatusUtils.setTaskFailed).toHaveBeenCalledWith(
      'task-456',
      'PREPARE_WORKSPACE',
      'Failed to prepare local workspace'
    );
  });
});

describe('TaskInitializationEngine-integration-test', () => {
  it.skipIf(!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('test'))(
    'executes full initialization flow with real database',
    async () => {
      // This is a placeholder for integration tests that would require:
      // 1. Real database connection
      // 2. Real workspace manager
      // 3. Real git operations
      //
      // For now, we verify the structure works correctly
      const engine = new TaskInitializationEngine();
      expect(engine).toBeDefined();
      expect((engine as any).abstractWorkspaceManager).toBeDefined();
      expect((engine as any).backgroundServiceManager).toBeDefined();
    }
  );
});
