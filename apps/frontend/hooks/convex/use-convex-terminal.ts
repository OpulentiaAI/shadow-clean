"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMemo } from "react";
import type { TerminalEntry } from "@repo/types";

/**
 * Hook for getting terminal output from Convex
 * Alternative to Socket.IO-based terminal that uses Convex's real-time queries
 */
export function useConvexTerminal(taskId: string | undefined) {
  const convexTaskId = taskId ? (taskId as Id<"tasks">) : undefined;

  const terminalOutput = useQuery(
    api.terminalOutput.byTask,
    convexTaskId ? { taskId: convexTaskId } : "skip"
  );

  // Transform Convex terminal output to TerminalEntry format
  // StreamType in Convex is "stdout" | "stderr", map to TerminalEntry type
  const terminalEntries: TerminalEntry[] = useMemo(() => {
    if (!terminalOutput) return [];

    return terminalOutput.map((output, index) => ({
      id: index,
      type: output.streamType === "stderr" ? "stderr" as const : "stdout" as const,
      data: output.content,
      timestamp: output.timestamp,
    }));
  }, [terminalOutput]);

  const isConnected = terminalOutput !== undefined;

  return {
    terminalEntries,
    isTerminalConnected: isConnected,
    // No-op for Convex - clearing is handled server-side
    clearTerminal: () => {},
  };
}
