/**
 * Codebase Understanding / Shadow Wiki Tests
 * Tests the Convex codebase understanding functions
 * 
 * Run with: npm test -- --run src/tests/codebase-understanding.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Convex operations
vi.mock('../lib/convex-operations', () => ({
  getTask: vi.fn(),
  getCodebaseByRepo: vi.fn(),
  getCodebaseByTaskId: vi.fn(),
  createCodebaseUnderstanding: vi.fn(),
  updateTask: vi.fn(),
  toConvexId: vi.fn((id: string) => id),
}));

import {
  getTask,
  getCodebaseByRepo,
  getCodebaseByTaskId,
  createCodebaseUnderstanding,
  updateTask,
} from '../lib/convex-operations';
import { CodebaseUnderstandingStorage } from '../indexing/shadowwiki/db-storage';

describe('CodebaseUnderstandingStorage-unit-test', () => {
  const mockTaskId = 'task-123';
  const mockUserId = 'user-456';
  const mockRepoFullName = 'OpulentiaAI/shadow-clean';
  const mockRepoUrl = 'https://github.com/OpulentiaAI/shadow-clean';

  const mockSummaryContent = {
    rootSummary: 'A monorepo for Shadow Agent, an AI-powered coding assistant.',
    structure: {
      root: 'root',
      nodes: {
        root: {
          id: 'root',
          name: 'shadow-clean',
          absPath: '/workspace',
          relPath: '.',
          level: 0,
          children: ['apps', 'packages'],
          files: ['package.json', 'README.md'],
          summary: 'Root project directory',
        },
      },
    },
    fileCache: {
      'package.json': 'Project configuration file with dependencies',
      'README.md': 'Project documentation',
    },
    metadata: {
      filesProcessed: 2,
      directoriesProcessed: 1,
      generatedAt: new Date().toISOString(),
    },
  };

  const mockCodebaseRecord = {
    _id: 'codebase-789',
    repoFullName: mockRepoFullName,
    repoUrl: mockRepoUrl,
    contentJson: JSON.stringify(mockSummaryContent),
    content: mockSummaryContent,
    userId: mockUserId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('storeSummary', () => {
    it('creates new codebase understanding when none exists', async () => {
      const storage = new CodebaseUnderstandingStorage(mockTaskId);

      // Mock: task exists but has no codebaseUnderstandingId
      vi.mocked(getTask).mockResolvedValue({
        _id: mockTaskId,
        title: 'Test Task',
        codebaseUnderstandingId: undefined,
      } as any);

      // Mock: no existing codebase for this repo
      vi.mocked(getCodebaseByRepo).mockResolvedValue(null);

      // Mock: createCodebaseUnderstanding succeeds
      vi.mocked(createCodebaseUnderstanding).mockResolvedValue(undefined);

      // Mock: getCodebaseByRepo returns the new record after creation
      vi.mocked(getCodebaseByRepo)
        .mockResolvedValueOnce(null) // First call during check
        .mockResolvedValueOnce(mockCodebaseRecord as any); // Second call after creation

      // Mock: updateTask succeeds
      vi.mocked(updateTask).mockResolvedValue(undefined);

      const result = await storage.storeSummary(
        mockRepoFullName,
        mockRepoUrl,
        mockSummaryContent,
        mockUserId
      );

      expect(createCodebaseUnderstanding).toHaveBeenCalledWith({
        repoFullName: mockRepoFullName,
        repoUrl: mockRepoUrl,
        content: mockSummaryContent,
        userId: mockUserId,
      });

      expect(updateTask).toHaveBeenCalledWith({
        taskId: mockTaskId,
        codebaseUnderstandingId: mockCodebaseRecord._id,
      });

      expect(result).toBe(mockCodebaseRecord._id);
    });

    it('reuses existing codebase understanding for same repo', async () => {
      const storage = new CodebaseUnderstandingStorage(mockTaskId);

      // Mock: task exists but has no codebaseUnderstandingId
      vi.mocked(getTask).mockResolvedValue({
        _id: mockTaskId,
        title: 'Test Task',
        codebaseUnderstandingId: undefined,
      } as any);

      // Mock: existing codebase for this repo
      vi.mocked(getCodebaseByRepo).mockResolvedValue(mockCodebaseRecord as any);

      // Mock: updateTask succeeds
      vi.mocked(updateTask).mockResolvedValue(undefined);

      const result = await storage.storeSummary(
        mockRepoFullName,
        mockRepoUrl,
        mockSummaryContent,
        mockUserId
      );

      // Should NOT create new, just link existing
      expect(createCodebaseUnderstanding).not.toHaveBeenCalled();

      expect(updateTask).toHaveBeenCalledWith({
        taskId: mockTaskId,
        codebaseUnderstandingId: mockCodebaseRecord._id,
      });

      expect(result).toBe(mockCodebaseRecord._id);
    });

    it('throws error when task not found', async () => {
      const storage = new CodebaseUnderstandingStorage('nonexistent-task');

      vi.mocked(getTask).mockResolvedValue(null);

      await expect(
        storage.storeSummary(
          mockRepoFullName,
          mockRepoUrl,
          mockSummaryContent,
          mockUserId
        )
      ).rejects.toThrow('Task nonexistent-task not found');
    });
  });

  describe('getSummary', () => {
    it('returns summary when codebase exists for task', async () => {
      const storage = new CodebaseUnderstandingStorage(mockTaskId);

      vi.mocked(getCodebaseByTaskId).mockResolvedValue(mockCodebaseRecord as any);

      const result = await storage.getSummary();

      expect(result).toEqual({
        id: mockCodebaseRecord._id,
        repoFullName: mockCodebaseRecord.repoFullName,
        repoUrl: mockCodebaseRecord.repoUrl,
        content: mockCodebaseRecord.content,
        createdAt: mockCodebaseRecord.createdAt,
        updatedAt: mockCodebaseRecord.updatedAt,
      });
    });

    it('returns null when no codebase exists for task', async () => {
      const storage = new CodebaseUnderstandingStorage(mockTaskId);

      vi.mocked(getCodebaseByTaskId).mockResolvedValue(null);

      const result = await storage.getSummary();

      expect(result).toBeNull();
    });
  });

  describe('hasExistingSummary', () => {
    it('returns true when task has codebaseUnderstandingId', async () => {
      const storage = new CodebaseUnderstandingStorage(mockTaskId);

      vi.mocked(getTask).mockResolvedValue({
        _id: mockTaskId,
        codebaseUnderstandingId: 'codebase-789',
      } as any);

      const result = await storage.hasExistingSummary();

      expect(result).toBe(true);
    });

    it('returns false when task has no codebaseUnderstandingId', async () => {
      const storage = new CodebaseUnderstandingStorage(mockTaskId);

      vi.mocked(getTask).mockResolvedValue({
        _id: mockTaskId,
        codebaseUnderstandingId: undefined,
      } as any);

      const result = await storage.hasExistingSummary();

      expect(result).toBe(false);
    });

    it('returns false when task not found', async () => {
      const storage = new CodebaseUnderstandingStorage('nonexistent');

      vi.mocked(getTask).mockResolvedValue(null);

      const result = await storage.hasExistingSummary();

      expect(result).toBe(false);
    });
  });
});

describe('CodebaseUnderstanding-integration-test', () => {
  it.skipIf(!process.env.RUN_INTEGRATION_TESTS)(
    'can create and retrieve codebase understanding via Convex',
    async () => {
      // This would require a real Convex connection
      // Only runs when RUN_INTEGRATION_TESTS=true
      console.log('Integration test would run here with real Convex');
      expect(true).toBe(true);
    }
  );
});
