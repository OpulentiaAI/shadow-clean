// Initialize telemetry BEFORE any other imports
import { initializeTelemetry, shutdownTelemetry } from "./instrumentation";
initializeTelemetry();

import * as fs from "fs/promises";
import { socketIOServer } from "./app";
import config from "./config";
import { stopAllFileSystemWatchers } from "./agent/tools";
import { taskCleanupService } from "./services/task-cleanup";

/**
 * Ensure the workspace directory exists on startup
 * This prevents file operation errors when tasks are created
 */
async function ensureWorkspaceDirectory(): Promise<void> {
  const workspaceDir = config.workspaceDir;
  if (!workspaceDir) {
    console.warn("[SERVER] WORKSPACE_DIR not configured, skipping workspace initialization");
    return;
  }

  try {
    await fs.access(workspaceDir);
    console.log(`[SERVER] Workspace directory exists: ${workspaceDir}`);
  } catch {
    console.log(`[SERVER] Creating workspace directory: ${workspaceDir}`);
    try {
      await fs.mkdir(workspaceDir, { recursive: true });
      console.log(`[SERVER] Workspace directory created: ${workspaceDir}`);
    } catch (error) {
      console.error(`[SERVER] Failed to create workspace directory: ${error}`);
    }
  }

  // Also ensure the tasks subdirectory exists
  const tasksDir = `${workspaceDir}/tasks`;
  try {
    await fs.access(tasksDir);
  } catch {
    try {
      await fs.mkdir(tasksDir, { recursive: true });
      console.log(`[SERVER] Tasks directory created: ${tasksDir}`);
    } catch (error) {
      console.error(`[SERVER] Failed to create tasks directory: ${error}`);
    }
  }
}

// Use single server for both HTTP and WebSocket
// Railway provides PORT env var, fallback to config.apiPort
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : config.apiPort;

// Initialize workspace before starting server
ensureWorkspaceDirectory().then(() => {
  const server = socketIOServer.listen(port, () => {
    console.log(`Server (HTTP + WebSocket) running on port ${port}`);

    // Start background cleanup service
    taskCleanupService.start();
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    console.log(`\n[SERVER] Received ${signal}, starting graceful shutdown...`);

    // Stop cleanup service
    taskCleanupService.stop();

    // Stop all filesystem watchers first
    stopAllFileSystemWatchers();

    // Close server (handles both HTTP and WebSocket)
    server.close(async () => {
      // Shutdown telemetry
      try {
        await shutdownTelemetry();
        console.log("[SERVER] Telemetry shutdown complete");
      } catch (error) {
        console.error("[SERVER] Error shutting down telemetry:", error);
      }

      console.log("[SERVER] Server closed (HTTP + WebSocket)");
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error("[SERVER] Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}).catch((error) => {
  console.error("[SERVER] Failed to initialize workspace:", error);
  process.exit(1);
});
