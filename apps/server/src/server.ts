// Initialize telemetry BEFORE any other imports
import { initializeTelemetry, shutdownTelemetry } from "./instrumentation";
initializeTelemetry();

import { socketIOServer } from "./app";
import config from "./config";
import { stopAllFileSystemWatchers } from "./agent/tools";
import { taskCleanupService } from "./services/task-cleanup";

// Use single server for both HTTP and WebSocket
// Railway provides PORT env var, fallback to config.apiPort
const railwayPort = process.env.PORT;
const configPort = config.apiPort;
const port = railwayPort || configPort;
console.log(`[DEBUG] Raw process.env.PORT: ${JSON.stringify(railwayPort)}`);
console.log(`[DEBUG] config.apiPort: ${configPort}`);
console.log(`[DEBUG] Final port to use: ${port}`);
const server = socketIOServer.listen(port, () => {
  console.log(`Server (HTTP + WebSocket) running on port ${port}`);
  console.log(`[CONFIG] Using Railway PORT: ${railwayPort}, config.apiPort: ${configPort}`);

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
