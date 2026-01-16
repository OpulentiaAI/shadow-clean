import { httpRouter } from "convex/server";
import { streamPersistentDemo } from "./persistentStreaming";
import { authComponent, createAuth } from "./auth";
import { ingest as daytonaIngest, health as daytonaHealth } from "./daytonaIngest";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// CORS headers for auth endpoints
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://code.opulentia.ai",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
  "Access-Control-Allow-Credentials": "true",
};

// Helper to add CORS headers to a response
function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Create a CORS-wrapped auth handler
const corsAuthHandler = httpAction(async (ctx, request) => {
  // Handle OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  // Call the Better Auth handler
  const auth = createAuth(ctx);
  const response = await auth.handler(request);
  
  // Add CORS headers to the response
  return addCorsHeaders(response);
});

// Register all auth routes with CORS wrapper
// These must be registered BEFORE authComponent.registerRoutes to take precedence
http.route({
  path: "/api/auth/get-session",
  method: "GET",
  handler: corsAuthHandler,
});

http.route({
  path: "/api/auth/get-session",
  method: "POST",
  handler: corsAuthHandler,
});

http.route({
  path: "/api/auth/get-session",
  method: "OPTIONS",
  handler: corsAuthHandler,
});

http.route({
  path: "/api/auth/callback/github",
  method: "GET",
  handler: corsAuthHandler,
});

http.route({
  path: "/api/auth/callback/github",
  method: "POST", 
  handler: corsAuthHandler,
});

http.route({
  path: "/api/auth/callback/github",
  method: "OPTIONS",
  handler: corsAuthHandler,
});

http.route({
  path: "/api/auth/sign-in/github",
  method: "GET",
  handler: corsAuthHandler,
});

http.route({
  path: "/api/auth/sign-in/github",
  method: "POST",
  handler: corsAuthHandler,
});

http.route({
  path: "/api/auth/sign-in/github",
  method: "OPTIONS",
  handler: corsAuthHandler,
});

http.route({
  path: "/api/auth/sign-out",
  method: "GET",
  handler: corsAuthHandler,
});

http.route({
  path: "/api/auth/sign-out",
  method: "POST",
  handler: corsAuthHandler,
});

http.route({
  path: "/api/auth/sign-out",
  method: "OPTIONS",
  handler: corsAuthHandler,
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

// Register remaining Better Auth routes (fallback for routes not explicitly handled above)
authComponent.registerRoutes(http, createAuth);

export default http;



