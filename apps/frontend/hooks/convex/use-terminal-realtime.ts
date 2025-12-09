"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";

interface TerminalOutput {
  _id: Id<"terminalOutput">;
  taskId: Id<"tasks">;
  commandId: string;
  content: string;
  streamType: "stdout" | "stderr";
  timestamp: number;
  _creationTime: number;
}

/**
 * Real-time terminal output subscription for a specific command
 * Provides live streaming of stdout/stderr from sidecar command execution
 */
export function useTerminalRealtime(commandId: string | undefined) {
  const [combinedOutput, setCombinedOutput] = useState("");
  const [outputLines, setOutputLines] = useState<TerminalOutput[]>([]);
  const prevOutputRef = useRef<TerminalOutput[]>([]);

  // Subscribe to terminal output for this command
  const terminalData = useQuery(
    api.terminalOutput.byCommand,
    commandId ? { commandId } : "skip"
  );

  // Process new terminal output
  useEffect(() => {
    if (!terminalData) return;

    const prevOutput = prevOutputRef.current || [];
    const currentOutput = terminalData || [];

    // Detect new output lines
    const newLines = currentOutput.filter(
      (line) =>
        !prevOutput.find(
          (prev) =>
            prev._id === line._id && prev._creationTime === line._creationTime
        )
    );

    if (newLines.length > 0) {
      // Append new lines to combined output
      const newContent = newLines
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((line) => line.content)
        .join("");

      setCombinedOutput((prev) => prev + newContent);
      setOutputLines(currentOutput);
    }

    prevOutputRef.current = currentOutput;
  }, [terminalData]);

  // Get combined output from Convex (server-side concatenation)
  const combinedFromServer = useQuery(
    api.terminalOutput.getCombinedOutput,
    commandId ? { commandId } : "skip"
  );

  return {
    output: combinedOutput || combinedFromServer || "",
    lines: outputLines,
    hasOutput: outputLines.length > 0,
    latestTimestamp:
      outputLines.length > 0
        ? Math.max(...outputLines.map((l) => l.timestamp))
        : 0,
  };
}

/**
 * Real-time terminal output subscription for all commands in a task
 * Useful for task-level terminal monitoring
 */
export function useTaskTerminalRealtime(taskId: Id<"tasks"> | undefined) {
  const [commandOutputs, setCommandOutputs] = useState<
    Map<string, TerminalOutput[]>
  >(new Map());

  // Subscribe to all terminal output for this task
  const terminalData = useQuery(
    api.terminalOutput.byTask,
    taskId ? { taskId } : "skip"
  );

  // Group output by command ID
  useEffect(() => {
    if (!terminalData) return;

    const grouped = new Map<string, TerminalOutput[]>();

    terminalData.forEach((output) => {
      const existing = grouped.get(output.commandId) || [];
      grouped.set(output.commandId, [...existing, output]);
    });

    // Sort each command's output by timestamp
    grouped.forEach((outputs, commandId) => {
      grouped.set(
        commandId,
        outputs.sort((a, b) => a.timestamp - b.timestamp)
      );
    });

    setCommandOutputs(grouped);
  }, [terminalData]);

  return {
    commandOutputs,
    commands: Array.from(commandOutputs.keys()),
    getCommandOutput: (commandId: string) =>
      commandOutputs.get(commandId) || [],
    hasAnyOutput: commandOutputs.size > 0,
  };
}
