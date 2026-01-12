import { httpRouter } from "convex/server";
import { streamPersistentDemo } from "./persistentStreaming";
import { authComponent, createAuth } from "./auth";
import { ingest as daytonaIngest, health as daytonaHealth } from "./daytonaIngest";

const http = httpRouter();

http.route({
  path: "/persistent-stream",
  method: "POST",
  handler: streamPersistentDemo,
});

// Daytona Runner ingest endpoint - receives terminal output from Daytona Runner
http.route({
  path: "/daytona-ingest",
  method: "POST",
  handler: daytonaIngest,
});

// Daytona health check endpoint
http.route({
  path: "/daytona-ingest/health",
  method: "GET",
  handler: daytonaHealth,
});

// Register Better Auth routes
authComponent.registerRoutes(http, createAuth);

export default http;



