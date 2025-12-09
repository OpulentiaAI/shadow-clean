import { isCurrentlyIndexing } from "../initialization/background-indexing";
import { getRepositoryIndex } from "../lib/convex-operations";

export type IndexingStatusResponse = {
  status: 'not-started' | 'indexing' | 'completed' | 'failed';
  lastIndexedAt?: string | null;
  lastCommitSha?: string | null;
};

/**
 * Get the current indexing status for a repository
 * Combines in-memory activeIndexingJobs with database RepositoryIndex table
 */
export async function getIndexingStatus(repoFullName: string): Promise<IndexingStatusResponse> {
  try {
    // Check if currently indexing in memory
    const isCurrentlyIndexingRepo = isCurrentlyIndexing(repoFullName);
    
    if (isCurrentlyIndexingRepo) {
      return {
        status: 'indexing',
        lastIndexedAt: null,
        lastCommitSha: null
      };
    }

    // Check database for indexing history
    const repositoryIndex = await getRepositoryIndex(repoFullName);

    if (!repositoryIndex) {
      return {
        status: 'not-started',
        lastIndexedAt: null,
        lastCommitSha: null
      };
    }

    if (repositoryIndex.lastIndexedAt) {
      return {
        status: 'completed',
        lastIndexedAt: new Date(repositoryIndex.lastIndexedAt).toISOString(),
        lastCommitSha: repositoryIndex.lastCommitSha
      };
    }

    // Repository exists in database but no successful indexing
    return {
      status: 'failed',
      lastIndexedAt: null,
      lastCommitSha: repositoryIndex.lastCommitSha
    };

  } catch (error) {
    console.error(`[INDEXING_STATUS] Error fetching status for ${repoFullName}:`, error);
    return {
      status: 'failed',
      lastIndexedAt: null,
      lastCommitSha: null
    };
  }
}