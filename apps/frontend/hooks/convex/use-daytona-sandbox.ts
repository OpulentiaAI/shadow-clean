"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

/**
 * Hook for Daytona sandbox state and operations
 * 
 * This hook provides information about whether a task is using a Daytona sandbox
 * and can be used to route terminal commands appropriately.
 * 
 * The terminal output streaming works identically for both workspace and Daytona
 * sandboxes - all output flows through the same Convex terminalOutput table.
 */
export function useDaytonaSandbox(taskId: string | undefined) {
  const convexTaskId = taskId ? (taskId as Id<"tasks">) : undefined;

  // Query sandbox info for this task
  const sandboxInfo = useQuery(
    api.daytona.getSandboxInfo,
    convexTaskId ? { taskId: convexTaskId } : "skip"
  );

  // Determine if this task is using a Daytona sandbox
  const isDaytonaSandbox = sandboxInfo !== undefined && sandboxInfo !== null && sandboxInfo.status === "active";

  // Check feature flag from environment
  const isDaytonaEnabled = typeof process !== "undefined" && 
    process.env.NEXT_PUBLIC_ENABLE_DAYTONA_TERMINAL === "true";

  return {
    sandboxInfo,
    isDaytonaSandbox,
    isDaytonaEnabled,
    // Computed state for routing
    shouldUseDaytona: isDaytonaEnabled && isDaytonaSandbox,
    // Status helpers
    sandboxStatus: sandboxInfo?.status,
    sandboxId: sandboxInfo?.sandboxId,
    sessionId: sandboxInfo?.sessionId,
  };
}
