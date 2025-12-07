import { useMemo } from "react";
import { useConvexTasksExcludeArchived } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Task } from "@repo/db";
import { asConvexId } from "@/lib/convex/id";

/**
 * Tasks hook backed by Convex live queries.
 * Falls back to initialData for SSR/hydration, then live-updates from Convex.
 * Uses the Prisma user id (external id) to look up the Convex user id safely.
 */
export function useTasks(initialData: Task[], userExternalId?: string) {
  const externalUserId = userExternalId ?? initialData?.[0]?.userId;
  const convexUserId = asConvexId<"users">(externalUserId);
  const liveTasks = useConvexTasksExcludeArchived(convexUserId);

  const data = useMemo(() => {
    if (!liveTasks) return initialData ?? [];
    return liveTasks.map((t: any) => ({
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
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      userId: t.userId,
      baseBranch: t.baseBranch,
      baseCommitSha: t.baseCommitSha,
      shadowBranch: t.shadowBranch ?? null,
      pullRequestNumber: t.pullRequestNumber ?? null,
      githubIssueId: t.githubIssueId ?? null,
      codebaseUnderstandingId: t.codebaseUnderstandingId ?? null,
    })) as Task[];
  }, [liveTasks, initialData]);

  return {
    data,
    isLoading: convexUserId ? liveTasks === undefined : false,
    error: null,
  };
}
