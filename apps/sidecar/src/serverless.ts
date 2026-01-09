import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { config } from "./config";
import { errorHandler, requestLogger } from "./api/middleware";
import { WorkspaceService } from "./services/workspace-service";
import { FileService } from "./services/file-service";
import { SearchService } from "./services/search-service";
import { CommandService } from "./services/command-service";
import { GitService } from "./services/git-service";
import { TerminalBuffer } from "./services/terminal-buffer";
import { createHealthRouter } from "./api/health";
import { createFilesRouter } from "./api/files";
import { createSearchRouter } from "./api/search";
import { createExecuteRouter } from "./api/execute";
import { createGitRouter } from "./api/git";

// Serverless-compatible Express app export (no listen() call)
function createApp() {
  const app = express();

  // Initialize services
  const workspaceService = new WorkspaceService();
  const fileService = new FileService(workspaceService);
  const searchService = new SearchService(workspaceService);
  const commandService = new CommandService(workspaceService);
  const gitService = new GitService(workspaceService);

  const terminalBuffer = new TerminalBuffer({
    maxSize: 10000,
    maxMemory: 50 * 1024 * 1024,
    flushInterval: 60000,
  });

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );

  // Body parsing and compression
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());

  // Request logging
  app.use(requestLogger);

  // Mount API routes
  app.use("/health", createHealthRouter(workspaceService));
  app.use("/api/files", createFilesRouter(fileService));
  app.use("/api/search", createSearchRouter(searchService));
  app.use("/api/execute", createExecuteRouter(commandService, terminalBuffer));
  app.use("/api/git", createGitRouter(gitService));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}

// Create and export the app for serverless use
export const app = createApp();
export default app;
