import type { Task } from "@repo/db";
import { getConvexClient, api } from "../convex/client";

function mapConvexTaskToTask(doc: any): Task {
  return {
    // Prisma Task id is a string; Convex _id is an Id<"tasks">
    id: (doc?._id ?? "").toString(),
    title: doc?.title ?? "",
    status: doc?.status ?? "INITIALIZING",
    repoFullName: doc?.repoFullName ?? "",
    repoUrl: doc?.repoUrl ?? "",
    isScratchpad: !!doc?.isScratchpad,
    baseBranch: doc?.baseBranch ?? "main",
    baseCommitSha: doc?.baseCommitSha ?? "",
    shadowBranch: doc?.shadowBranch ?? "",
    mainModel: doc?.mainModel ?? null,
    initStatus: doc?.initStatus ?? "INACTIVE",
    scheduledCleanupAt: doc?.scheduledCleanupAt ?? null,
    initializationError: doc?.initializationError ?? null,
    errorMessage: doc?.errorMessage ?? null,
    workspaceCleanedUp: !!doc?.workspaceCleanedUp,
    hasBeenInitialized: !!doc?.hasBeenInitialized,
    createdAt: doc?.createdAt ? new Date(doc.createdAt) : new Date(0),
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt) : new Date(0),
    userId: (doc?.userId ?? "").toString(),
    pullRequestNumber: doc?.pullRequestNumber ?? null,
    githubIssueId: doc?.githubIssueId ?? null,
    codebaseUnderstandingId: doc?.codebaseUnderstandingId
      ? doc.codebaseUnderstandingId.toString()
      : null,
  } as Task;
}

export async function getTasks(userExternalId: string): Promise<Task[]> {
  try {
    const client = getConvexClient();

    // Look up the Convex user by externalId (same id we used with upsertUser)
    const user = await client.query(api.auth.getUserByExternalId, {
      externalId: userExternalId,
    });
    if (!user?._id) {
      console.warn(
        "[getTasks] No Convex user found for externalId",
        userExternalId
      );
      return [];
    }

    const convexTasks = await client.query(
      api.tasks.listByUserExcludeArchived,
      {
        userId: user._id,
      }
    );

    return convexTasks
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .map(mapConvexTaskToTask);
  } catch (err) {
    console.error("Failed to fetch tasks from Convex", err);
    return [];
  }
}
