"use client";

import { createContext, useContext, ReactNode } from "react";
import { useHybridTask, type HybridTaskData } from "@/hooks/convex";
import type {
  AssistantMessagePart,
  AutoPRStatusEvent
} from "@repo/types";
import { Id } from "../../../convex/_generated/dataModel";

interface TaskSocketContextValue extends HybridTaskData {
  // Extended with Convex-native data
}

const TaskSocketContext = createContext<TaskSocketContextValue | null>(null);

interface TaskSocketProviderProps {
  taskId: string;
  children: ReactNode;
}

export function TaskSocketProvider({ taskId, children }: TaskSocketProviderProps) {
  // Use hybrid hook that combines Socket.IO (chat) + Convex (sidecar data)
  const hybridState = useHybridTask(taskId);

  return (
    <TaskSocketContext.Provider value={hybridState}>
      {children}
    </TaskSocketContext.Provider>
  );
}

export function useTaskSocketContext(): TaskSocketContextValue {
  const context = useContext(TaskSocketContext);
  if (!context) {
    throw new Error(
      'useTaskSocketContext must be used within a TaskSocketProvider'
    );
  }
  return context;
}