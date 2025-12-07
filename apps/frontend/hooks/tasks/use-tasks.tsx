import { useMemo } from "react";
import { useConvexTasksExcludeArchived } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Task } from "@repo/db";

/**
 * Tasks hook backed by Convex live queries.
 * Falls back to initialData for SSR/hydration, then live-updates from Convex.
 */
export function useTasks(initialData: Task[]) {
  const initialUserId = initialData?.[0]?.userId as Id<"users"> | undefined;
  const liveTasks = useConvexTasksExcludeArchived(initialUserId);

  const data = useMemo(() => {
    if (!liveTasks) return initialData ?? [];
    return liveTasks.map((t) => ({
      // Map Convex doc -> Prisma Task shape expected by UI
      id: t._id,
      title: t.title,
      status: t.status,
      repoFullName: t.repoFullName,
      repoUrl: t.repoUrl,
      isScratchpad: t.isScratchpad,
      mainModel: t.mainModel ?? null,
      workspacePath: t.workspacePath ?? null,
      initStatus: t.initStatus,
      scheduledCleanupAt: t.scheduledCleanupAt ?? null,
      initializationError: t.initializationError ?? null,
      errorMessage: t.errorMessage ?? null,
      workspaceCleanedUp: t.workspaceCleanedUp ?? false,
      hasBeenInitialized: t.hasBeenInitialized ?? false,
      createdAt: new Date(t.createdAt).toISOString(),
      updatedAt: new Date(t.updatedAt).toISOString(),
      userId: t.userId,
      baseBranch: t.baseBranch,
      baseCommitSha: t.baseCommitSha,
      shadowBranch: t.shadowBranch ?? null,
      pullRequestNumber: t.pullRequestNumber ?? null,
      githubIssueId: t.githubIssueId ?? null,
    })) as Task[];
  }, [liveTasks, initialData]);

  return {
    data,
    isLoading: liveTasks === undefined,
    error: null,
  };
}
