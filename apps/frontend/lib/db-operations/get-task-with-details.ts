import type { Task, Todo } from "@repo/db";
import { getConvexClient, api } from "../convex/client";
import { makeBackendRequest } from "../make-backend-request";

export interface FileChange {
  filePath: string;
  operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
  additions: number;
  deletions: number;
  createdAt: string;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  totalFiles: number;
}

export interface TaskWithDetails {
  task: Task | null;
  todos: Todo[];
  fileChanges: FileChange[];
  diffStats: DiffStats;
}

async function fetchFileChanges(
  taskId: string
): Promise<{ fileChanges: FileChange[]; diffStats: DiffStats }> {
  try {
    const response = await makeBackendRequest(
      `/api/tasks/${taskId}/file-changes`
    );
    if (!response.ok) {
      console.warn(
        `Failed to fetch file changes for task ${taskId}: ${response.status}`
      );
      return {
        fileChanges: [],
        diffStats: { additions: 0, deletions: 0, totalFiles: 0 },
      };
    }
    const data = await response.json();

    return {
      fileChanges: data.fileChanges,
      diffStats: data.diffStats,
    };
  } catch (error) {
    console.error(`Error fetching file changes for task ${taskId}:`, error);
    return {
      fileChanges: [],
      diffStats: { additions: 0, deletions: 0, totalFiles: 0 },
    };
  }
}

export async function getTaskWithDetails(
  taskId: string
): Promise<TaskWithDetails> {
  try {
    const client = getConvexClient();
    const convexTaskId = taskId as any;

    const [convexDetails, { fileChanges, diffStats }] = await Promise.all([
      client.query(api.tasks.getWithDetails, { taskId: convexTaskId }),
      fetchFileChanges(taskId),
    ]);

    const taskDoc = convexDetails?.task;
    const todosDocs = convexDetails?.todos ?? [];

    const task: Task | null = taskDoc
      ? ({
          id: (taskDoc._id ?? "").toString(),
          title: taskDoc.title ?? "",
          status: taskDoc.status ?? "INITIALIZING",
          repoFullName: taskDoc.repoFullName ?? "",
          repoUrl: taskDoc.repoUrl ?? "",
          isScratchpad: !!taskDoc.isScratchpad,
          baseBranch: taskDoc.baseBranch ?? "main",
          baseCommitSha: taskDoc.baseCommitSha ?? "",
          shadowBranch: taskDoc.shadowBranch ?? "",
          mainModel: taskDoc.mainModel ?? null,
          initStatus: taskDoc.initStatus ?? "INACTIVE",
          scheduledCleanupAt: taskDoc.scheduledCleanupAt ?? null,
          initializationError: taskDoc.initializationError ?? null,
          errorMessage: taskDoc.errorMessage ?? null,
          workspaceCleanedUp: !!taskDoc.workspaceCleanedUp,
          hasBeenInitialized: !!taskDoc.hasBeenInitialized,
          createdAt: taskDoc.createdAt
            ? new Date(taskDoc.createdAt)
            : new Date(0),
          updatedAt: taskDoc.updatedAt
            ? new Date(taskDoc.updatedAt)
            : new Date(0),
          userId: (taskDoc.userId ?? "").toString(),
          pullRequestNumber: taskDoc.pullRequestNumber ?? null,
          githubIssueId: taskDoc.githubIssueId ?? null,
          codebaseUnderstandingId: taskDoc.codebaseUnderstandingId
            ? taskDoc.codebaseUnderstandingId.toString()
            : null,
        } as Task)
      : null;

    const todos: Todo[] = todosDocs.map((t: any) => ({
      id: (t._id ?? "").toString(),
      content: t.content ?? "",
      status: (t.status as Todo["status"]) ?? "PENDING",
      sequence: t.sequence ?? 0,
      taskId: (t.taskId ?? "").toString(),
      createdAt: t.createdAt ? new Date(t.createdAt) : new Date(0),
      updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(0),
    }));

    return {
      task,
      todos,
      fileChanges,
      diffStats,
    };
  } catch (error) {
    console.error(`Failed to fetch task details for ${taskId}:`, error);
    // Return empty data structure on error
    return {
      task: null,
      todos: [],
      fileChanges: [],
      diffStats: { additions: 0, deletions: 0, totalFiles: 0 },
    };
  }
}
