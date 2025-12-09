"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useQueryClient } from "@tanstack/react-query";
import type { TaskWithDetails } from "@/lib/db-operations/get-task-with-details";
import type { FileNode } from "@repo/types";

/**
 * Real-time Convex subscriptions for task-related data from sidecar
 * Provides live updates for file changes, tool logs, and terminal output
 */
export function useTaskRealtime(taskId: Id<"tasks"> | undefined) {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  // Subscribe to file changes
  const fileChanges = useQuery(
    api.fileChanges.byTask,
    taskId ? { taskId } : "skip"
  );

  // Subscribe to recent tool logs
  const toolLogs = useQuery(
    api.toolLogs.recentByTask,
    taskId ? { taskId, limit: 50 } : "skip"
  );

  // Subscribe to running tool logs for progress indication
  const runningTools = useQuery(
    api.toolLogs.runningByTask,
    taskId ? { taskId } : "skip"
  );

  // Subscribe to workspace status for health monitoring
  const workspaceStatus = useQuery(
    api.tasks.getWorkspaceStatus,
    taskId ? { taskId } : "skip"
  );

  // Track previous file changes to detect new ones
  const prevFileChangesRef = useRef<typeof fileChanges>([]);

  // Update React Query cache when Convex data changes
  useEffect(() => {
    if (!taskId || fileChanges === undefined) return;

    const prevChanges = prevFileChangesRef.current || [];
    const currentChanges = fileChanges || [];

    // Detect new file changes
    const newChanges = currentChanges.filter(
      (change) =>
        !prevChanges.find(
          (prev) =>
            prev._id === change._id &&
            prev._creationTime === change._creationTime
        )
    );

    if (newChanges.length > 0 && isInitialized) {
      // Update file tree optimistically for each new change
      newChanges.forEach((change) => {
        updateFileTreeFromChange(queryClient, taskId.toString(), change);
      });

      // Update task diff stats
      queryClient.setQueryData(
        ["task", taskId.toString()],
        (oldData: TaskWithDetails) => {
          if (!oldData) return oldData;

          const fileChangesArray = currentChanges.map((fc) => ({
            filePath: fc.filePath,
            operation: fc.operation,
            additions: fc.additions,
            deletions: fc.deletions,
            createdAt: new Date(fc.createdAt).toISOString(),
          }));

          const diffStats = fileChangesArray.reduce(
            (acc, file) => ({
              additions: acc.additions + file.additions,
              deletions: acc.deletions + file.deletions,
              totalFiles: acc.totalFiles + 1,
            }),
            { additions: 0, deletions: 0, totalFiles: 0 }
          );

          return {
            ...oldData,
            fileChanges: fileChangesArray,
            diffStats,
          };
        }
      );
    }

    prevFileChangesRef.current = currentChanges;

    if (!isInitialized && currentChanges.length >= 0) {
      setIsInitialized(true);
    }
  }, [fileChanges, taskId, queryClient, isInitialized]);

  // Update tool execution state
  useEffect(() => {
    if (!taskId || !toolLogs) return;

    // Update query cache with latest tool logs
    queryClient.setQueryData(["tool-logs", taskId.toString()], toolLogs);
  }, [toolLogs, taskId, queryClient]);

  // Update workspace health status
  useEffect(() => {
    if (!taskId || !workspaceStatus) return;

    queryClient.setQueryData(
      ["workspace-status", taskId.toString()],
      workspaceStatus
    );
  }, [workspaceStatus, taskId, queryClient]);

  return {
    fileChanges: fileChanges || [],
    toolLogs: toolLogs || [],
    runningTools: runningTools || [],
    workspaceStatus,
    isHealthy: workspaceStatus?.isHealthy ?? true,
    activeToolCount: runningTools?.length || 0,
  };
}

/**
 * Update file tree based on file change event
 */
function updateFileTreeFromChange(
  queryClient: ReturnType<typeof useQueryClient>,
  taskId: string,
  change: { filePath: string; operation: string }
) {
  queryClient.setQueryData(
    ["file-tree", taskId],
    (oldData: { success: boolean; tree: FileNode[] }) => {
      if (!oldData || !oldData.success || !oldData.tree) return oldData;

      const { filePath, operation } = change;
      let updatedTree = oldData.tree;

      if (operation === "CREATE") {
        updatedTree = addNodeToTree(oldData.tree, filePath, "file");
      } else if (operation === "DELETE") {
        updatedTree = removeNodeFromTree(oldData.tree, filePath);
      }

      return {
        ...oldData,
        tree: updatedTree,
      };
    }
  );
}

/**
 * Add a new node to the file tree
 */
function addNodeToTree(
  tree: FileNode[],
  filePath: string,
  type: "file" | "folder"
): FileNode[] {
  const parts = filePath.split("/").filter(Boolean);
  if (parts.length === 0) return tree;

  const [firstPart, ...restParts] = parts;
  if (!firstPart) return tree;

  const treeCopy = [...tree];
  const existingIndex = treeCopy.findIndex((node) => node.name === firstPart);

  if (restParts.length === 0) {
    if (existingIndex === -1) {
      const newNode = {
        name: firstPart,
        type,
        path: `/${filePath}`,
        ...(type === "folder" && { children: [] }),
      };
      treeCopy.push(newNode);

      // Sort: folders first, then files, both alphabetically
      treeCopy.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
    return treeCopy;
  }

  if (existingIndex === -1) {
    const newFolder = {
      name: firstPart,
      type: "folder" as const,
      path: `/${parts.slice(0, 1).join("/")}`,
      children: [],
    };
    treeCopy.push(newFolder);
  }

  const nodeIndex = treeCopy.findIndex((node) => node.name === firstPart);
  if (nodeIndex !== -1 && treeCopy[nodeIndex]?.type === "folder") {
    if (!treeCopy[nodeIndex].children) {
      treeCopy[nodeIndex].children = [];
    }
    treeCopy[nodeIndex].children = addNodeToTree(
      treeCopy[nodeIndex].children || [],
      restParts.join("/"),
      type
    );
  }

  return treeCopy;
}

/**
 * Remove a node from the file tree
 */
function removeNodeFromTree(tree: FileNode[], filePath: string): FileNode[] {
  const parts = filePath.split("/").filter(Boolean);
  if (parts.length === 0) return tree;

  const [firstPart, ...restParts] = parts;
  if (!firstPart) return tree;

  const treeCopy = [...tree];

  if (restParts.length === 0) {
    return treeCopy.filter((node) => node.name !== firstPart);
  }

  const nodeIndex = treeCopy.findIndex((node) => node.name === firstPart);
  if (
    nodeIndex !== -1 &&
    treeCopy[nodeIndex]?.type === "folder" &&
    treeCopy[nodeIndex]?.children
  ) {
    treeCopy[nodeIndex].children = removeNodeFromTree(
      treeCopy[nodeIndex].children || [],
      restParts.join("/")
    );

    // Remove empty folders
    if (treeCopy[nodeIndex].children?.length === 0) {
      return treeCopy.filter((_, index) => index !== nodeIndex);
    }
  }

  return treeCopy;
}
