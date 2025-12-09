import { useEffect, useMemo, useState } from "react";
import {
  useConvexTask,
  useConvexTodos,
  useConvexMessages,
  useTaskDetailsAction,
} from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Task, Todo } from "@repo/db";
import type { Message } from "@repo/types";
import type { FileChange, DiffStats } from "@/lib/db-operations/get-task-with-details";
import { asConvexId } from "@/lib/convex/id";

function mapTask(doc: any): Task {
  return {
    id: (doc._id ?? "").toString(),
    title: doc.title ?? "",
    status: doc.status ?? "INITIALIZING",
    repoFullName: doc.repoFullName ?? "",
    repoUrl: doc.repoUrl ?? "",
    isScratchpad: !!doc.isScratchpad,
    mainModel: doc.mainModel ?? null,
    workspacePath: doc.workspacePath ?? null,
    initStatus: doc.initStatus ?? "INACTIVE",
    scheduledCleanupAt: doc.scheduledCleanupAt ?? null,
    initializationError: doc.initializationError ?? null,
    errorMessage: doc.errorMessage ?? null,
    workspaceCleanedUp: doc.workspaceCleanedUp ?? false,
    hasBeenInitialized: doc.hasBeenInitialized ?? false,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(0),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(0),
    userId: (doc.userId ?? "").toString(),
    baseBranch: doc.baseBranch ?? "main",
    baseCommitSha: doc.baseCommitSha ?? "",
    shadowBranch: doc.shadowBranch ?? null,
    pullRequestNumber: doc.pullRequestNumber ?? null,
    githubIssueId: doc.githubIssueId ?? null,
    codebaseUnderstandingId: doc.codebaseUnderstandingId
      ? doc.codebaseUnderstandingId.toString()
      : null,
  };
}

function mapTodo(doc: any): Todo {
  return {
    id: (doc._id ?? "").toString(),
    content: doc.content ?? "",
    status: doc.status ?? "PENDING",
    sequence: doc.sequence ?? 0,
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(0),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(0),
    taskId: (doc.taskId ?? "").toString(),
  };
}

function mapMessage(doc: any): Message {
  return {
    id: (doc._id ?? "").toString(),
    role: (doc.role?.toLowerCase?.() ?? "assistant") as
      | "user"
      | "assistant"
      | "system",
    content: doc.content ?? "",
    llmModel: doc.llmModel ?? "",
    createdAt: new Date(doc.createdAt).toISOString(),
    metadata: doc.metadataJson ? JSON.parse(doc.metadataJson) : undefined,
    pullRequestSnapshot: doc.pullRequestSnapshot ?? undefined,
    stackedTaskId: doc.stackedTaskId ? doc.stackedTaskId.toString() : undefined,
    stackedTask: doc.stackedTask
      ? {
          id: doc.stackedTask.id?.toString?.() ?? doc.stackedTask.id,
          title: doc.stackedTask.title ?? "",
          shadowBranch: doc.stackedTask.shadowBranch ?? undefined,
          status: doc.stackedTask.status ?? undefined,
        }
      : undefined,
  };
}

export function useTask(taskId: string) {
  const convexTaskId = asConvexId<"tasks">(taskId);
  const task = useConvexTask(convexTaskId as Id<"tasks"> | undefined);
  const todos = useConvexTodos(convexTaskId as Id<"tasks"> | undefined);
  const messages = useConvexMessages(convexTaskId as Id<"tasks"> | undefined);
  const getDetails = useTaskDetailsAction();

  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [diffStats, setDiffStats] = useState<DiffStats>({
    additions: 0,
    deletions: 0,
    totalFiles: 0,
  });
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mappedTask = useMemo(() => (task ? mapTask(task) : null), [task]);
  const mappedTodos = useMemo(
    () => (todos ? (todos as any[]).map(mapTodo) : []),
    [todos]
  );
  const mappedMessages = useMemo(
    () => (messages ? (messages as any[]).map(mapMessage) : []),
    [messages]
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!convexTaskId) {
        setLoadingFiles(false);
        return;
      }
      setLoadingFiles(true);
      setError(null);
      try {
        const data = await getDetails({ taskId: convexTaskId as Id<"tasks"> });
        if (cancelled) return;
        setFileChanges(data.fileChanges ?? []);
        setDiffStats(
          data.diffStats ?? { additions: 0, deletions: 0, totalFiles: 0 }
        );
      } catch (err) {
        if (cancelled) return;
        setError(err as Error);
      } finally {
        if (!cancelled) setLoadingFiles(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [getDetails, convexTaskId, taskId]);

  return {
    task: mappedTask,
    todos: mappedTodos as Todo[],
    messages: mappedMessages as Message[],
    fileChanges,
    diffStats,
    isLoading:
      !!convexTaskId &&
      (task === undefined || todos === undefined || messages === undefined || loadingFiles),
    error,
  };
}
