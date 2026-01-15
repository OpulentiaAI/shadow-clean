import { httpRouter } from "convex/server";
import { streamPersistentDemo } from "./persistentStreaming";
import { authComponent, createAuth } from "./auth";
import { ingest as daytonaIngest, health as daytonaHealth } from "./daytonaIngest";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// CORS headers for auth endpoints
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://code.opulentia.ai",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
  "Access-Control-Allow-Credentials": "true",
};

// Handle CORS preflight for all /api/auth/* routes
http.route({
  path: "/api/auth/get-session",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/api/auth/callback/github",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/api/auth/sign-in/github",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/api/auth/sign-out",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

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



