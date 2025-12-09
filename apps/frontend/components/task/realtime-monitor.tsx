"use client";

import { useTaskSocketContext } from "@/contexts/task-socket-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  FileCode,
  Terminal,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

/**
 * Real-time monitoring panel for Convex-native sidecar data
 * Displays file changes, tool execution logs, and workspace status
 */
export function RealtimeMonitor() {
  const {
    fileChanges,
    toolLogs,
    runningTools,
    workspaceStatus,
    isWorkspaceHealthy,
    activeToolCount,
    isConvexEnabled,
    mode,
  } = useTaskSocketContext();

  if (!isConvexEnabled) {
    return null; // Only show when Convex mode is enabled
  }

  return (
    <div className="space-y-4 p-4">
      {/* Mode Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">Real-time Mode</span>
        </div>
        <Badge variant={mode === "convex-only" ? "default" : "secondary"}>
          {mode === "convex-only" ? "Convex (Realtime)" : "Socket.IO Only"}
        </Badge>
      </div>

      {/* Workspace Status */}
      {workspaceStatus && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {isWorkspaceHealthy ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              Workspace Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Health:</span>
                <span
                  className={
                    isWorkspaceHealthy ? "text-green-600" : "text-red-600"
                  }
                >
                  {isWorkspaceHealthy ? "Healthy" : "Unhealthy"}
                </span>
              </div>
              {workspaceStatus.activeProcessCount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Active Processes:
                  </span>
                  <span>{workspaceStatus.activeProcessCount}</span>
                </div>
              )}
              {workspaceStatus.diskUsageBytes !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Disk Usage:</span>
                  <span>
                    {(workspaceStatus.diskUsageBytes / 1024 / 1024).toFixed(2)}{" "}
                    MB
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Heartbeat:</span>
                <span>
                  {new Date(workspaceStatus.lastHeartbeat).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Running Tools */}
      {activeToolCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Running Tools ({activeToolCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-32 overflow-y-auto">
              <div className="space-y-2">
                {runningTools.map((tool: { _id: string; toolName: string }) => (
                  <div
                    key={tool._id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-sm font-medium">
                        {tool.toolName}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Running
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent File Changes */}
      {fileChanges.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              Recent File Changes ({fileChanges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto">
              <div className="space-y-1">
                {fileChanges.slice(0, 20).map(
                  (change: {
                    _id: string;
                    operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
                    filePath: string;
                    additions: number;
                    deletions: number;
                  }) => (
                  <div
                    key={change._id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge
                        variant={
                          change.operation === "CREATE"
                            ? "default"
                            : change.operation === "DELETE"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs shrink-0"
                      >
                        {change.operation}
                      </Badge>
                      <span
                        className="text-sm truncate"
                        title={change.filePath}
                      >
                        {change.filePath}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground shrink-0">
                      {change.additions > 0 && (
                        <span className="text-green-600">
                          +{change.additions}
                        </span>
                      )}
                      {change.deletions > 0 && (
                        <span className="text-red-600">
                          -{change.deletions}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tool Execution Log Summary */}
      {toolLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tool Execution Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">
                  {toolLogs.filter((t: { status: string }) => t.status === "COMPLETED").length}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {toolLogs.filter((t: { status: string }) => t.status === "RUNNING").length}
                </div>
                <div className="text-xs text-muted-foreground">Running</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {toolLogs.filter((t: { status: string }) => t.status === "FAILED").length}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
