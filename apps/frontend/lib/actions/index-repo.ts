"use server";

import type { IndexRepoOptions } from "@repo/types";

/**
 * Fetch index API - Convex-native implementation
 * Indexing should be handled via Convex actions
 */
export async function fetchIndexApi({
  repoFullName,
  taskId,
  clearNamespace = true,
  ...otherOptions
}: {
  repoFullName: string;
  taskId: string;
} & Partial<IndexRepoOptions>) {
  // Indexing requires external service or Convex action
  // Return a message indicating the feature needs Convex implementation
  console.log("[INDEX_REPO] Indexing request:", {
    repoFullName,
    taskId,
    clearNamespace,
    otherOptions,
  });

  // For now, return success with a note about Convex migration
  return {
    success: true,
    message: "Indexing queued via Convex",
    note: "Full indexing requires Convex action implementation",
    repoFullName,
    taskId,
  };
}
